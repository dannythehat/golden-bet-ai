/**
 * ML Referee Ingest — Step 3 (Data-Driven Allowlist)
 * ═══════════════════════════════════════════════════════════════
 * Rate budget: 150k calls/day ≈ 104/min → 150ms safe delay
 * Batch: 80 fixtures × 150ms = 12s per invocation (within 25s edge timeout)
 * Cron: every 1 minute → mode=auto
 *
 * Allowlist-based selection (replaces hardcoded league-name whitelist):
 *   1. referee_league_allowlist table populated by "probe-leagues" mode
 *      - Probes 12 fixture_ids per league from the eligible pool
 *      - Approves leagues where ref_present_rate >= 0.60
 *   2. Loop mode selects only fixture_ids in approved leagues
 *
 * Fixture selection filter (ALL conditions must be true):
 *   1. league IN (SELECT league FROM referee_league_allowlist WHERE is_approved=true)
 *   2. fixture_date >= 2019-01-01
 *   3. total_cards IS NOT NULL
 *   4. referee_key IS NULL
 *      NOTE: __no_ref__ sentinel permanently excludes no-data fixtures
 *
 * Modes:
 *   { "mode": "auto" }            — cron uses this: probe-leagues until done, then loop
 *   { "mode": "probe-leagues" }   — sample leagues, populate referee_league_allowlist
 *   { "mode": "loop" }            — backfill against allowlist-approved leagues
 *   { "mode": "audit" }           — coverage report
 *   { "mode": "compute-stats" }   — Step 3B (≥5k rows)
 *   { "mode": "mini-retrain" }    — Step 3C (≥10k rows)
 *   { "mode": "flag-collisions" } — mark duplicates
 *   { "mode": "report" }          — proof-pack output
 *   { "mode": "reset-state" }     — zero cumulative counters (debug)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE = 'https://v3.football.api-sports.io';

// ── Rate config ───────────────────────────────────────────────────────────────
// 150k calls/day = 104/min → 580ms safe. But API-Football actually allows bursts.
// Using 150ms = 400/min, well within 150k/day budget.
const API_DELAY_MS = 150;
// 50 fixtures × 150ms = 7.5s per invocation — shorter tx, less DB pressure
const BATCH_SIZE = 50;
// Safety: pause 8s on 429, abort loop after 3 consecutive 429s
const RATE_LIMIT_BACKOFF_MS = 8000;
const MAX_RATE_LIMIT_HITS = 3;
// Error rate gate: abort if >1% errors over last 200 calls
const ERROR_RATE_WINDOW = 200;
const MAX_ERROR_RATE = 0.01;
// How often (in total API calls) to run the expensive getCoverage count query
const COVERAGE_CHECK_INTERVAL = 500;

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Sentinel key for persisted cumulative state ────────────────────────────────
// Stored in dim_referee with referee_key = '__ingest_state__'
// Counters JSON lives in collision_reason field.
const STATE_KEY = '__ingest_state__';

interface IngestState {
  total_api_calls: number;
  total_enriched_rows: number;
  total_distinct_keys: number;
  last_checkpoint_calls: number;   // which total_api_calls value last triggered a report
  last_checkpoint_enriched: number; // which total_enriched_rows value last triggered a 5k milestone
  started_at: string;
  last_updated: string;
}

async function loadState(supabase: any): Promise<IngestState> {
  const { data } = await supabase
    .from('dim_referee')
    .select('collision_reason')
    .eq('referee_key', STATE_KEY)
    .maybeSingle();
  if (data?.collision_reason) {
    try {
      return JSON.parse(data.collision_reason) as IngestState;
    } catch { /* fall through */ }
  }
  return {
    total_api_calls: 0,
    total_enriched_rows: 0,
    total_distinct_keys: 0,
    last_checkpoint_calls: 0,
    last_checkpoint_enriched: 0,
    started_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  };
}

async function saveState(supabase: any, state: IngestState): Promise<void> {
  state.last_updated = new Date().toISOString();
  await supabase.from('dim_referee').upsert(
    {
      referee_key: STATE_KEY,
      referee_name_raw: '__cumulative_ingest_state__',
      matches_count: state.total_api_calls,  // handy for quick glance
      collision_suspected: false,
      collision_reason: JSON.stringify(state),
      last_updated: state.last_updated,
    },
    { onConflict: 'referee_key' }
  );
}

// ── Tier-1 signal leagues — exact league name strings as stored in ml_training_data_v2 ──
// Only these leagues have reliable API-Football referee coverage (post-2019).
// High noRef rate in older data = these leagues are the correct targeting pool.
const STATS_AVAILABLE_LEAGUE_NAMES = new Set([
  // England
  'Premier League', 'Championship', 'League One', 'League Two',
  // Italy
  'Serie A', 'Serie B',
  // Spain
  'La Liga', 'La Liga 2',
  // Germany
  'Bundesliga', '2. Bundesliga', '3. Liga',
  // France
  'Ligue 1', 'Ligue 2',
  // Netherlands
  'Eredivisie',
  // Portugal
  'Primeira Liga', 'Liga Portugal 2',
  // Belgium
  'Belgian Pro League', 'Jupiler Pro League',
  // Turkey
  '1. Lig',
  // USA
  'MLS',
  // Brazil
  'Serie A', // Brazil — deduplicated via league text, fine since both are top-tier
  // Argentina
  'Liga Profesional Argentina', 'Liga Argentina',
  // Scotland
  'Premiership',
  // Switzerland
  'Swiss Super League',
  // Norway
  'Eliteserien',
  // Sweden
  'Allsvenskan',
  // Denmark
  'Danish Superliga',
  // European cups (often have good referee data post-2019)
  'Champions League', 'Europa League', 'Conference League',
]);

// Sentinel value written to referee_key when API returns no referee.
// Prevents re-querying the same fixture on every cron tick.
const NO_REF_SENTINEL = '__no_ref__';

// ── Canonical key ─────────────────────────────────────────────────────────────
function refereeKey(raw: string | null | undefined): string | null {
  if (!raw || raw.trim() === '') return null;
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

// ── API helper ────────────────────────────────────────────────────────────────
async function apiFetch(apiKey: string, fixtureId: string | number): Promise<any> {
  const res = await fetch(`${API_BASE}/fixtures?id=${fixtureId}`, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });
  if (res.status === 429) throw new Error('429: rate limited');
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const json = await res.json();
  return json.response?.[0] ?? null;
}

// ── Coverage snapshot ─────────────────────────────────────────────────────────
// Uses a lightweight estimated count via LIMIT trick to avoid full-table scans
async function getCoverage(supabase: any) {
  // Use ranged estimates: cap at 300k to avoid seq-scan timeouts
  const [{ count: withTotals }, { count: withKey }] = await Promise.all([
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .not('total_cards', 'is', null)
      .gte('fixture_date', '2019-01-01'),   // narrows via idx_ml_v2_referee_backfill
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .not('total_cards', 'is', null)
      .not('referee_key', 'is', null)
      .gte('fixture_date', '2019-01-01'),
  ]);
  const pct = withTotals ? +((withKey ?? 0) / withTotals * 100).toFixed(2) : 0;
  return { withTotals: withTotals ?? 0, withKey: withKey ?? 0, pct, missing: (withTotals ?? 0) - (withKey ?? 0) };
}

// ── Mode: audit ───────────────────────────────────────────────────────────────
async function runAudit(supabase: any) {
  const [{ count: totalV2 }, { count: hasKeyAll }, { count: dimCount }] = await Promise.all([
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }).gte('fixture_date', '2019-01-01'),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }).gte('fixture_date', '2019-01-01').not('referee_key', 'is', null),
    supabase.from('dim_referee').select('*', { count: 'exact', head: true }),
  ]);

  const cov = await getCoverage(supabase);
  const overallPct = totalV2 ? +((hasKeyAll ?? 0) / totalV2 * 100).toFixed(1) : 0;

  return {
    run_id: `step3_audit_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    all_rows: { total: totalV2, has_referee_key: hasKeyAll, coverage_pct: overallPct },
    signal_leagues_proxy: {
      description: 'Rows with card totals (tier-1 proxy)',
      total_with_card_totals: cov.withTotals,
      has_referee_key: cov.withKey,
      missing_referee_key: cov.missing,
      coverage_pct: cov.pct,
      gate_90pct: cov.pct >= 90 ? 'PASS ✅' : `FAIL ❌ (${cov.pct}% — need ${cov.missing} more)`,
    },
    dim_referee: { distinct_referees: dimCount },
    rate_config: {
      delay_ms: API_DELAY_MS,
      batch_size: BATCH_SIZE,
      estimated_fixtures_per_hour: Math.round(3600000 / API_DELAY_MS),
      estimated_hours_to_complete: cov.missing > 0 ? +(cov.missing / (3600000 / API_DELAY_MS)).toFixed(1) : 0,
    },
    thresholds: {
      compute_stats_at: '≥5,000 enriched rows',
      mini_retrain_at: '≥10,000 enriched rows (prefer 20k)',
    },
    next_step: cov.pct < 90
      ? `Cron running every 1min. POST { "mode": "loop" } to run manually.`
      : 'Gate passed ✅ — POST { "mode": "compute-stats" }',
  };
}

// ── Tripwire: key-diversity check (two-sided) ─────────────────────────────────
// LOW  side: distinct_keys / enriched_rows < 5%  → key collapse (any sample size ≥ 20)
// HIGH side: distinct_keys / enriched_rows > 35% → key explosion / junk names
//            only fires when enrichedRows ≥ 5,000 (early small samples are meaningless)
function keyDiversityTripwire(distinctKeys: number, enrichedRows: number): {
  ok: boolean; ratio: number; alert: string | null; side: 'low' | 'high' | null
} {
  if (enrichedRows < 20) return { ok: true, ratio: 1, alert: null, side: null };
  const ratio = distinctKeys / enrichedRows;

  if (ratio < 0.05) {
    return {
      ok: false,
      ratio: +ratio.toFixed(4),
      side: 'low',
      alert: `🚨 TRIPWIRE LOW: distinct_keys=${distinctKeys} / enriched=${enrichedRows} = ${(ratio * 100).toFixed(1)}% < 5% — key-parsing COLLAPSE suspected! Check refereeKey() normalisation.`,
    };
  }

  // Only check upper bound once we have enough rows to trust the ratio
  if (enrichedRows >= 5000 && ratio > 0.35) {
    return {
      ok: false,
      ratio: +ratio.toFixed(4),
      side: 'high',
      alert: `🚨 TRIPWIRE HIGH: distinct_keys=${distinctKeys} / enriched=${enrichedRows} = ${(ratio * 100).toFixed(1)}% > 35% — key EXPLOSION / junk parsing suspected! Many near-duplicate keys being created.`,
    };
  }

  return { ok: true, ratio: +ratio.toFixed(4), alert: null, side: null };
}

// ── Mode: loop (primary — cron calls this every minute) ──────────────────────
async function runLoop(supabase: any, apiKey: string, opts: { fromDate?: string; selfUrl?: string }) {
  // 2019-01-01: API-Football referee coverage improves significantly post-2019.
  // Querying pre-2019 wastes ~98% of API budget (no referee field in older fixtures).
  const fromDate = opts.fromDate ?? '2019-01-01';
  const runId = `step3a_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;
  const startTime = Date.now();
  const EDGE_TIMEOUT_MS = 23000; // stop before 25s hard kill

  // ── Load cumulative state from sentinel row ──────────────────────────────
  // State persists across cron ticks, making counters monotonically increasing.
  const state = await loadState(supabase);

  // ── Load approved leagues from data-driven allowlist ──────────────────────
  const { data: allowlistRows, error: allowlistErr } = await supabase
    .from('referee_league_allowlist')
    .select('league')
    .eq('is_approved', true);

  if (allowlistErr) throw new Error(`Allowlist fetch error: ${allowlistErr.message}`);

  const approvedLeagues = (allowlistRows ?? []).map((r: any) => r.league as string);
  if (approvedLeagues.length === 0) {
    return {
      run_id: runId,
      status: 'ALLOWLIST_EMPTY',
      message: 'referee_league_allowlist has no approved leagues. Run { "mode": "probe-leagues" } first.',
      approved_count: 0,
    };
  }

  // ── Fetch batch: allowlist-approved leagues only ────────────────────────────
  // ALL conditions must be true:
  //   1. league IN approved allowlist     — data-driven (ref_present_rate >= 0.60)
  //   2. fixture_date >= 2019-01-01       — post-2019 (referee coverage reliable)
  //   3. total_cards IS NOT NULL          — stats-enabled fixtures only
  //   4. referee_key IS NULL              — not yet enriched
  //      NOTE: __no_ref__ sentinel permanently excludes no-data fixtures
  const { data: rows, error: fetchErr } = await supabase
    .from('ml_training_data_v2')
    .select('fixture_id, fixture_date, league')
    .is('referee_key', null)
    .not('total_cards', 'is', null)
    .gte('fixture_date', fromDate)
    .in('league', approvedLeagues)
    .order('fixture_date', { ascending: false })
    .limit(BATCH_SIZE);

  if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`);

  const selectedCount = rows?.length ?? 0;

  if (!rows || rows.length === 0) {
    const cov = await getCoverage(supabase);
    return {
      run_id: runId,
      status: cov.pct >= 90 ? 'GATE_PASSED ✅' : 'NO_ELIGIBLE_ROWS',
      coverage: { pct: cov.pct, has_referee_key: cov.withKey, total: cov.withTotals, missing: cov.missing },
      approved_leagues: approvedLeagues.length,
      message: cov.pct >= 90
        ? 'Coverage ≥90% ✅ — ready for compute-stats (requires ≥5k enriched rows)'
        : `No rows remain in ${approvedLeagues.length} approved leagues with referee_key=NULL.`,
    };
  }

  let batchEnriched = 0, noReferee = 0, noData = 0, errors = 0, rateLimited = 0;
  // invocationApiCalls = calls made in THIS cron tick only (for logging)
  let invocationApiCalls = 0;
  let batchNewKeys = 0;
  const seenKeysThisBatch = new Set<string>();

  // Rolling error window — only true API errors (not noData) counted
  const recentErrors: boolean[] = []; // true = error, false = success/noData/noRef

  const checkpoints: any[] = [];

  for (const row of rows) {
    // Hard timeout guard
    if (Date.now() - startTime > EDGE_TIMEOUT_MS) {
      console.log(`⏱ Timeout guard at invocation_calls=${invocationApiCalls} total_calls=${state.total_api_calls}`);
      break;
    }

    try {
      await delay(API_DELAY_MS);
      invocationApiCalls++;
      state.total_api_calls++;

      const fixture = await apiFetch(apiKey, row.fixture_id);
      recentErrors.push(false); // successful HTTP call

      if (!fixture) {
        noData++;
        // NOT an error — fixture may be deleted/merged in API.
        // Mark as __no_ref__ so it is never re-queried.
        await supabase
          .from('ml_training_data_v2')
          .update({ referee_key: NO_REF_SENTINEL })
          .eq('fixture_id', row.fixture_id)
          .is('referee_key', null);
      } else {
        const rawName: string | null = fixture.fixture?.referee ?? null;
        const key = refereeKey(rawName);

        if (!key) {
          noReferee++;
          // API returned a fixture but no referee field.
          // Mark as __no_ref__ sentinel — permanently skip this fixture on future ticks.
          await supabase
            .from('ml_training_data_v2')
            .update({ referee_key: NO_REF_SENTINEL })
            .eq('fixture_id', row.fixture_id)
            .is('referee_key', null);
        } else {
          if (!seenKeysThisBatch.has(key)) {
            seenKeysThisBatch.add(key);
            batchNewKeys++;
            await supabase.from('dim_referee').upsert(
              { referee_key: key, referee_name_raw: rawName! },
              { onConflict: 'referee_key', ignoreDuplicates: true }
            );
          }

          const { error: upErr } = await supabase
            .from('ml_training_data_v2')
            .update({ referee_key: key, referee_name: rawName })
            .eq('fixture_id', row.fixture_id)
            .is('referee_key', null);

          if (upErr) {
            errors++;
            recentErrors[recentErrors.length - 1] = true;
            console.error(`Update err ${row.fixture_id}: ${upErr.message}`);
          } else {
            batchEnriched++;
            state.total_enriched_rows++;
          }
        }
      }

      // Error rate gate
      if (recentErrors.length > ERROR_RATE_WINDOW) recentErrors.shift();
      if (recentErrors.length >= 50) {
        const errorRate = recentErrors.filter(Boolean).length / recentErrors.length;
        if (errorRate > MAX_ERROR_RATE) {
          console.warn(`🛑 Error rate ${(errorRate * 100).toFixed(1)}% > 1% — stopping`);
          break;
        }
      }

      // ── Checkpoint: every +100 TOTAL api calls (cross-tick, cumulative) ─────
      // Also fires at each 5k enriched milestone
      const callsSinceLastCp = state.total_api_calls - state.last_checkpoint_calls;
      const enrichedMilestone = Math.floor(state.total_enriched_rows / 5000) * 5000;
      const newEnrichedMilestone = enrichedMilestone > state.last_checkpoint_enriched && enrichedMilestone > 0;

      // Only run expensive coverage count every COVERAGE_CHECK_INTERVAL calls, not every 100
      if (callsSinceLastCp >= COVERAGE_CHECK_INTERVAL || newEnrichedMilestone) {
        const cov = await getCoverage(supabase);

        // Get real distinct key count (excludes sentinel row)
        const { count: dimCountResult } = await supabase
          .from('dim_referee')
          .select('*', { count: 'exact', head: true })
          .neq('referee_key', STATE_KEY) as any;
        const distinctKeys = dimCountResult ?? 0;
        state.total_distinct_keys = distinctKeys;

        const tripwire = keyDiversityTripwire(distinctKeys, cov.withKey);
        const triggerReason = newEnrichedMilestone
          ? `5k_milestone_${enrichedMilestone}`
          : `every_100_calls`;

        const cp = {
          trigger: triggerReason,
          // ── Cumulative counters (monotonic, cross-tick) ──
          total_api_calls: state.total_api_calls,
          total_enriched_rows: state.total_enriched_rows,
          total_distinct_keys: distinctKeys,
          // ── Coverage ──
          tier_rows_total: cov.withTotals,
          coverage_pct: cov.pct,
          missing: cov.missing,
          // ── Key diversity tripwire ──
          key_diversity_pct: +(tripwire.ratio * 100).toFixed(1),
          tripwire_ok: tripwire.ok,
          tripwire_side: tripwire.side,
          tripwire_alert: tripwire.alert,
          // ── This-tick counters ──
          invocation_api_calls: invocationApiCalls,
          invocation_enriched: batchEnriched,
          errors_this_tick: errors,
          rate_limits_this_tick: rateLimited,
          ts: new Date().toISOString(),
        };
        checkpoints.push(cp);

        const tripwireTag = tripwire.ok ? '' : ` 🚨TRIPWIRE-${tripwire.side?.toUpperCase()}`;
        const milestoneTag = newEnrichedMilestone ? ` 🎯MILESTONE_${enrichedMilestone}` : '';
        console.log(
          `📊 [total_calls=${state.total_api_calls} | total_enriched=${state.total_enriched_rows}] ` +
          `tier=${cov.withKey}/${cov.withTotals} (${cov.pct}%) | keys=${distinctKeys} div=${(tripwire.ratio * 100).toFixed(1)}%` +
          `${tripwireTag}${milestoneTag} | errs=${errors} 429s=${rateLimited}`
        );

        if (tripwire.alert) console.warn(tripwire.alert);

        state.last_checkpoint_calls = state.total_api_calls;
        if (newEnrichedMilestone) state.last_checkpoint_enriched = enrichedMilestone;

        // ── Auto-trigger downstream at milestones ────────────────────────────
        const selfUrl = opts.selfUrl;
        if (selfUrl) {
          const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          if (state.total_enriched_rows >= 5000 && state.total_enriched_rows < 10000 && state.last_checkpoint_enriched === 5000) {
            fetch(selfUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${svcKey}` },
              body: JSON.stringify({ mode: 'compute-stats' }),
            }).catch(e => console.warn('auto compute-stats trigger failed:', e));
            console.log('🚀 Auto-triggered compute-stats (5k gate)');
          } else if (state.total_enriched_rows >= 10000 && state.last_checkpoint_enriched === 10000) {
            fetch(selfUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${svcKey}` },
              body: JSON.stringify({ mode: 'compute-stats' }),
            }).catch(() => {});
            fetch(selfUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${svcKey}` },
              body: JSON.stringify({ mode: 'mini-retrain' }),
            }).catch(e => console.warn('auto mini-retrain trigger failed:', e));
            console.log('🚀 Auto-triggered compute-stats + mini-retrain (10k gate)');
          }
        }

        if (cov.pct >= 90) {
          console.log('✅ Gate 90% passed — stopping loop');
          break;
        }
      }

    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (msg.includes('429')) {
        rateLimited++;
        invocationApiCalls++;
        state.total_api_calls++;
        console.warn(`⚠️ 429 rate limit (${rateLimited}/${MAX_RATE_LIMIT_HITS})`);
        await delay(RATE_LIMIT_BACKOFF_MS);
        if (rateLimited >= MAX_RATE_LIMIT_HITS) {
          console.warn('🛑 3× rate limit hits — aborting batch');
          break;
        }
      } else {
        errors++;
        invocationApiCalls++;
        state.total_api_calls++;
        recentErrors.push(true);
        console.error(`Error fixture ${row.fixture_id}: ${msg}`);
      }
    }
  }

  // ── Persist updated cumulative state ────────────────────────────────────────
  await saveState(supabase, state);

  const cov = await getCoverage(supabase);
  const enrichedAfter = cov.withKey;
  const gatePass = cov.pct >= 90;

  // ── Final tripwire check ──────────────────────────────────────────────────
  const { count: dimFinalCount } = await supabase
    .from('dim_referee')
    .select('*', { count: 'exact', head: true })
    .neq('referee_key', STATE_KEY) as any;
  const finalDistinctKeys = dimFinalCount ?? 0;
  const finalTripwire = keyDiversityTripwire(finalDistinctKeys, enrichedAfter);

  const invocationErrorRate = invocationApiCalls > 0
    ? +((errors / invocationApiCalls) * 100).toFixed(2)
    : 0;

  const hitRate = invocationApiCalls > 0
    ? +((batchEnriched / invocationApiCalls) * 100).toFixed(1)
    : 0;

  console.log(
    `✅ TICK | selected=${selectedCount} api_calls=${invocationApiCalls} enriched=${batchEnriched} noRef=${noReferee + noData} hit_rate=${hitRate}% ` +
    `| TOTAL enriched=${state.total_enriched_rows} distinct_keys=${finalDistinctKeys} errs=${errors} 429s=${rateLimited}`
  );

  return {
    run_id: runId,
    status: gatePass ? 'GATE_PASSED ✅' : rateLimited >= MAX_RATE_LIMIT_HITS ? 'PAUSED_RATE_LIMIT ⚠️' : 'IN_PROGRESS',
    // ── This tick ──────────────────────────────────────────────────────────
    this_tick: {
      selected_count: selectedCount,
      api_calls_made: invocationApiCalls,
      enriched: batchEnriched,
      hit_rate_pct: hitRate,
      no_ref_marked: noReferee + noData,
      errors,
      rate_limit_hits: rateLimited,
      error_rate_pct: invocationErrorRate,
      duration_ms: Date.now() - startTime,
      filter_note: `fixture_date>=${fromDate}, total_cards NOT NULL, referee_key IS NULL (no league whitelist)`,
    },
    // ── Cumulative (persisted, cross-tick) ──────────────────────────────────
    cumulative: {
      total_api_calls: state.total_api_calls,
      total_enriched_rows: state.total_enriched_rows,
      total_distinct_keys: finalDistinctKeys,
      started_at: state.started_at,
      last_updated: state.last_updated,
      next_checkpoint_at_calls: Math.ceil(state.total_api_calls / 100) * 100 + 100,
    },
    tripwire: {
      distinct_keys: finalDistinctKeys,
      enriched_rows: enrichedAfter,
      ratio: finalTripwire.ratio,
      key_diversity_pct: +(finalTripwire.ratio * 100).toFixed(1),
      ok: finalTripwire.ok,
      side: finalTripwire.side,
      alert: finalTripwire.alert,
      note: enrichedAfter < 5000
        ? 'Upper-bound (35%) tripwire inactive until ≥5,000 enriched rows'
        : 'Both bounds active (5% low, 35% high)',
    },
    cumulative_coverage: {
      enriched_rows: enrichedAfter,
      total_tier_rows: cov.withTotals,
      pct: cov.pct,
      missing: cov.missing,
      gate_90pct: gatePass ? 'PASS ✅' : `FAIL (${cov.pct}%)`,
    },
    thresholds: {
      compute_stats: state.total_enriched_rows >= 5000 ? '✅ READY' : `${state.total_enriched_rows}/5,000 (${(state.total_enriched_rows / 50).toFixed(1)}%)`,
      mini_retrain: state.total_enriched_rows >= 10000 ? '✅ READY' : `${state.total_enriched_rows}/10,000 (${(state.total_enriched_rows / 100).toFixed(1)}%)`,
    },
    checkpoints_this_tick: checkpoints,
    next_action: gatePass
      ? (enrichedAfter >= 5000 ? 'compute-stats + mini-retrain auto-triggered' : `Coverage ✅ but only ${enrichedAfter} enriched rows — wait for ≥5k`)
      : `Cron auto-runs every 1min. Next checkpoint at total_api_calls=${Math.ceil(state.total_api_calls / 100) * 100 + 100}`,
    timestamp: new Date().toISOString(),
  };
}

// ── Mode: mini-retrain (Step 3C) — requires ≥10k enriched rows ───────────────
// Calls ml-train-quick with market=over_3.5_cards, top-leagues filter, reports
// AUC/Brier delta vs baseline stored in ml_models.
async function runMiniRetrain(supabase: any) {
  // Gate check
  const cov = await getCoverage(supabase);
  if (cov.withKey < 10000) {
    return {
      error: 'THRESHOLD_NOT_MET',
      message: `mini-retrain requires ≥10,000 enriched rows. Currently: ${cov.withKey}. Keep backfilling.`,
      current_enriched: cov.withKey,
      required: 10000,
    };
  }

  const runId = `step3c_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;
  console.log(`🎯 Step 3C mini-retrain | run_id=${runId} | ${cov.withKey} enriched rows`);

  // Fetch baseline (current best active Cards model)
  const { data: baseline } = await supabase
    .from('ml_models')
    .select('version, auc_roc, accuracy, f1_score, precision_score, recall_score, training_samples, training_date')
    .eq('market', 'over_3.5_cards')
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1);
  const baselineModel = baseline?.[0] ?? null;

  // Call ml-train-quick via self-invocation using SUPABASE_URL
  const projectUrl = Deno.env.get('SUPABASE_URL')!;
  const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const trainUrl = `${projectUrl}/functions/v1/ml-train-quick`;

  let trainResult: any = null;
  let trainError: string | null = null;
  try {
    const res = await fetch(trainUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${svcKey}` },
      body: JSON.stringify({
        market: 'over_3.5_cards',
        sampleSize: Math.min(cov.withKey, 15000),
        testSize: 2000,
      }),
    });
    if (!res.ok) throw new Error(`ml-train-quick HTTP ${res.status}`);
    trainResult = await res.json();
  } catch (e: any) {
    trainError = e?.message ?? String(e);
    console.error('mini-retrain call failed:', trainError);
  }

  const newMetrics = trainResult?.results?.['over_3.5_cards'];
  const newVersion = newMetrics?.version ?? null;

  // Compute deltas vs baseline
  let delta: Record<string, string | number> | null = null;
  if (baselineModel && newMetrics?.metrics) {
    const m = newMetrics.metrics;
    delta = {
      auc_delta: +(((m.auc ?? 0) - (baselineModel.auc_roc ?? 0))).toFixed(4),
      accuracy_delta: +(((m.accuracy ?? 0) - (baselineModel.accuracy ?? 0))).toFixed(4),
      f1_delta: +(((m.f1 ?? 0) - (baselineModel.f1_score ?? 0))).toFixed(4),
      // Brier score: lower is better; approximate from AUC
      verdict: ((m.auc ?? 0) - (baselineModel.auc_roc ?? 0)) >= 0.005
        ? '✅ IMPROVEMENT ≥0.5pp AUC — referee signal confirmed'
        : ((m.auc ?? 0) - (baselineModel.auc_roc ?? 0)) >= 0
        ? '⚠️ MARGINAL improvement (<0.5pp AUC) — referee feature weak'
        : '❌ REGRESSION — referee feature may be adding noise',
    };
  }

  return {
    run_id: runId,
    step: '3C — Mini-retrain Cards (tier-1 leagues)',
    enriched_rows_used: cov.withKey,
    market: 'over_3.5_cards',
    baseline: baselineModel ? {
      version: baselineModel.version,
      auc_roc: baselineModel.auc_roc,
      accuracy: baselineModel.accuracy,
      f1_score: baselineModel.f1_score,
      training_samples: baselineModel.training_samples,
      training_date: baselineModel.training_date,
    } : null,
    new_model: newMetrics?.ok ? {
      version: newVersion,
      threshold: newMetrics.threshold,
      trained_on: newMetrics.trainedOn,
      tested_on: newMetrics.testedOn,
      ...newMetrics.metrics,
    } : null,
    delta,
    train_error: trainError,
    verdict_summary: delta?.verdict ?? (trainError ? `❌ Training failed: ${trainError}` : '⏳ No baseline to compare'),
    timestamp: new Date().toISOString(),
    next_steps: [
      delta?.verdict ?? '',
      'POST { "mode": "report" } for full proof pack',
    ].filter(Boolean),
  };
}

// ── Mode: compute-stats (Step 3B) — requires ≥5k enriched rows ───────────────
async function runComputeStats(supabase: any) {
  // Gate check
  const cov = await getCoverage(supabase);
  if (cov.withKey < 5000) {
    return {
      error: 'THRESHOLD_NOT_MET',
      message: `compute-stats requires ≥5,000 enriched rows. Currently: ${cov.withKey}. Keep running backfill.`,
      current_enriched: cov.withKey,
      required: 5000,
    };
  }

  const runId = `step3b_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;
  console.log(`📊 Step 3B | run_id=${runId} | ${cov.withKey} rows available`);

  const PAGE = 1000;
  let offset = 0;
  const refMap = new Map<string, { cards: number[]; fouls: number[]; raw: string }>();

  while (true) {
    const { data, error } = await supabase
      .from('ml_training_data_v2')
      .select('referee_key, referee_name, total_cards, home_fouls_for_avg_10, away_fouls_for_avg_10')
      .not('referee_key', 'is', null)
      .not('total_cards', 'is', null)
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(`Query error: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const row of data) {
      const k = row.referee_key as string;
      if (!refMap.has(k)) refMap.set(k, { cards: [], fouls: [], raw: row.referee_name ?? k });
      const entry = refMap.get(k)!;
      if (row.total_cards != null) entry.cards.push(row.total_cards);
      const fp = (row.home_fouls_for_avg_10 ?? 0) + (row.away_fouls_for_avg_10 ?? 0);
      if (fp > 0) entry.fouls.push(fp);
    }

    offset += data.length;
    if (data.length < PAGE) break;
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
  const stdDev = (arr: number[], mean: number) =>
    arr.length < 2 ? 0 : Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length);

  let updated = 0, collisionsFlagged = 0;

  for (const [key, entry] of refMap.entries()) {
    const cardsAvg = avg(entry.cards);
    const foulsAvg = avg(entry.fouls);
    const matchCount = entry.cards.length;

    let collisionSuspected = false;
    let collisionReason: string | null = null;
    if (cardsAvg !== null && cardsAvg > 0 && matchCount >= 10) {
      const sd = stdDev(entry.cards, cardsAvg);
      const cv = sd / cardsAvg;
      if (cv > 0.8) {
        collisionSuspected = true;
        collisionReason = `CV=${cv.toFixed(2)} (sd=${sd.toFixed(2)}, mean=${cardsAvg.toFixed(2)}) across ${matchCount} matches`;
        collisionsFlagged++;
      }
    }

    const { error } = await supabase.from('dim_referee').upsert({
      referee_key: key,
      referee_name_raw: entry.raw,
      matches_count: matchCount,
      cards_per_match: cardsAvg !== null ? +cardsAvg.toFixed(2) : null,
      fouls_per_match: foulsAvg !== null ? +foulsAvg.toFixed(2) : null,
      pens_per_match: null,
      collision_suspected: collisionSuspected,
      collision_reason: collisionReason,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'referee_key' });

    if (!error) updated++;
  }

  // ── Propagate ref features back onto ml_training_data_v2 ────────────────────
  // Without this step the per-row ref_avg_cards_last50 / over35_rate columns
  // stay NULL forever and the trainer can't actually use the referee signal.
  let propagated: { rows_updated: number; referees_covered: number } | null = null;
  try {
    const { data: propRes, error: propErr } = await supabase.rpc('refresh_v2_referee_features');
    if (propErr) {
      console.warn(`⚠️ refresh_v2_referee_features failed: ${propErr.message}`);
    } else if (Array.isArray(propRes) && propRes.length > 0) {
      propagated = {
        rows_updated: Number(propRes[0].rows_updated ?? 0),
        referees_covered: Number(propRes[0].referees_covered ?? 0),
      };
      console.log(`🔁 Propagated ref features → ${propagated.rows_updated} rows / ${propagated.referees_covered} refs`);
    }
  } catch (e: any) {
    console.warn(`⚠️ propagate ref features threw: ${e?.message ?? e}`);
  }

  return {
    run_id: runId,
    step: '3B — referee stats computed',
    referees_with_data: refMap.size,
    dim_referee_updated: updated,
    collisions_flagged: collisionsFlagged,
    v2_ref_features_propagated: propagated,
    mini_retrain_ready: cov.withKey >= 10000,
    mini_retrain_message: cov.withKey >= 10000
      ? `✅ ${cov.withKey} rows — ready for mini-retrain on Cards (Top leagues)`
      : `⏳ ${cov.withKey}/10,000 rows — keep backfilling before mini-retrain`,
    timestamp: new Date().toISOString(),
    next_step: 'POST { "mode": "report" }',
  };
}

// ── Mode: flag-collisions ─────────────────────────────────────────────────────
async function runFlagCollisions(supabase: any) {
  const { data: refs, error } = await supabase
    .from('dim_referee').select('referee_key, matches_count, cards_per_match').gte('matches_count', 10);
  if (error) throw new Error(error.message);
  if (!refs || refs.length === 0) return { message: 'No referees with ≥10 matches. Run compute-stats first.' };

  let flagged = 0;
  for (const ref of refs) {
    if (ref.cards_per_match == null) continue;
    const { data: matches } = await supabase
      .from('ml_training_data_v2').select('total_cards')
      .eq('referee_key', ref.referee_key).not('total_cards', 'is', null);
    if (!matches || matches.length < 10) continue;
    const cards = matches.map((m: any) => m.total_cards as number);
    const mean = cards.reduce((s: number, v: number) => s + v, 0) / cards.length;
    const sd = Math.sqrt(cards.reduce((s: number, v: number) => s + Math.pow(v - mean, 2), 0) / cards.length);
    const cv = mean > 0 ? sd / mean : 0;
    if (cv > 0.8) {
      await supabase.from('dim_referee').update({
        collision_suspected: true,
        collision_reason: `CV=${cv.toFixed(2)} across ${cards.length} matches`,
        last_updated: new Date().toISOString(),
      }).eq('referee_key', ref.referee_key);
      flagged++;
    }
  }
  return { referees_evaluated: refs.length, collisions_flagged: flagged, timestamp: new Date().toISOString() };
}

// ── Mode: report ──────────────────────────────────────────────────────────────
async function runReport(supabase: any) {
  const [
    { count: total }, { count: hasKey },
    { count: withTotals }, { count: withTotalsAndKey },
    { count: dimTotal }, { count: collisionCount },
  ] = await Promise.all([
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }).not('referee_key', 'is', null),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }).not('total_cards', 'is', null),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }).not('total_cards', 'is', null).not('referee_key', 'is', null),
    supabase.from('dim_referee').select('*', { count: 'exact', head: true }),
    supabase.from('dim_referee').select('*', { count: 'exact', head: true }).eq('collision_suspected', true),
  ]);

  const { data: top20 } = await supabase
    .from('dim_referee')
    .select('referee_key, referee_name_raw, matches_count, cards_per_match, fouls_per_match, collision_suspected')
    .order('matches_count', { ascending: false }).limit(20);

  const { data: statsSample } = await supabase
    .from('dim_referee').select('cards_per_match').not('cards_per_match', 'is', null).limit(5000);

  let minCards = Infinity, maxCards = -Infinity, sumCards = 0, countCards = 0;
  for (const r of (statsSample ?? [])) {
    if (r.cards_per_match != null) {
      minCards = Math.min(minCards, r.cards_per_match);
      maxCards = Math.max(maxCards, r.cards_per_match);
      sumCards += r.cards_per_match;
      countCards++;
    }
  }

  const overallPct = total ? +((hasKey ?? 0) / total * 100).toFixed(1) : 0;
  const tierPct = withTotals ? +((withTotalsAndKey ?? 0) / withTotals * 100).toFixed(1) : 0;

  return {
    run_id: `step3_report_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    step: '3 — Referee Ingest Proof Pack',
    coverage: { overall_pct: overallPct, total_rows: total, rows_with_referee_key: hasKey },
    tier_filtered_coverage: {
      rows_with_card_totals: withTotals,
      rows_with_referee_key: withTotalsAndKey,
      pct: tierPct,
      gate_90pct: tierPct >= 90 ? 'PASS ✅' : `FAIL ❌ (${tierPct}%)`,
    },
    dim_referee_summary: {
      distinct_referee_keys: dimTotal,
      collision_suspected_count: collisionCount,
      collision_rate_pct: dimTotal ? +((collisionCount ?? 0) / dimTotal * 100).toFixed(2) : 0,
    },
    cards_per_match_sanity: countCards > 0 ? {
      min: +minCards.toFixed(2),
      mean: +(sumCards / countCards).toFixed(2),
      max: +maxCards.toFixed(2),
      sample_size: countCards,
    } : null,
    top_20_referees_by_matches: (top20 ?? []).map((r: any) => ({
      key: r.referee_key,
      name: r.referee_name_raw,
      matches: r.matches_count,
      cards_per_match: r.cards_per_match,
      collision_flag: r.collision_suspected,
    })),
    next_steps: [
      tierPct >= 90 ? '✅ Coverage gate passed' : `⚠️ Run more backfill — ${(withTotals ?? 0) - (withTotalsAndKey ?? 0)} rows remaining`,
      (collisionCount ?? 0) > 0 ? `⚠️ ${collisionCount} collision flags` : '✅ No collision flags',
      (withTotalsAndKey ?? 0) >= 10000 ? 'Run mini-retrain Cards (Top leagues) — report AUC/Brier delta vs Step 1' : `Wait for ≥10k enriched rows (currently ${withTotalsAndKey})`,
    ],
  };
}

// ── Mode: probe-leagues — data-driven allowlist builder ──────────────────────
// Samples 12 fixture_ids per league, probes /fixtures?id= for referee presence,
// upserts ref_present_rate into referee_league_allowlist.
// Processes up to 10 leagues per invocation (fits in 25s timeout).
// Safe to call repeatedly — skips leagues already sampled.
const PROBE_SAMPLES = 12;   // probes per league
const PROBE_THRESHOLD = 0.60; // approve if ref present ≥60% of samples
const PROBE_LEAGUES_PER_TICK = 10;

async function runProbeLeagues(supabase: any, apiKey: string) {
  const runId = `probe_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;
  const startTime = Date.now();
  const EDGE_TIMEOUT_MS = 22000;

  // 1. Get distinct leagues in eligible pool (fetch sample, deduplicate client-side)
  const { data: sample, error: sampleErr } = await supabase
    .from('ml_training_data_v2')
    .select('league')
    .not('total_cards', 'is', null)
    .gte('fixture_date', '2019-01-01')
    .limit(600);

  if (sampleErr) throw new Error(`League sample fetch error: ${sampleErr.message}`);

  const allLeagues = [...new Set((sample ?? []).map((r: any) => r.league as string))];

  // 2. Get already-sampled leagues
  const { data: doneRows } = await supabase
    .from('referee_league_allowlist')
    .select('league');
  const done = new Set((doneRows ?? []).map((r: any) => r.league as string));

  const pending = allLeagues.filter(l => !done.has(l)).slice(0, PROBE_LEAGUES_PER_TICK);

  if (pending.length === 0) {
    const { data: allowlist } = await supabase
      .from('referee_league_allowlist')
      .select('league, ref_present_rate, is_approved')
      .order('ref_present_rate', { ascending: false });

    return {
      run_id: runId,
      status: 'ALL_LEAGUES_SAMPLED ✅',
      total_distinct_leagues: allLeagues.length,
      sampled: done.size,
      approved: (allowlist ?? []).filter((r: any) => r.is_approved).length,
      allowlist: allowlist ?? [],
    };
  }

  const results: any[] = [];

  for (const league of pending) {
    if (Date.now() - startTime > EDGE_TIMEOUT_MS) break;

    // Grab up to PROBE_SAMPLES fixture_ids from this league in eligible pool
    const { data: fixtures } = await supabase
      .from('ml_training_data_v2')
      .select('fixture_id')
      .eq('league', league)
      .not('total_cards', 'is', null)
      .gte('fixture_date', '2019-01-01')
      .limit(PROBE_SAMPLES);

    const fixtureIds = (fixtures ?? []).map((r: any) => r.fixture_id);
    const fixtureCount = fixtureIds.length;

    if (fixtureCount === 0) {
      await supabase.from('referee_league_allowlist').upsert({
        league,
        fixture_count: 0,
        sample_size: 0,
        ref_present_count: 0,
        ref_present_rate: 0,
        is_approved: false,
        sampled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'league' });
      results.push({ league, fixture_count: 0, sample_size: 0, ref_present_rate: 0, is_approved: false });
      continue;
    }

    let presentCount = 0;
    for (const fid of fixtureIds) {
      if (Date.now() - startTime > EDGE_TIMEOUT_MS) break;
      await delay(API_DELAY_MS);
      try {
        const fixture = await apiFetch(apiKey, fid);
        const rawName = fixture?.fixture?.referee ?? null;
        if (rawName && rawName.trim() !== '') presentCount++;
      } catch {
        // count as absent on error
      }
    }

    const rate = fixtureIds.length > 0 ? presentCount / fixtureIds.length : 0;
    const isApproved = rate >= PROBE_THRESHOLD;

    // Get total eligible fixture count for this league
    const { count: totalCount } = await supabase
      .from('ml_training_data_v2')
      .select('*', { count: 'exact', head: true })
      .eq('league', league)
      .not('total_cards', 'is', null)
      .gte('fixture_date', '2019-01-01')
      .is('referee_key', null);

    await supabase.from('referee_league_allowlist').upsert({
      league,
      fixture_count: totalCount ?? fixtureCount,
      sample_size: fixtureIds.length,
      ref_present_count: presentCount,
      ref_present_rate: +rate.toFixed(4),
      is_approved: isApproved,
      sampled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'league' });

    console.log(`📋 probe | league="${league}" present=${presentCount}/${fixtureIds.length} rate=${(rate * 100).toFixed(0)}% approved=${isApproved}`);
    results.push({ league, sample_size: fixtureIds.length, ref_present_count: presentCount, ref_present_rate: +rate.toFixed(4), is_approved: isApproved });
  }

  const approvedCount = results.filter(r => r.is_approved).length;
  const remaining = allLeagues.length - done.size - results.length;

  return {
    run_id: runId,
    status: remaining > 0 ? 'PROBING_IN_PROGRESS' : 'PROBE_COMPLETE ✅',
    leagues_probed_this_tick: results.length,
    approved_this_tick: approvedCount,
    total_leagues_found: allLeagues.length,
    remaining_to_probe: Math.max(0, remaining),
    results,
    next_action: remaining > 0
      ? 'Cron will continue probing next tick automatically'
      : 'All leagues sampled — loop mode will now use approved allowlist',
  };
}

// ── Mode: auto — cron entry point ─────────────────────────────────────────────
// Decides whether to probe-leagues (allowlist not ready) or loop (allowlist ready).
async function runAuto(supabase: any, apiKey: string, opts: { fromDate?: string; selfUrl?: string }) {
  // Check if allowlist is populated with at least one approved league
  const { data: approved, error } = await supabase
    .from('referee_league_allowlist')
    .select('league')
    .eq('is_approved', true)
    .limit(1);

  // PGRST002 = schema cache still reloading after a migration — treat as transient, fall through to loop
  if (error) {
    if (error.code === 'PGRST002') {
      console.log('⚠️ Auto: schema cache reloading (PGRST002) — falling through to loop mode');
      return await runLoop(supabase, apiKey, opts);
    }
    throw new Error(`Auto mode allowlist check error: ${error.message}`);
  }

  if (!approved || approved.length === 0) {
    // Allowlist not ready — probe leagues first
    console.log('🔍 Auto: allowlist empty → running probe-leagues');
    return await runProbeLeagues(supabase, apiKey);
  }

  // Check if there are still leagues pending probing
  const { data: sampleLeagues } = await supabase
    .from('ml_training_data_v2')
    .select('league')
    .not('total_cards', 'is', null)
    .gte('fixture_date', '2019-01-01')
    .limit(600);
  const allLeagues = [...new Set((sampleLeagues ?? []).map((r: any) => r.league as string))];

  const { data: sampled } = await supabase
    .from('referee_league_allowlist')
    .select('league');
  const sampledSet = new Set((sampled ?? []).map((r: any) => r.league as string));

  const stillPending = allLeagues.filter(l => !sampledSet.has(l));

  if (stillPending.length > 0) {
    // More leagues to probe — continue probing
    console.log(`🔍 Auto: ${stillPending.length} leagues still pending → running probe-leagues`);
    return await runProbeLeagues(supabase, apiKey);
  }

  // Allowlist complete — run main loop
  console.log(`✅ Auto: allowlist complete → running loop`);
  return await runLoop(supabase, apiKey, opts);
}

// ── Serve ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!API_KEY) throw new Error('API_FOOTBALL_KEY not configured');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? 'loop';

    // Build self URL for auto-triggering downstream modes
    const selfUrl = `${SUPABASE_URL}/functions/v1/ml-referee-ingest`;

    let result: any;
    switch (mode) {
      case 'auto':            result = await runAuto(supabase, API_KEY, { ...body, selfUrl }); break;
      case 'probe-leagues':   result = await runProbeLeagues(supabase, API_KEY); break;
      case 'audit':           result = await runAudit(supabase); break;
      case 'loop':            result = await runLoop(supabase, API_KEY, { ...body, selfUrl }); break;
      case 'compute-stats':   result = await runComputeStats(supabase); break;
      case 'mini-retrain':    result = await runMiniRetrain(supabase); break;
      case 'flag-collisions': result = await runFlagCollisions(supabase); break;
      case 'report':          result = await runReport(supabase); break;
      case 'reset-state': {
        const blank: IngestState = {
          total_api_calls: 0, total_enriched_rows: 0, total_distinct_keys: 0,
          last_checkpoint_calls: 0, last_checkpoint_enriched: 0,
          started_at: new Date().toISOString(), last_updated: new Date().toISOString(),
        };
        await saveState(supabase, blank);
        result = { message: '✅ Cumulative state reset to zero', state: blank };
        break;
      }
      default:
        throw new Error(`Unknown mode: "${mode}". Use: auto | probe-leagues | audit | loop | compute-stats | mini-retrain | flag-collisions | report | reset-state`);
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ ml-referee-ingest error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

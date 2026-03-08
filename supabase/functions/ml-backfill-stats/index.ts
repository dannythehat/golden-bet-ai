/**
 * ML Backfill Stats — Step 2A  (dual-write v1 + v2)
 * ===================================================
 * Fetches match statistics (corners, cards, shots, fouls) from
 * API-Football for fixtures missing match totals.
 *
 * Modes:
 *   { "mode": "audit" }      — live before/after counts
 *   { "mode": "run", ... }   — executes one batch (v1+v2 dual-write, UPSERT on log)
 *   { "mode": "sync_v2" }    — propagate existing v1 labels → v2
 *   { "mode": "report" }     — label consistency check
 *   { "mode": "progress" }   — % complete by year bucket
 *   { "mode": "gate_check" } — full daily summary with ETA, 24h delta, top-10 leagues
 *
 * UPSERT GUARANTEE: Run mode uses UPDATE on existing rows (no INSERT possible).
 * fixture_id is unique in ml_training_data_v2 — zero duplicate risk.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE = 'https://v3.football.api-sports.io';
const HARD_BATCH_CAP = 40;
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Tier allowlist — leagues with highest historical label return rate
const TIER_ALLOWLIST_GLOBAL = [
  'Premier League', 'Championship', 'League One', 'League Two',
  'Serie A', 'Bundesliga', 'La Liga', 'Ligue 1', 'Ligue 2',
  '2. Bundesliga', 'La Liga 2', 'Serie B', 'Primeira Liga',
  'Belgian Pro League', 'Eredivisie', 'Super Lig', 'Scottish Premiership',
  'Europa League', 'Champions League', 'Liga Argentina', 'MLS',
  'Serie A Brazil', 'Serie B Brazil', 'Colombian Primera A',
  'Super League Greece', 'TFF 1. Lig',
];

// ── API helper ───────────────────────────────────────────────────────────────
async function apiFetch(apiKey: string, path: string, params: Record<string, string | number>): Promise<any[]> {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), {
    headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'v3.football.api-sports.io' },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  // API-Football returns errors in the response body even with 200 status
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API errors: ${JSON.stringify(json.errors)}`);
  }
  return json.response ?? [];
}

function getStat(stats: any[], type: string): number | null {
  const s = stats.find((x: any) => x.type === type);
  if (!s || s.value === null || s.value === undefined) return null;
  const raw = typeof s.value === 'string' ? parseFloat(s.value.replace('%', '')) : s.value;
  return isNaN(raw) ? null : raw;
}

// ── Mode: audit ──────────────────────────────────────────────────────────────
async function runAudit(supabase: any) {
  const [
    { count: total },
    { count: hasCorners },
    { count: hasCards },
    { count: missing2021Plus },
    { count: goalsUsable },
    { count: cornersUsable },
    { count: cardsUsable },
  ] = await Promise.all([
    supabase.from('ml_training_data').select('*', { count: 'exact', head: true }),
    supabase.from('ml_training_data').select('*', { count: 'exact', head: true }).not('total_corners', 'is', null),
    supabase.from('ml_training_data').select('*', { count: 'exact', head: true }).not('total_cards', 'is', null),
    supabase.from('ml_training_data').select('*', { count: 'exact', head: true }).is('total_corners', null).gte('fixture_date', '2021-01-01'),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }).not('over_25_hit', 'is', null).not('home_goals_for_avg_10', 'is', null),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }).not('over_95_corners_hit', 'is', null).not('home_corners_for_avg_10', 'is', null),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }).not('over_35_cards_hit', 'is', null).not('home_cards_for_avg_10', 'is', null),
  ]);

  return {
    run_id: `step2a_audit_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`,
    audit_timestamp: new Date().toISOString(),
    label_coverage: {
      total_rows: total, has_corners: hasCorners, has_cards: hasCards,
      corners_pct: total ? +((hasCorners ?? 0) / total * 100).toFixed(1) : 0,
      cards_pct: total ? +((hasCards ?? 0) / total * 100).toFixed(1) : 0,
      missing_stats_2021_plus: missing2021Plus,
    },
    usable_training_rows: { goals_btts: goalsUsable, corners: cornersUsable, cards: cardsUsable },
    gate_status: {
      goals_gate_80k:    (goalsUsable   ?? 0) >= 80000  ? 'PASS ✅' : 'FAIL ❌',
      corners_gate_150k: (cornersUsable ?? 0) >= 150000 ? 'PASS ✅' : 'FAIL ❌',
      cards_gate_150k:   (cardsUsable   ?? 0) >= 150000 ? 'PASS ✅' : 'FAIL ❌',
    },
    backfill_plan: {
      target_rows: missing2021Plus,
      expected_api_return_rate: '70%',
      expected_new_rows: Math.round((missing2021Plus ?? 0) * 0.7),
      batches_needed_at_40_per_run: Math.ceil((missing2021Plus ?? 0) / HARD_BATCH_CAP),
      recommended_cron: 'every 2 minutes → ~40 fixtures/run',
    },
  };
}

// ── Mode: progress ───────────────────────────────────────────────────────────
async function runProgress(supabase: any) {
  const years = ['pre-2021', '2021', '2022', '2023', '2024', '2025+'];
  const dateRanges: Record<string, [string, string]> = {
    'pre-2021': ['2010-01-01', '2020-12-31'],
    '2021': ['2021-01-01', '2021-12-31'],
    '2022': ['2022-01-01', '2022-12-31'],
    '2023': ['2023-01-01', '2023-12-31'],
    '2024': ['2024-01-01', '2024-12-31'],
    '2025+': ['2025-01-01', '2030-12-31'],
  };

  const rows = await Promise.all(years.map(async (yr) => {
    const [from, to] = dateRanges[yr];
    const [{ count: total }, { count: hasStats }] = await Promise.all([
      supabase.from('ml_training_data').select('*', { count: 'exact', head: true }).gte('fixture_date', from).lte('fixture_date', to),
      supabase.from('ml_training_data').select('*', { count: 'exact', head: true }).gte('fixture_date', from).lte('fixture_date', to).not('total_corners', 'is', null),
    ]);
    return {
      year: yr, total: total ?? 0, has_stats: hasStats ?? 0,
      missing: (total ?? 0) - (hasStats ?? 0),
      coverage_pct: total ? +((hasStats ?? 0) / total * 100).toFixed(1) : 0,
    };
  }));

  const totalMissing2021Plus = rows.filter(r => r.year !== 'pre-2021').reduce((s, r) => s + r.missing, 0);
  const totalHas2021Plus = rows.filter(r => r.year !== 'pre-2021').reduce((s, r) => s + r.has_stats, 0);
  const total2021Plus = rows.filter(r => r.year !== 'pre-2021').reduce((s, r) => s + r.total, 0);

  return {
    run_id: `step2a_progress_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`,
    timestamp: new Date().toISOString(),
    by_year: rows,
    summary_2021_plus: {
      total: total2021Plus, backfilled: totalHas2021Plus, remaining: totalMissing2021Plus,
      coverage_pct: total2021Plus ? +((totalHas2021Plus / total2021Plus) * 100).toFixed(1) : 0,
      runs_remaining_at_40_per_call: Math.ceil(totalMissing2021Plus / HARD_BATCH_CAP),
    },
  };
}

// ── Mode: report (label consistency) ─────────────────────────────────────────
async function runReport(supabase: any) {
  const { data: sample } = await supabase
    .from('ml_training_data')
    .select('fixture_id, total_cards, over_35_cards_hit, home_goals, away_goals, total_goals, over_25_hit, btts_hit')
    .not('total_cards', 'is', null)
    .not('total_goals', 'is', null)
    .limit(5000);

  if (!sample || sample.length === 0) return { error: 'No data for consistency report' };

  let cardsOk = 0, cardsWrong = 0, goalsOk = 0, goalsWrong = 0, bttsOk = 0, bttsWrong = 0;

  for (const r of sample) {
    if (r.over_35_cards_hit !== null && r.total_cards !== null) {
      (r.total_cards > 3.5) === r.over_35_cards_hit ? cardsOk++ : cardsWrong++;
    }
    if (r.over_25_hit !== null && r.total_goals !== null) {
      (r.total_goals > 2.5) === r.over_25_hit ? goalsOk++ : goalsWrong++;
    }
    if (r.btts_hit !== null && r.home_goals !== null && r.away_goals !== null) {
      (r.home_goals > 0 && r.away_goals > 0) === r.btts_hit ? bttsOk++ : bttsWrong++;
    }
  }

  const dist: Record<string, number> = {};
  for (const r of sample.filter((x: any) => x.total_cards !== null)) {
    const b = `${Math.floor(r.total_cards)}`;
    dist[b] = (dist[b] || 0) + 1;
  }

  return {
    run_id: `step2a_consistency_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`,
    sample_size: sample.length,
    label_integrity: {
      cards: { correct: cardsOk, wrong: cardsWrong, accuracy_pct: cardsOk + cardsWrong > 0 ? +((cardsOk / (cardsOk + cardsWrong)) * 100).toFixed(2) : null },
      goals: { correct: goalsOk, wrong: goalsWrong, accuracy_pct: goalsOk + goalsWrong > 0 ? +((goalsOk / (goalsOk + goalsWrong)) * 100).toFixed(2) : null },
      btts:  { correct: bttsOk,  wrong: bttsWrong,  accuracy_pct: bttsOk  + bttsWrong  > 0 ? +((bttsOk  / (bttsOk  + bttsWrong))  * 100).toFixed(2) : null },
    },
    cards_distribution: Object.entries(dist).sort((a, b) => +a[0] - +b[0]).map(([c, n]) => ({ total_cards: +c, count: n })),
    verdict: cardsWrong === 0 ? 'LABELS CONSISTENT ✅' : `LABELS HAVE ${cardsWrong} ERRORS ❌`,
  };
}

// ── Mode: sync_v2 — propagate existing v1 labels → v2 ────────────────────────
async function runSyncV2(supabase: any) {
  const runId = `step2a_syncv2_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;
  console.log(`🔄 Sync v1→v2 labels | run_id=${runId}`);

  let total = 0, page = 0;
  const PAGE = 2000;

  while (true) {
    const { data: v1Rows, error } = await supabase
      .from('ml_training_data')
      .select('fixture_id, total_cards, total_corners, over_35_cards_hit, over_95_corners_hit')
      .not('total_cards', 'is', null)
      .range(page * PAGE, (page + 1) * PAGE - 1);

    if (error) throw new Error(`Sync fetch error: ${error.message}`);
    if (!v1Rows || v1Rows.length === 0) break;

    const ids = v1Rows.map((r: any) => r.fixture_id);
    const { data: v2Need } = await supabase
      .from('ml_training_data_v2')
      .select('id, fixture_id')
      .in('fixture_id', ids)
      .is('over_35_cards_hit', null);

    if (v2Need && v2Need.length > 0) {
      const v1Map = new Map(v1Rows.map((r: any) => [r.fixture_id, r]));
      for (const v2r of v2Need) {
        const v1 = v1Map.get(v2r.fixture_id);
        await supabase.from('ml_training_data_v2').update({
          total_cards:         v1.total_cards,
          total_corners:       v1.total_corners,
          over_35_cards_hit:   v1.over_35_cards_hit,
          over_95_corners_hit: v1.over_95_corners_hit,
        }).eq('id', v2r.id);
      }
      total += v2Need.length;
      console.log(`📦 Page ${page}: synced ${v2Need.length} v2 rows (total=${total})`);
    }

    if (v1Rows.length < PAGE) break;
    page++;
  }

  const [{ count: cardsLabelled }, { count: cornersLabelled }] = await Promise.all([
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }).not('over_35_cards_hit', 'is', null).not('home_cards_for_avg_10', 'is', null),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }).not('over_95_corners_hit', 'is', null).not('home_corners_for_avg_10', 'is', null),
  ]);

  return {
    run_id: runId,
    v2_rows_synced: total,
    after_labels: { cards: cardsLabelled, corners: cornersLabelled },
    cards_gate_150k:   (cardsLabelled   ?? 0) >= 150000 ? 'PASS ✅' : `FAIL ❌ (need ${150000 - (cardsLabelled   ?? 0)} more)`,
    corners_gate_150k: (cornersLabelled ?? 0) >= 150000 ? 'PASS ✅' : `FAIL ❌ (need ${150000 - (cornersLabelled ?? 0)} more)`,
  };
}

// ── Mode: gate_check — full daily summary ────────────────────────────────────
async function runGateCheck(supabase: any) {
  const CARDS_TARGET = 150000;
  const CORNERS_TARGET = 150000;
  const GOALS_TARGET = 80000;
  // Cron: every minute, 40 fixtures/batch, 550ms delay between calls → ~40 fixtures/min
  const CRON_THROUGHPUT_PER_DAY = 40 * 60 * 24; // theoretical max = 57,600/day
  // Realistic: ~50% API return rate on eligible fixtures → ~28,800 enrichable/day

  // ── Core label counts ────────────────────────────────────────────────────────
  const [
    { count: cardsUsable },
    { count: cornersUsable },
    { count: goalsUsable },
    { count: bttsUsable },
    { count: totalV2 },
    // Actual actionable pool: unlabelled + has rolling features + in allowlist + 2021+
    { count: cardsActionablePool },
    { count: cornersActionablePool },
  ] = await Promise.all([
    // Fully-usable (label + rolling avg features both present — can train now)
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .not('over_35_cards_hit', 'is', null).not('home_cards_for_avg_10', 'is', null),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .not('over_95_corners_hit', 'is', null).not('home_corners_for_avg_10', 'is', null),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .not('over_25_hit', 'is', null).not('home_goals_for_avg_10', 'is', null),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .not('btts_hit', 'is', null).not('home_goals_for_avg_10', 'is', null),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true }),
    // Actual backfill target pool (mirrors run mode WHERE clause exactly)
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .is('over_35_cards_hit', null)
      .not('home_cards_for_avg_10', 'is', null)
      .gte('fixture_date', '2021-01-01')
      .lte('fixture_date', '2025-12-31')
      .in('league', TIER_ALLOWLIST_GLOBAL),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .is('over_95_corners_hit', null)
      .not('home_corners_for_avg_10', 'is', null)
      .gte('fixture_date', '2021-01-01')
      .lte('fixture_date', '2025-12-31')
      .in('league', TIER_ALLOWLIST_GLOBAL),
  ]);

  // ── 24h delta from run log ────────────────────────────────────────────────
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentRuns } = await supabase
    .from('backfill_stats_log')
    .select('enriched, targeted, no_data, api_hit_rate, cards_total, corners_total, run_at, leagues_hit')
    .gte('run_at', since24h)
    .order('run_at', { ascending: true });

  const runs24h = recentRuns ?? [];
  const newLabels24h  = runs24h.reduce((s: number, r: any) => s + (r.enriched ?? 0), 0);
  const targeted24h   = runs24h.reduce((s: number, r: any) => s + (r.targeted ?? 0), 0);
  const noData24h     = runs24h.reduce((s: number, r: any) => s + (r.no_data  ?? 0), 0);
  // True hit rate = enriched / (targeted - noData). noData = API has nothing, not a real failure.
  const apiEligible24h  = targeted24h - noData24h;
  const apiHitRate24h   = apiEligible24h > 0 ? +((newLabels24h / apiEligible24h) * 100).toFixed(1) : null;

  const firstCards    = runs24h.length > 0 ? (runs24h[0].cards_total   ?? 0) : null;
  const lastCards     = runs24h.length > 0 ? (runs24h[runs24h.length - 1].cards_total   ?? 0) : null;
  const firstCorners  = runs24h.length > 0 ? (runs24h[0].corners_total ?? 0) : null;
  const lastCorners   = runs24h.length > 0 ? (runs24h[runs24h.length - 1].corners_total ?? 0) : null;
  const cardsGrowth24h   = (firstCards   != null && lastCards   != null) ? lastCards   - firstCards   : newLabels24h;
  const cornersGrowth24h = (firstCorners != null && lastCorners != null) ? lastCorners - firstCorners : newLabels24h;

  // ── ETA — based on actual pool remaining (not target - current) ───────────
  // We need to enrich (target - current) more labels, sourced from the actionable pool
  const cardsNeeded   = Math.max(0, CARDS_TARGET   - (cardsUsable   ?? 0));
  const cornersNeeded = Math.max(0, CORNERS_TARGET - (cornersUsable ?? 0));
  // Pool may be < needed — flag this
  const cardsPoolSufficient   = (cardsActionablePool   ?? 0) >= cardsNeeded;
  const cornersPoolSufficient = (cornersActionablePool ?? 0) >= cornersNeeded;

  const labelsPerDayCards   = cardsGrowth24h   > 0 ? cardsGrowth24h   : (newLabels24h > 0 ? newLabels24h : null);
  const labelsPerDayCorners = cornersGrowth24h > 0 ? cornersGrowth24h : (newLabels24h > 0 ? newLabels24h : null);
  const etaDaysCards   = labelsPerDayCards   ? +(cardsNeeded   / labelsPerDayCards).toFixed(1)   : null;
  const etaDaysCorners = labelsPerDayCorners ? +(cornersNeeded / labelsPerDayCorners).toFixed(1) : null;

  // Projected based on cron throughput (every minute, ~70% API return on eligible fixtures)
  const projectedEnrichPerDay = Math.round(CRON_THROUGHPUT_PER_DAY * 0.70);
  const projectedEtaDaysCards   = +(cardsNeeded   / projectedEnrichPerDay).toFixed(1);
  const projectedEtaDaysCorners = +(cornersNeeded / projectedEnrichPerDay).toFixed(1);

  function etaDate(days: number | null): string {
    if (days === null) return 'unknown (no recent runs)';
    if (days === 0) return 'COMPLETE ✅';
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  }

  // ── Top 10 leagues by new label count in last 24h ─────────────────────────
  const leagueMap: Record<string, number> = {};
  for (const run of runs24h) {
    if (run.leagues_hit && typeof run.leagues_hit === 'object') {
      for (const [league, count] of Object.entries(run.leagues_hit as Record<string, number>)) {
        leagueMap[league] = (leagueMap[league] ?? 0) + (count as number);
      }
    }
  }
  const top10Leagues = Object.entries(leagueMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([league, count]) => ({ league, new_labels_24h: count }));

  return {
    summary_type: 'daily_gate_check',
    timestamp: new Date().toISOString(),
    cron_schedule: 'every 1 minute — 40 fixtures/batch — 550ms per API call',

    label_counts: {
      cards_usable_rows:   cardsUsable   ?? 0,
      corners_usable_rows: cornersUsable ?? 0,
      goals_usable_rows:   goalsUsable   ?? 0,
      btts_usable_rows:    bttsUsable    ?? 0,
      total_v2_rows:       totalV2       ?? 0,
    },

    gate_status: {
      cards_150k:   (cardsUsable   ?? 0) >= CARDS_TARGET   ? 'PASS ✅' : `FAIL ❌ — ${cardsUsable}/${CARDS_TARGET} (${((cardsUsable   ?? 0) / CARDS_TARGET   * 100).toFixed(1)}%)`,
      corners_150k: (cornersUsable ?? 0) >= CORNERS_TARGET ? 'PASS ✅' : `FAIL ❌ — ${cornersUsable}/${CORNERS_TARGET} (${((cornersUsable ?? 0) / CORNERS_TARGET * 100).toFixed(1)}%)`,
      goals_80k:    (goalsUsable   ?? 0) >= GOALS_TARGET   ? 'PASS ✅' : `FAIL ❌ — ${goalsUsable}/${GOALS_TARGET} (${((goalsUsable   ?? 0) / GOALS_TARGET   * 100).toFixed(1)}%)`,
      training_blocked: ((cardsUsable ?? 0) < CARDS_TARGET || (cornersUsable ?? 0) < CORNERS_TARGET)
        ? 'YES — awaiting label targets before retraining cards/corners'
        : 'NO — ready to retrain all markets',
    },

    actionable_pool: {
      // Exact same WHERE clause as the run mode — this is what cron actually targets
      cards_unlabelled_in_pool:   cardsActionablePool   ?? 0,
      corners_unlabelled_in_pool: cornersActionablePool ?? 0,
      pool_note: 'Unlabelled rows with rolling features + 2021+ date + tier allowlist only',
      cards_pool_sufficient:   cardsPoolSufficient   ? 'YES ✅' : `SHORTFALL ⚠️ — pool has ${cardsActionablePool}, need ${cardsNeeded}`,
      corners_pool_sufficient: cornersPoolSufficient ? 'YES ✅' : `SHORTFALL ⚠️ — pool has ${cornersActionablePool}, need ${cornersNeeded}`,
    },

    last_24h: {
      runs_completed:       runs24h.length,
      new_labels_24h:       newLabels24h,
      no_data_fixtures_24h: noData24h,
      cards_growth_24h:     cardsGrowth24h,
      corners_growth_24h:   cornersGrowth24h,
      // True hit rate excludes noData (API has no stats for fixture = not a failure)
      api_true_hit_rate_pct: apiHitRate24h,
      api_hit_quality: apiHitRate24h === null ? 'no data yet'
                     : apiHitRate24h >= 80    ? 'EXCELLENT ✅'
                     : apiHitRate24h >= 60    ? 'GOOD ✅'
                     : apiHitRate24h >= 40    ? 'ACCEPTABLE ⚠️'
                     :                          'POOR ❌ — audit allowlist',
      note: runs24h.length === 0 ? '⚠️ No runs in last 24h — check cron is firing' : undefined,
    },

    eta: {
      cards_needed:         cardsNeeded,
      corners_needed:       cornersNeeded,
      // Actual rate from last 24h logs
      actual_labels_per_day_cards:   labelsPerDayCards,
      actual_labels_per_day_corners: labelsPerDayCorners,
      actual_eta_date_cards:         etaDate(etaDaysCards),
      actual_eta_date_corners:       etaDate(etaDaysCorners),
      // Projected at cron throughput (every minute, 40/batch, 70% API return)
      projected_enrich_per_day:       projectedEnrichPerDay,
      projected_eta_days_cards:       projectedEtaDaysCards,
      projected_eta_days_corners:     projectedEtaDaysCorners,
      projected_eta_date_cards:       etaDate(projectedEtaDaysCards),
      projected_eta_date_corners:     etaDate(projectedEtaDaysCorners),
    },

    top_10_leagues_24h: top10Leagues.length > 0
      ? top10Leagues
      : [{ note: 'No league data yet — run one backfill batch first' }],

    allowlist_drift_check: {
      instruction: 'Watch for leagues with consistently 0 new labels — remove from allowlist after 3 days of zero return',
      flag_threshold: 'League with < 2% of daily labels = drift candidate',
    },

    upsert_confirmation: {
      method: 'UPDATE on existing rows — zero duplicate risk',
      explanation: 'SELECT WHERE over_35_cards_hit IS NULL → API → UPDATE WHERE fixture_id = X. fixture_id is unique in v2.',
    },
  };
}

// ── Mode: run ────────────────────────────────────────────────────────────────
async function runBackfill(supabase: any, apiKey: string, opts: {
  batchSize?: number; fromDate?: string; toDate?: string; dryRun?: boolean; leagues?: string[];
}) {
  const batchSize = Math.min(opts.batchSize ?? 40, HARD_BATCH_CAP);
  const fromDate  = opts.fromDate ?? '2021-01-01'; // Default to 2021+ — API coverage is best here
  const toDate    = opts.toDate   ?? '2024-12-31';
  const dryRun    = opts.dryRun   ?? false;
  // Include ms for uniqueness in fast cron runs
  const runId     = `step2a_${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 17)}`;
  const TIER_ALLOWLIST = opts.leagues ?? TIER_ALLOWLIST_GLOBAL;

  console.log(`🔁 Step 2A | run_id=${runId} | batch=${batchSize} | from=${fromDate} | dry=${dryRun}`);

  // SELECT rows WHERE label IS NULL — the "upsert" equivalent: only unlabelled rows
  // IMPORTANT: order newest-first (2024→2021) — API coverage drops sharply pre-2021
  // Only target rows with rolling features already computed (home_cards_for_avg_10 NOT NULL)
  const { data: fixtureRows, error: fetchErr } = await supabase
    .from('ml_training_data_v2')
    .select('id, fixture_id, league, fixture_date')
    .is('over_35_cards_hit', null)
    .not('home_cards_for_avg_10', 'is', null)
    .gte('fixture_date', fromDate)
    .lte('fixture_date', toDate)
    .in('league', TIER_ALLOWLIST)
    .order('fixture_date', { ascending: false })
    .limit(batchSize);

  if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`);

  const fixtureIds = (fixtureRows ?? []).map((r: any) => r.fixture_id);
  console.log(`📋 Targeting: ${fixtureIds.length} fixtures`);

  if (fixtureIds.length === 0) {
    return { run_id: runId, fixtures_found: 0, message: 'No unlabelled fixtures in this date range. ✅' };
  }

  if (dryRun) {
    return { run_id: runId, dry_run: true, would_process: fixtureIds.length, sample: fixtureIds.slice(0, 5) };
  }

  let enriched = 0, noData = 0, errors = 0, rateLimited = 0;
  const leagueEnrichMap: Record<string, number> = {};
  const fixtureLeagueMap: Record<string, string> = {};
  for (const r of fixtureRows ?? []) fixtureLeagueMap[r.fixture_id] = r.league ?? 'Unknown';

  for (const fixtureId of fixtureIds) {
    try {
      await delay(550);
      const statsResp = await apiFetch(apiKey, '/fixtures/statistics', { fixture: fixtureId });

      if (!statsResp || statsResp.length < 2) { noData++; continue; }

      const hS = statsResp[0]?.statistics ?? [];
      const aS = statsResp[1]?.statistics ?? [];

      const homeCorners = getStat(hS, 'Corner Kicks');
      const awayCorners = getStat(aS, 'Corner Kicks');
      const homeYC = getStat(hS, 'Yellow Cards') ?? 0;
      const awayYC = getStat(aS, 'Yellow Cards') ?? 0;
      const homeRC = getStat(hS, 'Red Cards')    ?? 0;
      const awayRC = getStat(aS, 'Red Cards')    ?? 0;
      const totalCorners = (homeCorners != null && awayCorners != null) ? homeCorners + awayCorners : null;
      const totalCards   = homeYC + awayYC + homeRC + awayRC;

      const v1Payload: Record<string, any> = {
        home_corners: homeCorners, away_corners: awayCorners, total_corners: totalCorners,
        over_95_corners_hit: totalCorners !== null ? totalCorners > 9.5 : null,
        home_yellow_cards: homeYC, away_yellow_cards: awayYC,
        home_red_cards:    homeRC, away_red_cards:    awayRC,
        total_cards: totalCards, over_35_cards_hit: totalCards > 3.5,
        home_fouls:           getStat(hS, 'Fouls'),           away_fouls:           getStat(aS, 'Fouls'),
        home_total_shots:     getStat(hS, 'Total Shots'),     away_total_shots:     getStat(aS, 'Total Shots'),
        home_shots_on_goal:   getStat(hS, 'Shots on Goal'),   away_shots_on_goal:   getStat(aS, 'Shots on Goal'),
        home_shots_off_goal:  getStat(hS, 'Shots off Goal'),  away_shots_off_goal:  getStat(aS, 'Shots off Goal'),
        home_blocked_shots:   getStat(hS, 'Blocked Shots'),   away_blocked_shots:   getStat(aS, 'Blocked Shots'),
        home_shots_insidebox: getStat(hS, 'Shots insidebox'), away_shots_insidebox: getStat(aS, 'Shots insidebox'),
        home_shots_outsidebox:getStat(hS, 'Shots outsidebox'),away_shots_outsidebox:getStat(aS, 'Shots outsidebox'),
        home_goalkeeper_saves:getStat(hS, 'Goalkeeper Saves'),away_goalkeeper_saves:getStat(aS, 'Goalkeeper Saves'),
        home_offsides:        getStat(hS, 'Offsides'),        away_offsides:        getStat(aS, 'Offsides'),
      };

      // Dual-write: v1
      const { error: upErrV1 } = await supabase
        .from('ml_training_data').update(v1Payload).eq('fixture_id', fixtureId);

      // Dual-write: v2 (labels + totals only — rolling avgs computed separately)
      const { error: upErrV2 } = await supabase
        .from('ml_training_data_v2').update({
          total_cards:         totalCards,
          total_corners:       totalCorners,
          over_35_cards_hit:   totalCards > 3.5,
          over_95_corners_hit: totalCorners !== null ? totalCorners > 9.5 : null,
        }).eq('fixture_id', fixtureId);

      if (upErrV1 || upErrV2) {
        console.warn(`⚠️ Write error fixture=${fixtureId}`);
        errors++;
      } else {
        enriched++;
        const league = fixtureLeagueMap[fixtureId] ?? 'Unknown';
        leagueEnrichMap[league] = (leagueEnrichMap[league] ?? 0) + 1;
      }
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? 'unknown');
      console.error(`❌ Fixture ${fixtureId} error: ${msg}`);
      if (msg.includes('429') || msg.includes('rate') || msg.includes('Too Many')) {
        rateLimited++;
        if (rateLimited >= 3) { console.warn('⚠️ Rate limit 3x — stopping early'); break; }
        await delay(5000);
      } else {
        errors++;
      }
    }
  }

  // After-counts — raw label counts (not gated on features, to avoid undercounting)
  const [
    { count: cardsTotal },
    { count: cornersTotal },
    { count: nowHas },
    { count: rangeTotal },
  ] = await Promise.all([
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .not('over_35_cards_hit', 'is', null),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .not('over_95_corners_hit', 'is', null),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .not('total_corners', 'is', null).gte('fixture_date', fromDate),
    supabase.from('ml_training_data_v2').select('*', { count: 'exact', head: true })
      .gte('fixture_date', fromDate).in('league', TIER_ALLOWLIST),
  ]);

  console.log(`✅ done | enriched=${enriched} noData=${noData} errors=${errors} | cards=${cardsTotal} corners=${cornersTotal}`);

  // Log this run (UPSERT on run_id — idempotent if run_id somehow reused)
  const hitRate = fixtureIds.length > 0 ? +((enriched / fixtureIds.length) * 100).toFixed(1) : 0;
  await supabase.from('backfill_stats_log').upsert({
    run_id: runId, mode: 'run',
    batch_size: batchSize, targeted: fixtureIds.length,
    enriched, no_data: noData, errors, rate_limits: rateLimited,
    api_hit_rate:  hitRate,
    cards_total:   cardsTotal   ?? 0,
    corners_total: cornersTotal ?? 0,
    from_date: fromDate, to_date: toDate,
    leagues_hit: leagueEnrichMap,
  }, { onConflict: 'run_id' });

  return {
    run_id: runId,
    batch: { size: batchSize, targeted: fixtureIds.length, enriched, no_data: noData, errors, rate_limits: rateLimited },
    api_hit_rate_pct:          hitRate,
    v2_cards_labelled_total:   cardsTotal,
    v2_corners_labelled_total: cornersTotal,
    cards_gate_150k:           (cardsTotal   ?? 0) >= 150000 ? 'PASS ✅' : `FAIL ❌ (${cardsTotal}/150000)`,
    corners_gate_150k:         (cornersTotal ?? 0) >= 150000 ? 'PASS ✅' : `FAIL ❌ (${cornersTotal}/150000)`,
    top_leagues_this_run: Object.entries(leagueEnrichMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([league, count]) => ({ league, enriched: count })),
    after_range_coverage: {
      from_date: fromDate, has_stats_v2: nowHas, tier_total: rangeTotal,
      pct: rangeTotal ? +((nowHas ?? 0) / rangeTotal * 100).toFixed(1) : 0,
    },
    timestamp: new Date().toISOString(),
  };
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
    const mode = body.mode ?? 'audit';

    let result: any;
    if      (mode === 'audit')      result = await runAudit(supabase);
    else if (mode === 'progress')   result = await runProgress(supabase);
    else if (mode === 'report')     result = await runReport(supabase);
    else if (mode === 'sync_v2')    result = await runSyncV2(supabase);
    else if (mode === 'gate_check') result = await runGateCheck(supabase);
    else if (mode === 'run')        result = await runBackfill(supabase, API_KEY, body);
    else throw new Error(`Unknown mode: "${mode}". Use: audit | progress | report | run | sync_v2 | gate_check`);

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ ml-backfill-stats error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

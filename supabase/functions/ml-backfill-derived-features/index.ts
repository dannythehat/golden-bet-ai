import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ml-backfill-derived-features
 * ─────────────────────────────
 * Idempotent batch job — computes 4 derived feature columns using
 * ONLY columns already present in ml_training_data_v2.
 *
 * fouls_momentum_5   = home_fouls_for_avg_5  + away_fouls_for_avg_5
 * discipline_gap_10  = home_cards_for_avg_10 - away_cards_for_avg_10
 * shot_pressure_10   = home_shots_for_avg_10 + away_shots_for_avg_10
 * tempo_index_10     = shot_pressure_10 + fouls_momentum_5
 *
 * Uses small page batches (500) with individual row updates to avoid
 * payload-size limits on the JS upsert path.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const url = new URL(req.url);
  const pageSize = Math.min(parseInt(url.searchParams.get('page') || '500'), 1000);
  const maxBatches = parseInt(url.searchParams.get('max_batches') || '200'); // safety cap

  console.log(`🔧 Derived-feature backfill | pageSize=${pageSize} maxBatches=${maxBatches}`);

  try {
    let totalUpdated = 0;
    let batchNum = 0;
    let hasMore = true;

    while (hasMore && batchNum < maxBatches) {
      // Always fetch from offset 0 (rows not yet computed) — computed rows drop out
      // Also fetch NOT NULL cols needed for upsert to work
      const { data: rows, error: fetchErr } = await supabase
        .from('ml_training_data_v2')
        .select('id, fixture_id, home_team, away_team, league, region, fixture_date, home_fouls_for_avg_5, away_fouls_for_avg_5, home_cards_for_avg_10, away_cards_for_avg_10, home_shots_for_avg_10, away_shots_for_avg_10')
        .not('home_fouls_for_avg_5', 'is', null)
        .not('away_fouls_for_avg_5', 'is', null)
        .not('home_cards_for_avg_10', 'is', null)
        .not('away_cards_for_avg_10', 'is', null)
        .not('home_shots_for_avg_10', 'is', null)
        .not('away_shots_for_avg_10', 'is', null)
        .is('fouls_momentum_5', null)
        .limit(pageSize);

      if (fetchErr) {
        throw new Error(`Fetch error: ${fetchErr.message}`);
      }

      if (!rows || rows.length === 0) {
        hasMore = false;
        break;
      }

      batchNum++;

      // Build update objects — include all NOT NULL cols so upsert constraint is satisfied
      const updates = rows.map((r) => {
        const fm5  = round3((r.home_fouls_for_avg_5  ?? 0) + (r.away_fouls_for_avg_5  ?? 0));
        const dg10 = round3((r.home_cards_for_avg_10 ?? 0) - (r.away_cards_for_avg_10 ?? 0));
        const sp10 = round3((r.home_shots_for_avg_10 ?? 0) + (r.away_shots_for_avg_10 ?? 0));
        const ti10 = round3(sp10 + fm5);
        return {
          id: r.id,
          fixture_id: r.fixture_id, home_team: r.home_team, away_team: r.away_team,
          league: r.league, region: r.region ?? 'european', fixture_date: r.fixture_date,
          fouls_momentum_5: fm5, discipline_gap_10: dg10, shot_pressure_10: sp10, tempo_index_10: ti10,
        };
      });

      // Upsert in chunks of 200 — all NOT NULL cols included so constraint is satisfied
      const CHUNK = 200;
      for (let i = 0; i < updates.length; i += CHUNK) {
        const chunk = updates.slice(i, i + CHUNK);
        const { error: uErr } = await supabase
          .from('ml_training_data_v2')
          .upsert(chunk, { onConflict: 'id' });
        if (uErr) throw new Error(`Upsert error (chunk ${i}): ${uErr.message}`);
      }

      totalUpdated += rows.length;
      if (batchNum % 10 === 0 || rows.length < pageSize) {
        console.log(`✅ Batch ${batchNum}: +${rows.length} rows (total=${totalUpdated})`);
      }

      hasMore = rows.length === pageSize;
    }

    // ── Stats snapshot ────────────────────────────────────────────────────────
    const { count: totalRows } = await supabase
      .from('ml_training_data_v2')
      .select('*', { count: 'exact', head: true });

    const { count: populatedCount } = await supabase
      .from('ml_training_data_v2')
      .select('*', { count: 'exact', head: true })
      .not('fouls_momentum_5', 'is', null);

    const pctPopulated = totalRows && totalRows > 0
      ? Math.round(((populatedCount ?? 0) / totalRows) * 10000) / 100
      : 0;

    // Sample for stats
    const { data: sample } = await supabase
      .from('ml_training_data_v2')
      .select('fouls_momentum_5, discipline_gap_10, shot_pressure_10, tempo_index_10')
      .not('fouls_momentum_5', 'is', null)
      .limit(5000);

    const featureStats: Record<string, any> = {};
    const keys = ['fouls_momentum_5', 'discipline_gap_10', 'shot_pressure_10', 'tempo_index_10'] as const;
    for (const key of keys) {
      const vals = (sample ?? []).map((r: any) => r[key]).filter((v: any) => v != null) as number[];
      if (vals.length === 0) { featureStats[key] = { count: 0, note: 'no data' }; continue; }
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std  = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
      const nonZero = vals.filter(v => v !== 0).length;
      featureStats[key] = {
        count:    vals.length,
        pct_non_null: `${Math.round((populatedCount ?? 0) / (totalRows ?? 1) * 10000) / 100}%`,
        mean:     round3(mean),
        std:      round3(std),
        min:      Math.min(...vals),
        max:      Math.max(...vals),
        pct_non_zero: `${Math.round((nonZero / vals.length) * 10000) / 100}%`,
      };
    }

    console.log(`🏁 Done. rows_updated=${totalUpdated} pct_populated=${pctPopulated}%`);

    const stillEligible = hasMore && batchNum >= maxBatches;

    return new Response(JSON.stringify({
      success: true,
      batches_run: batchNum,
      rows_updated: totalUpdated,
      total_rows: totalRows,
      populated_count: populatedCount,
      pct_populated: `${pctPopulated}%`,
      more_to_run: stillEligible,
      feature_stats: featureStats,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error('❌ Backfill error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

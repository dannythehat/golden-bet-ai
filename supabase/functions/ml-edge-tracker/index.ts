import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ML Edge Tracker
 * ───────────────
 * Reads settled bets from golden_bet_history + bet_builder_history,
 * groups them by market × probability band, measures historical hit rate
 * vs bookmaker implied probability, and upserts market_edge_profile.
 *
 * edge_strength_score = historical_hit_rate - avg_bookmaker_implied_prob  (% pts)
 *   Positive → model genuinely outperforms bookmaker in this band
 *   Negative → model overestimates; avoid or discount
 *
 * model_confidence_score (stored in ml_models) = f(AUC, 1-brier, feature_coverage)
 *   Computed separately and also written here when called with ?mode=confidence
 *
 * Run: POST /ml-edge-tracker          — rebuild edge profile from history
 *      POST /ml-edge-tracker?mode=confidence — recompute model_confidence_score
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'edge';

    // ── MODE: recompute model_confidence_score ────────────────────────────
    if (mode === 'confidence') {
      return await recomputeConfidenceScores(supabase);
    }

    // ── MODE: rebuild edge profile ────────────────────────────────────────
    console.log('📊 ML Edge Tracker: rebuilding market_edge_profile from settled history');

    // Pull all settled golden bets (won/lost)
    const { data: goldenBets, error: gbErr } = await supabase
      .from('golden_bet_history')
      .select('market, ml_confidence, ml_confidence_raw, bookmaker_odds, result, profit_loss, stake')
      .in('status', ['won', 'lost'])
      .not('bookmaker_odds', 'is', null);

    if (gbErr) throw gbErr;

    // Pull settled bet builders (per-market breakdown stored in market_confidences)
    const { data: betBuilders, error: bbErr } = await supabase
      .from('bet_builder_history')
      .select('markets, market_confidences, market_confidences_raw, result, stake, combined_odds')
      .in('status', ['won', 'lost']);

    if (bbErr) throw bbErr;

    // ── Aggregate per market×band ────────────────────────────────────────
    // Structure: Map<market_band_key, { hits, total, modelProbs, bkImplied, returns, staked }>
    const bands = new Map<string, {
      market: string;
      prob_band: string;
      model_prob_mid: number;
      hits: number;
      total: number;
      modelProbs: number[];
      bkImplied: number[];
      returns: number;
      staked: number;
    }>();

    function getBand(prob: number): { band: string; mid: number } {
      // 5-point bands: 50-55, 55-60, ..., 90-95
      const lower = Math.max(50, Math.min(90, Math.floor(prob / 5) * 5));
      return { band: `${lower}-${lower + 5}`, mid: lower + 2.5 };
    }

    function ensureBand(market: string, prob: number) {
      const { band, mid } = getBand(prob);
      const key = `${market}__${band}`;
      if (!bands.has(key)) {
        bands.set(key, { market, prob_band: band, model_prob_mid: mid, hits: 0, total: 0, modelProbs: [], bkImplied: [], returns: 0, staked: 0 });
      }
      return key;
    }

    // Process golden bets
    for (const bet of (goldenBets || [])) {
      const prob = (bet.ml_confidence_raw ?? bet.ml_confidence ?? 0) * 100;
      if (prob < 50) continue; // only confident selections matter

      const key = ensureBand(bet.market, prob);
      const entry = bands.get(key)!;
      entry.total++;
      entry.modelProbs.push(prob);
      if (bet.result === 'won') entry.hits++;

      // Bookmaker implied prob from decimal odds
      if (bet.bookmaker_odds && bet.bookmaker_odds > 1) {
        entry.bkImplied.push(100 / bet.bookmaker_odds);
      }

      // ROI tracking
      const stake = bet.stake ?? 2;
      entry.staked += stake;
      if (bet.result === 'won' && bet.bookmaker_odds) {
        entry.returns += stake * bet.bookmaker_odds;
      }
    }

    // Process bet builders — expand per market from market_confidences
    for (const bb of (betBuilders || [])) {
      if (!bb.markets || !bb.market_confidences) continue;
      const confs: Record<string, number> = typeof bb.market_confidences === 'object' ? bb.market_confidences as any : {};
      const rawConfs: Record<string, number> = typeof bb.market_confidences_raw === 'object' ? (bb.market_confidences_raw as any ?? {}) : {};

      for (const market of (bb.markets || [])) {
        const rawProb = ((rawConfs[market] ?? confs[market] ?? 0)) * 100;
        if (rawProb < 50) continue;

        const key = ensureBand(market, rawProb);
        const entry = bands.get(key)!;
        entry.total++;
        entry.modelProbs.push(rawProb);
        if (bb.result === 'won') entry.hits++;

        // Stake attribution: split equally across markets in combo
        const stake = (bb.stake ?? 2) / (bb.markets?.length || 1);
        entry.staked += stake;
        if (bb.result === 'won' && bb.combined_odds) {
          entry.returns += stake * bb.combined_odds;
        }
      }
    }

    // ── Upsert market_edge_profile ────────────────────────────────────────
    const MINIMUM_SAMPLE = 10; // require at least 10 settled bets to publish a band
    const upsertRows: any[] = [];

    for (const [, entry] of bands) {
      if (entry.total < MINIMUM_SAMPLE) continue;

      const historical_hit_rate = Math.round((entry.hits / entry.total) * 10000) / 100; // e.g. 64.28
      const avg_model_prob = entry.modelProbs.length
        ? Math.round(entry.modelProbs.reduce((a, b) => a + b, 0) / entry.modelProbs.length * 100) / 100
        : entry.model_prob_mid;
      const avg_bk_implied = entry.bkImplied.length
        ? Math.round(entry.bkImplied.reduce((a, b) => a + b, 0) / entry.bkImplied.length * 100) / 100
        : null;
      const roi = entry.staked > 0
        ? Math.round(((entry.returns - entry.staked) / entry.staked) * 10000) / 100
        : null;

      // edge_strength_score: how many % pts our hit rate exceeds bookmaker's implied prob
      const edge_strength_score = avg_bk_implied !== null
        ? Math.round((historical_hit_rate - avg_bk_implied) * 100) / 100
        : null;

      upsertRows.push({
        market: entry.market,
        prob_band: entry.prob_band,
        model_prob_mid: entry.model_prob_mid,
        sample_count: entry.total,
        hit_count: entry.hits,
        historical_hit_rate,
        avg_bookmaker_implied_prob: avg_bk_implied,
        avg_model_prob,
        roi,
        edge_strength_score,
        last_updated: new Date().toISOString(),
      });
    }

    if (upsertRows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('market_edge_profile')
        .upsert(upsertRows, { onConflict: 'market,prob_band' });
      if (upsertErr) throw upsertErr;
    }

    console.log(`✅ Edge Tracker: ${upsertRows.length} bands updated (${bands.size} total, ${bands.size - upsertRows.length} insufficient samples)`);

    return new Response(JSON.stringify({
      success: true,
      bands_updated: upsertRows.length,
      bands_skipped_low_sample: bands.size - upsertRows.length,
      summary: upsertRows.map(r => ({
        market: r.market,
        band: r.prob_band,
        samples: r.sample_count,
        hit_rate: r.historical_hit_rate,
        edge: r.edge_strength_score,
        roi: r.roi,
      })),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Edge Tracker error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ── Recompute model_confidence_score for all active models ─────────────────────
async function recomputeConfidenceScores(supabase: any) {
  const { data: models, error } = await supabase
    .from('ml_models')
    .select('id, market, auc_roc, brier_score, features_used, feature_names, rows_used, is_active')
    .eq('is_active', true);

  if (error) throw error;

  const updates: any[] = [];

  for (const model of (models || [])) {
    const auc = model.auc_roc ?? 0.50;
    const brier = model.brier_score ?? 0.25;
    const rowsUsed = model.rows_used ?? 0;
    const featuresUsed = model.features_used ?? 0;

    // AUC component: 0-40 pts (AUC 0.5 → 0pts, AUC 0.72+ → 40pts)
    const aucScore = Math.min(40, Math.max(0, ((auc - 0.50) / 0.22) * 40));

    // Brier component: 0-35 pts (brier 0.25 → 0pts, brier 0.10 → 35pts)
    const brierScore = Math.min(35, Math.max(0, ((0.25 - brier) / 0.15) * 35));

    // Feature coverage: 0-25 pts based on rows_used vs target 80k
    const TARGET_ROWS = 80_000;
    const coverageScore = Math.min(25, Math.max(0, (rowsUsed / TARGET_ROWS) * 25));

    const confidence = Math.round(aucScore + brierScore + coverageScore);

    updates.push({ id: model.id, model_confidence_score: confidence });
    console.log(`🎯 ${model.market}: AUC=${auc} Brier=${brier} rows=${rowsUsed} → confidence=${confidence}/100`);
  }

  for (const u of updates) {
    await supabase.from('ml_models').update({ model_confidence_score: u.model_confidence_score }).eq('id', u.id);
  }

  return new Response(JSON.stringify({
    success: true,
    updated: updates.length,
    scores: updates,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

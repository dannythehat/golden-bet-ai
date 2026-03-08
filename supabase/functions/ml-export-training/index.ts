import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ML Training Data Export - Serves the FULL 285k+ dataset
 * with league bias normalization for external Python training.
 * 
 * Endpoints:
 *   POST { action: "export", market: "over_2.5_goals", limit: 50000, offset: 0 }
 *   POST { action: "stats" } - returns dataset statistics
 *   POST { action: "league-baselines" } - returns per-league averages for bias correction
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'stats';

    // ═══════════════════════════════════════════
    // DATASET STATISTICS
    // ═══════════════════════════════════════════
    if (action === 'stats') {
      const { count: totalV2 } = await supabase
        .from('ml_training_data_v2')
        .select('*', { count: 'exact', head: true });

      const { data: regionBreakdown } = await supabase
        .from('ml_training_data_v2')
        .select('region')
        .limit(1000);

      // Sample label distribution
      const { data: labelSample } = await supabase
        .from('ml_training_data_v2')
        .select('over_25_hit, btts_hit, over_95_corners_hit, over_35_cards_hit')
        .not('over_25_hit', 'is', null)
        .limit(1000);

      const labels = {
        over_25: { total: 0, positive: 0 },
        btts: { total: 0, positive: 0 },
        corners: { total: 0, positive: 0 },
        cards: { total: 0, positive: 0 },
      };

      if (labelSample) {
        for (const row of labelSample) {
          if (row.over_25_hit !== null) { labels.over_25.total++; if (row.over_25_hit) labels.over_25.positive++; }
          if (row.btts_hit !== null) { labels.btts.total++; if (row.btts_hit) labels.btts.positive++; }
          if (row.over_95_corners_hit !== null) { labels.corners.total++; if (row.over_95_corners_hit) labels.corners.positive++; }
          if (row.over_35_cards_hit !== null) { labels.cards.total++; if (row.over_35_cards_hit) labels.cards.positive++; }
        }
      }

      // Feature completeness
      const { data: featureSample } = await supabase
        .from('ml_training_data_v2')
        .select('home_xg_for_avg_10, home_goals_for_avg_10, home_corners_for_avg_10, home_cards_for_avg_10, league_avg_goals, ref_avg_cards_last50')
        .limit(1000);

      const completeness: Record<string, number> = {};
      if (featureSample && featureSample.length > 0) {
        const keys = ['home_xg_for_avg_10', 'home_goals_for_avg_10', 'home_corners_for_avg_10', 'home_cards_for_avg_10', 'league_avg_goals', 'ref_avg_cards_last50'];
        for (const k of keys) {
          completeness[k] = Math.round((featureSample.filter((r: any) => r[k] !== null).length / featureSample.length) * 100);
        }
      }

      return new Response(JSON.stringify({
        total_records: totalV2,
        label_distribution_sample: labels,
        feature_completeness_pct: completeness,
        recommended_training: {
          min_samples: 50000,
          ideal_samples: 200000,
          models: ['XGBoost', 'LightGBM', 'CatBoost'],
          cv_strategy: 'TimeSeriesSplit with 5 folds (walk-forward)',
          league_bias: 'Normalize features by league baselines (subtract league avg, divide by league std)',
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════
    // LEAGUE BASELINES (for bias correction)
    // ═══════════════════════════════════════════
    if (action === 'league-baselines') {
      const { data: baselines } = await supabase
        .from('ml_training_data_v2')
        .select('league, league_avg_goals, league_over25_rate, league_btts_rate, league_avg_corners, league_avg_cards')
        .not('league_avg_goals', 'is', null)
        .limit(1000);

      // Aggregate unique league baselines
      const leagueMap = new Map<string, any>();
      if (baselines) {
        for (const row of baselines) {
          if (!leagueMap.has(row.league)) {
            leagueMap.set(row.league, {
              league: row.league,
              avg_goals: row.league_avg_goals,
              over25_rate: row.league_over25_rate,
              btts_rate: row.league_btts_rate,
              avg_corners: row.league_avg_corners,
              avg_cards: row.league_avg_cards,
            });
          }
        }
      }

      return new Response(JSON.stringify({
        league_count: leagueMap.size,
        baselines: Array.from(leagueMap.values()),
        usage: 'Subtract league baseline from team features to normalize across leagues. E.g. home_goals_norm = home_goals_for_avg_10 - league_avg_goals',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════
    // EXPORT TRAINING DATA (paginated)
    // ═══════════════════════════════════════════
    if (action === 'export') {
      const limit = Math.min(body.limit || 1000, 1000); // Max 1000 per page (Supabase limit)
      const offset = body.offset || 0;
      const market = body.market; // optional filter

      let query = supabase
        .from('ml_training_data_v2')
        .select('*')
        .order('fixture_date', { ascending: true })
        .range(offset, offset + limit - 1);

      // Only return rows where the target label exists
      if (market === 'over_2.5_goals') query = query.not('over_25_hit', 'is', null);
      if (market === 'btts') query = query.not('btts_hit', 'is', null);
      if (market === 'over_9.5_corners') query = query.not('over_95_corners_hit', 'is', null);
      if (market === 'over_3.5_cards') query = query.not('over_35_cards_hit', 'is', null);

      const { data, error, count } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({
        records: data?.length || 0,
        offset,
        limit,
        hasMore: (data?.length || 0) === limit,
        nextOffset: offset + limit,
        data,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action. Use: stats, export, league-baselines' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Export error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

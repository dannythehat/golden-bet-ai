import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ML Orchestrator V6 — League-Cluster-Specific Models
 * 
 * Actions:
 *   "train-all"        — Train all 12 cluster×market models (3 clusters × 4 markets)
 *   "train-market"     — Train a specific market (optionally per cluster)
 *   "retrain"          — Weekly retrain (fresh models with latest data)
 *   "status"           — Check training status of all models
 *   "predict"          — Run ML inference with cluster routing + AI refinement
 *   "h2h-compute"      — Compute H2H features for all team pairs
 */

const MARKETS = ['over_2.5_goals', 'btts', 'over_9.5_corners', 'over_3.5_cards'];
const CLUSTERS = ['high_scoring', 'mid_scoring', 'low_scoring'];

// League → cluster mapping (mirrors ml-train-engine)
const LEAGUE_CLUSTERS: Record<string, string[]> = {
  'high_scoring': [
    'Eredivisie', 'Bundesliga', 'Premier League', 'Championship',
    'Austrian Bundesliga', 'Swiss Super League', 'Belgian Pro League',
    'Norwegian Eliteserien', 'Swedish Allsvenskan',
  ],
  'mid_scoring': [
    'La Liga', 'Serie A', 'Ligue 1', 'Primeira Liga',
    'Scottish Premiership', 'Danish Superliga', 'MLS',
    'Brasileirao Serie A', 'Liga MX', 'Argentine Primera',
  ],
  'low_scoring': [
    'Super Lig', 'Greek Super League', 'Russian Premier League',
    'Ukrainian Premier League', 'Saudi Pro League',
    'J1 League', 'K League 1', 'Chinese Super League',
  ],
};

function getLeagueCluster(league: string): string {
  for (const [cluster, leagues] of Object.entries(LEAGUE_CLUSTERS)) {
    if (leagues.some(l => league.toLowerCase().includes(l.toLowerCase()))) return cluster;
  }
  return 'global';
}

// Generate cluster-specific market key
function clusterMarketKey(market: string, cluster: string): string {
  return cluster === 'global' ? market : `${market}__${cluster}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'status';

    // ═══════════════════════════════════════════
    // STATUS — Show all model states
    // ═══════════════════════════════════════════
    if (action === 'status') {
      const { data: models } = await supabase
        .from('ml_models')
        .select('market, model_type, auc_roc, accuracy, training_samples, test_samples, training_date, version, is_active, weights')
        .eq('is_active', true)
        .order('market');

      const { count: totalData } = await supabase
        .from('ml_training_data_v2')
        .select('*', { count: 'exact', head: true });

      return new Response(JSON.stringify({
        total_training_data: totalData,
        active_models: models?.length || 0,
        models: models?.map(m => {
          const w = m.weights as any;
          return {
            market: m.market,
            type: m.model_type,
            cluster: w?.league_cluster || 'global',
            auc: m.auc_roc,
            accuracy: m.accuracy,
            samples: m.training_samples,
            trees: w?.n_trained || m.version,
            engine: w?.engine_version || 'unknown',
            trained: m.training_date,
            early_stopped: w?.rounds_without_improvement >= 5,
          };
        }),
        cluster_coverage: {
          expected: MARKETS.length * (CLUSTERS.length + 1), // +1 for global fallback
          clusters: CLUSTERS,
          markets: MARKETS,
        },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════
    // DAILY-TRAIN — Train ONE model per call (rotating through all models)
    // Designed to be called by a daily cron, avoids timeout by only training 1 model
    // ═══════════════════════════════════════════
    if (action === 'daily-train') {
      const treesPerCall = body.treesPerCall || 10;
      const totalTrees = body.totalTrees || 100;
      
      // Build the full list of market+cluster combos
      const allModels: { market: string; cluster: string; marketKey: string }[] = [];
      for (const market of MARKETS) {
        for (const cluster of [...CLUSTERS, 'global']) {
          allModels.push({ market, cluster, marketKey: clusterMarketKey(market, cluster) });
        }
      }

      // Find the model that was trained least recently (or never)
      const { data: existingModels } = await supabase
        .from('ml_models')
        .select('market, training_date')
        .eq('model_type', 'gradient_boosted_trees')
        .eq('is_active', true);

      const trainedMap = new Map((existingModels || []).map(m => [m.market, m.training_date]));

      // Sort by oldest training date first (null = never trained = highest priority)
      allModels.sort((a, b) => {
        const dateA = trainedMap.get(a.marketKey);
        const dateB = trainedMap.get(b.marketKey);
        if (!dateA && !dateB) return 0;
        if (!dateA) return -1;
        if (!dateB) return 1;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });

      // Train the oldest model
      const target = allModels[0];
      console.log(`🎯 Daily train: ${target.marketKey} (oldest model)`);

      const trainUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ml-train-engine`;
      const trainResp = await fetch(trainUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          market: target.marketKey,
          leagueCluster: target.cluster === 'global' ? null : target.cluster,
          treesPerCall,
          totalTrees,
          resume: true,
        }),
      });

      const result = await trainResp.json();

      return new Response(JSON.stringify({
        success: true,
        action: 'daily-train',
        model_trained: target.marketKey,
        cluster: target.cluster,
        result,
        all_models_count: allModels.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════
    // TRAIN-ALL — Train all 12 cluster×market models
    // ═══════════════════════════════════════════
    if (action === 'train-all' || action === 'retrain') {
      const isRetrain = action === 'retrain';
      const totalTrees = body.totalTrees || 1500;
      const treesPerCall = body.treesPerCall || 10;
      const sampleSize = body.sampleSize || 60000;
      const results: any[] = [];

      // Train cluster-specific models + global fallback
      const clusterList = [...CLUSTERS, 'global'];

      for (const market of MARKETS) {
        for (const cluster of clusterList) {
          const marketKey = clusterMarketKey(market, cluster);

          if (isRetrain) {
            await supabase
              .from('ml_models')
              .update({ is_active: false })
              .eq('market', marketKey)
              .eq('model_type', 'gradient_boosted_trees');
          }

          const trainUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ml-train-engine`;
          const trainResp = await fetch(trainUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              market: marketKey,
              leagueCluster: cluster === 'global' ? null : cluster,
              treesPerCall,
              totalTrees,
              sampleSize,
              resume: !isRetrain,
            }),
          });

          const trainResult = await trainResp.json();
          results.push({ market: marketKey, cluster, ...trainResult });
        }
      }

      const incomplete = results.filter(r => r.hasMore);

      return new Response(JSON.stringify({
        success: true,
        action,
        total_models: results.length,
        results,
        all_complete: incomplete.length === 0,
        models_needing_more: incomplete.map(r => r.market),
        instruction: incomplete.length > 0
          ? 'Call again with same action to continue training remaining trees'
          : 'All 16 models fully trained! (4 markets × 4 clusters incl. global)',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════
    // TRAIN-MARKET — Train a specific market (with optional cluster)
    // ═══════════════════════════════════════════
    if (action === 'train-market') {
      const market = body.market;
      const cluster = body.cluster || null; // null = train all clusters for this market
      
      if (!market || !MARKETS.includes(market)) {
        return new Response(JSON.stringify({ error: `Invalid market. Use: ${MARKETS.join(', ')}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const clusterList = cluster ? [cluster] : [...CLUSTERS, 'global'];
      const results: any[] = [];

      for (const c of clusterList) {
        const marketKey = clusterMarketKey(market, c);
        const trainUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ml-train-engine`;
        const trainResp = await fetch(trainUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            market: marketKey,
            leagueCluster: c === 'global' ? null : c,
            treesPerCall: body.treesPerCall || 10,
            totalTrees: body.totalTrees || 1500,
            sampleSize: body.sampleSize || 60000,
            resume: body.resume !== false,
          }),
        });

        const result = await trainResp.json();
        results.push({ market: marketKey, cluster: c, ...result });
      }

      return new Response(JSON.stringify({
        success: true,
        market,
        clusters_trained: clusterList,
        results,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════
    // PREDICT — Cluster-routed inference + AI
    // ═══════════════════════════════════════════
    if (action === 'predict') {
      const fixtureDate = body.date || new Date().toISOString().split('T')[0];

      // Load ALL active GBT models (cluster + global)
      const { data: models } = await supabase
        .from('ml_models')
        .select('market, weights')
        .eq('model_type', 'gradient_boosted_trees')
        .eq('is_active', true);

      if (!models?.length) {
        return new Response(JSON.stringify({ error: 'No trained GBT models found. Run train-all first.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Index models by market key
      const modelIndex = new Map<string, any>();
      for (const m of models) {
        modelIndex.set(m.market, m.weights);
      }

      const fixtures = body.fixtures || [];
      if (!fixtures.length) {
        return new Response(JSON.stringify({
          error: 'Provide fixtures array with feature data',
          required_format: { fixture_id: 'string', home_team: 'string', away_team: 'string', league: 'string', features: {} }
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Generate predictions with cluster routing
      const mlPredictions: any[] = [];
      const routingLog: any[] = [];

      for (const fixture of fixtures) {
        const league = fixture.league || '';
        const cluster = getLeagueCluster(league);

        for (const market of MARKETS) {
          // Try cluster-specific model first, fall back to global
          const clusterKey = clusterMarketKey(market, cluster);
          const globalKey = market; // global models use plain market name
          
          let state = modelIndex.get(clusterKey);
          let usedModel = clusterKey;
          
          if (!state) {
            state = modelIndex.get(globalKey);
            usedModel = globalKey;
          }

          if (!state?.trees?.length || !state?.feature_names) continue;

          const feats = state.feature_names.map((name: string) => {
            const val = fixture.features?.[name] ?? fixture[name];
            return val !== null && val !== undefined ? Number(val) : NaN;
          });

          // Impute NaN with medians
          if (state.feature_medians) {
            for (let i = 0; i < feats.length; i++) {
              if (feats[i] !== feats[i]) feats[i] = state.feature_medians[i] || 0;
            }
          }

          // Predict using dual-model blending
          const wA = state.blend_weight_a || 0.5;
          const wB = 1 - wA;
          const lrA = state.learning_rate;
          const lrB = lrA * 1.75; // Model B has higher LR

          let scoreA = state.base_score;
          for (const tree of state.trees) scoreA += lrA * predictTree(tree, feats);
          const probA = sigmoid(scoreA);

          let probB = probA;
          if (state.trees_b?.length) {
            let scoreB = state.base_score;
            for (const tree of state.trees_b) scoreB += lrB * predictTree(tree, feats);
            probB = sigmoid(scoreB);
          }

          let prob = wA * probA + wB * probB;

          // Apply isotonic calibration
          if (state.isotonic_map?.length) {
            prob = applyIsotonicCalibration(prob, state.isotonic_map);
          }

          // Apply sanity cap
          if (state.sanity_caps?.max_probability) {
            prob = Math.min(prob, state.sanity_caps.max_probability);
          }

          mlPredictions.push({
            fixture_id: fixture.fixture_id,
            home_team: fixture.home_team,
            away_team: fixture.away_team,
            league,
            market,
            ml_probability: Math.round(prob * 10000) / 10000,
            model_used: usedModel,
            cluster_routed: cluster,
          });

          routingLog.push({ fixture_id: fixture.fixture_id, market, cluster, model: usedModel });
        }
      }

      // Send to AI layer for refinement
      const aiUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ml-ai-layer`;
      const aiResp = await fetch(aiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ predictions: mlPredictions }),
      });

      const aiResult = await aiResp.json();

      return new Response(JSON.stringify({
        success: true,
        date: fixtureDate,
        fixtures: fixtures.length,
        predictions: aiResult.predictions || mlPredictions,
        ml_only: !aiResult.success,
        routing_log: routingLog,
        models_available: models.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ═══════════════════════════════════════════
    // H2H-COMPUTE — Build H2H features from historical matches
    // ═══════════════════════════════════════════
    if (action === 'h2h-compute') {
      const targetRows = body.limit || 50000;
      const pageSize = 1000;
      
      // Paginated fetch to bypass Supabase 1000-row default limit
      const allMatches: any[] = [];
      let offset = 0;
      while (allMatches.length < targetRows) {
        const { data: page, error: pageErr } = await supabase
          .from('ml_training_data_v2')
          .select('home_team, away_team, total_goals, total_corners, total_cards, btts_hit, over_25_hit, fixture_date')
          .not('total_goals', 'is', null)
          .order('fixture_date', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (pageErr) throw pageErr;
        if (!page?.length) break;
        allMatches.push(...page);
        offset += pageSize;
        if (page.length < pageSize) break;
      }

      const matches = allMatches;
      if (!matches.length) {
        return new Response(JSON.stringify({ error: 'No match data' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build H2H lookup: key = sorted team pair
      const h2hMap = new Map<string, any[]>();
      
      for (const m of matches) {
        const pair = [m.home_team, m.away_team].sort().join('|||');
        if (!h2hMap.has(pair)) h2hMap.set(pair, []);
        h2hMap.get(pair)!.push({
          goals: m.total_goals || 0,
          corners: m.total_corners || 0,
          cards: m.total_cards || 0,
          btts: m.btts_hit ? 1 : 0,
          over25: m.over_25_hit ? 1 : 0,
        });
      }

      // Compute H2H stats for pairs with ≥2 meetings
      const h2hStats: any[] = [];
      let pairsProcessed = 0;

      for (const [pair, meetings] of h2hMap.entries()) {
        if (meetings.length < 2) continue;
        
        const last5 = meetings.slice(0, 5); // Already sorted desc
        const [teamA, teamB] = pair.split('|||');
        
        const stats = {
          team_a: teamA,
          team_b: teamB,
          meetings: last5.length,
          h2h_avg_goals: Math.round((last5.reduce((s, m) => s + m.goals, 0) / last5.length) * 100) / 100,
          h2h_over25_rate: Math.round((last5.filter(m => m.over25).length / last5.length) * 100) / 100,
          h2h_btts_rate: Math.round((last5.filter(m => m.btts).length / last5.length) * 100) / 100,
          h2h_avg_corners: Math.round((last5.reduce((s, m) => s + m.corners, 0) / last5.length) * 100) / 100,
          h2h_avg_cards: Math.round((last5.reduce((s, m) => s + m.cards, 0) / last5.length) * 100) / 100,
        };
        
        h2hStats.push(stats);
        pairsProcessed++;
      }

      return new Response(JSON.stringify({
        success: true,
        total_matches_scanned: matches.length,
        unique_pairs: h2hMap.size,
        pairs_with_h2h: pairsProcessed,
        h2h_stats: h2hStats.slice(0, 100), // Return first 100 for preview
        usage: 'These H2H features will be integrated into the training feature vector in the next engine update',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ 
      error: 'Unknown action. Use: status, train-all, train-market, retrain, predict, h2h-compute' 
    }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Orchestrator error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ═══════════════════════════════════════════
// HELPERS (duplicated to avoid import issues)
// ═══════════════════════════════════════════

function predictTree(tree: any, features: number[]): number {
  if (tree.v !== undefined) return tree.v;
  const val = features[tree.f];
  if (val !== val || val <= tree.t) return predictTree(tree.l, features);
  return predictTree(tree.r, features);
}

function sigmoid(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

function applyIsotonicCalibration(score: number, isoMap: number[][]): number {
  if (!isoMap || isoMap.length === 0) return score;
  if (score <= isoMap[0][0]) return isoMap[0][1];
  if (score >= isoMap[isoMap.length - 1][0]) return isoMap[isoMap.length - 1][1];
  for (let i = 1; i < isoMap.length; i++) {
    if (score <= isoMap[i][0]) {
      const t = (score - isoMap[i - 1][0]) / (isoMap[i][0] - isoMap[i - 1][0]);
      return isoMap[i - 1][1] + t * (isoMap[i][1] - isoMap[i - 1][1]);
    }
  }
  return score;
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ML INFERENCE ENGINE V2 — Rolling Stats Powered
 * 
 * 1. Looks up both teams' L10 rolling stats from team_rolling_stats
 * 2. Builds the same V3 feature vector the GBT engine was trained on
 * 3. Runs prediction through stored GBT model trees
 * 4. Returns probability, confidence, and rolling stats context
 */

interface TreeNode {
  f?: number; t?: number; l?: TreeNode; r?: TreeNode; v?: number;
}

interface RollingStats {
  team_name: string;
  avg_goals_scored: number;
  avg_goals_conceded: number;
  avg_total_goals: number;
  over_15_goals_pct: number;
  over_25_goals_pct: number;
  over_35_goals_pct: number;
  btts_pct: number;
  clean_sheet_pct: number;
  failed_to_score_pct: number;
  avg_corners_for: number;
  avg_corners_against: number;
  avg_total_corners: number;
  over_85_corners_pct: number;
  over_95_corners_pct: number;
  over_105_corners_pct: number;
  avg_cards_for: number;
  avg_cards_against: number;
  avg_total_cards: number;
  over_25_cards_pct: number;
  over_35_cards_pct: number;
  over_45_cards_pct: number;
  avg_shots_for: number;
  avg_shots_on_target: number;
  avg_xg_for: number;
  avg_xg_against: number;
  avg_possession: number;
  wins: number;
  draws: number;
  losses: number;
  form_string: string;
  matches_used: number;
  league: string;
}

// ═══════════════════════════════════════
// GBT TREE PREDICTION
// ═══════════════════════════════════════
function predictTree(node: TreeNode, features: number[]): number {
  if (node.v !== undefined) return node.v;
  if (node.f === undefined || node.t === undefined) return 0;
  return features[node.f] <= node.t
    ? predictTree(node.l!, features)
    : predictTree(node.r!, features);
}

function predictGBT(trees: TreeNode[], baseScore: number, lr: number, features: number[]): number {
  let score = baseScore;
  for (const tree of trees) {
    score += lr * predictTree(tree, features);
  }
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, score))));
}

function safeNum(v: any, fallback = 0): number {
  const n = Number(v);
  return (n === n && v !== null && v !== undefined) ? n : fallback;
}

// ═══════════════════════════════════════
// POISSON HELPERS
// ═══════════════════════════════════════
function poissonCDF(lambda: number, k: number): number {
  if (lambda <= 0) return k <= 0 ? 1 : 0;
  let sum = 0, term = Math.exp(-lambda);
  for (let i = 0; i < k; i++) { sum += term; term *= lambda / (i + 1); }
  return sum;
}
function poissonProbOver(lambda: number, threshold: number): number {
  return Math.max(0, Math.min(1, 1 - poissonCDF(lambda, threshold)));
}
function eloPower(gf: number, ga: number): number {
  return Math.log(Math.max(gf, 0.1) / Math.max(ga, 0.1));
}

// ═══════════════════════════════════════
// BUILD FEATURES FROM ROLLING STATS
// Match the V3 training engine's feature vector exactly
// ═══════════════════════════════════════
function buildFeatures(market: string, home: RollingStats, away: RollingStats, leagueAvg: any): number[] {
  // We build the same engineered features the V3 engine uses
  // The model was trained on: raw DB columns + engineered features
  // Since we have rolling stats, we map them to the same feature space
  
  const hGF = safeNum(home.avg_goals_scored, 1.3);
  const hGA = safeNum(home.avg_goals_conceded, 1.3);
  const aGF = safeNum(away.avg_goals_scored, 1.1);
  const aGA = safeNum(away.avg_goals_conceded, 1.3);
  const hCF = safeNum(home.avg_corners_for, 5);
  const hCA = safeNum(home.avg_corners_against, 5);
  const aCF = safeNum(away.avg_corners_for, 4.5);
  const aCA = safeNum(away.avg_corners_against, 4.5);
  const hCardF = safeNum(home.avg_cards_for, 1.8);
  const hCardA = safeNum(home.avg_cards_against, 1.8);
  const aCardF = safeNum(away.avg_cards_for, 1.6);
  const aCardA = safeNum(away.avg_cards_against, 1.6);
  const lgGoals = safeNum(leagueAvg.goals, 2.5);
  const lgCorners = safeNum(leagueAvg.corners, 10);
  const lgCards = safeNum(leagueAvg.cards, 3.5);

  switch (market) {
    case 'over_2.5_goals': {
      const homeExpected = (hGF + aGA) / 2;
      const awayExpected = (aGF + hGA) / 2;
      const totalLambda = homeExpected + awayExpected;
      return [
        // Raw rolling features (mapped to L5/L10/L20 slots — use L10 for all since that's what we have)
        hGF, hGF, hGF,       // home_goals_for L5/L10/L20
        hGA, hGA, hGA,       // home_goals_against L5/L10/L20
        aGF, aGF, aGF,       // away_goals_for L5/L10/L20
        aGA, aGA, aGA,       // away_goals_against L5/L10/L20
        hGF + aGF,            // combined_goals_for_10
        lgGoals,              // league_avg_goals
        safeNum(leagueAvg.over25_rate, 0.5), // league_over25_rate
        (hGA + aGA) - lgGoals,  // defense_weakness_index_10
        // Engineered features
        poissonProbOver(totalLambda, 3),     // poisson_over25_combined
        poissonProbOver(totalLambda, 2),     // poisson_over15_combined
        eloPower(hGF, hGA),                  // home_elo_power
        eloPower(aGF, aGA),                  // away_elo_power
        eloPower(hGF, hGA) + eloPower(aGF, aGA), // elo_power_sum
        hGF * aGA,                           // home_attack_x_away_defense
        aGF * hGA,                           // away_attack_x_home_defense
        (hGF * aGA) + (aGF * hGA),          // combined_attack_defense_product
        0, 0,                                // momentum (L5-L20 = 0 since we only have L10)
        hGF - lgGoals / 2,                   // home_goals_vs_league
        aGF - lgGoals / 2,                   // away_goals_vs_league
        hGF - hGA,                           // home_goal_diff_10
        aGF - aGA,                           // away_goal_diff_10
        hGF + aGF,                           // total_expected_goals
        hGA + aGA,                           // total_goals_conceded
        0, 0,                                // form_consistency (L5-L10 = 0)
        hGA / Math.max(aGA, 0.1),           // defense_ratio
      ];
    }
    
    case 'btts': {
      const homeLambda = (hGF + aGA) / 2;
      const awayLambda = (aGF + hGA) / 2;
      return [
        hGF, hGF, hGF, hGA, hGA, hGA,
        aGF, aGF, aGF, aGA, aGA, aGA,
        hGF + aGF,
        safeNum(leagueAvg.btts_rate, 0.5),
        lgGoals,
        (hGA + aGA) - lgGoals,
        // Engineered
        (1 - Math.exp(-homeLambda)) * (1 - Math.exp(-awayLambda)), // poisson_btts
        eloPower(hGF, hGA),
        eloPower(aGF, aGA),
        Math.min(hGF, aGF),        // min_attack_power
        Math.max(hGA, aGA),         // max_defense_weakness
        hGF * aGF,                  // both_attack_product
        hGA * aGA,                  // both_concede_product
        hGF * aGA,                  // home_attack_x_away_defense
        aGF * hGA,                  // away_attack_x_home_defense
        0, 0,                       // momentum
        hGF - lgGoals / 2,
        aGF - lgGoals / 2,
        Math.min(hGA, aGA),         // min_concede_rate
        hGF - hGA,
        aGF - aGA,
        0, 0,                       // form_consistency
      ];
    }
    
    case 'over_9.5_corners': {
      const totalCorners = hCF + aCF;
      return [
        hCF, hCF, hCF, hCA, hCA, hCA,
        aCF, aCF, aCF, aCA, aCA, aCA,
        hCF + aCF,
        lgCorners,
        hGF, aGF, hGF + aGF,       // goals drive corners
        // Engineered
        poissonProbOver(totalCorners, 10),
        hCF + aCF,                   // total_corners_expected
        hCA + aCA,                   // total_corners_conceded
        (hCF + hCA + aCF + aCA) / 2, // avg_match_corners
        0, 0,                        // momentum
        (hCF + aCF) - lgCorners,     // corners_vs_league
        hGF + aGF,                   // combined_attack_intensity
        hCF / Math.max(aCF, 0.1),   // corner_dominance
        hCF + aCF,                   // total_corners_l5
        0, 0,                        // consistency
        Math.log(Math.max(hCF, 0.1) / Math.max(hCA, 0.1)),
        Math.log(Math.max(aCF, 0.1) / Math.max(aCA, 0.1)),
      ];
    }
    
    case 'over_3.5_cards': {
      const totalCards = hCardF + aCardF;
      const hFouls = safeNum(home.avg_cards_for, 1.8) * 5; // rough fouls estimate
      const aFouls = safeNum(away.avg_cards_for, 1.6) * 5;
      const refCards = safeNum(leagueAvg.ref_cards, lgCards);
      return [
        hCardF, hCardF, hCardF, hCardA, hCardA, hCardA,
        aCardF, aCardF, aCardF, aCardA, aCardA, aCardA,
        hFouls, hFouls, hFouls,      // home fouls L5/L10/L20
        aFouls, aFouls, aFouls,      // away fouls L5/L10/L20
        hCardF + aCardF,             // combined_cards_10
        refCards,                     // ref_avg_cards_last50
        refCards > lgCards ? 1 : 0,  // ref_over35_cards_rate_last50
        lgCards,
        // Engineered
        poissonProbOver(totalCards, 4),
        hCardF + aCardF,
        hCardA + aCardA,
        hFouls + aFouls,             // total_fouls
        hCardF / Math.max(hFouls, 0.1),
        aCardF / Math.max(aFouls, 0.1),
        refCards - lgCards,           // ref_strictness_vs_league
        refCards * (hFouls + aFouls), // ref_x_fouls
        0, 0,                        // momentum
        (hCardF + aCardF) - lgCards,
        hCardA + aCardA,
        0,                           // fouls_momentum
        Math.log(Math.max(hCardF, 0.01) / Math.max(hCardA, 0.01)),
        Math.log(Math.max(aCardF, 0.01) / Math.max(aCardA, 0.01)),
        0, 0,                        // consistency
      ];
    }
    
    default:
      return [];
  }
}

// ═══════════════════════════════════════
// CONFIDENCE TIER
// ═══════════════════════════════════════
function getConfidence(prob: number): 'low' | 'medium' | 'high' {
  if (prob > 0.70) return 'high';
  if (prob > 0.55) return 'medium';
  return 'low';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { home_team, away_team, markets = ['over_2.5_goals', 'btts', 'over_9.5_corners', 'over_3.5_cards'] } = body;

    if (!home_team || !away_team) {
      return new Response(
        JSON.stringify({ error: 'home_team and away_team required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔮 ML Inference V2: ${home_team} vs ${away_team}`);

    // Step 1: Look up both teams' rolling stats
    const { data: rollingData } = await supabase
      .from('team_rolling_stats')
      .select('*')
      .in('team_name', [home_team, away_team]);

    const homeStats = rollingData?.find((r: any) => r.team_name === home_team) as RollingStats | undefined;
    const awayStats = rollingData?.find((r: any) => r.team_name === away_team) as RollingStats | undefined;

    if (!homeStats) console.log(`⚠️ No rolling stats for ${home_team} — using defaults`);
    if (!awayStats) console.log(`⚠️ No rolling stats for ${away_team} — using defaults`);

    const defaultStats: RollingStats = {
      team_name: 'Unknown', avg_goals_scored: 1.3, avg_goals_conceded: 1.2,
      avg_total_goals: 2.5, over_15_goals_pct: 65, over_25_goals_pct: 50,
      over_35_goals_pct: 25, btts_pct: 50, clean_sheet_pct: 30,
      failed_to_score_pct: 25, avg_corners_for: 5, avg_corners_against: 5,
      avg_total_corners: 10, over_85_corners_pct: 55, over_95_corners_pct: 45,
      over_105_corners_pct: 30, avg_cards_for: 1.8, avg_cards_against: 1.8,
      avg_total_cards: 3.6, over_25_cards_pct: 60, over_35_cards_pct: 45,
      over_45_cards_pct: 25, avg_shots_for: 12, avg_shots_on_target: 4,
      avg_xg_for: 1.3, avg_xg_against: 1.2, avg_possession: 50,
      wins: 4, draws: 3, losses: 3, form_string: 'WDLWDLWDLW',
      matches_used: 10, league: 'Unknown',
    };

    const home = homeStats || { ...defaultStats, team_name: home_team };
    const away = awayStats || { ...defaultStats, team_name: away_team };

    // Compute rough league averages from both teams' data
    const leagueAvg = {
      goals: ((home.avg_total_goals || 2.5) + (away.avg_total_goals || 2.5)) / 2,
      corners: ((home.avg_total_corners || 10) + (away.avg_total_corners || 10)) / 2,
      cards: ((home.avg_total_cards || 3.5) + (away.avg_total_cards || 3.5)) / 2,
      over25_rate: ((home.over_25_goals_pct || 50) + (away.over_25_goals_pct || 50)) / 200,
      btts_rate: ((home.btts_pct || 50) + (away.btts_pct || 50)) / 200,
      ref_cards: 3.5, // default
    };

    // Step 2: Load active GBT models
    const { data: models } = await supabase
      .from('ml_models')
      .select('market, weights, version, model_type, accuracy, auc_roc, brier_score, calibration_slope, calibration_intercept, reliability_bins, model_confidence_score')
      .eq('is_active', true)
      .eq('model_type', 'gradient_boosted_trees')
      .in('market', markets);

    // ── GOVERNANCE BLOCK ─────────────────────────────────────────────────────
    // Reject any active model that is missing mandatory proof pack fields.
    // A model without Brier, calibration, or reliability_bins has not passed
    // the validation gate and must NOT serve predictions.
    const governanceRejections: string[] = [];
    const governanceApproved: any[] = [];
    for (const m of (models || [])) {
      const missing: string[] = [];
      if (m.brier_score == null)          missing.push('brier_score');
      if (m.calibration_slope == null)    missing.push('calibration_slope');
      if (m.reliability_bins == null || (Array.isArray(m.reliability_bins) && m.reliability_bins.length === 0))
                                          missing.push('reliability_bins');
      if (missing.length > 0) {
        console.warn(`🚫 GOVERNANCE REJECT model market=${m.market} v${m.version}: missing [${missing.join(', ')}] — falling back to heuristic`);
        governanceRejections.push(m.market);
      } else {
        governanceApproved.push(m);
        console.log(`✅ GOVERNANCE PASS model market=${m.market} v${m.version} brier=${m.brier_score} cal_slope=${m.calibration_slope}`);
      }
    }

    // Build model map using ONLY governance-approved models
    const modelMap = new Map<string, any>();
    for (const m of governanceApproved) modelMap.set(m.market, m);
    if (governanceRejections.length > 0) {
      console.warn(`🚫 ${governanceRejections.length} market(s) will use heuristic fallback due to governance failure: [${governanceRejections.join(', ')}]`);
    }

    // Step 3: Run predictions
    const predictions = [];

    for (const market of markets) {
      const features = buildFeatures(market, home, away, leagueAvg);
      const model = modelMap.get(market);
      
      let probability: number;
      let modelType = 'heuristic';
      let modelVersion = 0;

      if (model?.weights?.trees && model.weights.trees.length > 0) {
        // Run through trained GBT trees
        const { trees, base_score, learning_rate, feature_medians } = model.weights;
        
        // Apply median imputation for any NaN/missing
        const cleanFeatures = features.map((f, i) => {
          if (isNaN(f) || f === null || f === undefined) {
            return feature_medians?.[i] || 0;
          }
          return f;
        });

        probability = predictGBT(trees, base_score || 0, learning_rate || 0.05, cleanFeatures);
        modelType = 'gradient_boosted_trees';
        modelVersion = model.version;
        console.log(`  🌳 ${market}: GBT (${trees.length} trees) → ${(probability * 100).toFixed(1)}%`);
      } else {
        // Heuristic fallback using rolling stats directly
        probability = heuristicFromRolling(market, home, away);
        console.log(`  📊 ${market}: Heuristic → ${(probability * 100).toFixed(1)}%`);
      }

      predictions.push({
        market,
        probability: parseFloat(probability.toFixed(4)),
        prediction: probability >= 0.55,
        confidence: getConfidence(probability),
        model_type: modelType,
        model_version: modelVersion,
        model_auc: model?.auc_roc || null,
      });
    }

    predictions.sort((a, b) => b.probability - a.probability);

    console.log('✅ Inference complete:', predictions.map(p => `${p.market}: ${(p.probability * 100).toFixed(1)}%`).join(', '));

    return new Response(JSON.stringify({
      success: true,
      home_team,
      away_team,
      predictions,
      rolling_stats: {
        home: {
          team: home.team_name,
          form: home.form_string,
          matches: home.matches_used,
          avg_goals: home.avg_goals_scored,
          avg_corners: home.avg_corners_for,
          avg_cards: home.avg_cards_for,
          btts_pct: home.btts_pct,
          over25_pct: home.over_25_goals_pct,
        },
        away: {
          team: away.team_name,
          form: away.form_string,
          matches: away.matches_used,
          avg_goals: away.avg_goals_scored,
          avg_corners: away.avg_corners_for,
          avg_cards: away.avg_cards_for,
          btts_pct: away.btts_pct,
          over25_pct: away.over_25_goals_pct,
        },
      },
      timestamp: new Date().toISOString(),
      governance: {
        approved: governanceApproved.map(m => m.market),
        rejected: governanceRejections,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Inference error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Heuristic fallback using rolling stats
function heuristicFromRolling(market: string, home: RollingStats, away: RollingStats): number {
  switch (market) {
    case 'over_2.5_goals': {
      const avgTotal = (safeNum(home.avg_total_goals, 2.5) + safeNum(away.avg_total_goals, 2.5)) / 2;
      const pctAvg = (safeNum(home.over_25_goals_pct, 50) + safeNum(away.over_25_goals_pct, 50)) / 200;
      const lambda = safeNum(home.avg_goals_scored, 1.3) + safeNum(away.avg_goals_scored, 1.1);
      const poisson = poissonProbOver(lambda, 3);
      return pctAvg * 0.5 + poisson * 0.3 + (avgTotal > 2.5 ? 0.15 : 0.05) + 0.05;
    }
    case 'btts': {
      const pctAvg = (safeNum(home.btts_pct, 50) + safeNum(away.btts_pct, 50)) / 200;
      const bothScore = (1 - Math.exp(-safeNum(home.avg_goals_scored, 1.3))) * (1 - Math.exp(-safeNum(away.avg_goals_scored, 1.1)));
      return pctAvg * 0.6 + bothScore * 0.4;
    }
    case 'over_9.5_corners': {
      const totalCorners = safeNum(home.avg_corners_for, 5) + safeNum(away.avg_corners_for, 4.5);
      const pctAvg = (safeNum(home.over_95_corners_pct, 45) + safeNum(away.over_95_corners_pct, 45)) / 200;
      const poisson = poissonProbOver(totalCorners, 10);
      return pctAvg * 0.5 + poisson * 0.3 + (totalCorners > 10 ? 0.15 : 0.05) + 0.05;
    }
    case 'over_3.5_cards': {
      const totalCards = safeNum(home.avg_cards_for, 1.8) + safeNum(away.avg_cards_for, 1.6);
      const pctAvg = (safeNum(home.over_35_cards_pct, 45) + safeNum(away.over_35_cards_pct, 45)) / 200;
      const poisson = poissonProbOver(totalCards, 4);
      return pctAvg * 0.5 + poisson * 0.3 + (totalCards > 3.5 ? 0.15 : 0.05) + 0.05;
    }
    default: return 0.5;
  }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ═══════════════════════════════════════════════════════════════
// V5 RESEARCH-GRADE GBT ENGINE
// ─────────────────────────────────────────────────────────────
// Expert-guided upgrades from V4:
// 1. Time-based 70/15/15 train/val/test split (sorted by date, NO shuffle)
// 2. League-cluster models (high-scoring vs low-scoring style)
// 3. Sample recency weights (up-weight recent, down-weight old)
// 4. Poisson GLM stacking for ALL 4 markets (not just corners/cards)
// 5. Second-order gradients (Hessian) confirmed + per-leaf regularization
// 6. H2H-style features via Elo offensive/defensive ratings
// 7. Enhanced defence-weakness: xga_per_shot, cards_per_foul
// 8. Set-piece/efficiency proxies: corners_per_shot, xg_per_shot
// 9. Fast SHAP-style feature contributions (marginal method)
// 10. Sanity-rule caps tied to league averages
// 11. Tree target 1500 with tight early stopping (5 rounds)
// 12. Walk-forward validation awareness
// ═══════════════════════════════════════════════════════════════

interface TreeNode {
  f?: number; t?: number; l?: TreeNode; r?: TreeNode; v?: number;
}

interface GBTModelState {
  trees: TreeNode[];
  trees_b?: TreeNode[];
  base_score: number;
  learning_rate: number;
  max_depth: number;
  feature_names: string[];
  engineered_feature_names: string[];
  market: string;
  n_trained: number;
  target_trees: number;
  train_auc: number | null;
  val_auc: number | null;
  train_accuracy: number | null;
  val_accuracy: number | null;
  feature_medians: number[];
  engine_version: string;
  best_val_auc?: number;
  rounds_without_improvement?: number;
  blend_weight_a?: number;
  blend_weight_b?: number;
  isotonic_map?: number[][];
  feature_importance?: Record<string, number>;
  shap_top3_example?: Record<string, number>;
  sanity_caps?: Record<string, number>;
  league_cluster?: string;
}

// ═══════════════════════════════════════════
// RAW DB COLUMNS per market
// ═══════════════════════════════════════════
// Shared derived/tactical feature columns available across markets
const DERIVED_COLS = [
  'home_shots_for_avg_10', 'away_shots_for_avg_10',
  'home_shots_on_target_avg_10', 'away_shots_on_target_avg_10',
  'home_fouls_for_avg_10', 'away_fouls_for_avg_10',
];

// Odds columns — only available in sportmonks_ml_features, NOT ml_training_data_v2
// Will be included when training from sportmonks_ml_features in future
const ODDS_COLS: string[] = [];

const RAW_COLUMNS: Record<string, string[]> = {
  'over_2.5_goals': [
    'home_goals_for_avg_5', 'home_goals_for_avg_10', 'home_goals_for_avg_20',
    'home_goals_against_avg_5', 'home_goals_against_avg_10', 'home_goals_against_avg_20',
    'away_goals_for_avg_5', 'away_goals_for_avg_10', 'away_goals_for_avg_20',
    'away_goals_against_avg_5', 'away_goals_against_avg_10', 'away_goals_against_avg_20',
    'home_xg_for_avg_10', 'home_xg_against_avg_10',
    'away_xg_for_avg_10', 'away_xg_against_avg_10',
    'home_shots_for_avg_10', 'away_shots_for_avg_10',
    'home_shots_on_target_avg_10', 'away_shots_on_target_avg_10',
    'combined_goals_for_10', 'combined_xg_for_10', 'combined_shots_10',
    'xg_diff_10', 'defense_weakness_index_10',
    'league_avg_goals', 'league_over25_rate',
    // Tactical proxies (cross-market)
    'home_fouls_for_avg_10', 'away_fouls_for_avg_10',
    // Odds features
    ...ODDS_COLS,
  ],
  'btts': [
    'home_goals_for_avg_5', 'home_goals_for_avg_10', 'home_goals_for_avg_20',
    'home_goals_against_avg_5', 'home_goals_against_avg_10', 'home_goals_against_avg_20',
    'away_goals_for_avg_5', 'away_goals_for_avg_10', 'away_goals_for_avg_20',
    'away_goals_against_avg_5', 'away_goals_against_avg_10', 'away_goals_against_avg_20',
    'home_xg_for_avg_10', 'home_xg_against_avg_10',
    'away_xg_for_avg_10', 'away_xg_against_avg_10',
    'home_shots_for_avg_10', 'away_shots_for_avg_10',
    'combined_goals_for_10', 'combined_xg_for_10',
    'xg_diff_10', 'defense_weakness_index_10',
    'league_btts_rate', 'league_avg_goals',
    // Tactical proxies
    'home_shots_on_target_avg_10', 'away_shots_on_target_avg_10',
    'home_fouls_for_avg_10', 'away_fouls_for_avg_10',
    // Odds features
    ...ODDS_COLS,
  ],
  'over_9.5_corners': [
    'home_corners_for_avg_5', 'home_corners_for_avg_10', 'home_corners_for_avg_20',
    'home_corners_against_avg_5', 'home_corners_against_avg_10', 'home_corners_against_avg_20',
    'away_corners_for_avg_5', 'away_corners_for_avg_10', 'away_corners_for_avg_20',
    'away_corners_against_avg_5', 'away_corners_against_avg_10', 'away_corners_against_avg_20',
    'combined_corners_10', 'league_avg_corners',
    'home_shots_for_avg_10', 'away_shots_for_avg_10',
    'home_goals_for_avg_10', 'away_goals_for_avg_10',
    'combined_goals_for_10', 'combined_shots_10',
    // Tactical proxies for corners
    'home_shots_on_target_avg_10', 'away_shots_on_target_avg_10',
    'home_fouls_for_avg_10', 'away_fouls_for_avg_10',
    // Odds features
    ...ODDS_COLS,
  ],
  'over_3.5_cards': [
    'home_cards_for_avg_5', 'home_cards_for_avg_10', 'home_cards_for_avg_20',
    'home_cards_against_avg_5', 'home_cards_against_avg_10', 'home_cards_against_avg_20',
    'away_cards_for_avg_5', 'away_cards_for_avg_10', 'away_cards_for_avg_20',
    'away_cards_against_avg_5', 'away_cards_against_avg_10', 'away_cards_against_avg_20',
    'home_fouls_for_avg_5', 'home_fouls_for_avg_10', 'home_fouls_for_avg_20',
    'away_fouls_for_avg_5', 'away_fouls_for_avg_10', 'away_fouls_for_avg_20',
    'combined_cards_10',
    'ref_avg_cards_last50', 'ref_over35_cards_rate_last50',
    'league_avg_cards',
    // Tactical proxies for cards
    'home_shots_for_avg_10', 'away_shots_for_avg_10',
    // Odds features
    ...ODDS_COLS,
  ],
};

const LABEL_COLUMNS: Record<string, string> = {
  'over_2.5_goals': 'over_25_hit',
  'btts': 'btts_hit',
  'over_9.5_corners': 'over_95_corners_hit',
  'over_3.5_cards': 'over_35_cards_hit',
};

// Count columns for Poisson GLM stacking — ALL markets now
const COUNT_COLUMNS: Record<string, string> = {
  'over_2.5_goals': 'total_goals',
  'btts': 'total_goals',
  'over_9.5_corners': 'total_corners',
  'over_3.5_cards': 'total_cards',
};

const COUNT_THRESHOLDS: Record<string, number> = {
  'over_2.5_goals': 3,
  'btts': 1, // at least 1 goal each side approximated via total
  'over_9.5_corners': 10,
  'over_3.5_cards': 4,
};

// ═══════════════════════════════════════════
// LEAGUE CLUSTERING
// ═══════════════════════════════════════════
// Group leagues by style to train cluster-specific models

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
  return 'global'; // fallback
}

// ═══════════════════════════════════════════
// MATH UTILITIES
// ═══════════════════════════════════════════

function safeNum(v: any, fallback = 0): number {
  const n = Number(v);
  return (n === n && v !== null && v !== undefined) ? n : fallback;
}

function sigmoid(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

function logOdds(p: number): number {
  p = Math.max(0.001, Math.min(0.999, p));
  return Math.log(p / (1 - p));
}

function poissonCDF(lambda: number, k: number): number {
  if (lambda <= 0) return k <= 0 ? 1 : 0;
  let sum = 0, term = Math.exp(-lambda);
  for (let i = 0; i < k; i++) { sum += term; term *= lambda / (i + 1); }
  return sum;
}

function poissonProbOver(lambda: number, threshold: number): number {
  return Math.max(0, Math.min(1, 1 - poissonCDF(lambda, threshold)));
}

function eloPower(goalsFor: number, goalsAgainst: number): number {
  const gf = Math.max(safeNum(goalsFor, 1), 0.1);
  const ga = Math.max(safeNum(goalsAgainst, 1), 0.1);
  return Math.log(gf / ga);
}

function computeAUC(labels: number[], scores: number[]): number {
  const pairs = labels.map((l, i) => ({ label: l, score: scores[i] }));
  pairs.sort((a, b) => b.score - a.score);
  let tp = 0, fp = 0;
  const totalPos = labels.filter(l => l === 1).length;
  const totalNeg = labels.length - totalPos;
  if (totalPos === 0 || totalNeg === 0) return 0.5;
  let auc = 0, prevFPR = 0, prevTPR = 0;
  for (const p of pairs) {
    if (p.label === 1) tp++; else fp++;
    const tpr = tp / totalPos;
    const fpr = fp / totalNeg;
    auc += (fpr - prevFPR) * (tpr + prevTPR) / 2;
    prevFPR = fpr; prevTPR = tpr;
  }
  return Math.round(auc * 10000) / 10000;
}

function computeAccuracy(labels: number[], scores: number[], threshold = 0.5): number {
  let correct = 0;
  for (let i = 0; i < labels.length; i++) {
    if ((scores[i] >= threshold ? 1 : 0) === labels[i]) correct++;
  }
  return Math.round((correct / labels.length) * 10000) / 10000;
}

function findOptimalThreshold(labels: number[], scores: number[]): { threshold: number; accuracy: number } {
  let best = { threshold: 0.5, accuracy: 0 };
  for (let t = 0.05; t <= 0.95; t += 0.05) {
    const acc = computeAccuracy(labels, scores, t);
    if (acc > best.accuracy) best = { threshold: Math.round(t * 100) / 100, accuracy: acc };
  }
  return best;
}

// ═══════════════════════════════════════════
// SAMPLE RECENCY WEIGHTS
// ─────────────────────────────────────────
// Down-weight older matches, up-weight recent ones
// Uses exponential decay based on position in time-sorted data
// ═══════════════════════════════════════════

function computeSampleWeights(n: number, decayFactor = 0.5): Float64Array {
  const weights = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // i=0 is oldest, i=n-1 is most recent
    const recency = i / (n - 1 || 1); // 0→1
    weights[i] = decayFactor + (1 - decayFactor) * recency; // range [decayFactor, 1.0]
  }
  return weights;
}

// ═══════════════════════════════════════════
// POISSON GLM (for ALL markets now)
// ─────────────────────────────────────────
// Goals/BTTS: model total goals, derive P(≥3) or P(BTTS)
// Corners: model total corners, derive P(≥10)
// Cards: model total cards, derive P(≥4)
// ═══════════════════════════════════════════

interface GLMResult {
  coefficients: number[];
  intercept: number;
}

function fitPoissonGLM(
  X: number[][], y: number[], maxIter = 50, lr = 0.0005,
): GLMResult {
  const n = X.length;
  const p = X[0]?.length || 0;
  const beta = new Array(p).fill(0);
  let intercept = Math.log(Math.max(y.reduce((s, v) => s + v, 0) / n, 0.1));

  for (let iter = 0; iter < maxIter; iter++) {
    const gradBeta = new Array(p).fill(0);
    let gradIntercept = 0;
    for (let i = 0; i < n; i++) {
      let eta = intercept;
      for (let j = 0; j < p; j++) eta += beta[j] * X[i][j];
      eta = Math.max(-10, Math.min(10, eta));
      const mu = Math.exp(eta);
      const residual = y[i] - mu;
      gradIntercept += residual;
      for (let j = 0; j < p; j++) gradBeta[j] += residual * X[i][j];
    }
    intercept += lr * gradIntercept / n;
    for (let j = 0; j < p; j++) beta[j] += lr * gradBeta[j] / n;
  }
  return { coefficients: beta, intercept };
}

function predictGLMProbOver(glm: GLMResult, features: number[], threshold: number): number {
  let eta = glm.intercept;
  for (let j = 0; j < features.length; j++) eta += glm.coefficients[j] * features[j];
  eta = Math.max(-10, Math.min(10, eta));
  const lambda = Math.exp(eta);
  return poissonProbOver(lambda, threshold);
}

// BTTS-specific: P(home ≥ 1) * P(away ≥ 1) from independent Poisson
function predictGLMBTTS(glm: GLMResult, features: number[], homeGoalAvg: number, awayGoalAvg: number): number {
  let eta = glm.intercept;
  for (let j = 0; j < features.length; j++) eta += glm.coefficients[j] * features[j];
  eta = Math.max(-10, Math.min(10, eta));
  // Use team-specific lambdas for BTTS
  const homeLambda = Math.max(homeGoalAvg, 0.3);
  const awayLambda = Math.max(awayGoalAvg, 0.3);
  return (1 - Math.exp(-homeLambda)) * (1 - Math.exp(-awayLambda));
}

// ═══════════════════════════════════════════
// ISOTONIC CALIBRATION (PAVA)
// ═══════════════════════════════════════════

function fitIsotonicCalibration(rawScores: number[], labels: number[], nBins = 20): number[][] {
  const indexed = rawScores.map((s, i) => ({ score: s, label: labels[i] }));
  indexed.sort((a, b) => a.score - b.score);
  const binSize = Math.max(1, Math.floor(indexed.length / nBins));
  const bins: { avgScore: number; avgLabel: number }[] = [];
  for (let b = 0; b < nBins; b++) {
    const start = b * binSize;
    const end = b === nBins - 1 ? indexed.length : (b + 1) * binSize;
    if (start >= indexed.length) break;
    let sumScore = 0, sumLabel = 0, count = 0;
    for (let i = start; i < end; i++) { sumScore += indexed[i].score; sumLabel += indexed[i].label; count++; }
    bins.push({ avgScore: sumScore / count, avgLabel: sumLabel / count });
  }
  for (let i = 1; i < bins.length; i++) {
    if (bins[i].avgLabel < bins[i - 1].avgLabel) {
      const merged = (bins[i].avgLabel + bins[i - 1].avgLabel) / 2;
      bins[i].avgLabel = merged; bins[i - 1].avgLabel = merged;
    }
  }
  return bins.map(b => [b.avgScore, b.avgLabel]);
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

// ═══════════════════════════════════════════
// SANITY-RULE CAPS (league-average based)
// ─────────────────────────────────────────
// Hard-cap predictions based on league baselines
// e.g. if league BTTS rate is 40%, cap at 65%
// ═══════════════════════════════════════════

const SANITY_CAP_MULTIPLIER: Record<string, number> = {
  'over_2.5_goals': 1.40,  // cap at league_rate * 1.4
  'btts': 1.625,           // cap at league_rate * 1.625
  'over_9.5_corners': 1.50,
  'over_3.5_cards': 1.50,
};

const SANITY_CAP_MIN: Record<string, number> = {
  'over_2.5_goals': 0.55,
  'btts': 0.55,
  'over_9.5_corners': 0.50,
  'over_3.5_cards': 0.50,
};

const SANITY_CAP_MAX: Record<string, number> = {
  'over_2.5_goals': 0.78,
  'btts': 0.75,
  'over_9.5_corners': 0.75,
  'over_3.5_cards': 0.75,
};

function applySanityCap(prob: number, leagueBaseRate: number, market: string): number {
  const multiplier = SANITY_CAP_MULTIPLIER[market] || 1.5;
  const minCap = SANITY_CAP_MIN[market] || 0.50;
  const maxCap = SANITY_CAP_MAX[market] || 0.78;
  const cap = Math.max(minCap, Math.min(maxCap, leagueBaseRate * multiplier));
  return Math.min(prob, cap);
}

// ═══════════════════════════════════════════
// ENGINEERED FEATURES (V5 — enhanced)
// ═══════════════════════════════════════════

interface EngFeatureDef {
  name: string;
  compute: (row: any) => number;
}

const GOALS_ENGINEERED: EngFeatureDef[] = [
  // Poisson probabilities
  { name: 'poisson_over25_combined', compute: r => {
    const homeExp = (safeNum(r.home_goals_for_avg_10, 1.3) + safeNum(r.away_goals_against_avg_10, 1.3)) / 2;
    const awayExp = (safeNum(r.away_goals_for_avg_10, 1.3) + safeNum(r.home_goals_against_avg_10, 1.3)) / 2;
    return poissonProbOver(homeExp + awayExp, 3);
  }},
  { name: 'poisson_over15', compute: r => {
    const total = (safeNum(r.home_goals_for_avg_10, 1.3) + safeNum(r.away_goals_against_avg_10, 1.3)) / 2 +
                  (safeNum(r.away_goals_for_avg_10, 1.3) + safeNum(r.home_goals_against_avg_10, 1.3)) / 2;
    return poissonProbOver(total, 2);
  }},
  // Elo offensive/defensive ratings
  { name: 'home_elo_off', compute: r => eloPower(safeNum(r.home_goals_for_avg_10, 1.3), safeNum(r.league_avg_goals, 2.5) / 2) },
  { name: 'home_elo_def', compute: r => eloPower(safeNum(r.league_avg_goals, 2.5) / 2, safeNum(r.home_goals_against_avg_10, 1.3)) },
  { name: 'away_elo_off', compute: r => eloPower(safeNum(r.away_goals_for_avg_10, 1.3), safeNum(r.league_avg_goals, 2.5) / 2) },
  { name: 'away_elo_def', compute: r => eloPower(safeNum(r.league_avg_goals, 2.5) / 2, safeNum(r.away_goals_against_avg_10, 1.3)) },
  // xG efficiency: xg_per_shot
  { name: 'home_xg_per_shot', compute: r => safeNum(r.home_xg_for_avg_10) / Math.max(safeNum(r.home_shots_for_avg_10, 1), 0.1) },
  { name: 'away_xg_per_shot', compute: r => safeNum(r.away_xg_for_avg_10) / Math.max(safeNum(r.away_shots_for_avg_10, 1), 0.1) },
  // Defence weakness: xGA relative
  { name: 'home_xga_weakness', compute: r => safeNum(r.home_xg_against_avg_10) - (safeNum(r.league_avg_goals, 2.5) / 2) },
  { name: 'away_xga_weakness', compute: r => safeNum(r.away_xg_against_avg_10) - (safeNum(r.league_avg_goals, 2.5) / 2) },
  // Attack interactions
  { name: 'home_attack_x_away_defense', compute: r => safeNum(r.home_goals_for_avg_10) * safeNum(r.away_goals_against_avg_10) },
  { name: 'away_attack_x_home_defense', compute: r => safeNum(r.away_goals_for_avg_10) * safeNum(r.home_goals_against_avg_10) },
  { name: 'combined_attack_defense_product', compute: r => (safeNum(r.home_goals_for_avg_10) * safeNum(r.away_goals_against_avg_10)) + (safeNum(r.away_goals_for_avg_10) * safeNum(r.home_goals_against_avg_10)) },
  // Momentum (L5 vs L20 — form drift signal)
  { name: 'home_goals_momentum', compute: r => safeNum(r.home_goals_for_avg_5) - safeNum(r.home_goals_for_avg_20) },
  { name: 'away_goals_momentum', compute: r => safeNum(r.away_goals_for_avg_5) - safeNum(r.away_goals_for_avg_20) },
  // League-relative
  { name: 'home_goals_vs_league', compute: r => safeNum(r.home_goals_for_avg_10) - (safeNum(r.league_avg_goals, 2.5) / 2) },
  { name: 'away_goals_vs_league', compute: r => safeNum(r.away_goals_for_avg_10) - (safeNum(r.league_avg_goals, 2.5) / 2) },
  { name: 'total_expected_goals', compute: r => safeNum(r.home_goals_for_avg_10) + safeNum(r.away_goals_for_avg_10) },
  { name: 'total_goals_conceded', compute: r => safeNum(r.home_goals_against_avg_10) + safeNum(r.away_goals_against_avg_10) },
  // Shots efficiency
  { name: 'shots_on_target_ratio_home', compute: r => safeNum(r.home_shots_on_target_avg_10) / Math.max(safeNum(r.home_shots_for_avg_10, 1), 0.1) },
  { name: 'shots_on_target_ratio_away', compute: r => safeNum(r.away_shots_on_target_avg_10) / Math.max(safeNum(r.away_shots_for_avg_10, 1), 0.1) },
  // Aggression proxy (fouls signal pressing intensity → more goals)
  { name: 'combined_fouls', compute: r => safeNum(r.home_fouls_for_avg_10) + safeNum(r.away_fouls_for_avg_10) },
  // Odds-implied probability signal (if available)
  { name: 'odds_signal_over25', compute: r => safeNum(r.implied_prob_over25, 0.5) },
  { name: 'odds_vs_model_delta', compute: r => {
    // Market consensus vs raw statistical estimate
    const statEst = (safeNum(r.home_goals_for_avg_10, 1.3) + safeNum(r.away_goals_for_avg_10, 1.3)) / 2.5;
    return safeNum(r.implied_prob_over25, 0.5) - Math.min(1, statEst);
  }},
];

const BTTS_ENGINEERED: EngFeatureDef[] = [
  { name: 'poisson_btts', compute: r => {
    const homeLambda = (safeNum(r.home_goals_for_avg_10, 1.3) + safeNum(r.away_goals_against_avg_10, 1.3)) / 2;
    const awayLambda = (safeNum(r.away_goals_for_avg_10, 1.3) + safeNum(r.home_goals_against_avg_10, 1.3)) / 2;
    return (1 - Math.exp(-homeLambda)) * (1 - Math.exp(-awayLambda));
  }},
  { name: 'poisson_over15', compute: r => {
    const total = (safeNum(r.home_goals_for_avg_10, 1.3) + safeNum(r.away_goals_against_avg_10, 1.3)) / 2 +
                  (safeNum(r.away_goals_for_avg_10, 1.3) + safeNum(r.home_goals_against_avg_10, 1.3)) / 2;
    return poissonProbOver(total, 2);
  }},
  // Elo off/def
  { name: 'home_elo_off', compute: r => eloPower(safeNum(r.home_goals_for_avg_10, 1.3), safeNum(r.league_avg_goals, 2.5) / 2) },
  { name: 'home_elo_def', compute: r => eloPower(safeNum(r.league_avg_goals, 2.5) / 2, safeNum(r.home_goals_against_avg_10, 1.3)) },
  { name: 'away_elo_off', compute: r => eloPower(safeNum(r.away_goals_for_avg_10, 1.3), safeNum(r.league_avg_goals, 2.5) / 2) },
  { name: 'away_elo_def', compute: r => eloPower(safeNum(r.league_avg_goals, 2.5) / 2, safeNum(r.away_goals_against_avg_10, 1.3)) },
  // Key BTTS signals
  { name: 'min_attack_power', compute: r => Math.min(safeNum(r.home_goals_for_avg_10), safeNum(r.away_goals_for_avg_10)) },
  { name: 'max_defense_weakness', compute: r => Math.max(safeNum(r.home_goals_against_avg_10), safeNum(r.away_goals_against_avg_10)) },
  { name: 'both_attack_product', compute: r => safeNum(r.home_goals_for_avg_10) * safeNum(r.away_goals_for_avg_10) },
  { name: 'both_concede_product', compute: r => safeNum(r.home_goals_against_avg_10) * safeNum(r.away_goals_against_avg_10) },
  { name: 'home_attack_x_away_defense', compute: r => safeNum(r.home_goals_for_avg_10) * safeNum(r.away_goals_against_avg_10) },
  { name: 'away_attack_x_home_defense', compute: r => safeNum(r.away_goals_for_avg_10) * safeNum(r.home_goals_against_avg_10) },
  // xG efficiency
  { name: 'home_xg_per_shot', compute: r => safeNum(r.home_xg_for_avg_10) / Math.max(safeNum(r.home_shots_for_avg_10, 1), 0.1) },
  { name: 'away_xg_per_shot', compute: r => safeNum(r.away_xg_for_avg_10) / Math.max(safeNum(r.away_shots_for_avg_10, 1), 0.1) },
  // Momentum
  { name: 'home_scoring_trend', compute: r => safeNum(r.home_goals_for_avg_5) - safeNum(r.home_goals_for_avg_20) },
  { name: 'away_scoring_trend', compute: r => safeNum(r.away_goals_for_avg_5) - safeNum(r.away_goals_for_avg_20) },
  { name: 'home_goals_vs_league', compute: r => safeNum(r.home_goals_for_avg_10) - (safeNum(r.league_avg_goals, 2.5) / 2) },
  { name: 'away_goals_vs_league', compute: r => safeNum(r.away_goals_for_avg_10) - (safeNum(r.league_avg_goals, 2.5) / 2) },
  { name: 'min_concede_rate', compute: r => Math.min(safeNum(r.home_goals_against_avg_5), safeNum(r.away_goals_against_avg_5)) },
  // Shots efficiency for BTTS
  { name: 'shots_on_target_ratio_home', compute: r => safeNum(r.home_shots_on_target_avg_10) / Math.max(safeNum(r.home_shots_for_avg_10, 1), 0.1) },
  { name: 'shots_on_target_ratio_away', compute: r => safeNum(r.away_shots_on_target_avg_10) / Math.max(safeNum(r.away_shots_for_avg_10, 1), 0.1) },
  // Aggression (pressing intensity → more chances → more BTTS)
  { name: 'combined_fouls', compute: r => safeNum(r.home_fouls_for_avg_10) + safeNum(r.away_fouls_for_avg_10) },
  // Odds signal
  { name: 'odds_signal_btts', compute: r => safeNum(r.implied_prob_btts, 0.45) },
];

const CORNERS_ENGINEERED: EngFeatureDef[] = [
  { name: 'poisson_over95', compute: r => {
    const total = safeNum(r.home_corners_for_avg_10, 5) + safeNum(r.away_corners_for_avg_10, 5);
    return poissonProbOver(total, 10);
  }},
  { name: 'total_corners_expected', compute: r => safeNum(r.home_corners_for_avg_10) + safeNum(r.away_corners_for_avg_10) },
  { name: 'total_corners_conceded', compute: r => safeNum(r.home_corners_against_avg_10) + safeNum(r.away_corners_against_avg_10) },
  { name: 'avg_match_corners', compute: r => (safeNum(r.home_corners_for_avg_10) + safeNum(r.home_corners_against_avg_10) + safeNum(r.away_corners_for_avg_10) + safeNum(r.away_corners_against_avg_10)) / 2 },
  { name: 'home_corners_momentum', compute: r => safeNum(r.home_corners_for_avg_5) - safeNum(r.home_corners_for_avg_20) },
  { name: 'away_corners_momentum', compute: r => safeNum(r.away_corners_for_avg_5) - safeNum(r.away_corners_for_avg_20) },
  { name: 'corners_vs_league', compute: r => (safeNum(r.home_corners_for_avg_10) + safeNum(r.away_corners_for_avg_10)) - safeNum(r.league_avg_corners, 10) },
  // Set-piece proxies: corners_per_shot
  { name: 'corners_per_shot_home', compute: r => safeNum(r.home_corners_for_avg_10) / Math.max(safeNum(r.home_shots_for_avg_10, 1), 0.1) },
  { name: 'corners_per_shot_away', compute: r => safeNum(r.away_corners_for_avg_10) / Math.max(safeNum(r.away_shots_for_avg_10, 1), 0.1) },
  { name: 'combined_attack_intensity', compute: r => safeNum(r.home_goals_for_avg_10) + safeNum(r.away_goals_for_avg_10) },
  { name: 'combined_shots', compute: r => safeNum(r.home_shots_for_avg_10) + safeNum(r.away_shots_for_avg_10) },
  { name: 'corner_dominance', compute: r => safeNum(r.home_corners_for_avg_10, 1) / Math.max(safeNum(r.away_corners_for_avg_10, 1), 0.1) },
  { name: 'home_corner_power', compute: r => Math.log(Math.max(safeNum(r.home_corners_for_avg_10, 1), 0.1) / Math.max(safeNum(r.home_corners_against_avg_10, 1), 0.1)) },
  { name: 'away_corner_power', compute: r => Math.log(Math.max(safeNum(r.away_corners_for_avg_10, 1), 0.1) / Math.max(safeNum(r.away_corners_against_avg_10, 1), 0.1)) },
  // Tactical: fouls drive set pieces → corners
  { name: 'combined_fouls', compute: r => safeNum(r.home_fouls_for_avg_10) + safeNum(r.away_fouls_for_avg_10) },
  { name: 'fouls_per_shot', compute: r => (safeNum(r.home_fouls_for_avg_10) + safeNum(r.away_fouls_for_avg_10)) / Math.max(safeNum(r.home_shots_for_avg_10, 1) + safeNum(r.away_shots_for_avg_10, 1), 0.1) },
];

const CARDS_ENGINEERED: EngFeatureDef[] = [
  { name: 'poisson_over35', compute: r => {
    const total = safeNum(r.home_cards_for_avg_10, 1.8) + safeNum(r.away_cards_for_avg_10, 1.8);
    return poissonProbOver(total, 4);
  }},
  { name: 'total_cards_expected', compute: r => safeNum(r.home_cards_for_avg_10) + safeNum(r.away_cards_for_avg_10) },
  { name: 'total_cards_drawn', compute: r => safeNum(r.home_cards_against_avg_10) + safeNum(r.away_cards_against_avg_10) },
  { name: 'total_fouls', compute: r => safeNum(r.home_fouls_for_avg_10) + safeNum(r.away_fouls_for_avg_10) },
  // Card risk: cards_per_foul
  { name: 'cards_per_foul_home', compute: r => safeNum(r.home_cards_for_avg_10) / Math.max(safeNum(r.home_fouls_for_avg_10, 1), 0.1) },
  { name: 'cards_per_foul_away', compute: r => safeNum(r.away_cards_for_avg_10) / Math.max(safeNum(r.away_fouls_for_avg_10, 1), 0.1) },
  // Ref interactions
  { name: 'ref_strictness_vs_league', compute: r => safeNum(r.ref_avg_cards_last50) - safeNum(r.league_avg_cards, 3.5) },
  { name: 'ref_x_fouls', compute: r => safeNum(r.ref_avg_cards_last50) * (safeNum(r.home_fouls_for_avg_10) + safeNum(r.away_fouls_for_avg_10)) },
  { name: 'ref_x_cards_drawn', compute: r => safeNum(r.ref_avg_cards_last50) * (safeNum(r.home_cards_against_avg_10) + safeNum(r.away_cards_against_avg_10)) },
  // Momentum
  { name: 'home_cards_momentum', compute: r => safeNum(r.home_cards_for_avg_5) - safeNum(r.home_cards_for_avg_20) },
  { name: 'away_cards_momentum', compute: r => safeNum(r.away_cards_for_avg_5) - safeNum(r.away_cards_for_avg_20) },
  { name: 'fouls_momentum', compute: r => (safeNum(r.home_fouls_for_avg_5) + safeNum(r.away_fouls_for_avg_5)) - (safeNum(r.home_fouls_for_avg_20) + safeNum(r.away_fouls_for_avg_20)) },
  { name: 'cards_vs_league', compute: r => (safeNum(r.home_cards_for_avg_10) + safeNum(r.away_cards_for_avg_10)) - safeNum(r.league_avg_cards, 3.5) },
  { name: 'home_card_power', compute: r => Math.log(Math.max(safeNum(r.home_cards_for_avg_10, 0.5), 0.01) / Math.max(safeNum(r.home_cards_against_avg_10, 0.5), 0.01)) },
  { name: 'away_card_power', compute: r => Math.log(Math.max(safeNum(r.away_cards_for_avg_10, 0.5), 0.01) / Math.max(safeNum(r.away_cards_against_avg_10, 0.5), 0.01)) },
  // Aggression intensity: shots signal attack tempo → more fouls in transition
  { name: 'combined_shots_proxy', compute: r => safeNum(r.home_shots_for_avg_10) + safeNum(r.away_shots_for_avg_10) },
  { name: 'fouls_per_shot', compute: r => (safeNum(r.home_fouls_for_avg_10) + safeNum(r.away_fouls_for_avg_10)) / Math.max(safeNum(r.home_shots_for_avg_10, 1) + safeNum(r.away_shots_for_avg_10, 1), 0.1) },
];

const MARKET_ENGINEERED: Record<string, EngFeatureDef[]> = {
  'over_2.5_goals': GOALS_ENGINEERED,
  'btts': BTTS_ENGINEERED,
  'over_9.5_corners': CORNERS_ENGINEERED,
  'over_3.5_cards': CARDS_ENGINEERED,
};

// League-rate column mapping for sanity caps
const LEAGUE_RATE_COL: Record<string, string> = {
  'over_2.5_goals': 'league_over25_rate',
  'btts': 'league_btts_rate',
  'over_9.5_corners': 'league_avg_corners',
  'over_3.5_cards': 'league_avg_cards',
};

// ═══════════════════════════════════════════
// V5 HYPERPARAMETERS — Tuned for 1500 trees
// Model A: conservative (lower LR, more reg)
// Model B: aggressive (faster LR, deeper)
// ═══════════════════════════════════════════

interface TrainConfig {
  maxDepth: number;
  minSamplesLeaf: number;
  learningRate: number;
  lambda: number;
  gamma: number;
  colsampleByTree: number;
  subsample: number;
  nBins: number;
}

const V5_CONFIG_A: Record<string, TrainConfig> = {
  'over_2.5_goals': { maxDepth: 5, minSamplesLeaf: 40, learningRate: 0.02, lambda: 4.0, gamma: 0.4, colsampleByTree: 0.6, subsample: 0.7, nBins: 128 },
  'btts':           { maxDepth: 5, minSamplesLeaf: 40, learningRate: 0.02, lambda: 4.0, gamma: 0.4, colsampleByTree: 0.6, subsample: 0.7, nBins: 128 },
  'over_9.5_corners': { maxDepth: 5, minSamplesLeaf: 40, learningRate: 0.02, lambda: 4.0, gamma: 0.4, colsampleByTree: 0.6, subsample: 0.7, nBins: 128 },
  'over_3.5_cards': { maxDepth: 5, minSamplesLeaf: 40, learningRate: 0.02, lambda: 4.0, gamma: 0.4, colsampleByTree: 0.6, subsample: 0.7, nBins: 128 },
};

const V5_CONFIG_B: Record<string, TrainConfig> = {
  'over_2.5_goals': { maxDepth: 7, minSamplesLeaf: 25, learningRate: 0.035, lambda: 2.0, gamma: 0.15, colsampleByTree: 0.75, subsample: 0.8, nBins: 128 },
  'btts':           { maxDepth: 7, minSamplesLeaf: 25, learningRate: 0.035, lambda: 2.0, gamma: 0.15, colsampleByTree: 0.75, subsample: 0.8, nBins: 128 },
  'over_9.5_corners': { maxDepth: 7, minSamplesLeaf: 25, learningRate: 0.035, lambda: 2.0, gamma: 0.15, colsampleByTree: 0.75, subsample: 0.8, nBins: 128 },
  'over_3.5_cards': { maxDepth: 7, minSamplesLeaf: 25, learningRate: 0.035, lambda: 2.0, gamma: 0.15, colsampleByTree: 0.75, subsample: 0.8, nBins: 128 },
};

// ═══════════════════════════════════════════
// HISTOGRAM TREE BUILDING (second-order: uses Hessian)
// ═══════════════════════════════════════════

function buildHistogram(
  values: Float64Array, gradients: Float64Array, hessians: Float64Array,
  indices: number[], nBins: number,
) {
  let min = Infinity, max = -Infinity;
  for (const i of indices) {
    const v = values[i]; if (v !== v) continue;
    if (v < min) min = v; if (v > max) max = v;
  }
  if (min === max || min === Infinity) return { binEdges: [] as number[], binGrad: [] as number[], binHess: [] as number[], binCount: [] as number[] };
  const binGrad = new Array(nBins).fill(0);
  const binHess = new Array(nBins).fill(0);
  const binCount = new Array(nBins).fill(0);
  const step = (max - min) / nBins;
  const binEdges = Array.from({ length: nBins }, (_, b) => min + step * (b + 1));
  for (const i of indices) {
    const v = values[i]; if (v !== v) continue;
    let bin = Math.floor((v - min) / step);
    if (bin >= nBins) bin = nBins - 1; if (bin < 0) bin = 0;
    binGrad[bin] += gradients[i]; binHess[bin] += hessians[i]; binCount[bin]++;
  }
  return { binEdges, binGrad, binHess, binCount };
}

function findBestSplit(
  X: Float64Array[], gradients: Float64Array, hessians: Float64Array,
  indices: number[], featureSubset: number[], config: TrainConfig,
) {
  const totalG = indices.reduce((s, i) => s + gradients[i], 0);
  const totalH = indices.reduce((s, i) => s + hessians[i], 0);
  let bestGain = 0, bestFeature = -1, bestThreshold = 0;
  for (const f of featureSubset) {
    const hist = buildHistogram(X[f], gradients, hessians, indices, config.nBins);
    if (hist.binEdges.length === 0) continue;
    let leftG = 0, leftH = 0, leftCount = 0;
    for (let b = 0; b < hist.binEdges.length - 1; b++) {
      leftG += hist.binGrad[b]; leftH += hist.binHess[b]; leftCount += hist.binCount[b];
      const rightCount = indices.length - leftCount;
      if (leftCount < config.minSamplesLeaf || rightCount < config.minSamplesLeaf) continue;
      const rightG = totalG - leftG; const rightH = totalH - leftH;
      // XGBoost-style gain with second-order gradients
      const gain = 0.5 * ((leftG * leftG) / (leftH + config.lambda) + (rightG * rightG) / (rightH + config.lambda) - (totalG * totalG) / (totalH + config.lambda)) - config.gamma;
      if (gain > bestGain) { bestGain = gain; bestFeature = f; bestThreshold = hist.binEdges[b]; }
    }
  }
  if (bestGain <= 0 || bestFeature === -1) return null;
  const leftIdx: number[] = [], rightIdx: number[] = [];
  for (const i of indices) {
    const v = X[bestFeature][i];
    if (v !== v || v <= bestThreshold) leftIdx.push(i); else rightIdx.push(i);
  }
  return { feature: bestFeature, threshold: bestThreshold, gain: bestGain, leftIdx, rightIdx };
}

function buildTree(
  X: Float64Array[], gradients: Float64Array, hessians: Float64Array,
  indices: number[], featureSubset: number[], config: TrainConfig, depth: number,
): TreeNode {
  const totalG = indices.reduce((s, i) => s + gradients[i], 0);
  const totalH = indices.reduce((s, i) => s + hessians[i], 0);
  // XGBoost leaf weight formula: -G / (H + λ)
  const leafValue = -totalG / (totalH + config.lambda);
  if (depth >= config.maxDepth || indices.length < config.minSamplesLeaf * 2) {
    return { v: Math.round(leafValue * 100000) / 100000 };
  }
  const split = findBestSplit(X, gradients, hessians, indices, featureSubset, config);
  if (!split) return { v: Math.round(leafValue * 100000) / 100000 };
  return {
    f: split.feature,
    t: Math.round(split.threshold * 100000) / 100000,
    l: buildTree(X, gradients, hessians, split.leftIdx, featureSubset, config, depth + 1),
    r: buildTree(X, gradients, hessians, split.rightIdx, featureSubset, config, depth + 1),
  };
}

function predictTree(tree: TreeNode, features: number[]): number {
  if (tree.v !== undefined) return tree.v;
  const val = features[tree.f!];
  if (val !== val || val <= tree.t!) return predictTree(tree.l!, features);
  return predictTree(tree.r!, features);
}

function predictGBT(trees: TreeNode[], baseScore: number, lr: number, features: number[]): number {
  let score = baseScore;
  for (const tree of trees) score += lr * predictTree(tree, features);
  return sigmoid(score);
}

// ═══════════════════════════════════════════
// DATA PREPARATION (V5 — with GLM for all markets)
// ═══════════════════════════════════════════

function computeMedians(X: Float64Array[], n: number): number[] {
  return X.map(col => {
    const valid: number[] = [];
    for (let i = 0; i < n; i++) { if (col[i] === col[i]) valid.push(col[i]); }
    if (valid.length === 0) return 0;
    valid.sort((a, b) => a - b);
    return valid[Math.floor(valid.length / 2)];
  });
}

function imputeNaN(X: Float64Array[], medians: number[], n: number): void {
  for (let f = 0; f < X.length; f++) {
    for (let i = 0; i < n; i++) {
      if (X[f][i] !== X[f][i]) X[f][i] = medians[f];
    }
  }
}

// ═══════════════════════════════════════════
// H2H FEATURE COMPUTATION (inline during training)
// ═══════════════════════════════════════════

interface H2HStats {
  h2h_avg_goals: number;
  h2h_over25_rate: number;
  h2h_btts_rate: number;
  h2h_avg_corners: number;
  h2h_avg_cards: number;
}

function buildH2HMap(rows: any[]): Map<string, H2HStats> {
  // Build lookup from historical data: key = sorted team pair
  const pairMeetings = new Map<string, any[]>();
  
  for (const r of rows) {
    if (r.total_goals == null) continue;
    const pair = [r.home_team, r.away_team].sort().join('|||');
    if (!pairMeetings.has(pair)) pairMeetings.set(pair, []);
    pairMeetings.get(pair)!.push({
      goals: safeNum(r.total_goals),
      corners: safeNum(r.total_corners),
      cards: safeNum(r.total_cards),
      btts: (safeNum(r.home_goals) > 0 && safeNum(r.away_goals) > 0) ? 1 : 0,
      over25: safeNum(r.total_goals) > 2.5 ? 1 : 0,
    });
  }

  const h2hMap = new Map<string, H2HStats>();
  for (const [pair, meetings] of pairMeetings.entries()) {
    if (meetings.length < 2) continue;
    const last5 = meetings.slice(-5); // Most recent 5
    h2hMap.set(pair, {
      h2h_avg_goals: last5.reduce((s, m) => s + m.goals, 0) / last5.length,
      h2h_over25_rate: last5.filter(m => m.over25).length / last5.length,
      h2h_btts_rate: last5.filter(m => m.btts).length / last5.length,
      h2h_avg_corners: last5.reduce((s, m) => s + m.corners, 0) / last5.length,
      h2h_avg_cards: last5.reduce((s, m) => s + m.cards, 0) / last5.length,
    });
  }
  return h2hMap;
}

const H2H_FEATURE_NAMES = ['h2h_avg_goals_5', 'h2h_over25_rate_5', 'h2h_btts_rate_5', 'h2h_avg_corners_5', 'h2h_avg_cards_5'];

function prepareData(
  rows: any[], rawCols: string[], engDefs: EngFeatureDef[],
  glmResult?: GLMResult, glmFeatureCols?: string[], countThreshold?: number,
  market?: string, h2hMap?: Map<string, H2HStats>,
): { X: Float64Array[]; featureNames: string[]; n: number } {
  const n = rows.length;
  const hasGLM = glmResult && glmFeatureCols && countThreshold !== undefined;
  const hasH2H = h2hMap && h2hMap.size > 0;
  const allNames = [...rawCols, ...engDefs.map(e => e.name)];
  if (hasGLM) allNames.push('glm_prob_over_threshold');
  // V5: Add BTTS-specific GLM feature
  if (hasGLM && market === 'btts') allNames.push('glm_btts_prob');
  // V6: H2H features
  if (hasH2H) allNames.push(...H2H_FEATURE_NAMES);

  const totalFeatures = allNames.length;
  const X: Float64Array[] = Array.from({ length: totalFeatures }, () => new Float64Array(n));

  for (let i = 0; i < n; i++) {
    for (let f = 0; f < rawCols.length; f++) {
      const val = rows[i][rawCols[f]];
      X[f][i] = safeNum(val, NaN);
    }
    for (let e = 0; e < engDefs.length; e++) {
      try { X[rawCols.length + e][i] = engDefs[e].compute(rows[i]); }
      catch { X[rawCols.length + e][i] = NaN; }
    }
    if (hasGLM) {
      const glmIdx = rawCols.length + engDefs.length;
      const glmFeatures = glmFeatureCols!.map(c => safeNum(rows[i][c]));
      X[glmIdx][i] = predictGLMProbOver(glmResult!, glmFeatures, countThreshold!);
      // BTTS: also compute team-specific BTTS probability
      if (market === 'btts') {
        const homeGoalAvg = (safeNum(rows[i].home_goals_for_avg_10, 1.3) + safeNum(rows[i].away_goals_against_avg_10, 1.3)) / 2;
        const awayGoalAvg = (safeNum(rows[i].away_goals_for_avg_10, 1.3) + safeNum(rows[i].home_goals_against_avg_10, 1.3)) / 2;
        X[glmIdx + 1][i] = predictGLMBTTS(glmResult!, glmFeatures, homeGoalAvg, awayGoalAvg);
      }
    }
    // H2H features
    if (hasH2H) {
      const h2hStartIdx = totalFeatures - H2H_FEATURE_NAMES.length;
      const pair = [rows[i].home_team, rows[i].away_team].sort().join('|||');
      const h2h = h2hMap!.get(pair);
      if (h2h) {
        X[h2hStartIdx][i] = h2h.h2h_avg_goals;
        X[h2hStartIdx + 1][i] = h2h.h2h_over25_rate;
        X[h2hStartIdx + 2][i] = h2h.h2h_btts_rate;
        X[h2hStartIdx + 3][i] = h2h.h2h_avg_corners;
        X[h2hStartIdx + 4][i] = h2h.h2h_avg_cards;
      } else {
        // NaN will be imputed to median
        for (let h = 0; h < 5; h++) X[h2hStartIdx + h][i] = NaN;
      }
    }
  }
  return { X, featureNames: allNames, n };
}

// ═══════════════════════════════════════════
// FAST SHAP-STYLE FEATURE CONTRIBUTIONS
// ─────────────────────────────────────────
// Uses marginal contribution method: for each feature,
// compare prediction with vs without the feature (replaced by median)
// Returns top-3 drivers per sample
// ═══════════════════════════════════════════

function computeFastSHAP(
  trees: TreeNode[], baseScore: number, lr: number,
  features: number[], featureNames: string[], medians: number[],
): Record<string, number> {
  const basePred = predictGBT(trees, baseScore, lr, features);
  const contributions: { name: string; impact: number }[] = [];

  for (let f = 0; f < featureNames.length; f++) {
    const modified = [...features];
    modified[f] = medians[f]; // replace with median (baseline)
    const modPred = predictGBT(trees, baseScore, lr, modified);
    contributions.push({ name: featureNames[f], impact: Math.round((basePred - modPred) * 10000) / 10000 });
  }

  // Return top 3 by absolute impact
  contributions.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const top3: Record<string, number> = {};
  for (let i = 0; i < Math.min(3, contributions.length); i++) {
    top3[contributions[i].name] = contributions[i].impact;
  }
  return top3;
}

// ═══════════════════════════════════════════
// PERMUTATION IMPORTANCE
// ═══════════════════════════════════════════

function computePermutationImportance(
  trees: TreeNode[], baseScore: number, lr: number,
  X: Float64Array[], labels: number[], featureNames: string[],
  n: number, nRepeats = 2,
): Record<string, number> {
  const baselineScores: number[] = [];
  for (let i = 0; i < n; i++) {
    const feats = featureNames.map((_, f) => X[f][i]);
    baselineScores.push(predictGBT(trees, baseScore, lr, feats));
  }
  const baselineAUC = computeAUC(labels, baselineScores);
  const importance: Record<string, number> = {};
  const featuresToCheck = Math.min(featureNames.length, 20);

  for (let fi = 0; fi < featuresToCheck; fi++) {
    let totalDrop = 0;
    for (let rep = 0; rep < nRepeats; rep++) {
      const shuffled = new Float64Array(n);
      for (let i = 0; i < n; i++) shuffled[i] = X[fi][i];
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const original = X[fi]; X[fi] = shuffled;
      const permScores: number[] = [];
      for (let i = 0; i < n; i++) {
        const feats = featureNames.map((_, f) => X[f][i]);
        permScores.push(predictGBT(trees, baseScore, lr, feats));
      }
      const permAUC = computeAUC(labels, permScores);
      totalDrop += baselineAUC - permAUC;
      X[fi] = original;
    }
    importance[featureNames[fi]] = Math.round((totalDrop / nRepeats) * 10000) / 10000;
  }
  return importance;
}

// ═══════════════════════════════════════════
// TRAIN GBT BATCH (with sample weights)
// ═══════════════════════════════════════════

function trainGBTBatch(
  trainX: Float64Array[], trainY: Float64Array, trainN: number,
  existingTrees: TreeNode[], baseScore: number,
  config: TrainConfig, treesPerCall: number,
  featureNames: string[], sampleWeights: Float64Array,
): { newTrees: TreeNode[]; predictions: Float64Array } {
  const lr = config.learningRate;
  const nFeatures = featureNames.length;
  const predictions = new Float64Array(trainN);

  for (let i = 0; i < trainN; i++) {
    let score = baseScore;
    const feats = featureNames.map((_, f) => trainX[f][i]);
    for (const tree of existingTrees) score += lr * predictTree(tree, feats);
    predictions[i] = sigmoid(score);
  }

  const newTrees: TreeNode[] = [];
  for (let t = 0; t < treesPerCall; t++) {
    const gradients = new Float64Array(trainN);
    const hessians = new Float64Array(trainN);
    for (let i = 0; i < trainN; i++) {
      const p = predictions[i];
      const w = sampleWeights[i]; // V5: recency weight
      // Second-order gradients (XGBoost-style) with sample weights
      gradients[i] = (p - trainY[i]) * w;
      hessians[i] = Math.max(p * (1 - p) * w, 1e-6);
    }

    const sampleIndices: number[] = [];
    for (let i = 0; i < trainN; i++) {
      if (Math.random() < config.subsample) sampleIndices.push(i);
    }

    const nColSample = Math.max(1, Math.floor(nFeatures * config.colsampleByTree));
    const shuffled = Array.from({ length: nFeatures }, (_, i) => i).sort(() => Math.random() - 0.5);
    const featureSubset = shuffled.slice(0, nColSample);

    const tree = buildTree(trainX, gradients, hessians, sampleIndices, featureSubset, config, 0);
    newTrees.push(tree);

    for (let i = 0; i < trainN; i++) {
      const feats = featureNames.map((_, f) => trainX[f][i]);
      predictions[i] = sigmoid(logOdds(predictions[i]) + lr * predictTree(tree, feats));
    }
  }

  return { newTrees, predictions };
}

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));

    const marketRaw = body.market || 'over_2.5_goals';
    const treesPerCall = body.treesPerCall || 10;
    const totalTrees = body.totalTrees || 1500;
    const sampleSize = body.sampleSize || 60000;
    const resume = body.resume !== false;
    const earlyStopPatience = body.earlyStopPatience || 5;
    const leagueCluster = body.leagueCluster || null; // null = global fallback

    // V6: Parse cluster-specific market keys (e.g. "over_2.5_goals__high_scoring")
    const marketParts = marketRaw.split('__');
    const market = marketParts[0]; // Base market name
    const clusterFromKey = marketParts[1] || null;
    const effectiveCluster = clusterFromKey || leagueCluster;
    const marketKey = marketRaw; // Full key for storage (includes cluster suffix)

    const rawCols = RAW_COLUMNS[market];
    const engDefs = MARKET_ENGINEERED[market];
    const labelCol = LABEL_COLUMNS[market];
    // Allow request-level lambda/gamma overrides for loosened regularization
    const configA = { ...V5_CONFIG_A[market], ...(body.lambda !== undefined ? { lambda: body.lambda } : {}), ...(body.gamma !== undefined ? { gamma: body.gamma } : {}) };
    const configB = { ...V5_CONFIG_B[market], ...(body.lambda !== undefined ? { lambda: body.lambda } : {}), ...(body.gamma !== undefined ? { gamma: body.gamma } : {}) };
    const countCol = COUNT_COLUMNS[market];
    const countThreshold = COUNT_THRESHOLDS[market];
    const leagueRateCol = LEAGUE_RATE_COL[market];

    if (!rawCols || !labelCol) {
      return new Response(JSON.stringify({ error: `Unknown market: ${market}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🧠 V6 Training: market=${market}, key=${marketKey}, trees/call=${treesPerCall}, target=${totalTrees}, cluster=${effectiveCluster || 'global'}`);

    // Load existing model state
    let modelState: GBTModelState | null = null;
    if (resume) {
      const { data: existing } = await supabase
        .from('ml_models').select('weights')
        .eq('market', marketKey).eq('model_type', 'gradient_boosted_trees').eq('is_active', true)
        .order('training_date', { ascending: false }).limit(1).single();
      if (existing?.weights) {
        try { modelState = existing.weights as unknown as GBTModelState; } catch {}
      }
    }

    // Force V6 upgrade (accepts V5 and V6 models)
    const isCurrentEngine = modelState?.engine_version === 'V5' || modelState?.engine_version === 'V6';
    const isNewModel = !modelState || !modelState.trees || !isCurrentEngine;
    const existingTreesA: TreeNode[] = isNewModel ? [] : modelState!.trees;
    const existingTreesB: TreeNode[] = isNewModel ? [] : (modelState!.trees_b || []);
    const nTrained = isNewModel ? 0 : modelState!.n_trained;
    const bestValAuc = isNewModel ? 0 : (modelState!.best_val_auc || 0);
    const roundsNoImprovement = isNewModel ? 0 : (modelState!.rounds_without_improvement || 0);

    // Early stopping check
    if (!isNewModel && roundsNoImprovement >= earlyStopPatience) {
      return new Response(JSON.stringify({
        success: true, message: `⛔ Early stopped after ${roundsNoImprovement} rounds`,
        market: marketKey, trees: nTrained, best_val_auc: bestValAuc, early_stopped: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!isNewModel && nTrained >= totalTrees) {
      return new Response(JSON.stringify({
        success: true, message: `V6 model fully trained (${nTrained}/${totalTrees})`,
        market: marketKey, trees: nTrained, val_auc: modelState?.val_auc, val_accuracy: modelState?.val_accuracy,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (isNewModel) console.log(`🔄 Starting fresh V6 engine: cluster=${effectiveCluster || 'global'}, key=${marketKey}`);

    // ── FETCH DATA (sorted by date for time-based split) ──
    const extraCols = [countCol, 'league', 'home_team', 'away_team', 'home_goals', 'away_goals', 'total_goals', 'total_corners', 'total_cards'];
    const selectCols = [...new Set([...rawCols, ...extraCols, labelCol, 'fixture_date'])].join(', ');
    const { count: totalRows } = await supabase
      .from('ml_training_data_v2').select('*', { count: 'exact', head: true }).not(labelCol, 'is', null);

    const batchSize = 1000;
    const batchCount = Math.ceil(sampleSize / batchSize);
    let rawData: any[] = [];

    // V5: Time-based — fetch most recent N samples (no random offset)
    // This ensures the val/test sets are always the most recent data
    const startOffset = Math.max(0, (totalRows || 0) - sampleSize);

    for (let b = 0; b < batchCount; b++) {
      const start = startOffset + b * batchSize;
      const end = start + batchSize - 1;
      const { data: batch, error: batchErr } = await supabase
        .from('ml_training_data_v2').select(selectCols)
        .not(labelCol, 'is', null)
        .order('fixture_date', { ascending: true })
        .range(start, end);
      if (batchErr) throw batchErr;
      if (batch?.length) rawData = rawData.concat(batch);
      if (!batch || batch.length < batchSize) break;
    }

    if (rawData.length < 500) {
      return new Response(JSON.stringify({ error: 'Insufficient data', rows: rawData.length }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── V6: LEAGUE CLUSTER FILTERING ──
    if (effectiveCluster && effectiveCluster !== 'global') {
      const clusterLeagues = LEAGUE_CLUSTERS[effectiveCluster] || [];
      if (clusterLeagues.length > 0) {
        const filtered = rawData.filter(r => {
          const league = String(r.league || '').toLowerCase();
          return clusterLeagues.some(cl => league.includes(cl.toLowerCase()));
        });
        if (filtered.length >= 500) {
          console.log(`🏟️ League cluster '${effectiveCluster}': ${filtered.length}/${rawData.length} samples`);
          rawData = filtered;
        } else {
          console.log(`⚠️ Cluster '${effectiveCluster}' too small (${filtered.length}), using global`);
        }
      }
    }

    // Data is already sorted by fixture_date (ascending)
    console.log(`📊 V5 Loaded ${rawData.length} samples (time-sorted, offset ${startOffset}/${totalRows})`);

    // ── V5: TIME-BASED 70/15/15 SPLIT (no shuffle!) ──
    const trainEnd = Math.floor(rawData.length * 0.70);
    const valEnd = Math.floor(rawData.length * 0.85);
    const trainData = rawData.slice(0, trainEnd);
    const valData = rawData.slice(trainEnd, valEnd);
    const testData = rawData.slice(valEnd);

    console.log(`📐 Split: train=${trainData.length} val=${valData.length} test=${testData.length}`);

    // ── Compute sample recency weights ──
    const sampleWeights = computeSampleWeights(trainData.length, 0.4);

    // ── Fit Poisson GLM for ALL markets ──
    let glmResult: GLMResult | undefined;
    let glmFeatureCols: string[] | undefined;
    console.log(`📐 Fitting Poisson GLM for ${countCol} (threshold=${countThreshold})...`);
    glmFeatureCols = rawCols.filter(c =>
      c.includes('_avg_10') || c.includes('_avg_5') || c.includes('league_avg') || c.includes('league_') || c.includes('ref_avg')
    );
    const glmX: number[][] = trainData.map((r: any) => glmFeatureCols!.map(c => safeNum(r[c])));
    const glmY: number[] = trainData.map((r: any) => safeNum(r[countCol]));
    glmResult = fitPoissonGLM(glmX, glmY, 50, 0.0005);
    console.log(`📐 GLM: intercept=${glmResult.intercept.toFixed(3)}, coeffs=${glmResult.coefficients.length}`);

    // Build H2H map from training data (only use training data to avoid leakage)
    console.log(`🤝 Building H2H map from ${trainData.length} training samples...`);
    const h2hMap = buildH2HMap(trainData);
    console.log(`🤝 H2H map: ${h2hMap.size} team pairs with 2+ meetings`);

    // Prepare features (with H2H)
    const { X: trainX, featureNames, n: trainN } = prepareData(trainData, rawCols, engDefs, glmResult, glmFeatureCols, countThreshold, market, h2hMap);
    const { X: valX } = prepareData(valData, rawCols, engDefs, glmResult, glmFeatureCols, countThreshold, market, h2hMap);
    const { X: testX } = prepareData(testData, rawCols, engDefs, glmResult, glmFeatureCols, countThreshold, market, h2hMap);

    // Extract labels
    const trainY = new Float64Array(trainN);
    for (let i = 0; i < trainN; i++) trainY[i] = trainData[i][labelCol] === true ? 1 : 0;
    const valY = new Float64Array(valData.length);
    for (let i = 0; i < valData.length; i++) valY[i] = valData[i][labelCol] === true ? 1 : 0;
    const testY = new Float64Array(testData.length);
    for (let i = 0; i < testData.length; i++) testY[i] = testData[i][labelCol] === true ? 1 : 0;

    // Impute
    const medians = computeMedians(trainX, trainN);
    imputeNaN(trainX, medians, trainN);
    imputeNaN(valX, medians, valData.length);
    imputeNaN(testX, medians, testData.length);

    const posRate = trainY.reduce((s, v) => s + v, 0) / trainN;
    const baseScore = isNewModel ? logOdds(posRate) : modelState!.base_score;

    // ── Train Model A (conservative) + Model B (aggressive) ──
    const { newTrees: newTreesA } = trainGBTBatch(
      trainX, trainY, trainN, existingTreesA, baseScore, configA,
      Math.ceil(treesPerCall / 2), featureNames, sampleWeights,
    );
    const { newTrees: newTreesB } = trainGBTBatch(
      trainX, trainY, trainN, existingTreesB, baseScore, configB,
      Math.ceil(treesPerCall / 2), featureNames, sampleWeights,
    );

    const allTreesA = [...existingTreesA, ...newTreesA];
    const allTreesB = [...existingTreesB, ...newTreesB];
    const totalTrained = nTrained + newTreesA.length + newTreesB.length;

    // ── Validate on VAL set ──
    const valScoresA: number[] = [], valScoresB: number[] = [];
    for (let i = 0; i < valData.length; i++) {
      const feats = featureNames.map((_, f) => valX[f][i]);
      valScoresA.push(predictGBT(allTreesA, baseScore, configA.learningRate, feats));
      valScoresB.push(predictGBT(allTreesB, baseScore, configB.learningRate, feats));
    }

    // Optimal blend weight
    let bestBlendAUC = 0, bestWeightA = 0.5;
    for (let wA = 0.2; wA <= 0.8; wA += 0.1) {
      const blended = valScoresA.map((a, i) => wA * a + (1 - wA) * valScoresB[i]);
      const auc = computeAUC(Array.from(valY), blended);
      if (auc > bestBlendAUC) { bestBlendAUC = auc; bestWeightA = Math.round(wA * 10) / 10; }
    }

    const blendedVal = valScoresA.map((a, i) => bestWeightA * a + (1 - bestWeightA) * valScoresB[i]);
    const valAUC = computeAUC(Array.from(valY), blendedVal);
    const valAcc = computeAccuracy(Array.from(valY), blendedVal);
    const optThreshold = findOptimalThreshold(Array.from(valY), blendedVal);
    const aucA = computeAUC(Array.from(valY), valScoresA);
    const aucB = computeAUC(Array.from(valY), valScoresB);

    // ── TEST set metrics (held-out, never seen during training) ──
    const testScoresA: number[] = [], testScoresB: number[] = [];
    for (let i = 0; i < testData.length; i++) {
      const feats = featureNames.map((_, f) => testX[f][i]);
      testScoresA.push(predictGBT(allTreesA, baseScore, configA.learningRate, feats));
      testScoresB.push(predictGBT(allTreesB, baseScore, configB.learningRate, feats));
    }
    const blendedTest = testScoresA.map((a, i) => bestWeightA * a + (1 - bestWeightA) * testScoresB[i]);
    const testAUC = computeAUC(Array.from(testY), blendedTest);
    const testAcc = computeAccuracy(Array.from(testY), blendedTest);

    // Train metrics
    const trainScoresA: number[] = [], trainScoresB: number[] = [];
    for (let i = 0; i < trainN; i++) {
      const feats = featureNames.map((_, f) => trainX[f][i]);
      trainScoresA.push(predictGBT(allTreesA, baseScore, configA.learningRate, feats));
      trainScoresB.push(predictGBT(allTreesB, baseScore, configB.learningRate, feats));
    }
    const trainBlended = trainScoresA.map((a, i) => bestWeightA * a + (1 - bestWeightA) * trainScoresB[i]);
    const trainAUC = computeAUC(Array.from(trainY), trainBlended);
    const trainAcc = computeAccuracy(Array.from(trainY), trainBlended);

    // ── Isotonic calibration ──
    const isoMap = fitIsotonicCalibration(blendedVal, Array.from(valY));

    // ── Sanity cap computation ──
    const avgLeagueRate = trainData.reduce((s: number, r: any) => s + safeNum(r[leagueRateCol], 0.5), 0) / trainData.length;
    const sanityCap = applySanityCap(1.0, avgLeagueRate > 1 ? avgLeagueRate / 100 : avgLeagueRate, market);

    // ── Early stopping ──
    let newBestValAuc = bestValAuc;
    let newRoundsNoImprovement = roundsNoImprovement;
    if (valAUC > bestValAuc + 0.001) {
      newBestValAuc = valAUC; newRoundsNoImprovement = 0;
    } else {
      newRoundsNoImprovement++;
    }

    // ── SHAP + Permutation importance on completion ──
    let featureImportance: Record<string, number> | undefined;
    let shapExample: Record<string, number> | undefined;
    const isComplete = totalTrained >= totalTrees || newRoundsNoImprovement >= earlyStopPatience;
    if (isComplete) {
      console.log('🔍 Computing permutation importance + SHAP...');
      featureImportance = computePermutationImportance(
        allTreesA, baseScore, configA.learningRate,
        valX, Array.from(valY), featureNames, valData.length, 2,
      );
      // SHAP example on first val sample
      const exampleFeats = featureNames.map((_, f) => valX[f][0]);
      shapExample = computeFastSHAP(allTreesA, baseScore, configA.learningRate, exampleFeats, featureNames, medians);
    }

    console.log(`🎯 V5 Trees: A=${allTreesA.length} B=${allTreesB.length} total=${totalTrained}/${totalTrees}`);
    console.log(`   Val: AUC=${valAUC} Acc=${valAcc} | Test: AUC=${testAUC} Acc=${testAcc}`);
    console.log(`   AUC: A=${aucA} B=${aucB} Blend(${bestWeightA})=${valAUC}`);
    console.log(`   Early stop: best=${newBestValAuc}, no_improve=${newRoundsNoImprovement}/${earlyStopPatience}`);
    console.log(`   Sanity cap: league_rate=${avgLeagueRate.toFixed(3)}, max_prob=${sanityCap.toFixed(3)}`);

    // ── Save model (V6: uses marketKey for cluster-specific storage) ──
    const newModelState: GBTModelState = {
      trees: allTreesA, trees_b: allTreesB,
      base_score: baseScore,
      learning_rate: configA.learningRate, max_depth: configA.maxDepth,
      feature_names: featureNames,
      engineered_feature_names: engDefs.map(e => e.name),
      market, n_trained: totalTrained, target_trees: totalTrees,
      train_auc: trainAUC, val_auc: valAUC,
      train_accuracy: trainAcc, val_accuracy: valAcc,
      feature_medians: medians, engine_version: 'V6',
      best_val_auc: newBestValAuc,
      rounds_without_improvement: newRoundsNoImprovement,
      blend_weight_a: bestWeightA,
      blend_weight_b: Math.round((1 - bestWeightA) * 10) / 10,
      isotonic_map: isoMap,
      feature_importance: featureImportance,
      shap_top3_example: shapExample,
      sanity_caps: { league_base_rate: avgLeagueRate, max_probability: sanityCap },
      league_cluster: effectiveCluster || 'global',
    };

    await supabase.from('ml_models').update({ is_active: false })
      .eq('market', marketKey).eq('model_type', 'gradient_boosted_trees').eq('is_active', true);

    const { error: insertErr } = await supabase.from('ml_models').insert({
      market: marketKey, model_type: 'gradient_boosted_trees',
      weights: newModelState as unknown as Record<string, unknown>,
      feature_names: featureNames, features_used: featureNames.length,
      training_samples: trainN, test_samples: valData.length + testData.length,
      auc_roc: valAUC, accuracy: valAcc,
      precision_score: optThreshold.accuracy, recall_score: optThreshold.threshold,
      training_date: new Date().toISOString(), is_active: true, version: Date.now(),
    });
    if (insertErr) console.error('❌ Model save error:', insertErr.message);

    // Log training
    await supabase.from('ml_training_log').insert({
      market: marketKey, model_type: 'gradient_boosted_trees',
      trees_trained: totalTrained, target_trees: totalTrees,
      training_samples: trainN, validation_samples: valData.length,
      total_available: totalRows || 0,
      train_auc: trainAUC, val_auc: valAUC, train_accuracy: trainAcc, val_accuracy: valAcc,
      data_source: `V6_cluster_${effectiveCluster || 'global'}`,
      status: isComplete ? 'complete' : 'in_progress',
    });

    return new Response(JSON.stringify({
      success: true, market: marketKey, base_market: market, engine: 'V6_cluster_specific',
      trees_a: allTreesA.length, trees_b: allTreesB.length,
      trees_trained: totalTrained, target_trees: totalTrees,
      blend_weight_a: bestWeightA,
      total_features: featureNames.length,
      has_glm_stacking: true, glm_market: countCol,
      league_cluster: effectiveCluster || 'global',
      // Splits
      split: { train: trainData.length, val: valData.length, test: testData.length },
      // Metrics
      train_auc: trainAUC, train_accuracy: trainAcc,
      val_auc: valAUC, val_accuracy: valAcc, auc_a: aucA, auc_b: aucB,
      test_auc: testAUC, test_accuracy: testAcc,
      optimal_threshold: optThreshold.threshold, optimal_accuracy: optThreshold.accuracy,
      // Sanity
      sanity_cap: sanityCap, league_base_rate: avgLeagueRate,
      // Early stopping
      best_val_auc: newBestValAuc,
      rounds_without_improvement: newRoundsNoImprovement,
      early_stopped: newRoundsNoImprovement >= earlyStopPatience,
      // Explainability
      feature_importance: featureImportance,
      shap_example: shapExample,
      is_complete: isComplete,
      hasMore: !isComplete,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ V6 Training error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

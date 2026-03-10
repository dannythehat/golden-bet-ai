import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= CONFIGURATION =============
const MARKETS = [
  { name: "over_2.5_goals", labelField: "over_25_hit", threshold: 2.5 },
  { name: "btts", labelField: "btts_hit", threshold: 0 },
  { name: "over_9.5_corners", labelField: "over_95_corners_hit", threshold: 9.5 },
  { name: "over_3.5_cards", labelField: "over_35_cards_hit", threshold: 3.5 }
];

// ============= MATH UTILITIES =============
function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poissonProbability(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function poissonCumulativeOver(lambda: number, threshold: number): number {
  // P(X > threshold) = 1 - P(X <= floor(threshold))
  let cumulative = 0;
  const maxK = Math.floor(threshold);
  for (let k = 0; k <= maxK; k++) {
    cumulative += poissonProbability(lambda, k);
  }
  return 1 - cumulative;
}

function sigmoid(x: number): number {
  if (x > 20) return 1;
  if (x < -20) return 0;
  return 1 / (1 + Math.exp(-x));
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============= FEATURE ENGINEERING =============
interface RawRow {
  home_avg_goals: number | null;
  away_avg_goals: number | null;
  home_avg_corners: number | null;
  away_avg_corners: number | null;
  home_avg_cards: number | null;
  away_avg_cards: number | null;
  home_over25_pct: number | null;
  away_over25_pct: number | null;
  home_btts_pct: number | null;
  away_btts_pct: number | null;
  home_over95_corners_pct: number | null;
  away_over95_corners_pct: number | null;
  home_over35_cards_pct: number | null;
  away_over35_cards_pct: number | null;
  home_xg: number | null;
  away_xg: number | null;
  home_total_shots: number | null;
  away_total_shots: number | null;
  home_shots_on_goal: number | null;
  away_shots_on_goal: number | null;
  home_possession: string | null;
  away_possession: string | null;
  home_corners: number | null;
  away_corners: number | null;
  home_fouls: number | null;
  away_fouls: number | null;
  home_yellow_cards: number | null;
  away_yellow_cards: number | null;
  [key: string]: unknown;
}

function extractFeatures(row: RawRow): number[] {
  const val = (v: unknown): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "string") return parseFloat(v.replace("%", "")) || 0;
    return Number(v) || 0;
  };

  const homeGoals = val(row.home_avg_goals);
  const awayGoals = val(row.away_avg_goals);
  const homeCorners = val(row.home_avg_corners);
  const awayCorners = val(row.away_avg_corners);
  const homeCards = val(row.home_avg_cards);
  const awayCards = val(row.away_avg_cards);
  const homeXg = val(row.home_xg);
  const awayXg = val(row.away_xg);
  const homeShots = val(row.home_total_shots);
  const awayShots = val(row.away_total_shots);
  const homeShotsOn = val(row.home_shots_on_goal);
  const awayShotsOn = val(row.away_shots_on_goal);
  const homePoss = val(row.home_possession);
  const awayPoss = val(row.away_possession);
  const homeFouls = val(row.home_fouls);
  const awayFouls = val(row.away_fouls);

  // Combined metrics
  const totalExpectedGoals = homeGoals + awayGoals;
  const totalExpectedCorners = homeCorners + awayCorners;
  const totalExpectedCards = homeCards + awayCards;
  const totalXg = homeXg + awayXg;
  const totalShots = homeShots + awayShots;
  const totalShotsOn = homeShotsOn + awayShotsOn;
  const totalFouls = homeFouls + awayFouls;

  // Poisson probabilities (statistically optimal for goals/corners)
  const poissonOver25 = poissonCumulativeOver(totalExpectedGoals, 2.5);
  const poissonOver95Corners = poissonCumulativeOver(totalExpectedCorners, 9.5);
  const poissonOver35Cards = poissonCumulativeOver(totalExpectedCards, 3.5);
  
  // BTTS probability (both teams score)
  const homeScoreProb = 1 - poissonProbability(homeGoals, 0);
  const awayScoreProb = 1 - poissonProbability(awayGoals, 0);
  const bttsPoissonProb = homeScoreProb * awayScoreProb;

  // Shot accuracy ratios
  const homeShotAccuracy = homeShots > 0 ? homeShotsOn / homeShots : 0;
  const awayShotAccuracy = awayShots > 0 ? awayShotsOn / awayShots : 0;

  // Historical success rates
  const homeOver25Pct = val(row.home_over25_pct) / 100;
  const awayOver25Pct = val(row.away_over25_pct) / 100;
  const homeBttsPct = val(row.home_btts_pct) / 100;
  const awayBttsPct = val(row.away_btts_pct) / 100;
  const homeOver95CornersPct = val(row.home_over95_corners_pct) / 100;
  const awayOver95CornersPct = val(row.away_over95_corners_pct) / 100;
  const homeOver35CardsPct = val(row.home_over35_cards_pct) / 100;
  const awayOver35CardsPct = val(row.away_over35_cards_pct) / 100;

  // Differentials (relative strength)
  const goalsDiff = homeGoals - awayGoals;
  const xgDiff = homeXg - awayXg;
  const shotsDiff = homeShots - awayShots;
  const possessionDiff = homePoss - awayPoss;

  return [
    // Core averages (8)
    homeGoals, awayGoals, homeCorners, awayCorners,
    homeCards, awayCards, homeXg, awayXg,
    
    // Combined totals (7)
    totalExpectedGoals, totalExpectedCorners, totalExpectedCards,
    totalXg, totalShots, totalShotsOn, totalFouls,
    
    // Poisson probabilities (4) - KEY FEATURES
    poissonOver25, poissonOver95Corners, poissonOver35Cards, bttsPoissonProb,
    
    // Shot metrics (4)
    homeShots, awayShots, homeShotAccuracy, awayShotAccuracy,
    
    // Historical rates (8)
    homeOver25Pct, awayOver25Pct, homeBttsPct, awayBttsPct,
    homeOver95CornersPct, awayOver95CornersPct, homeOver35CardsPct, awayOver35CardsPct,
    
    // Differentials (4)
    goalsDiff, xgDiff, shotsDiff, possessionDiff,
    
    // Possession (2)
    homePoss / 100, awayPoss / 100,
    
    // Fouls (2)
    homeFouls, awayFouls
  ];
}

const FEATURE_NAMES = [
  "home_avg_goals", "away_avg_goals", "home_avg_corners", "away_avg_corners",
  "home_avg_cards", "away_avg_cards", "home_xg", "away_xg",
  "total_expected_goals", "total_expected_corners", "total_expected_cards",
  "total_xg", "total_shots", "total_shots_on", "total_fouls",
  "poisson_over_25", "poisson_over_95_corners", "poisson_over_35_cards", "btts_poisson_prob",
  "home_shots", "away_shots", "home_shot_accuracy", "away_shot_accuracy",
  "home_over25_pct", "away_over25_pct", "home_btts_pct", "away_btts_pct",
  "home_over95_corners_pct", "away_over95_corners_pct", "home_over35_cards_pct", "away_over35_cards_pct",
  "goals_diff", "xg_diff", "shots_diff", "possession_diff",
  "home_possession", "away_possession",
  "home_fouls", "away_fouls"
];

// ============= GRADIENT BOOSTING =============
interface DecisionStump {
  featureIndex: number;
  threshold: number;
  leftValue: number;
  rightValue: number;
}

interface GradientBoostingModel {
  stumps: DecisionStump[];
  learningRate: number;
  initialPrediction: number;
}

function findBestSplit(
  features: number[][],
  residuals: number[],
  featureIndex: number
): { threshold: number; improvement: number; leftValue: number; rightValue: number } {
  const values = features.map((f, i) => ({ val: f[featureIndex], residual: residuals[i] }));
  values.sort((a, b) => a.val - b.val);
  
  let bestThreshold = values[0].val;
  let bestImprovement = -Infinity;
  let bestLeftValue = 0;
  let bestRightValue = 0;
  
  const n = values.length;
  let leftSum = 0, leftCount = 0;
  let rightSum = residuals.reduce((a, b) => a + b, 0);
  let rightCount = n;
  
  for (let i = 0; i < n - 1; i++) {
    leftSum += values[i].residual;
    leftCount++;
    rightSum -= values[i].residual;
    rightCount--;
    
    if (values[i].val === values[i + 1].val) continue;
    
    const leftMean = leftSum / leftCount;
    const rightMean = rightSum / rightCount;
    
    // Improvement = reduction in squared error
    const improvement = leftCount * leftMean * leftMean + rightCount * rightMean * rightMean;
    
    if (improvement > bestImprovement) {
      bestImprovement = improvement;
      bestThreshold = (values[i].val + values[i + 1].val) / 2;
      bestLeftValue = leftMean;
      bestRightValue = rightMean;
    }
  }
  
  return { threshold: bestThreshold, improvement: bestImprovement, leftValue: bestLeftValue, rightValue: bestRightValue };
}

function trainGradientBoosting(
  features: number[][],
  labels: number[],
  nEstimators: number = 50,
  learningRate: number = 0.1
): GradientBoostingModel {
  const n = features.length;
  const nFeatures = features[0].length;
  
  // Initial prediction (log-odds of positive class)
  const posCount = labels.filter(l => l === 1).length;
  const initialPrediction = Math.log((posCount + 1) / (n - posCount + 1));
  
  const predictions = new Array(n).fill(initialPrediction);
  const stumps: DecisionStump[] = [];
  
  for (let iter = 0; iter < nEstimators; iter++) {
    // Calculate residuals (gradient of log-loss)
    const residuals = labels.map((y, i) => y - sigmoid(predictions[i]));
    
    // Find best stump across all features
    let bestStump: DecisionStump | null = null;
    let bestImprovement = -Infinity;
    
    // Sample features for diversity (like Random Forest)
    const featureSample = Math.min(Math.floor(Math.sqrt(nFeatures)) + 5, nFeatures);
    const featureIndices = shuffle([...Array(nFeatures).keys()]).slice(0, featureSample);
    
    for (const fi of featureIndices) {
      const split = findBestSplit(features, residuals, fi);
      if (split.improvement > bestImprovement) {
        bestImprovement = split.improvement;
        bestStump = {
          featureIndex: fi,
          threshold: split.threshold,
          leftValue: split.leftValue,
          rightValue: split.rightValue
        };
      }
    }
    
    if (bestStump) {
      stumps.push(bestStump);
      
      // Update predictions
      for (let i = 0; i < n; i++) {
        const value = features[i][bestStump.featureIndex] <= bestStump.threshold
          ? bestStump.leftValue
          : bestStump.rightValue;
        predictions[i] += learningRate * value;
      }
    }
  }
  
  return { stumps, learningRate, initialPrediction };
}

function predictGradientBoosting(model: GradientBoostingModel, features: number[]): number {
  let prediction = model.initialPrediction;
  
  for (const stump of model.stumps) {
    const value = features[stump.featureIndex] <= stump.threshold
      ? stump.leftValue
      : stump.rightValue;
    prediction += model.learningRate * value;
  }
  
  return sigmoid(prediction);
}

// ============= LOGISTIC REGRESSION =============
interface LogisticModel {
  weights: number[];
  bias: number;
  mean: number[];
  std: number[];
}

function normalizeFeatures(features: number[][]): { normalized: number[][]; mean: number[]; std: number[] } {
  const n = features.length;
  const nFeatures = features[0].length;
  const mean = new Array(nFeatures).fill(0);
  const std = new Array(nFeatures).fill(0);
  
  // Calculate mean
  for (const row of features) {
    for (let j = 0; j < nFeatures; j++) {
      mean[j] += row[j];
    }
  }
  for (let j = 0; j < nFeatures; j++) mean[j] /= n;
  
  // Calculate std
  for (const row of features) {
    for (let j = 0; j < nFeatures; j++) {
      std[j] += (row[j] - mean[j]) ** 2;
    }
  }
  for (let j = 0; j < nFeatures; j++) {
    std[j] = Math.sqrt(std[j] / n) || 1;
  }
  
  // Normalize
  const normalized = features.map(row => 
    row.map((val, j) => (val - mean[j]) / std[j])
  );
  
  return { normalized, mean, std };
}

function trainLogisticRegression(
  features: number[][],
  labels: number[],
  iterations: number = 500,
  learningRate: number = 0.01,
  l2Lambda: number = 0.01
): LogisticModel {
  const { normalized, mean, std } = normalizeFeatures(features);
  const n = normalized.length;
  const nFeatures = normalized[0].length;
  
  const weights = new Array(nFeatures).fill(0);
  let bias = 0;
  
  for (let iter = 0; iter < iterations; iter++) {
    const gradW = new Array(nFeatures).fill(0);
    let gradB = 0;
    
    for (let i = 0; i < n; i++) {
      const z = normalized[i].reduce((sum, x, j) => sum + x * weights[j], 0) + bias;
      const pred = sigmoid(z);
      const error = pred - labels[i];
      
      for (let j = 0; j < nFeatures; j++) {
        gradW[j] += error * normalized[i][j] + l2Lambda * weights[j];
      }
      gradB += error;
    }
    
    for (let j = 0; j < nFeatures; j++) {
      weights[j] -= learningRate * gradW[j] / n;
    }
    bias -= learningRate * gradB / n;
  }
  
  return { weights, bias, mean, std };
}

function predictLogistic(model: LogisticModel, features: number[]): number {
  const normalized = features.map((val, j) => (val - model.mean[j]) / model.std[j]);
  const z = normalized.reduce((sum, x, j) => sum + x * model.weights[j], 0) + model.bias;
  return sigmoid(z);
}

// ============= ENSEMBLE =============
interface EnsembleModel {
  gbModels: GradientBoostingModel[];
  lrModels: LogisticModel[];
  calibration: { a: number; b: number };
}

function calibrateProbabilities(
  predictions: number[],
  labels: number[]
): { a: number; b: number } {
  // Platt scaling: P_calibrated = 1 / (1 + exp(a * P + b))
  let a = 1, b = 0;
  const lr = 0.01;
  
  for (let iter = 0; iter < 100; iter++) {
    let gradA = 0, gradB = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      const p = sigmoid(a * predictions[i] + b);
      const error = p - labels[i];
      gradA += error * predictions[i];
      gradB += error;
    }
    
    a -= lr * gradA / predictions.length;
    b -= lr * gradB / predictions.length;
  }
  
  return { a, b };
}

function trainEnsemble(
  features: number[][],
  labels: number[],
  nGbModels: number = 3,
  nLrModels: number = 2
): EnsembleModel {
  const gbModels: GradientBoostingModel[] = [];
  const lrModels: LogisticModel[] = [];
  
  // Train multiple Gradient Boosting models with different subsamples
  for (let i = 0; i < nGbModels; i++) {
    const sampleIndices = shuffle([...Array(features.length).keys()])
      .slice(0, Math.floor(features.length * 0.8));
    const sampleFeatures = sampleIndices.map(idx => features[idx]);
    const sampleLabels = sampleIndices.map(idx => labels[idx]);
    
    gbModels.push(trainGradientBoosting(
      sampleFeatures, 
      sampleLabels, 
      30 + i * 10, // Vary number of estimators
      0.1 - i * 0.02 // Vary learning rate
    ));
  }
  
  // Train multiple Logistic Regression models
  for (let i = 0; i < nLrModels; i++) {
    const sampleIndices = shuffle([...Array(features.length).keys()])
      .slice(0, Math.floor(features.length * 0.8));
    const sampleFeatures = sampleIndices.map(idx => features[idx]);
    const sampleLabels = sampleIndices.map(idx => labels[idx]);
    
    lrModels.push(trainLogisticRegression(
      sampleFeatures,
      sampleLabels,
      300 + i * 100,
      0.01,
      0.01 + i * 0.005
    ));
  }
  
  // Get ensemble predictions for calibration
  const ensemblePredictions = features.map(f => {
    const gbPreds = gbModels.map(m => predictGradientBoosting(m, f));
    const lrPreds = lrModels.map(m => predictLogistic(m, f));
    const allPreds = [...gbPreds, ...lrPreds];
    return allPreds.reduce((a, b) => a + b, 0) / allPreds.length;
  });
  
  const calibration = calibrateProbabilities(ensemblePredictions, labels);
  
  return { gbModels, lrModels, calibration };
}

function predictEnsemble(model: EnsembleModel, features: number[]): number {
  const gbPreds = model.gbModels.map(m => predictGradientBoosting(m, features));
  const lrPreds = model.lrModels.map(m => predictLogistic(m, features));
  const allPreds = [...gbPreds, ...lrPreds];
  const rawPred = allPreds.reduce((a, b) => a + b, 0) / allPreds.length;
  
  // Apply calibration
  return sigmoid(model.calibration.a * rawPred + model.calibration.b);
}

// ============= METRICS =============
function calculateMetrics(predictions: number[], labels: number[], threshold: number = 0.5) {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  
  for (let i = 0; i < predictions.length; i++) {
    const pred = predictions[i] >= threshold ? 1 : 0;
    const actual = labels[i];
    
    if (pred === 1 && actual === 1) tp++;
    else if (pred === 0 && actual === 0) tn++;
    else if (pred === 1 && actual === 0) fp++;
    else fn++;
  }
  
  const accuracy = (tp + tn) / (tp + tn + fp + fn);
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1 = 2 * precision * recall / (precision + recall) || 0;
  
  // AUC-ROC approximation
  const sorted = predictions.map((p, i) => ({ p, l: labels[i] }))
    .sort((a, b) => b.p - a.p);
  
  let auc = 0;
  let posCount = 0;
  let negCount = 0;
  
  for (const item of sorted) {
    if (item.l === 1) {
      posCount++;
    } else {
      auc += posCount;
      negCount++;
    }
  }
  
  const aucRoc = posCount > 0 && negCount > 0 ? auc / (posCount * negCount) : 0.5;
  
  return { accuracy, precision, recall, f1, aucRoc, tp, tn, fp, fn };
}

function findOptimalThreshold(predictions: number[], labels: number[]): number {
  let bestThreshold = 0.5;
  let bestF1 = 0;
  
  for (let t = 0.3; t <= 0.8; t += 0.01) {
    const metrics = calculateMetrics(predictions, labels, t);
    if (metrics.f1 > bestF1) {
      bestF1 = metrics.f1;
      bestThreshold = t;
    }
  }
  
  return bestThreshold;
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      market = "all",
      sampleSize = 8000, // Optimized for Edge Function memory
      nGbModels = 2,     // Reduced for performance
      nLrModels = 2
    } = await req.json().catch(() => ({}));

    // Cap sample size to avoid memory issues
    const effectiveSampleSize = Math.min(sampleSize, 10000);

    const marketsToTrain = market === "all" 
      ? MARKETS 
      : MARKETS.filter(m => m.name === market);

    console.log(`[Ensemble ML] Training ${marketsToTrain.length} markets with ${effectiveSampleSize} samples`);

    const results: Record<string, unknown> = {};

    for (const marketConfig of marketsToTrain) {
      console.log(`[Ensemble ML] Training ${marketConfig.name}...`);

      // Fetch data in batches to overcome 1000 row limit
      const batchSize = 1000;
      const batches = Math.ceil(effectiveSampleSize / batchSize);
      // deno-lint-ignore no-explicit-any
      let allData: any[] = [];

      for (let batch = 0; batch < batches && allData.length < effectiveSampleSize; batch++) {
        const { data: batchData, error: fetchError } = await supabase
          .from("ml_training_data")
          .select("home_avg_goals,away_avg_goals,home_avg_corners,away_avg_corners,home_avg_cards,away_avg_cards,home_over25_pct,away_over25_pct,home_btts_pct,away_btts_pct,home_over95_corners_pct,away_over95_corners_pct,home_over35_cards_pct,away_over35_cards_pct,home_xg,away_xg,home_total_shots,away_total_shots,home_shots_on_goal,away_shots_on_goal,home_possession,away_possession,home_corners,away_corners,home_fouls,away_fouls,home_yellow_cards,away_yellow_cards,over_25_hit,btts_hit,over_95_corners_hit,over_35_cards_hit,fixture_date")
          .not(marketConfig.labelField, "is", null)
          .order("fixture_date", { ascending: false })
          .range(batch * batchSize, (batch + 1) * batchSize - 1);

        if (fetchError) {
          console.error(`[Ensemble ML] Batch ${batch} error:`, fetchError);
          break;
        }

        if (!batchData || batchData.length === 0) break;
        allData = allData.concat(batchData);
      }

      if (allData.length < 500) {
        results[marketConfig.name] = { 
          error: `Insufficient data: ${allData.length} rows`,
          success: false 
        };
        continue;
      }

      // Cap at requested sample size
      const dataRows = allData.slice(0, effectiveSampleSize);
      console.log(`[Ensemble ML] Loaded ${dataRows.length} rows for ${marketConfig.name}`);

      // Extract features and labels
      const features = dataRows.map(row => extractFeatures(row));
      const labels = dataRows.map(row => row[marketConfig.labelField] ? 1 : 0);

      // Shuffle and split (80/20)
      const indices = shuffle([...Array(features.length).keys()]);
      const splitIdx = Math.floor(indices.length * 0.8);
      
      const trainIndices = indices.slice(0, splitIdx);
      const testIndices = indices.slice(splitIdx);
      
      const trainFeatures = trainIndices.map(i => features[i]);
      const trainLabels = trainIndices.map(i => labels[i]);
      const testFeatures = testIndices.map(i => features[i]);
      const testLabels = testIndices.map(i => labels[i]);

      console.log(`[Ensemble ML] Train: ${trainFeatures.length}, Test: ${testFeatures.length}`);

      // Train ensemble
      const startTime = Date.now();
      const ensembleModel = trainEnsemble(trainFeatures, trainLabels, nGbModels, nLrModels);
      const trainTime = Date.now() - startTime;

      // Evaluate
      const testPredictions = testFeatures.map(f => predictEnsemble(ensembleModel, f));
      const optimalThreshold = findOptimalThreshold(testPredictions, testLabels);
      const metrics = calculateMetrics(testPredictions, testLabels, optimalThreshold);

      console.log(`[Ensemble ML] ${marketConfig.name}: AUC=${metrics.aucRoc.toFixed(3)}, F1=${metrics.f1.toFixed(3)}`);

      // Serialize model for storage
      const modelWeights = {
        gbModels: ensembleModel.gbModels.map(m => ({
          stumps: m.stumps,
          learningRate: m.learningRate,
          initialPrediction: m.initialPrediction
        })),
        lrModels: ensembleModel.lrModels.map(m => ({
          weights: m.weights,
          bias: m.bias,
          mean: m.mean,
          std: m.std
        })),
        calibration: ensembleModel.calibration,
        optimalThreshold
      };

      // Deactivate previous models
      await supabase
        .from("ml_models")
        .update({ is_active: false })
        .eq("market", marketConfig.name);

      // Get next version
      const { data: versionData } = await supabase
        .from("ml_models")
        .select("version")
        .eq("market", marketConfig.name)
        .order("version", { ascending: false })
        .limit(1);

      const nextVersion = (versionData?.[0]?.version || 0) + 1;

      // Save model
      const { error: insertError } = await supabase
        .from("ml_models")
        .insert({
          market: marketConfig.name,
          model_type: "gradient_boosting_ensemble",
          weights: modelWeights,
          feature_names: FEATURE_NAMES,
          training_samples: trainFeatures.length,
          test_samples: testFeatures.length,
          features_used: FEATURE_NAMES.length,
          accuracy: metrics.accuracy,
          auc_roc: metrics.aucRoc,
          f1_score: metrics.f1,
          precision_score: metrics.precision,
          recall_score: metrics.recall,
          true_positives: metrics.tp,
          true_negatives: metrics.tn,
          false_positives: metrics.fp,
          false_negatives: metrics.fn,
          is_active: true,
          version: nextVersion
        });

      if (insertError) {
        console.error(`[Ensemble ML] Save error:`, insertError);
      }

      results[marketConfig.name] = {
        success: true,
        version: nextVersion,
        training_samples: trainFeatures.length,
        test_samples: testFeatures.length,
        train_time_ms: trainTime,
        optimal_threshold: optimalThreshold,
        metrics: {
          auc_roc: metrics.aucRoc,
          accuracy: metrics.accuracy,
          precision: metrics.precision,
          recall: metrics.recall,
          f1_score: metrics.f1
        },
        ensemble: {
          gradient_boosting_models: nGbModels,
          logistic_regression_models: nLrModels,
          total_models: nGbModels + nLrModels
        }
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: "ensemble",
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Ensemble ML] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

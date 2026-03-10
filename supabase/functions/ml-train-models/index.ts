import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ML TRAINING PIPELINE
 * 
 * Implements proper ML training with:
 * - Logistic Regression from scratch
 * - 80/20 Train/Test split
 * - Full metrics: AUC-ROC, Accuracy, Precision, Recall, F1
 * - Confusion matrix
 * - Model versioning
 */

interface TrainingData {
  features: number[];
  label: number; // 0 or 1
}

interface ModelMetrics {
  auc: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
}

// Sigmoid function for logistic regression
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
}

// Predict probability using trained weights
function predict(features: number[], weights: number[]): number {
  let z = weights[0]; // bias
  for (let i = 0; i < features.length; i++) {
    z += features[i] * weights[i + 1];
  }
  return sigmoid(z);
}

// Train logistic regression using gradient descent
function trainLogisticRegression(
  data: TrainingData[],
  learningRate = 0.01,
  iterations = 1000
): number[] {
  const numFeatures = data[0].features.length;
  const weights = new Array(numFeatures + 1).fill(0); // +1 for bias
  
  for (let iter = 0; iter < iterations; iter++) {
    const gradients = new Array(numFeatures + 1).fill(0);
    
    for (const sample of data) {
      const prediction = predict(sample.features, weights);
      const error = prediction - sample.label;
      
      // Gradient for bias
      gradients[0] += error;
      
      // Gradients for features
      for (let i = 0; i < numFeatures; i++) {
        gradients[i + 1] += error * sample.features[i];
      }
    }
    
    // Update weights
    for (let i = 0; i < weights.length; i++) {
      weights[i] -= (learningRate / data.length) * gradients[i];
    }
  }
  
  return weights;
}

// Calculate AUC-ROC using trapezoidal rule
function calculateAUC(predictions: { prob: number; label: number }[]): number {
  // Sort by probability descending
  const sorted = [...predictions].sort((a, b) => b.prob - a.prob);
  
  const totalPositives = sorted.filter(p => p.label === 1).length;
  const totalNegatives = sorted.filter(p => p.label === 0).length;
  
  if (totalPositives === 0 || totalNegatives === 0) return 0.5;
  
  let tpr = 0, fpr = 0;
  let prevTpr = 0, prevFpr = 0;
  let auc = 0;
  
  for (const point of sorted) {
    if (point.label === 1) {
      tpr += 1 / totalPositives;
    } else {
      fpr += 1 / totalNegatives;
      // Add area of trapezoid
      auc += (fpr - prevFpr) * (tpr + prevTpr) / 2;
      prevFpr = fpr;
      prevTpr = tpr;
    }
  }
  
  return Math.min(1, Math.max(0, auc));
}

// Calculate all metrics
function calculateMetrics(
  testData: TrainingData[],
  weights: number[],
  threshold = 0.5
): ModelMetrics {
  const predictions: { prob: number; label: number }[] = [];
  let tp = 0, tn = 0, fp = 0, fn = 0;
  
  for (const sample of testData) {
    const prob = predict(sample.features, weights);
    const predicted = prob >= threshold ? 1 : 0;
    const actual = sample.label;
    
    predictions.push({ prob, label: actual });
    
    if (predicted === 1 && actual === 1) tp++;
    else if (predicted === 0 && actual === 0) tn++;
    else if (predicted === 1 && actual === 0) fp++;
    else fn++;
  }
  
  const accuracy = (tp + tn) / testData.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
  const auc = calculateAUC(predictions);
  
  return {
    auc,
    accuracy,
    precision,
    recall,
    f1,
    truePositives: tp,
    trueNegatives: tn,
    falsePositives: fp,
    falseNegatives: fn
  };
}

// Normalize features to 0-1 range
function normalizeFeatures(data: TrainingData[]): { 
  normalized: TrainingData[], 
  mins: number[], 
  maxs: number[] 
} {
  if (data.length === 0) return { normalized: [], mins: [], maxs: [] };
  
  const numFeatures = data[0].features.length;
  const mins = new Array(numFeatures).fill(Infinity);
  const maxs = new Array(numFeatures).fill(-Infinity);
  
  // Find min/max for each feature
  for (const sample of data) {
    for (let i = 0; i < numFeatures; i++) {
      mins[i] = Math.min(mins[i], sample.features[i]);
      maxs[i] = Math.max(maxs[i], sample.features[i]);
    }
  }
  
  // Normalize
  const normalized = data.map(sample => ({
    label: sample.label,
    features: sample.features.map((f, i) => 
      maxs[i] - mins[i] > 0 ? (f - mins[i]) / (maxs[i] - mins[i]) : 0.5
    )
  }));
  
  return { normalized, mins, maxs };
}

// Shuffle array (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Feature names used for each market
const FEATURE_NAMES = [
  'home_over25_pct', 'away_over25_pct',
  'home_btts_pct', 'away_btts_pct',
  'home_avg_goals', 'away_avg_goals',
  'home_avg_corners', 'away_avg_corners',
  'home_avg_cards', 'away_avg_cards',
  'home_over95_corners_pct', 'away_over95_corners_pct',
  'home_over35_cards_pct', 'away_over35_cards_pct'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🧠 ML Training Pipeline Starting...');

    // Fetch all training data
    const { data: rawData, error: fetchError } = await supabase
      .from('ml_training_data')
      .select(`
        home_over25_pct, away_over25_pct,
        home_btts_pct, away_btts_pct,
        home_avg_goals, away_avg_goals,
        home_avg_corners, away_avg_corners,
        home_avg_cards, away_avg_cards,
        home_over95_corners_pct, away_over95_corners_pct,
        home_over35_cards_pct, away_over35_cards_pct,
        over_25_hit, btts_hit, over_95_corners_hit, over_35_cards_hit
      `)
      .not('home_over25_pct', 'is', null)
      .not('away_over25_pct', 'is', null);

    if (fetchError) throw fetchError;
    if (!rawData || rawData.length < 100) {
      throw new Error(`Insufficient training data: ${rawData?.length || 0} samples`);
    }

    console.log(`📊 Loaded ${rawData.length} training samples`);

    const markets = [
      { name: 'over_2.5_goals', labelField: 'over_25_hit' },
      { name: 'btts', labelField: 'btts_hit' },
      { name: 'over_9.5_corners', labelField: 'over_95_corners_hit' },
      { name: 'over_3.5_cards', labelField: 'over_35_cards_hit' }
    ];

    const results: Record<string, any> = {};

    for (const market of markets) {
      console.log(`\n🎯 Training model for: ${market.name}`);

      // Prepare data for this market
      const marketData: TrainingData[] = rawData
        .filter(row => (row as Record<string, unknown>)[market.labelField] !== null)
        .map(row => ({
          features: [
            row.home_over25_pct || 0,
            row.away_over25_pct || 0,
            row.home_btts_pct || 0,
            row.away_btts_pct || 0,
            parseFloat(row.home_avg_goals) || 0,
            parseFloat(row.away_avg_goals) || 0,
            parseFloat(row.home_avg_corners) || 0,
            parseFloat(row.away_avg_corners) || 0,
            parseFloat(row.home_avg_cards) || 0,
            parseFloat(row.away_avg_cards) || 0,
            row.home_over95_corners_pct || 0,
            row.away_over95_corners_pct || 0,
            row.home_over35_cards_pct || 0,
            row.away_over35_cards_pct || 0
          ],
          label: (row as Record<string, unknown>)[market.labelField] ? 1 : 0
        }));

      if (marketData.length < 100) {
        console.log(`⚠️ Skipping ${market.name}: only ${marketData.length} samples`);
        continue;
      }

      // Shuffle and split 80/20
      const shuffled = shuffle(marketData);
      const splitIndex = Math.floor(shuffled.length * 0.8);
      const trainData = shuffled.slice(0, splitIndex);
      const testData = shuffled.slice(splitIndex);

      console.log(`  📈 Train: ${trainData.length}, Test: ${testData.length}`);

      // Normalize features
      const { normalized: normalizedTrain, mins, maxs } = normalizeFeatures(trainData);
      const normalizedTest = testData.map(sample => ({
        label: sample.label,
        features: sample.features.map((f, i) => 
          maxs[i] - mins[i] > 0 ? (f - mins[i]) / (maxs[i] - mins[i]) : 0.5
        )
      }));

      // Train the model
      console.log('  🔄 Training logistic regression...');
      const weights = trainLogisticRegression(normalizedTrain, 0.1, 2000);

      // Calculate metrics
      const metrics = calculateMetrics(normalizedTest, weights, 0.5);

      console.log(`  ✅ AUC: ${metrics.auc.toFixed(3)}, Accuracy: ${metrics.accuracy.toFixed(3)}`);
      console.log(`     Precision: ${metrics.precision.toFixed(3)}, Recall: ${metrics.recall.toFixed(3)}, F1: ${metrics.f1.toFixed(3)}`);
      console.log(`     Confusion: TP=${metrics.truePositives}, TN=${metrics.trueNegatives}, FP=${metrics.falsePositives}, FN=${metrics.falseNegatives}`);

      // Get current version
      const { data: existingModels } = await supabase
        .from('ml_models')
        .select('version')
        .eq('market', market.name)
        .order('version', { ascending: false })
        .limit(1);

      const newVersion = (existingModels?.[0]?.version || 0) + 1;

      // Deactivate previous models
      await supabase
        .from('ml_models')
        .update({ is_active: false })
        .eq('market', market.name);

      // Store the model
      await supabase.from('ml_models').insert({
        market: market.name,
        model_type: 'logistic_regression',
        weights: { weights, mins, maxs },
        feature_names: FEATURE_NAMES,
        auc_roc: metrics.auc,
        accuracy: metrics.accuracy,
        precision_score: metrics.precision,
        recall_score: metrics.recall,
        f1_score: metrics.f1,
        true_positives: metrics.truePositives,
        true_negatives: metrics.trueNegatives,
        false_positives: metrics.falsePositives,
        false_negatives: metrics.falseNegatives,
        training_samples: trainData.length,
        test_samples: testData.length,
        features_used: FEATURE_NAMES.length,
        version: newVersion,
        is_active: true
      });

      results[market.name] = {
        auc: parseFloat(metrics.auc.toFixed(3)),
        accuracy: parseFloat(metrics.accuracy.toFixed(3)),
        precision: parseFloat(metrics.precision.toFixed(3)),
        recall: parseFloat(metrics.recall.toFixed(3)),
        f1: parseFloat(metrics.f1.toFixed(3)),
        confusionMatrix: {
          tp: metrics.truePositives,
          tn: metrics.trueNegatives,
          fp: metrics.falsePositives,
          fn: metrics.falseNegatives
        },
        trainingSamples: trainData.length,
        testSamples: testData.length,
        version: newVersion
      };
    }

    console.log('\n🎉 ML Training Complete!');

    return new Response(JSON.stringify({
      success: true,
      totalSamples: rawData.length,
      modelsTrainedAt: new Date().toISOString(),
      markets: results
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('ML Training Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * INCREMENTAL ML TRAINING PIPELINE
 * 
 * Uses mini-batch Stochastic Gradient Descent with recursive chaining
 * to train on 200k+ samples without timeout issues.
 */

const BATCH_SIZE = 3000;
const LEARNING_RATE = 0.05;
const L2_LAMBDA = 0.001;

interface TrainingState {
  weights: number[];
  mins: number[];
  maxs: number[];
  samplesProcessed: number;
  epoch: number;
  runId: string;
}

// Sigmoid with numerical stability
function sigmoid(z: number): number {
  if (z > 500) return 1;
  if (z < -500) return 0;
  return 1 / (1 + Math.exp(-z));
}

// Predict probability
function predict(features: number[], weights: number[]): number {
  let z = weights[0];
  for (let i = 0; i < features.length; i++) {
    z += features[i] * (weights[i + 1] || 0);
  }
  return sigmoid(z);
}

// Poisson probability for over 2.5 goals
function poissonOver25(homeXg: number, awayXg: number): number {
  const lambda = homeXg + awayXg;
  const prob0 = Math.exp(-lambda);
  const prob1 = lambda * Math.exp(-lambda);
  const prob2 = (lambda * lambda / 2) * Math.exp(-lambda);
  return Math.max(0, Math.min(1, 1 - (prob0 + prob1 + prob2)));
}

// Parse form string to numeric score
function parseForm(form: string | null): number {
  if (!form) return 0;
  let score = 0;
  const chars = form.toUpperCase().split('').slice(-5);
  chars.forEach((c, i) => {
    const weight = (i + 1) / 5;
    if (c === 'W') score += 3 * weight;
    else if (c === 'D') score += 1 * weight;
  });
  return score / 3;
}

// Extract 48 engineered features
function extractFeatures(row: Record<string, unknown>): number[] {
  const homeXg = Number(row.home_xg) || Number(row.home_avg_goals) || 1.3;
  const awayXg = Number(row.away_xg) || Number(row.away_avg_goals) || 1.1;
  const homeGoals = Number(row.home_avg_goals) || 1.3;
  const awayGoals = Number(row.away_avg_goals) || 1.1;
  const homeCorners = Number(row.home_avg_corners) || 5;
  const awayCorners = Number(row.away_avg_corners) || 4.5;
  const homeCards = Number(row.home_avg_cards) || 2;
  const awayCards = Number(row.away_avg_cards) || 2;
  
  const homeShotsOn = Number(row.home_shots_on_goal) || 4;
  const awayShotsOn = Number(row.away_shots_on_goal) || 3;
  const homeShotsTotal = Number(row.home_total_shots) || 12;
  const awayShotsTotal = Number(row.away_total_shots) || 10;
  
  const homeForm = parseForm(row.home_form as string);
  const awayForm = parseForm(row.away_form as string);
  
  const homeOver25 = Number(row.home_over25_pct) || 50;
  const awayOver25 = Number(row.away_over25_pct) || 50;
  const homeBtts = Number(row.home_btts_pct) || 50;
  const awayBtts = Number(row.away_btts_pct) || 50;
  const homeOver95C = Number(row.home_over95_corners_pct) || 50;
  const awayOver95C = Number(row.away_over95_corners_pct) || 50;
  const homeOver35Cards = Number(row.home_over35_cards_pct) || 50;
  const awayOver35Cards = Number(row.away_over35_cards_pct) || 50;
  
  const poissonO25 = poissonOver25(homeXg, awayXg);
  const xgDiff = homeXg - awayXg;
  const xgTotal = homeXg + awayXg;
  const goalsDiff = homeGoals - awayGoals;
  const goalsTotal = homeGoals + awayGoals;
  const cornersDiff = homeCorners - awayCorners;
  const cornersTotal = homeCorners + awayCorners;
  const cardsDiff = homeCards - awayCards;
  const cardsTotal = homeCards + awayCards;
  
  const homeShotAcc = homeShotsTotal > 0 ? homeShotsOn / homeShotsTotal : 0.33;
  const awayShotAcc = awayShotsTotal > 0 ? awayShotsOn / awayShotsTotal : 0.30;
  const formDiff = homeForm - awayForm;
  const formTotal = homeForm + awayForm;
  
  const over25Synergy = (homeOver25 + awayOver25) / 200;
  const bttsSynergy = (homeBtts + awayBtts) / 200;
  const cornerSynergy = (homeOver95C + awayOver95C) / 200;
  const cardSynergy = (homeOver35Cards + awayOver35Cards) / 200;
  
  const xgFormInteraction = xgTotal * (formTotal / 10);
  const goalsCornerInteraction = goalsTotal * (cornersTotal / 20);
  const xgTotalSq = xgTotal * xgTotal;
  const goalsTotalSq = goalsTotal * goalsTotal;

  return [
    homeOver25 / 100, awayOver25 / 100, homeBtts / 100, awayBtts / 100,
    homeOver95C / 100, awayOver95C / 100, homeOver35Cards / 100, awayOver35Cards / 100,
    homeGoals / 3, awayGoals / 3, homeCorners / 10, awayCorners / 10,
    homeCards / 5, awayCards / 5, homeXg / 3, awayXg / 3,
    homeShotsOn / 10, awayShotsOn / 10, homeShotAcc, awayShotAcc,
    homeForm / 5, awayForm / 5, formDiff / 5, formTotal / 10,
    xgDiff / 2, xgTotal / 4, goalsDiff / 2, goalsTotal / 4,
    cornersDiff / 5, cornersTotal / 15, cardsDiff / 3, cardsTotal / 8,
    poissonO25, over25Synergy, bttsSynergy, cornerSynergy, cardSynergy,
    xgFormInteraction / 10, goalsCornerInteraction / 10, xgTotalSq / 16, goalsTotalSq / 16,
    xgTotal > 2.5 ? 1 : 0, goalsTotal > 2.5 ? 1 : 0, cornersTotal > 9.5 ? 1 : 0, cardsTotal > 3.5 ? 1 : 0,
    homeForm > awayForm ? 1 : 0, homeShotAcc > awayShotAcc ? 1 : 0, over25Synergy > 0.6 ? 1 : 0,
  ];
}

const NUM_FEATURES = 48;

const MARKETS = [
  { name: 'over_2.5_goals', labelField: 'over_25_hit' },
  { name: 'btts', labelField: 'btts_hit' },
  { name: 'over_9.5_corners', labelField: 'over_95_corners_hit' },
  { name: 'over_3.5_cards', labelField: 'over_35_cards_hit' }
];

const FEATURE_NAMES = [
  'home_over25_pct', 'away_over25_pct', 'home_btts_pct', 'away_btts_pct',
  'home_over95c_pct', 'away_over95c_pct', 'home_over35cards_pct', 'away_over35cards_pct',
  'home_avg_goals', 'away_avg_goals', 'home_avg_corners', 'away_avg_corners',
  'home_avg_cards', 'away_avg_cards', 'home_xg', 'away_xg',
  'home_shots_on', 'away_shots_on', 'home_shot_acc', 'away_shot_acc',
  'home_form', 'away_form', 'form_diff', 'form_total',
  'xg_diff', 'xg_total', 'goals_diff', 'goals_total',
  'corners_diff', 'corners_total', 'cards_diff', 'cards_total',
  'poisson_o25', 'over25_synergy', 'btts_synergy', 'corner_synergy', 'card_synergy',
  'xg_form_interaction', 'goals_corner_interaction', 'xg_total_sq', 'goals_total_sq',
  'xg_threshold', 'goals_threshold', 'corners_threshold', 'cards_threshold',
  'home_form_better', 'home_shot_acc_better', 'over25_synergy_high'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const marketIdx = body.marketIdx || 0;
    const offset = body.offset || 0;
    const runId = body.runId || crypto.randomUUID();
    
    const market = MARKETS[marketIdx];
    if (!market) {
      console.log('🎉 All markets trained!');
      return new Response(JSON.stringify({
        success: true,
        message: 'Training complete for all markets',
        runId
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`📊 Training ${market.name} | Offset: ${offset} | RunId: ${runId}`);

    // Get total count
    const { count: totalCount } = await supabase
      .from('ml_training_data')
      .select('*', { count: 'exact', head: true })
      .not(market.labelField, 'is', null)
      .not('home_over25_pct', 'is', null);

    console.log(`  Total samples for ${market.name}: ${totalCount}`);

    // Fetch batch
    const { data: batch, error: fetchError } = await supabase
      .from('ml_training_data')
      .select('*')
      .not(market.labelField, 'is', null)
      .not('home_over25_pct', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (fetchError) throw fetchError;

    if (!batch || batch.length === 0) {
      console.log(`✅ ${market.name} complete! Finalizing...`);
      
      await finalizeModel(supabase, market.name, runId);
      
      const nextCall = { marketIdx: marketIdx + 1, offset: 0, runId };
      EdgeRuntime.waitUntil(chainNext(supabaseUrl, supabaseKey, nextCall));
      
      return new Response(JSON.stringify({
        success: true,
        market: market.name,
        status: 'completed',
        nextMarket: MARKETS[marketIdx + 1]?.name || 'none'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load or initialize state
    let state = await loadState(supabase, market.name, runId);
    if (!state) {
      state = {
        weights: new Array(NUM_FEATURES + 1).fill(0),
        mins: new Array(NUM_FEATURES).fill(Infinity),
        maxs: new Array(NUM_FEATURES).fill(-Infinity),
        samplesProcessed: 0,
        epoch: 1,
        runId
      };
    }

    // Process batch
    const features: number[][] = [];
    const labels: number[] = [];
    
    for (const row of batch) {
      const feat = extractFeatures(row as Record<string, unknown>);
      features.push(feat);
      labels.push((row as Record<string, unknown>)[market.labelField] ? 1 : 0);
      
      for (let i = 0; i < feat.length; i++) {
        state.mins[i] = Math.min(state.mins[i], feat[i]);
        state.maxs[i] = Math.max(state.maxs[i], feat[i]);
      }
    }

    // Normalize and train
    const normalizedFeatures = features.map(f => 
      f.map((v, i) => {
        const range = state.maxs[i] - state.mins[i];
        return range > 0 ? (v - state.mins[i]) / range : 0.5;
      })
    );

    // Mini-batch SGD
    const gradients = new Array(NUM_FEATURES + 1).fill(0);
    
    for (let i = 0; i < normalizedFeatures.length; i++) {
      const feat = normalizedFeatures[i];
      const label = labels[i];
      const pred = predict(feat, state.weights);
      const error = pred - label;
      
      gradients[0] += error;
      for (let j = 0; j < feat.length; j++) {
        gradients[j + 1] += error * feat[j] + L2_LAMBDA * state.weights[j + 1];
      }
    }

    const batchLen = normalizedFeatures.length;
    for (let i = 0; i < state.weights.length; i++) {
      state.weights[i] -= (LEARNING_RATE / batchLen) * gradients[i];
    }

    state.samplesProcessed += batch.length;
    await saveState(supabase, market.name, state);

    const progress = totalCount ? Math.round((state.samplesProcessed / totalCount) * 100) : 0;
    console.log(`  Processed ${state.samplesProcessed}/${totalCount} (${progress}%)`);

    // Chain to next batch
    const nextCall = { marketIdx, offset: offset + BATCH_SIZE, runId };
    EdgeRuntime.waitUntil(chainNext(supabaseUrl, supabaseKey, nextCall));

    return new Response(JSON.stringify({
      success: true,
      market: market.name,
      samplesProcessed: state.samplesProcessed,
      totalSamples: totalCount,
      progress: `${progress}%`,
      batchSize: batch.length
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Training error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// deno-lint-ignore no-explicit-any
async function loadState(supabase: any, market: string, runId: string): Promise<TrainingState | null> {
  const { data } = await supabase
    .from('ml_models')
    .select('weights')
    .eq('market', market)
    .eq('model_type', `training_${runId}`)
    .maybeSingle();
  
  return data?.weights as TrainingState || null;
}

// deno-lint-ignore no-explicit-any
async function saveState(supabase: any, market: string, state: TrainingState) {
  const existing = await supabase
    .from('ml_models')
    .select('id')
    .eq('market', market)
    .eq('model_type', `training_${state.runId}`)
    .maybeSingle();

  if (existing.data) {
    await supabase
      .from('ml_models')
      .update({ weights: state })
      .eq('id', existing.data.id);
  } else {
    await supabase.from('ml_models').insert({
      market,
      model_type: `training_${state.runId}`,
      weights: state,
      feature_names: FEATURE_NAMES,
      training_samples: state.samplesProcessed,
      test_samples: 0,
      features_used: NUM_FEATURES,
      version: 0,
      is_active: false
    });
  }
}

// deno-lint-ignore no-explicit-any
async function finalizeModel(supabase: any, market: string, runId: string) {
  const state = await loadState(supabase, market, runId);
  if (!state) return;

  const marketConfig = MARKETS.find(m => m.name === market);
  if (!marketConfig) return;

  const { data: testData } = await supabase
    .from('ml_training_data')
    .select('*')
    .not(marketConfig.labelField, 'is', null)
    .not('home_over25_pct', 'is', null)
    .limit(5000);

  if (!testData || testData.length === 0) return;

  let tp = 0, tn = 0, fp = 0, fn = 0;
  const predictions: { prob: number; label: number }[] = [];

  for (const row of testData) {
    const feat = extractFeatures(row as Record<string, unknown>);
    const normalized = feat.map((v, i) => {
      const range = state.maxs[i] - state.mins[i];
      return range > 0 ? (v - state.mins[i]) / range : 0.5;
    });
    
    const prob = predict(normalized, state.weights);
    const label = (row as Record<string, unknown>)[marketConfig.labelField] ? 1 : 0;
    const predicted = prob >= 0.5 ? 1 : 0;
    
    predictions.push({ prob, label });
    
    if (predicted === 1 && label === 1) tp++;
    else if (predicted === 0 && label === 0) tn++;
    else if (predicted === 1 && label === 0) fp++;
    else fn++;
  }

  // Calculate AUC
  const sorted = [...predictions].sort((a, b) => b.prob - a.prob);
  const totalPos = sorted.filter(p => p.label === 1).length;
  const totalNeg = sorted.filter(p => p.label === 0).length;
  
  let tpr = 0, fpr = 0, prevTpr = 0, prevFpr = 0, auc = 0;
  
  if (totalPos > 0 && totalNeg > 0) {
    for (const point of sorted) {
      if (point.label === 1) {
        tpr += 1 / totalPos;
      } else {
        fpr += 1 / totalNeg;
        auc += (fpr - prevFpr) * (tpr + prevTpr) / 2;
        prevFpr = fpr;
        prevTpr = tpr;
      }
    }
  }

  const accuracy = (tp + tn) / testData.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

  console.log(`📈 ${market} Final: AUC=${auc.toFixed(3)}, Acc=${accuracy.toFixed(3)}, F1=${f1.toFixed(3)}`);

  // Get next version
  const { data: existing } = await supabase
    .from('ml_models')
    .select('version')
    .eq('market', market)
    .eq('model_type', 'logistic_regression')
    .order('version', { ascending: false })
    .limit(1);

  const newVersion = ((existing as { version: number }[])?.[0]?.version || 0) + 1;

  // Deactivate old
  await supabase
    .from('ml_models')
    .update({ is_active: false })
    .eq('market', market)
    .eq('model_type', 'logistic_regression');

  // Save new model
  await supabase.from('ml_models').insert({
    market,
    model_type: 'logistic_regression',
    weights: { weights: state.weights, mins: state.mins, maxs: state.maxs },
    feature_names: FEATURE_NAMES,
    auc_roc: auc,
    accuracy,
    precision_score: precision,
    recall_score: recall,
    f1_score: f1,
    true_positives: tp,
    true_negatives: tn,
    false_positives: fp,
    false_negatives: fn,
    training_samples: state.samplesProcessed,
    test_samples: testData.length,
    features_used: NUM_FEATURES,
    version: newVersion,
    is_active: true
  });

  // Cleanup training state
  await supabase
    .from('ml_models')
    .delete()
    .eq('market', market)
    .eq('model_type', `training_${runId}`);
}

async function chainNext(url: string, key: string, params: { marketIdx: number; offset: number; runId: string }) {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await fetch(`${url}/functions/v1/ml-train-incremental`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify(params)
  });
}

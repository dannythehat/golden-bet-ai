import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

type MarketKey = "over_2.5_goals" | "btts" | "over_9.5_corners" | "over_3.5_cards";

const MARKETS: { name: MarketKey; labelField: string }[] = [
  { name: "over_2.5_goals", labelField: "over_25_hit" },
  { name: "btts", labelField: "btts_hit" },
  { name: "over_9.5_corners", labelField: "over_95_corners_hit" },
  { name: "over_3.5_cards", labelField: "over_35_cards_hit" },
];

// Keep this deliberately small + robust.
const FEATURE_NAMES = [
  "home_over25_pct",
  "away_over25_pct",
  "home_btts_pct",
  "away_btts_pct",
  "home_over95_corners_pct",
  "away_over95_corners_pct",
  "home_over35_cards_pct",
  "away_over35_cards_pct",
  "home_avg_goals",
  "away_avg_goals",
  "home_avg_corners",
  "away_avg_corners",
  "home_avg_cards",
  "away_avg_cards",
  "home_xg",
  "away_xg",
  "home_total_shots",
  "away_total_shots",
  "home_shots_on_goal",
  "away_shots_on_goal",
  "home_fouls",
  "away_fouls",
  "home_offsides",
  "away_offsides",
];

interface Sample {
  features: number[];
  label: number;
}

function sigmoid(z: number): number {
  // numerical stability
  if (z > 500) return 1;
  if (z < -500) return 0;
  return 1 / (1 + Math.exp(-z));
}

function predict(features: number[], weights: number[]): number {
  let z = weights[0] || 0;
  for (let i = 0; i < features.length; i++) z += features[i] * (weights[i + 1] || 0);
  return sigmoid(z);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(samples: Sample[]): { normalized: Sample[]; mins: number[]; maxs: number[] } {
  if (samples.length === 0) return { normalized: [], mins: [], maxs: [] };
  const n = samples[0].features.length;
  const mins = new Array(n).fill(Infinity);
  const maxs = new Array(n).fill(-Infinity);

  for (const s of samples) {
    for (let i = 0; i < n; i++) {
      mins[i] = Math.min(mins[i], s.features[i]);
      maxs[i] = Math.max(maxs[i], s.features[i]);
    }
  }

  const normalized = samples.map((s) => ({
    label: s.label,
    features: s.features.map((v, i) => {
      const r = maxs[i] - mins[i];
      return r > 0 ? (v - mins[i]) / r : 0.5;
    }),
  }));

  return { normalized, mins, maxs };
}

function trainLogReg(
  train: Sample[],
  learningRate = 0.1,
  iterations = 600,
  l2 = 0.001
): number[] {
  const numFeatures = train[0]?.features.length ?? 0;
  const weights = new Array(numFeatures + 1).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    const grads = new Array(numFeatures + 1).fill(0);
    for (const s of train) {
      const p = predict(s.features, weights);
      const err = p - s.label;
      grads[0] += err;
      for (let i = 0; i < numFeatures; i++) {
        grads[i + 1] += err * s.features[i] + l2 * weights[i + 1];
      }
    }
    for (let i = 0; i < weights.length; i++) {
      weights[i] -= (learningRate / train.length) * grads[i];
    }
  }
  return weights;
}

function metrics(test: Sample[], weights: number[], threshold: number) {
  let tp = 0,
    tn = 0,
    fp = 0,
    fn = 0;
  const preds: { prob: number; label: number }[] = [];

  for (const s of test) {
    const prob = predict(s.features, weights);
    preds.push({ prob, label: s.label });
    const pred = prob >= threshold ? 1 : 0;
    if (pred === 1 && s.label === 1) tp++;
    else if (pred === 0 && s.label === 0) tn++;
    else if (pred === 1 && s.label === 0) fp++;
    else fn++;
  }

  const accuracy = test.length ? (tp + tn) / test.length : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // AUC-ROC (simple trapezoid)
  const sorted = [...preds].sort((a, b) => b.prob - a.prob);
  const pos = sorted.filter((p) => p.label === 1).length;
  const neg = sorted.filter((p) => p.label === 0).length;
  let auc = 0;
  if (pos > 0 && neg > 0) {
    let tpr = 0,
      fpr = 0,
      prevTpr = 0,
      prevFpr = 0;
    for (const p of sorted) {
      if (p.label === 1) {
        tpr += 1 / pos;
      } else {
        fpr += 1 / neg;
        auc += (fpr - prevFpr) * (tpr + prevTpr) / 2;
        prevFpr = fpr;
        prevTpr = tpr;
      }
    }
  } else {
    auc = 0.5;
  }

  return {
    auc: Math.max(0, Math.min(1, auc)),
    accuracy,
    precision,
    recall,
    f1,
    tp,
    tn,
    fp,
    fn,
  };
}

function findBestThreshold(test: Sample[], weights: number[]): { threshold: number; f1: number } {
  let bestT = 0.5;
  let bestF1 = -1;
  for (let t = 0.2; t <= 0.8; t += 0.02) {
    const m = metrics(test, weights, Number(t.toFixed(2)));
    if (m.f1 > bestF1) {
      bestF1 = m.f1;
      bestT = Number(t.toFixed(2));
    }
  }
  return { threshold: bestT, f1: bestF1 };
}

async function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
  );
  // Supabase query builders are thenables (PromiseLike), not plain Promises.
  return (await Promise.race([Promise.resolve(promiseLike), timeout])) as T;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function extractFeatures(row: Record<string, unknown>): number[] {
  // Keep scaling roughly consistent; normalization will handle the rest.
  return [
    num(row.home_over25_pct, 50),
    num(row.away_over25_pct, 50),
    num(row.home_btts_pct, 50),
    num(row.away_btts_pct, 50),
    num(row.home_over95_corners_pct, 50),
    num(row.away_over95_corners_pct, 50),
    num(row.home_over35_cards_pct, 50),
    num(row.away_over35_cards_pct, 50),

    num(row.home_avg_goals, 1.3),
    num(row.away_avg_goals, 1.1),
    num(row.home_avg_corners, 5),
    num(row.away_avg_corners, 4.5),
    num(row.home_avg_cards, 2),
    num(row.away_avg_cards, 2),

    num(row.home_xg, 1.3),
    num(row.away_xg, 1.1),
    num(row.home_total_shots, 12),
    num(row.away_total_shots, 10),
    num(row.home_shots_on_goal, 4),
    num(row.away_shots_on_goal, 3),
    num(row.home_fouls, 12),
    num(row.away_fouls, 12),
    num(row.home_offsides, 2),
    num(row.away_offsides, 2),
  ];
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const ADMIN_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

  // NOTE: This function is intentionally callable without auth (matching the rest of this project).
  // To avoid abuse, we enforce strict caps + timeouts (sampleSize <= 20k, testSize <= 2k).
  // If you want to lock it down later, we can require a logged-in user or an admin key.
  const providedKey = req.headers.get("x-admin-key") || "";
  const authHeader = req.headers.get("authorization") || "";
  if (ADMIN_KEY && providedKey === ADMIN_KEY) {
    console.log("🔐 Admin-key call");
  } else if (ANON_KEY && authHeader) {
    // Best-effort log (do not fail the request if auth is absent)
    try {
      const authClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await authClient.auth.getUser();
      if (data?.user?.id) console.log(`🔐 User call: ${data.user.id}`);
    } catch {
      // ignore
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json().catch(() => ({}));
    const sampleSize = Math.max(500, Math.min(20000, Number(body.sampleSize ?? 5000)));
    const testSize = Math.max(200, Math.min(2000, Number(body.testSize ?? 1000)));
    const region = typeof body.region === "string" ? body.region : null;
    const league = typeof body.league === "string" ? body.league : null;
    const marketsFilter = Array.isArray(body.markets) ? (body.markets as string[]) : null;
    const requestedMarket = typeof body.market === "string" ? body.market : null;
    const selectedMarkets = MARKETS.filter((m) => {
      if (requestedMarket) return m.name === requestedMarket;
      if (marketsFilter?.length) return marketsFilter.includes(m.name);
      return true;
    });

    console.log(
      `🧪 Quick training start | sampleSize=${sampleSize} testSize=${testSize} markets=${selectedMarkets
        .map((m) => m.name)
        .join(",")}`
    );

    const selectCols = [
      ...FEATURE_NAMES,
      "fixture_date",
      "league",
      "region",
      "over_25_hit",
      "btts_hit",
      "over_95_corners_hit",
      "over_35_cards_hit",
    ].join(",");

    const results: Record<string, unknown> = {};

    for (const market of selectedMarkets) {
      console.log(`\n🎯 Market: ${market.name}`);

      try {
        let q = supabase
          .from("ml_training_data")
          .select(selectCols)
          .not(market.labelField, "is", null)
          .not("home_over25_pct", "is", null)
          .order("fixture_date", { ascending: false })
          .limit(sampleSize);

        if (region) q = q.eq("region", region);
        if (league) q = q.eq("league", league);

        const { data: rows, error } = await withTimeout<any>(q, 15000, `load ${market.name}`);
        if (error) throw new Error(errMsg(error));
        if (!rows || rows.length < 500) {
          throw new Error(`Insufficient data for ${market.name}: ${rows?.length || 0}`);
        }

        const samples: Sample[] = (rows as Record<string, unknown>[]).map((r) => ({
          features: extractFeatures(r),
          label: r[market.labelField] ? 1 : 0,
        }));

        const shuffled = shuffle(samples);
        const split = Math.floor(shuffled.length * 0.8);
        const trainRaw = shuffled.slice(0, split);
        const testRaw = shuffled.slice(split);

        const { normalized: train, mins, maxs } = normalize(trainRaw);
        const test = testRaw.map((s) => ({
          label: s.label,
          features: s.features.map((v, i) => {
            const r = (maxs[i] ?? 1) - (mins[i] ?? 0);
            return r > 0 ? (v - (mins[i] ?? 0)) / r : 0.5;
          }),
        }));

        const trimmedTest = test.slice(0, testSize);
        const weights = trainLogReg(train, 0.15, 700, 0.001);
        const { threshold } = findBestThreshold(trimmedTest, weights);
        const m = metrics(trimmedTest, weights, threshold);

        console.log(
          `  ✅ auc=${m.auc.toFixed(3)} acc=${m.accuracy.toFixed(3)} f1=${m.f1.toFixed(3)} (t=${threshold})`
        );

        // Versioning
        const { data: existing, error: versionErr } = await withTimeout<any>(
          supabase
            .from("ml_models")
            .select("version")
            .eq("market", market.name)
            .order("version", { ascending: false })
            .limit(1),
          10000,
          `version lookup ${market.name}`
        );
        if (versionErr) throw new Error(errMsg(versionErr));
        const newVersion = ((existing as { version: number }[] | null)?.[0]?.version || 0) + 1;

        const { error: deactivateErr } = await withTimeout<any>(
          supabase
            .from("ml_models")
            .update({ is_active: false })
            .eq("market", market.name)
            .eq("model_type", "logistic_regression"),
          10000,
          `deactivate ${market.name}`
        );
        if (deactivateErr) throw new Error(errMsg(deactivateErr));

        const payload = {
          market: market.name,
          model_type: "logistic_regression",
          weights: { weights, mins, maxs, threshold },
          feature_names: FEATURE_NAMES,
          auc_roc: m.auc,
          accuracy: m.accuracy,
          precision_score: m.precision,
          recall_score: m.recall,
          f1_score: m.f1,
          true_positives: m.tp,
          true_negatives: m.tn,
          false_positives: m.fp,
          false_negatives: m.fn,
          training_samples: trainRaw.length,
          test_samples: trimmedTest.length,
          features_used: FEATURE_NAMES.length,
          version: newVersion,
          is_active: true,
        };

        const { error: insertError } = await withTimeout<any>(
          supabase.from("ml_models").insert(payload),
          10000,
          `insert ${market.name}`
        );
        if (insertError) throw new Error(errMsg(insertError));

        results[market.name] = {
          ok: true,
          version: newVersion,
          trainedOn: trainRaw.length,
          testedOn: trimmedTest.length,
          threshold,
          metrics: {
            auc: Number(m.auc.toFixed(3)),
            accuracy: Number(m.accuracy.toFixed(3)),
            precision: Number(m.precision.toFixed(3)),
            recall: Number(m.recall.toFixed(3)),
            f1: Number(m.f1.toFixed(3)),
          },
        };
      } catch (err) {
        const msg = errMsg(err);
        console.error(`  ❌ ${market.name} failed:`, msg);
        results[market.name] = { ok: false, error: msg };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: "quick",
        sampleSize,
        testSize,
        filters: { region, league },
        results,
        trainedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ ml-train-quick error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

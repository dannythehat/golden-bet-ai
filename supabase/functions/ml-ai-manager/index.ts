import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * AI Manager - Autonomous ML oversight layer
 * 
 * Responsibilities:
 * 1. Monitor model drift & performance degradation
 * 2. Validate data quality & feature completeness
 * 3. Detect temporal leakage risks
 * 4. Log decisions & recommendations
 * 5. Trigger retraining signals
 */

interface HealthCheck {
  category: string;
  status: 'healthy' | 'warning' | 'critical';
  metric: string;
  value: number | string | null;
  threshold: string;
  recommendation: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'full-audit';

    const checks: HealthCheck[] = [];
    const aiDecisions: string[] = [];

    // ═══════════════════════════════════════════
    // 1. DATA QUALITY AUDIT
    // ═══════════════════════════════════════════
    
    // Check SportMonks match data volume
    const { count: matchCount } = await supabase
      .from('sportmonks_matches')
      .select('*', { count: 'exact', head: true });

    checks.push({
      category: 'Data Volume',
      status: (matchCount || 0) >= 5000 ? 'healthy' : (matchCount || 0) >= 1000 ? 'warning' : 'critical',
      metric: 'SportMonks matches',
      value: matchCount,
      threshold: '≥5,000 for robust training',
      recommendation: matchCount! < 5000 ? 'Run SportMonks loader to backfill more historical data' : 'Sufficient data volume'
    });

    // Check feature completeness
    const { count: featureCount } = await supabase
      .from('sportmonks_ml_features')
      .select('*', { count: 'exact', head: true });

    const featureCoverage = matchCount ? Math.round((featureCount || 0) / matchCount * 100) : 0;
    checks.push({
      category: 'Feature Pipeline',
      status: featureCoverage >= 90 ? 'healthy' : featureCoverage >= 50 ? 'warning' : 'critical',
      metric: 'Feature coverage',
      value: `${featureCoverage}% (${featureCount}/${matchCount})`,
      threshold: '≥90% of matches should have computed features',
      recommendation: featureCoverage < 90 ? 'Run sportmonks-compute-features to populate missing features' : 'Feature pipeline healthy'
    });

    // Check xG data quality
    const { count: xgCount } = await supabase
      .from('sportmonks_matches')
      .select('*', { count: 'exact', head: true })
      .not('home_xg', 'is', null);

    const xgCoverage = matchCount ? Math.round((xgCount || 0) / matchCount * 100) : 0;
    checks.push({
      category: 'Data Quality',
      status: xgCoverage >= 80 ? 'healthy' : xgCoverage >= 30 ? 'warning' : 'critical',
      metric: 'xG data coverage',
      value: `${xgCoverage}% (${xgCount}/${matchCount})`,
      threshold: '≥80% matches should have xG data',
      recommendation: xgCoverage < 80 ? 'Focus SportMonks ingestion on leagues with xG data available' : 'xG coverage acceptable'
    });

    // Cards data quality
    const { count: cardsCount } = await supabase
      .from('sportmonks_matches')
      .select('*', { count: 'exact', head: true })
      .not('total_cards', 'is', null);

    const cardsCoverage = matchCount ? Math.round((cardsCount || 0) / matchCount * 100) : 0;
    checks.push({
      category: 'Data Quality',
      status: cardsCoverage >= 80 ? 'healthy' : cardsCoverage >= 50 ? 'warning' : 'critical',
      metric: 'Cards data coverage',
      value: `${cardsCoverage}% (${cardsCount}/${matchCount})`,
      threshold: '≥80% matches should have cards data',
      recommendation: cardsCoverage < 80 ? 'Cards model may underperform — prioritize cards data ingestion' : 'Cards data sufficient'
    });

    // ═══════════════════════════════════════════
    // 2. MODEL HEALTH CHECK
    // ═══════════════════════════════════════════
    
    const { data: models } = await supabase
      .from('ml_models')
      .select('market, auc_roc, accuracy, training_samples, training_date, model_type, version')
      .eq('is_active', true)
      .order('training_date', { ascending: false });

    const marketThresholds: Record<string, number> = {
      'over_2.5_goals': 0.62,
      'btts': 0.58,
      'over_9.5_corners': 0.70,
      'over_3.5_cards': 0.72,
    };

    if (models && models.length > 0) {
      for (const model of models) {
        const threshold = marketThresholds[model.market] || 0.60;
        const auc = model.auc_roc || 0;
        checks.push({
          category: 'Model Performance',
          status: auc >= threshold ? 'healthy' : auc >= threshold * 0.9 ? 'warning' : 'critical',
          metric: `${model.market} AUC`,
          value: auc,
          threshold: `≥${threshold}`,
          recommendation: auc < threshold ? `Model underperforming — retrain with more data (currently ${model.training_samples} samples)` : 'Model performing within expectations'
        });

        // Check model freshness
        if (model.training_date) {
          const daysSinceTraining = Math.floor((Date.now() - new Date(model.training_date).getTime()) / 86400000);
          checks.push({
            category: 'Model Freshness',
            status: daysSinceTraining <= 7 ? 'healthy' : daysSinceTraining <= 30 ? 'warning' : 'critical',
            metric: `${model.market} age`,
            value: `${daysSinceTraining} days`,
            threshold: '≤7 days for optimal performance',
            recommendation: daysSinceTraining > 7 ? 'Schedule retraining — model may not reflect recent form changes' : 'Model is fresh'
          });
        }

        // Check training sample size
        checks.push({
          category: 'Training Data',
          status: model.training_samples >= 10000 ? 'healthy' : model.training_samples >= 1000 ? 'warning' : 'critical',
          metric: `${model.market} training samples`,
          value: model.training_samples,
          threshold: '≥10,000 for production models',
          recommendation: model.training_samples < 10000 ? 'Insufficient training data — models trained on <10k samples are unreliable' : 'Sufficient training volume'
        });
      }
    } else {
      checks.push({
        category: 'Model Performance',
        status: 'critical',
        metric: 'Active models',
        value: 0,
        threshold: '≥4 active models (one per market)',
        recommendation: 'No active models found — run training pipeline immediately'
      });
    }

    // ═══════════════════════════════════════════
    // 3. LEAKAGE DETECTION
    // ═══════════════════════════════════════════
    
    // Check if any features reference future data
    const { data: leakCheck } = await supabase
      .from('sportmonks_ml_features')
      .select('fixture_id, fixture_date, max_source_match_date')
      .not('max_source_match_date', 'is', null)
      .limit(100);

    let leakageFound = 0;
    if (leakCheck) {
      for (const row of leakCheck) {
        if (row.max_source_match_date && row.fixture_date && row.max_source_match_date >= row.fixture_date) {
          leakageFound++;
        }
      }
    }

    checks.push({
      category: 'Leakage Prevention',
      status: leakageFound === 0 ? 'healthy' : 'critical',
      metric: 'Temporal leakage',
      value: `${leakageFound} leaky features found (sampled 100)`,
      threshold: '0 leaks allowed',
      recommendation: leakageFound > 0 ? 'CRITICAL: Features using future data detected — recompute all features with strict date filtering' : 'No temporal leakage detected'
    });

    // ═══════════════════════════════════════════
    // 4. AI DECISIONS & RECOMMENDATIONS
    // ═══════════════════════════════════════════
    
    const criticals = checks.filter(c => c.status === 'critical');
    const warnings = checks.filter(c => c.status === 'warning');
    const healthy = checks.filter(c => c.status === 'healthy');

    if (criticals.length > 0) {
      aiDecisions.push(`🚨 ${criticals.length} CRITICAL issues require immediate attention`);
      for (const c of criticals) {
        aiDecisions.push(`  → ${c.category}: ${c.metric} = ${c.value} (need ${c.threshold})`);
      }
    }

    if (warnings.length > 0) {
      aiDecisions.push(`⚠️ ${warnings.length} warnings to monitor`);
    }

    aiDecisions.push(`✅ ${healthy.length} checks passing`);

    // Retraining signal
    const needsRetraining = criticals.some(c => 
      c.category === 'Model Performance' || c.category === 'Model Freshness' || c.category === 'Training Data'
    );

    if (needsRetraining) {
      aiDecisions.push('🔄 RETRAINING RECOMMENDED: Model performance or freshness below threshold');
    }

    // ═══════════════════════════════════════════
    // 5. STORE AUDIT LOG
    // ═══════════════════════════════════════════

    const overallStatus = criticals.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'healthy';

    return new Response(JSON.stringify({
      success: true,
      audit_timestamp: new Date().toISOString(),
      overall_status: overallStatus,
      summary: {
        critical: criticals.length,
        warning: warnings.length,
        healthy: healthy.length,
        total_checks: checks.length,
      },
      ai_decisions: aiDecisions,
      needs_retraining: needsRetraining,
      checks,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ AI Manager error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

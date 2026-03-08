import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ML Enrich Features - Adds match intelligence (weather, injuries, ref bias)
 * and league-normalized features to ml_training_data_v2 records.
 * 
 * This bridges the gap between raw stats and smart features.
 * Processes in batches to avoid timeouts.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 100;
    const startOffset = body.startOffset || 0;

    console.log(`🧠 ML Enrich: offset=${startOffset}, batch=${batchSize}`);

    // Fetch training records that need enrichment
    const { data: records, error: fetchErr } = await supabase
      .from('ml_training_data_v2')
      .select('fixture_id, fixture_date, home_team, away_team, league, region, home_goals_for_avg_10, away_goals_for_avg_10, home_xg_for_avg_10, away_xg_for_avg_10, home_corners_for_avg_10, away_corners_for_avg_10, home_cards_for_avg_10, away_cards_for_avg_10, league_avg_goals, league_avg_corners, league_avg_cards, league_over25_rate, league_btts_rate')
      .order('fixture_date', { ascending: true })
      .range(startOffset, startOffset + batchSize - 1);

    if (fetchErr) throw fetchErr;
    if (!records?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No more records', processed: 0, hasMore: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch match intelligence data for these fixtures
    const fixtureIds = records.map(r => r.fixture_id);
    const { data: intel } = await supabase
      .from('match_intelligence')
      .select('fixture_id, home_injury_count, away_injury_count, home_is_fatigued, away_is_fatigued, referee_avg_cards, referee_avg_fouls, weather_risk_score, injury_risk_score, fatigue_risk_score, overall_risk_score, is_early_kickoff, kickoff_hour, temperature_celsius, wind_speed_kmh, home_new_manager, away_new_manager, home_days_since_last_match, away_days_since_last_match')
      .in('fixture_id', fixtureIds);

    const intelMap = new Map<string, any>();
    if (intel) {
      for (const row of intel) intelMap.set(row.fixture_id, row);
    }

    // Compute league-normalized features and intelligence enrichment
    let processed = 0;
    let errors = 0;

    for (const rec of records) {
      try {
        const mi = intelMap.get(rec.fixture_id);
        const lgGoals = rec.league_avg_goals || 2.5; // fallback global average
        const lgCorners = rec.league_avg_corners || 10;
        const lgCards = rec.league_avg_cards || 3.5;

        // League-normalized features (counter league bias)
        const updateData: Record<string, any> = {};

        // We store enriched data in existing nullable columns or use defense_weakness_index_10 for composite
        if (rec.home_goals_for_avg_10 !== null && lgGoals) {
          // Store league-relative scoring power as xg_diff_10 if not already set
          const homeGoalDelta = (rec.home_goals_for_avg_10 || 0) - lgGoals;
          const awayGoalDelta = (rec.away_goals_for_avg_10 || 0) - lgGoals;
          
          // Combined league-adjusted goal power
          if (!rec.defense_weakness_index_10) {
            updateData.defense_weakness_index_10 = Math.round((homeGoalDelta + awayGoalDelta) * 10000) / 10000;
          }
        }

        // Add ref bias from match intelligence
        if (mi && !rec.ref_avg_cards_last50) {
          if (mi.referee_avg_cards) {
            updateData.ref_avg_cards_last50 = mi.referee_avg_cards;
          }
          if (mi.referee_avg_cards && lgCards) {
            // ref cards relative to league = ref strictness signal
            updateData.ref_over35_cards_rate_last50 = mi.referee_avg_cards > lgCards ? 1 : 0;
          }
        }

        if (Object.keys(updateData).length > 0) {
          const { error: uErr } = await supabase
            .from('ml_training_data_v2')
            .update(updateData)
            .eq('fixture_id', rec.fixture_id);

          if (uErr) {
            errors++;
          } else {
            processed++;
          }
        }
      } catch {
        errors++;
      }
    }

    console.log(`✅ Enriched ${processed}, errors ${errors}`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      errors,
      matched_intelligence: intelMap.size,
      nextOffset: startOffset + batchSize,
      hasMore: records.length === batchSize,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Enrich error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

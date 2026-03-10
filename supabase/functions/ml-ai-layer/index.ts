import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * AI Intelligence Layer - Uses Lovable AI (Gemini) to refine ML predictions
 * with real-world context: team news, weather, ref bias, fatigue, form.
 * 
 * This is the "brain" that sits ON TOP of the ML engine.
 * ML provides statistical probabilities → AI adjusts ±10% based on context.
 */

interface MLPrediction {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  market: string;
  ml_probability: number;
}

interface MatchContext {
  home_injuries: any[];
  away_injuries: any[];
  home_injury_count: number;
  away_injury_count: number;
  home_is_fatigued: boolean;
  away_is_fatigued: boolean;
  referee_name: string | null;
  referee_avg_cards: number | null;
  referee_avg_fouls: number | null;
  weather_condition: string | null;
  temperature_celsius: number | null;
  wind_speed_kmh: number | null;
  is_early_kickoff: boolean;
  home_new_manager: boolean;
  away_new_manager: boolean;
  home_days_since_last_match: number | null;
  away_days_since_last_match: number | null;
  overall_risk_score: number;
  gaffer_talking_points: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const body = await req.json().catch(() => ({}));
    const predictions: MLPrediction[] = body.predictions || [];
    
    if (!predictions.length) {
      return new Response(JSON.stringify({ error: 'No predictions provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🤖 AI Layer: Refining ${predictions.length} predictions`);

    // Fetch match intelligence for all fixtures
    const fixtureIds = predictions.map(p => p.fixture_id);
    const { data: intel } = await supabase
      .from('match_intelligence')
      .select('*')
      .in('fixture_id', fixtureIds);

    const intelMap = new Map<string, any>();
    if (intel) {
      for (const row of intel) intelMap.set(row.fixture_id, row);
    }

    // Fetch rolling stats for teams
    const teamNames = [...new Set(predictions.flatMap(p => [p.home_team, p.away_team]))];
    const { data: rollingStats } = await supabase
      .from('team_rolling_stats')
      .select('team_name, form_string, avg_goals_scored, avg_goals_conceded, btts_pct, over_25_goals_pct, over_95_corners_pct, over_35_cards_pct')
      .in('team_name', teamNames);

    const statsMap = new Map<string, any>();
    if (rollingStats) {
      for (const row of rollingStats) statsMap.set(row.team_name, row);
    }

    // Process each prediction through AI
    const refined: any[] = [];

    for (const pred of predictions) {
      const mi = intelMap.get(pred.fixture_id);
      const homeStats = statsMap.get(pred.home_team);
      const awayStats = statsMap.get(pred.away_team);

      // Build context for AI
      const context: string[] = [];
      
      // Form
      if (homeStats?.form_string) context.push(`${pred.home_team} form: ${homeStats.form_string}`);
      if (awayStats?.form_string) context.push(`${pred.away_team} form: ${awayStats.form_string}`);

      // Injuries
      if (mi?.home_injury_count > 0) {
        context.push(`${pred.home_team}: ${mi.home_injury_count} injuries${mi.home_key_players_out?.length ? ` (key: ${mi.home_key_players_out.join(', ')})` : ''}`);
      }
      if (mi?.away_injury_count > 0) {
        context.push(`${pred.away_team}: ${mi.away_injury_count} injuries${mi.away_key_players_out?.length ? ` (key: ${mi.away_key_players_out.join(', ')})` : ''}`);
      }

      // Fatigue
      if (mi?.home_is_fatigued) context.push(`${pred.home_team} fatigued (${mi.home_matches_last_14_days} matches in 14 days)`);
      if (mi?.away_is_fatigued) context.push(`${pred.away_team} fatigued (${mi.away_matches_last_14_days} matches in 14 days)`);

      // Manager changes
      if (mi?.home_new_manager) context.push(`${pred.home_team} has a NEW MANAGER (${mi.home_manager}, ${mi.home_manager_games} games)`);
      if (mi?.away_new_manager) context.push(`${pred.away_team} has a NEW MANAGER (${mi.away_manager}, ${mi.away_manager_games} games)`);

      // Referee
      if (mi?.referee_name) {
        context.push(`Referee: ${mi.referee_name} (avg ${mi.referee_avg_cards} cards/game, ${mi.referee_strictness || 'unknown'} strictness)`);
      }

      // Weather
      if (mi?.weather_condition) {
        context.push(`Weather: ${mi.weather_condition}, ${mi.weather_temp_celsius}°C, wind ${mi.weather_wind_speed_kmh}km/h`);
        if (mi.weather_impact?.length) context.push(`Weather impacts: ${mi.weather_impact.join(', ')}`);
      }

      // Rolling stats context
      if (pred.market === 'over_2.5_goals') {
        if (homeStats) context.push(`${pred.home_team} O2.5: ${homeStats.over_25_goals_pct}%, avg scored: ${homeStats.avg_goals_scored}`);
        if (awayStats) context.push(`${pred.away_team} O2.5: ${awayStats.over_25_goals_pct}%, avg scored: ${awayStats.avg_goals_scored}`);
      } else if (pred.market === 'btts') {
        if (homeStats) context.push(`${pred.home_team} BTTS: ${homeStats.btts_pct}%, concedes: ${homeStats.avg_goals_conceded}`);
        if (awayStats) context.push(`${pred.away_team} BTTS: ${awayStats.btts_pct}%, concedes: ${awayStats.avg_goals_conceded}`);
      } else if (pred.market === 'over_9.5_corners') {
        if (homeStats) context.push(`${pred.home_team} O9.5 corners: ${homeStats.over_95_corners_pct}%`);
        if (awayStats) context.push(`${pred.away_team} O9.5 corners: ${awayStats.over_95_corners_pct}%`);
      } else if (pred.market === 'over_3.5_cards') {
        if (homeStats) context.push(`${pred.home_team} O3.5 cards: ${homeStats.over_35_cards_pct}%`);
        if (awayStats) context.push(`${pred.away_team} O3.5 cards: ${awayStats.over_35_cards_pct}%`);
      }

      // If no context available, pass through ML probability unchanged
      if (context.length === 0) {
        refined.push({
          ...pred,
          ai_adjusted_probability: pred.ml_probability,
          ai_adjustment: 0,
          ai_reasoning: 'No additional context available — using raw ML probability.',
          ai_confidence: 'medium',
        });
        continue;
      }

      // Call Lovable AI for refinement
      const systemPrompt = `You are an elite football betting analyst AI. You receive ML model predictions (statistical probabilities) and real-world match context. Your job is to REFINE the probability based on context.

RULES:
1. You can adjust the ML probability by maximum ±10 percentage points
2. Injuries to key attackers REDUCE goal/BTTS probabilities
3. Injuries to key defenders INCREASE goal/BTTS probabilities
4. Fatigued teams tend to concede more goals and commit more fouls/cards
5. New managers often bring tactical changes — increase uncertainty
6. Strict referees increase card probabilities
7. Rain/wet conditions increase card risk, may reduce corners
8. Early kickoffs (before noon) tend to produce fewer goals
9. Strong recent form (WWWW) supports the ML prediction
10. Poor recent form (LLLL) contradicts high ML predictions

You MUST respond with ONLY valid JSON: {\"adjusted_probability\": 0.XX, \"adjustment\": +/-0.XX, \"reasoning\": \"brief explanation\", \"confidence\": \"high|medium|low\"}`;

      const userPrompt = `Match: ${pred.home_team} vs ${pred.away_team} (${pred.league})
Market: ${pred.market}
ML Probability: ${(pred.ml_probability * 100).toFixed(1)}%

Context:
${context.map(c => `• ${c}`).join('\n')}

Provide your adjusted probability.`;

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'refine_prediction',
                description: 'Refine the ML prediction probability based on match context',
                parameters: {
                  type: 'object',
                  properties: {
                    adjusted_probability: { type: 'number', description: 'Refined probability between 0 and 1' },
                    adjustment: { type: 'number', description: 'Change from ML probability (-0.10 to +0.10)' },
                    reasoning: { type: 'string', description: 'Brief explanation of adjustment' },
                    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                  },
                  required: ['adjusted_probability', 'adjustment', 'reasoning', 'confidence'],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: 'function', function: { name: 'refine_prediction' } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            
      // Enforce ±6% cap (reduced from ±10% while AUC < 0.65 — restore to 0.10 after recovery)
            const maxAdj = 0.06;
            let adj = Math.max(-maxAdj, Math.min(maxAdj, parsed.adjustment || 0));
            let adjProb = Math.max(0.05, Math.min(0.95, pred.ml_probability + adj));

            refined.push({
              ...pred,
              ai_adjusted_probability: Math.round(adjProb * 10000) / 10000,
              ai_adjustment: Math.round(adj * 10000) / 10000,
              ai_reasoning: parsed.reasoning || 'AI analysis complete',
              ai_confidence: parsed.confidence || 'medium',
              context_used: context.length,
            });

            // Log intelligence decision
            await supabase.from('ml_intelligence_log').insert({
              fixture_id: pred.fixture_id,
              home_team: pred.home_team,
              away_team: pred.away_team,
              league: pred.league,
              market: pred.market,
              ml_probability: pred.ml_probability,
              ai_adjusted_probability: Math.round(adjProb * 10000) / 10000,
              ai_adjustment: Math.round(adj * 10000) / 10000,
              ai_reasoning: parsed.reasoning || 'AI analysis complete',
              ai_confidence: parsed.confidence || 'medium',
              context_factors: context,
            }).then(() => {}).catch(() => {}); // fire and forget

            continue;
          }
        } else {
          const errText = await aiResponse.text();
          console.error(`AI error (${aiResponse.status}):`, errText);
        }
      } catch (aiErr) {
        console.error('AI call failed:', aiErr);
      }

      // Fallback: use ML probability if AI fails
      refined.push({
        ...pred,
        ai_adjusted_probability: pred.ml_probability,
        ai_adjustment: 0,
        ai_reasoning: 'AI unavailable — using raw ML probability.',
        ai_confidence: 'low',
      });
    }

    return new Response(JSON.stringify({
      success: true,
      predictions: refined,
      total: refined.length,
      ai_adjusted: refined.filter(r => r.ai_adjustment !== 0).length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ AI Layer error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

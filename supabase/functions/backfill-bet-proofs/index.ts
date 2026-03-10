import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results = {
      golden_bets: { processed: 0, success: 0, failed: 0 },
      accas: { processed: 0, success: 0, failed: 0 },
      bet_builders: { processed: 0, success: 0, failed: 0 },
    };

    // Get all settled bets without proof screenshots
    const [goldenBets, accas, betBuilders] = await Promise.all([
      supabase
        .from('golden_bet_history')
        .select('*')
        .or('status.eq.won,status.eq.lost')
        .is('proof_screenshot_url', null),
      supabase
        .from('acca_history')
        .select('*')
        .or('status.eq.won,status.eq.lost')
        .is('proof_screenshot_url', null),
      supabase
        .from('bet_builder_history')
        .select('*')
        .or('status.eq.won,status.eq.lost')
        .is('proof_screenshot_url', null),
    ]);

    console.log(`📊 Found ${goldenBets.data?.length || 0} golden bets, ${accas.data?.length || 0} accas, ${betBuilders.data?.length || 0} bet builders to backfill`);

    // Process Golden Bets
    for (const bet of goldenBets.data || []) {
      results.golden_bets.processed++;
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/capture-bet-proof`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            betType: 'golden_bet',
            betId: bet.id,
            homeTeam: bet.home_team,
            awayTeam: bet.away_team,
            league: bet.league,
            market: bet.market,
            confidence: bet.ml_confidence,
            gafferReasoning: bet.gaffer_reasoning,
            kickoff: bet.kickoff,
            odds: bet.bookmaker_odds,
          }),
        });

        if (response.ok) {
          results.golden_bets.success++;
          console.log(`✅ Golden bet ${bet.id} proof captured`);
        } else {
          results.golden_bets.failed++;
          console.error(`❌ Golden bet ${bet.id} failed:`, await response.text());
        }
      } catch (error) {
        results.golden_bets.failed++;
        console.error(`❌ Golden bet ${bet.id} error:`, error);
      }
    }

    // Process ACCAs
    for (const acca of accas.data || []) {
      results.accas.processed++;
      try {
        const selections = Array.isArray(acca.selections) ? acca.selections : [];
        const response = await fetch(`${supabaseUrl}/functions/v1/capture-bet-proof`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            betType: 'acca',
            betId: acca.id,
            selections: selections.map((s: any) => ({
              teamName: s.teamName,
              market: s.market || s.marketLabel,
              confidence: s.successPercent || 0,
            })),
            odds: acca.combined_odds,
            confidence: acca.average_confidence,
            gafferReasoning: acca.gaffer_reasoning,
          }),
        });

        if (response.ok) {
          results.accas.success++;
          console.log(`✅ ACCA ${acca.id} proof captured`);
        } else {
          results.accas.failed++;
          console.error(`❌ ACCA ${acca.id} failed:`, await response.text());
        }
      } catch (error) {
        results.accas.failed++;
        console.error(`❌ ACCA ${acca.id} error:`, error);
      }
    }

    // Process Bet Builders
    for (const bb of betBuilders.data || []) {
      results.bet_builders.processed++;
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/capture-bet-proof`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            betType: 'bet_builder',
            betId: bb.id,
            homeTeam: bb.home_team,
            awayTeam: bb.away_team,
            league: bb.league,
            markets: bb.markets,
            odds: bb.combined_odds,
            confidence: bb.average_confidence,
            gafferReasoning: bb.gaffer_reasoning,
            kickoff: bb.kickoff,
          }),
        });

        if (response.ok) {
          results.bet_builders.success++;
          console.log(`✅ Bet Builder ${bb.id} proof captured`);
        } else {
          results.bet_builders.failed++;
          console.error(`❌ Bet Builder ${bb.id} failed:`, await response.text());
        }
      } catch (error) {
        results.bet_builders.failed++;
        console.error(`❌ Bet Builder ${bb.id} error:`, error);
      }
    }

    console.log('📊 Backfill complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Backfilled ${results.golden_bets.success} golden bets, ${results.accas.success} accas, ${results.bet_builders.success} bet builders`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Backfill error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

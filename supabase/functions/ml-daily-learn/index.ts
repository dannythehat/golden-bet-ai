import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';

/**
 * DAILY ML LEARNING
 * 
 * Runs every day at 4 AM UTC
 * 1. Fetches yesterday's finished fixtures
 * 2. Gets full match statistics (xG, corners, cards, shots, etc.)
 * 3. Upserts into ml_training_data
 * 4. Updates ml_model_accuracy with yesterday's settled bets
 * 
 * This makes the ML smarter every day!
 */

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchFromApi(apiKey: string, endpoint: string, params: Record<string, string | number> = {}) {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  const response = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

// Map region from league country
function getRegion(country: string): string {
  const regionMap: Record<string, string> = {
    'England': 'uk', 'Scotland': 'uk', 'Wales': 'uk', 'Northern-Ireland': 'uk', 'Ireland': 'uk',
    'Spain': 'european', 'Germany': 'european', 'Italy': 'european', 'France': 'european',
    'Portugal': 'european', 'Netherlands': 'european', 'Belgium': 'european', 'Turkey': 'european',
    'Greece': 'european', 'Switzerland': 'european', 'Austria': 'european', 'Denmark': 'european',
    'Sweden': 'european', 'Norway': 'european', 'Poland': 'european', 'Czech-Republic': 'european',
    'Russia': 'european', 'Ukraine': 'european', 'Croatia': 'european', 'Serbia': 'european',
    'Romania': 'european', 'Bulgaria': 'european', 'Hungary': 'european', 'Finland': 'european',
    'Brazil': 'americas', 'Argentina': 'americas', 'Mexico': 'americas', 'USA': 'americas',
    'Colombia': 'americas', 'Chile': 'americas', 'Uruguay': 'americas', 'Paraguay': 'americas',
    'Peru': 'americas', 'Ecuador': 'americas', 'Venezuela': 'americas', 'Canada': 'americas',
    'Japan': 'asia', 'South-Korea': 'asia', 'China': 'asia', 'Saudi-Arabia': 'asia',
    'UAE': 'asia', 'Qatar': 'asia', 'Iran': 'asia', 'India': 'asia', 'Thailand': 'asia',
    'Australia': 'asia', 'Malaysia': 'asia', 'Indonesia': 'asia', 'Singapore': 'asia',
    'Egypt': 'africa', 'South-Africa': 'africa', 'Morocco': 'africa', 'Tunisia': 'africa',
    'Algeria': 'africa', 'Nigeria': 'africa', 'Ghana': 'africa', 'Kenya': 'africa',
  };
  return regionMap[country] || 'european';
}

// Extract stat value from API response
function getStat(stats: any[], type: string): any {
  const stat = stats?.find((s: any) => s.type === type);
  return stat?.value ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    if (!API_KEY) throw new Error('API_FOOTBALL_KEY not configured');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`📚 Daily ML Learning: Processing ${yesterdayStr}`);

    // Fetch all finished fixtures from yesterday
    const fixturesData = await fetchFromApi(API_KEY, '/fixtures', {
      date: yesterdayStr,
      status: 'FT'
    });
    await delay(200);

    if (!fixturesData.response || fixturesData.response.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No finished fixtures found for yesterday',
        date: yesterdayStr 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const fixtures = fixturesData.response.filter((f: any) => 
      !f.league.name.toLowerCase().includes('women') &&
      !f.league.name.toLowerCase().includes('u21') &&
      !f.league.name.toLowerCase().includes('u19') &&
      !f.league.name.toLowerCase().includes('u17') &&
      !f.league.name.toLowerCase().includes('reserve')
    );

    console.log(`📊 Processing ${fixtures.length} fixtures from ${yesterdayStr}`);

    let processed = 0;
    let withStats = 0;

    for (const fixture of fixtures) {
      try {
        // Fetch detailed statistics for this fixture
        const statsData = await fetchFromApi(API_KEY, '/fixtures/statistics', {
          fixture: fixture.fixture.id
        });
        await delay(150);

        const homeTeamId = fixture.teams.home.id;
        const awayTeamId = fixture.teams.away.id;
        const homeGoals = fixture.goals.home || 0;
        const awayGoals = fixture.goals.away || 0;
        const totalGoals = homeGoals + awayGoals;

        let fullStats: any = {
          totalCorners: null,
          totalCards: null,
          home: {} as any,
          away: {} as any,
        };

        if (statsData.response && Array.isArray(statsData.response) && statsData.response.length >= 2) {
          const homeStatistics = statsData.response.find((s: any) => s.team?.id === homeTeamId);
          const awayStatistics = statsData.response.find((s: any) => s.team?.id === awayTeamId);

          if (homeStatistics?.statistics && awayStatistics?.statistics) {
            const hStats = homeStatistics.statistics;
            const aStats = awayStatistics.statistics;

            // Corners
            const homeCorners = getStat(hStats, 'Corner Kicks') || 0;
            const awayCorners = getStat(aStats, 'Corner Kicks') || 0;
            fullStats.totalCorners = (typeof homeCorners === 'number' ? homeCorners : 0) + 
                                      (typeof awayCorners === 'number' ? awayCorners : 0);

            // Cards
            const homeYellow = getStat(hStats, 'Yellow Cards') || 0;
            const awayYellow = getStat(aStats, 'Yellow Cards') || 0;
            const homeRed = getStat(hStats, 'Red Cards') || 0;
            const awayRed = getStat(aStats, 'Red Cards') || 0;
            fullStats.totalCards = (homeYellow || 0) + (awayYellow || 0) + (homeRed || 0) + (awayRed || 0);

            // All per-team stats
            fullStats.home = {
              xg: parseFloat(getStat(hStats, 'expected_goals')) || null,
              shotsOnGoal: getStat(hStats, 'Shots on Goal'),
              shotsOffGoal: getStat(hStats, 'Shots off Goal'),
              totalShots: getStat(hStats, 'Total Shots'),
              blockedShots: getStat(hStats, 'Blocked Shots'),
              shotsInsidebox: getStat(hStats, 'Shots insidebox'),
              shotsOutsidebox: getStat(hStats, 'Shots outsidebox'),
              fouls: getStat(hStats, 'Fouls'),
              corners: homeCorners,
              offsides: getStat(hStats, 'Offsides'),
              possession: getStat(hStats, 'Ball Possession'),
              yellowCards: homeYellow,
              redCards: homeRed,
              goalkeeperSaves: getStat(hStats, 'Goalkeeper Saves'),
              totalPasses: getStat(hStats, 'Total passes'),
              passesAccurate: getStat(hStats, 'Passes accurate'),
              passesPct: getStat(hStats, 'Passes %'),
            };

            fullStats.away = {
              xg: parseFloat(getStat(aStats, 'expected_goals')) || null,
              shotsOnGoal: getStat(aStats, 'Shots on Goal'),
              shotsOffGoal: getStat(aStats, 'Shots off Goal'),
              totalShots: getStat(aStats, 'Total Shots'),
              blockedShots: getStat(aStats, 'Blocked Shots'),
              shotsInsidebox: getStat(aStats, 'Shots insidebox'),
              shotsOutsidebox: getStat(aStats, 'Shots outsidebox'),
              fouls: getStat(aStats, 'Fouls'),
              corners: awayCorners,
              offsides: getStat(aStats, 'Offsides'),
              possession: getStat(aStats, 'Ball Possession'),
              yellowCards: awayYellow,
              redCards: awayRed,
              goalkeeperSaves: getStat(aStats, 'Goalkeeper Saves'),
              totalPasses: getStat(aStats, 'Total passes'),
              passesAccurate: getStat(aStats, 'Passes accurate'),
              passesPct: getStat(aStats, 'Passes %'),
            };

            withStats++;
          }
        }

        // Upsert training data
        const trainingRow = {
          fixture_id: String(fixture.fixture.id),
          fixture_date: yesterdayStr,
          home_team: fixture.teams.home.name,
          away_team: fixture.teams.away.name,
          league: fixture.league.name,
          region: getRegion(fixture.league.country),
          // Actual outcomes
          home_goals: homeGoals,
          away_goals: awayGoals,
          total_goals: totalGoals,
          over_25_hit: totalGoals > 2.5,
          btts_hit: homeGoals > 0 && awayGoals > 0,
          total_corners: fullStats.totalCorners,
          total_cards: fullStats.totalCards,
          over_95_corners_hit: fullStats.totalCorners !== null ? fullStats.totalCorners > 9.5 : null,
          over_35_cards_hit: fullStats.totalCards !== null ? fullStats.totalCards > 3.5 : null,
          // All 34 comprehensive per-team stats
          home_xg: fullStats.home.xg,
          away_xg: fullStats.away.xg,
          home_shots_on_goal: fullStats.home.shotsOnGoal,
          away_shots_on_goal: fullStats.away.shotsOnGoal,
          home_shots_off_goal: fullStats.home.shotsOffGoal,
          away_shots_off_goal: fullStats.away.shotsOffGoal,
          home_total_shots: fullStats.home.totalShots,
          away_total_shots: fullStats.away.totalShots,
          home_blocked_shots: fullStats.home.blockedShots,
          away_blocked_shots: fullStats.away.blockedShots,
          home_shots_insidebox: fullStats.home.shotsInsidebox,
          away_shots_insidebox: fullStats.away.shotsInsidebox,
          home_shots_outsidebox: fullStats.home.shotsOutsidebox,
          away_shots_outsidebox: fullStats.away.shotsOutsidebox,
          home_fouls: fullStats.home.fouls,
          away_fouls: fullStats.away.fouls,
          home_corners: fullStats.home.corners,
          away_corners: fullStats.away.corners,
          home_offsides: fullStats.home.offsides,
          away_offsides: fullStats.away.offsides,
          home_possession: fullStats.home.possession,
          away_possession: fullStats.away.possession,
          home_yellow_cards: fullStats.home.yellowCards,
          away_yellow_cards: fullStats.away.yellowCards,
          home_red_cards: fullStats.home.redCards,
          away_red_cards: fullStats.away.redCards,
          home_goalkeeper_saves: fullStats.home.goalkeeperSaves,
          away_goalkeeper_saves: fullStats.away.goalkeeperSaves,
          home_total_passes: fullStats.home.totalPasses,
          away_total_passes: fullStats.away.totalPasses,
          home_passes_accurate: fullStats.home.passesAccurate,
          away_passes_accurate: fullStats.away.passesAccurate,
          home_passes_pct: fullStats.home.passesPct,
          away_passes_pct: fullStats.away.passesPct,
        };

        await supabase
          .from('ml_training_data')
          .upsert(trainingRow, { onConflict: 'fixture_id' });

        processed++;
      } catch (fixtureError) {
        console.error(`Error processing fixture ${fixture.fixture.id}:`, fixtureError);
      }
    }

    // Update model accuracy from yesterday's settled bets
    const { data: settledBets } = await supabase
      .from('golden_bet_history')
      .select('*')
      .eq('prediction_date', yesterdayStr)
      .not('result', 'is', null);

    if (settledBets && settledBets.length > 0) {
      const markets = ['over25', 'btts', 'over95corners', 'over35cards'];
      
      for (const market of markets) {
        const marketBets = settledBets.filter((b: any) => b.market === market);
        if (marketBets.length === 0) continue;

        const wins = marketBets.filter((b: any) => b.result === 'won').length;
        const totalStaked = marketBets.reduce((sum: number, b: any) => sum + (b.stake || 10), 0);
        const totalReturns = marketBets.reduce((sum: number, b: any) => {
          if (b.result === 'won') return sum + ((b.stake || 10) * (b.bookmaker_odds || 2));
          return sum;
        }, 0);

        await supabase.from('ml_model_accuracy').upsert({
          date: yesterdayStr,
          market,
          total_predictions: marketBets.length,
          correct_predictions: wins,
          win_rate: Math.round((wins / marketBets.length) * 100),
          total_staked: totalStaked,
          total_returns: totalReturns,
          profit_loss: totalReturns - totalStaked,
          roi: Math.round(((totalReturns - totalStaked) / totalStaked) * 100),
        }, { onConflict: 'date,market' });
      }
    }

    console.log(`✅ Daily Learning Complete: ${processed} fixtures, ${withStats} with full stats`);

    return new Response(JSON.stringify({
      success: true,
      date: yesterdayStr,
      fixturesProcessed: processed,
      fixturesWithStats: withStats,
      settledBetsProcessed: settledBets?.length || 0
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Daily Learning Error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-upload-key',
};

/**
 * ML Predictions Endpoint (Simplified)
 * 
 * Receives raw ML probabilities only.
 * Handles: fixture lookup, odds fetching, edge calculation, bet selection, Gaffer reasoning.
 */

const MIN_ODDS = 1.60;
const MIN_EDGE = 0.20;
const GOLDEN_BET_MIN_ODDS = 1.70;

// Probability calibration constants
const CALIBRATION_ALPHA = 1.4; // Tune 1.3–1.6 if needed
const CALIBRATION_CAP = 0.78;

type Market = 'over_2_5_goals' | 'btts' | 'over_9_5_corners' | 'over_3_5_cards';
const MARKETS: Market[] = ['over_2_5_goals', 'btts', 'over_9_5_corners', 'over_3_5_cards'];

/**
 * LEAGUE WHITELIST - STRICT ENFORCEMENT
 * 
 * Tier 1: UK + Top 5 European leagues (highest priority)
 * Tier 2: Major European leagues + top South American
 * 
 * BLOCKED: India, Indonesia, Thailand, friendlies, youth, reserve, amateur, women's
 */
const ALLOWED_LEAGUE_IDS = new Set([
  // UK - Tier 1
  39,   // Premier League
  40,   // Championship
  41,   // League One
  42,   // League Two
  43,   // National League
  45,   // FA Cup
  48,   // EFL Cup
  
  // Top 5 Europe - Tier 1
  140,  // La Liga
  141,  // La Liga 2
  78,   // Bundesliga
  79,   // Bundesliga 2
  135,  // Serie A
  136,  // Serie B
  61,   // Ligue 1
  62,   // Ligue 2
  
  // UEFA Competitions - Tier 1
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  
  // Scotland - Tier 1
  179,  // Scottish Premiership
  180,  // Scottish Championship
  181,  // Scottish League One
  182,  // Scottish League Two
  
  // Major European - Tier 2
  94,   // Portugal Primeira Liga
  88,   // Netherlands Eredivisie
  144,  // Belgium Pro League
  203,  // Turkey Süper Lig
  218,  // Austria Bundesliga
  207,  // Switzerland Super League
  197,  // Greece Super League
  
  // Top South American - Tier 2
  71,   // Brazil Serie A
  128,  // Argentina Primera Division
]);

// Blocked keywords in league names (case-insensitive)
const BLOCKED_LEAGUE_KEYWORDS = [
  'friendly', 'friendlies',
  'youth', 'u19', 'u20', 'u21', 'u23',
  'reserve', 'reserves',
  'amateur',
  'women', 'woman',
  'india', 'indian', 'santosh',
  'indonesia', 'indonesian',
  'thailand', 'thai',
  'vietnam', 'vietnamese',
  'malaysia', 'malaysian',
  'singapore',
  'philippines',
  'club friendly',
];

/**
 * Check if a league is allowed for betting predictions
 */
function isLeagueAllowed(leagueId: number, leagueName: string): boolean {
  // Check ID whitelist first
  if (ALLOWED_LEAGUE_IDS.has(leagueId)) {
    // Even if ID is whitelisted, check for blocked keywords (e.g., "Premier League U23")
    const lowerName = leagueName.toLowerCase();
    for (const keyword of BLOCKED_LEAGUE_KEYWORDS) {
      if (lowerName.includes(keyword)) {
        console.log(`⛔ League "${leagueName}" (ID: ${leagueId}) blocked by keyword: "${keyword}"`);
        return false;
      }
    }
    return true;
  }
  
  console.log(`⛔ League "${leagueName}" (ID: ${leagueId}) not in whitelist`);
  return false;
}

/**
 * Calibrate raw ML probability using power squash
 * Formula: p_cal = min(0.78, p_raw ** 1.8)
 * 
 * Benefits:
 * - Leaves mid-range probs closer to reality
 * - Crushes "fake-looking" 0.90-0.99 into 0.78 max
 * - Preserves ordering (monotonic)
 */
function calibrateProbability(rawProb: number): number {
  const squashed = Math.pow(rawProb, CALIBRATION_ALPHA);
  return Math.min(CALIBRATION_CAP, squashed);
}

interface Prediction {
  fixture_id: string;
  probabilities: {
    over_2_5_goals?: number;
    btts?: number;
    over_9_5_corners?: number;
    over_3_5_cards?: number;
  };
}

interface Payload {
  date: string;
  run_id: string;
  model_version: string;
  predictions: Prediction[];
}

interface FixtureInfo {
  fixture_id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  league: string;
  league_id: number;
}

interface ScoredPick {
  fixture_id: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  league: string;
  market: Market;
  probability_raw: number;  // Raw ML probability
  probability: number;      // Calibrated probability (capped at 0.78)
  odds: number;
  implied_prob: number;
  edge: number;
  used_fallback: boolean;
}

// Fetch fixture details from API-Football
async function fetchFixtureDetails(fixtureId: string, apiKey: string): Promise<FixtureInfo | null> {
  try {
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, {
      headers: { 'x-apisports-key': apiKey }
    });
    const data = await response.json();
    
    if (!data.response?.[0]) return null;
    
    const fixture = data.response[0];
    return {
      fixture_id: fixtureId,
      home_team: fixture.teams.home.name,
      away_team: fixture.teams.away.name,
      kickoff: fixture.fixture.date,
      league: fixture.league.name,
      league_id: fixture.league.id,
    };
  } catch (error) {
    console.error(`Failed to fetch fixture ${fixtureId}:`, error);
    return null;
  }
}

// Map league IDs to Odds API sport keys
const LEAGUE_TO_SPORT_KEY: Record<number, string> = {
  // English Football
  39: 'soccer_epl',               // Premier League
  40: 'soccer_england_league1',   // Championship (approx)
  41: 'soccer_england_league1',   // League One
  42: 'soccer_england_league2',   // League Two
  45: 'soccer_fa_cup',            // FA Cup
  48: 'soccer_england_efl_cup',   // EFL Cup
  // European Top Leagues
  140: 'soccer_spain_la_liga',    // La Liga
  78: 'soccer_germany_bundesliga', // Bundesliga  
  135: 'soccer_italy_serie_a',    // Serie A
  61: 'soccer_france_ligue_one',  // Ligue 1
  94: 'soccer_portugal_primeira_liga', // Primeira Liga
  88: 'soccer_netherlands_eredivisie', // Eredivisie
  144: 'soccer_belgium_first_div', // Belgian Pro League
  // European Competitions
  2: 'soccer_uefa_champs_league',
  3: 'soccer_uefa_europa_league',
  848: 'soccer_uefa_europa_conference_league',
  // Scotland
  179: 'soccer_spl',              // Scottish Premiership
};

// Fetch odds from The Odds API
async function fetchOdds(homeTeam: string, awayTeam: string, market: Market, leagueId: number, oddsApiKey: string): Promise<{ odds: number; bookmaker: string; fallback: boolean }> {
  const fallbackOdds = calculateFallbackOdds(market);
  
  // Get sport key for this league
  const sportKey = LEAGUE_TO_SPORT_KEY[leagueId];
  if (!sportKey) {
    console.log(`⚠️ No Odds API mapping for league ID ${leagueId}, using fallback`);
    return { odds: fallbackOdds, bookmaker: 'estimated', fallback: true };
  }
  
  try {
    // Map our markets to Odds API format
    const marketMap: Record<Market, string> = {
      'over_2_5_goals': 'totals',
      'btts': 'btts',
      'over_9_5_corners': 'totals', // Corners rarely available
      'over_3_5_cards': 'totals',   // Cards rarely available
    };
    
    const oddsMarket = marketMap[market];
    if (oddsMarket === 'totals' && market !== 'over_2_5_goals') {
      return { odds: fallbackOdds, bookmaker: 'estimated', fallback: true };
    }
    
    console.log(`📊 Fetching odds: ${sportKey}/${oddsMarket} for ${homeTeam} vs ${awayTeam}`);
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?apiKey=${oddsApiKey}&markets=${oddsMarket}&oddsFormat=decimal&regions=uk,eu`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (!response.ok) {
      return { odds: fallbackOdds, bookmaker: 'estimated', fallback: true };
    }
    
    const data = await response.json();
    
    // Find matching game
    const normalizedHome = homeTeam.toLowerCase();
    const normalizedAway = awayTeam.toLowerCase();
    
    const game = data.find((g: any) => 
      g.home_team.toLowerCase().includes(normalizedHome) || 
      normalizedHome.includes(g.home_team.toLowerCase()) ||
      g.away_team.toLowerCase().includes(normalizedAway) ||
      normalizedAway.includes(g.away_team.toLowerCase())
    );
    
    if (!game?.bookmakers?.[0]?.markets?.[0]?.outcomes) {
      return { odds: fallbackOdds, bookmaker: 'estimated', fallback: true };
    }
    
    const outcomes = game.bookmakers[0].markets[0].outcomes;
    let targetOdds: number | null = null;
    
    if (market === 'over_2_5_goals') {
      const over = outcomes.find((o: any) => o.name === 'Over' && o.point === 2.5);
      targetOdds = over?.price;
    } else if (market === 'btts') {
      const yes = outcomes.find((o: any) => o.name === 'Yes');
      targetOdds = yes?.price;
    }
    
    if (targetOdds && targetOdds >= MIN_ODDS) {
      return { odds: targetOdds, bookmaker: game.bookmakers[0].title, fallback: false };
    }
    
    return { odds: fallbackOdds, bookmaker: 'estimated', fallback: true };
  } catch (error) {
    console.warn(`Odds fetch failed for ${market}:`, error);
    return { odds: fallbackOdds, bookmaker: 'estimated', fallback: true };
  }
}

// Calculate fallback odds based on market type
function calculateFallbackOdds(market: Market): number {
  const baseOdds: Record<Market, number> = {
    'over_2_5_goals': 1.85,
    'btts': 1.80,
    'over_9_5_corners': 1.90,
    'over_3_5_cards': 1.75,
  };
  
  const variance = (Math.random() - 0.5) * 0.30; // ±0.15
  return Math.round((baseOdds[market] + variance) * 100) / 100;
}

// Generate Gaffer reasoning
function generateGafferReasoning(pick: ScoredPick): string {
  const openers: Record<Market, string[]> = {
    'over_2_5_goals': [
      "Goals, goals, goals - that's what I'm seeing here.",
      "The models are screaming GOALS on this one.",
      "Attack-minded sides here - expect fireworks."
    ],
    'btts': [
      "Both teams to score? It's practically guaranteed, mate.",
      "Neither defence can keep a clean sheet lately.",
      "These two love a shootout."
    ],
    'over_9_5_corners': [
      "Corners galore incoming.",
      "Wing play's gonna be massive today.",
      "Expect plenty of dead-ball situations."
    ],
    'over_3_5_cards': [
      "This ref doesn't keep his cards in his pocket.",
      "Feisty one this - yellow cards aplenty.",
      "Tasty tackles expected - cards will fly."
    ],
  };
  
  const opener = openers[pick.market][Math.floor(Math.random() * openers[pick.market].length)];
  
  const edgeComment = pick.edge >= 0.30 
    ? "Massive value here - the edge is significant." 
    : "Solid value - worth the stake.";
  
  const confidenceComment = pick.probability >= 0.70
    ? `ML confidence at ${(pick.probability * 100).toFixed(0)}% - that's elite territory.`
    : `ML sitting at ${(pick.probability * 100).toFixed(0)}% - nice and steady.`;
  
  return `${opener} ${confidenceComment} ${edgeComment}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const uploadKey = req.headers.get('x-upload-key');
    if (uploadKey !== 'footy-oracle-ml-2026') {
      return new Response(
        JSON.stringify({ error: 'Invalid upload key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY') || '';
    const oddsApiKey = Deno.env.get('ODDS_API_KEY') || '';

    const payload: Payload = await req.json();
    
    // Validate
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.predictions?.length) {
      return new Response(
        JSON.stringify({ error: 'No predictions provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 Received ${payload.predictions.length} predictions for ${payload.date}`);

    // Process each prediction
    const allPicks: ScoredPick[] = [];
    
    for (const pred of payload.predictions) {
      // Fetch fixture details
      const fixture = await fetchFixtureDetails(pred.fixture_id, apiFootballKey);
      if (!fixture) {
        console.warn(`Skipping fixture ${pred.fixture_id} - could not fetch details`);
        continue;
      }

      // STRICT LEAGUE GATE - Block non-whitelisted leagues
      if (!isLeagueAllowed(fixture.league_id, fixture.league)) {
        console.warn(`⛔ BLOCKING fixture ${pred.fixture_id} (${fixture.home_team} vs ${fixture.away_team}) - League not allowed: ${fixture.league} (ID: ${fixture.league_id})`);
        continue;
      }
      console.log(`✅ League allowed: ${fixture.league} (ID: ${fixture.league_id})`);

      // Process each market
      for (const market of MARKETS) {
        const rawProbability = pred.probabilities[market];
        if (!rawProbability || rawProbability < 0.50) continue; // Skip low confidence
        
        // Apply calibration: p_cal = min(0.78, p_raw ** 1.8)
        const probability = calibrateProbability(rawProbability);
        console.log(`📊 ${market}: raw=${(rawProbability * 100).toFixed(1)}% → calibrated=${(probability * 100).toFixed(1)}%`);
        
        // Fetch odds
        const { odds, bookmaker, fallback } = await fetchOdds(
          fixture.home_team, 
          fixture.away_team, 
          market,
          fixture.league_id,
          oddsApiKey
        );
        
        if (odds < MIN_ODDS) continue;
        
        const impliedProb = 1 / odds;
        const edge = (probability - impliedProb) / impliedProb;
        
        if (edge < MIN_EDGE) continue;
        
        allPicks.push({
          fixture_id: pred.fixture_id,
          home_team: fixture.home_team,
          away_team: fixture.away_team,
          kickoff: fixture.kickoff,
          league: fixture.league,
          market,
          probability_raw: rawProbability,  // Store raw for debugging
          probability,                       // Calibrated for display/calculations
          odds,
          implied_prob: impliedProb,
          edge,
          used_fallback: fallback,
        });
      }
    }

    console.log(`✅ Found ${allPicks.length} valid picks (edge >= 20%, odds >= 1.60)`);

    // Sort by edge (best value first)
    allPicks.sort((a, b) => b.edge - a.edge);

    // Select Golden Bets: top 3 with odds >= 1.70, unique fixtures
    const goldenBets: ScoredPick[] = [];
    const usedFixturesGolden = new Set<string>();
    const usedMarketsGolden = new Set<Market>();
    
    for (const pick of allPicks) {
      if (goldenBets.length >= 3) break;
      if (usedFixturesGolden.has(pick.fixture_id)) continue;
      if (pick.odds < GOLDEN_BET_MIN_ODDS) continue;
      
      // Variety rule: max 2 of same market
      const marketCount = goldenBets.filter(p => p.market === pick.market).length;
      if (marketCount >= 2) continue;
      
      goldenBets.push(pick);
      usedFixturesGolden.add(pick.fixture_id);
    }

    // Select Bet Builder: best legs from remaining picks (different fixtures from Golden)
    const betBuilderLegs: ScoredPick[] = [];
    const usedFixturesBuilder = new Set<string>();
    
    for (const pick of allPicks) {
      if (betBuilderLegs.length >= 3) break;
      if (usedFixturesGolden.has(pick.fixture_id)) continue; // No overlap with Golden
      if (usedFixturesBuilder.has(pick.fixture_id)) continue;
      
      betBuilderLegs.push(pick);
      usedFixturesBuilder.add(pick.fixture_id);
    }

    console.log(`🎯 Selected: ${goldenBets.length} Golden Bets, ${betBuilderLegs.length} Builder legs`);

    // Check what already exists for this date (to avoid duplicates AND late additions)
    const { data: existingGolden } = await supabase
      .from('golden_bet_history')
      .select('fixture_id, market, status')
      .eq('prediction_date', payload.date);
    
    const existingGoldenKeys = new Set(
      (existingGolden || []).map(e => `${e.fixture_id}|${e.market}`)
    );
    
    // CRITICAL: Check if any bets are already settled - if so, DO NOT add new picks
    const hasSettledBets = (existingGolden || []).some(e => e.status === 'won' || e.status === 'lost');
    if (hasSettledBets) {
      console.log(`⚠️ Settled bets already exist for ${payload.date} - blocking ALL new picks to prevent data corruption`);
      return new Response(JSON.stringify({
        success: false,
        error: 'SETTLED_BETS_EXIST',
        message: `Cannot add new picks for ${payload.date} - bets have already been settled. This prevents duplicate or late additions.`,
        existing_count: existingGolden?.length || 0,
      }), {
        status: 409, // Conflict
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`📋 Found ${existingGoldenKeys.size} existing golden bets for ${payload.date} (none settled)`);

    // Clear existing PENDING picks for this date (so we can refresh odds/reasoning)
    console.log(`🗑️ Deleting existing pending picks for ${payload.date}...`);
    
    const { error: delGoldenErr, count: delGoldenCount } = await supabase
      .from('golden_bet_history')
      .delete({ count: 'exact' })
      .eq('prediction_date', payload.date)
      .eq('status', 'pending');
    
    if (delGoldenErr) {
      console.error('❌ Failed to delete golden bets:', delGoldenErr);
      throw delGoldenErr;
    }
    console.log(`✓ Deleted ${delGoldenCount ?? 0} pending golden bets`);

    // Filter out any picks that already exist (shouldn't happen now but kept as extra safety)
    const newGoldenBets = goldenBets.filter(pick => {
      const key = `${pick.fixture_id}|${pick.market}`;
      if (existingGoldenKeys.has(key)) {
        console.log(`⏭️ Skipping duplicate: ${pick.home_team} vs ${pick.away_team} (${pick.market}) - already exists`);
        return false;
      }
      return true;
    });

    // Insert Golden Bets (only new ones)
    if (newGoldenBets.length > 0) {
      const rows = newGoldenBets.map(pick => ({
        fixture_id: pick.fixture_id,
        home_team: pick.home_team,
        away_team: pick.away_team,
        league: pick.league,
        kickoff: pick.kickoff,
        market: pick.market,
        ml_confidence: pick.probability,           // Calibrated (for UI display)
        ml_confidence_raw: pick.probability_raw,   // Raw (for debugging/tracking)
        bookmaker_odds: pick.odds,
        value_edge: pick.edge,
        gaffer_reasoning: generateGafferReasoning(pick),
        prediction_date: payload.date,
        status: 'pending',
        stake: 10,
      }));

      console.log(`💾 Inserting ${rows.length} NEW golden bets...`);
      const { error, data: insertedGolden } = await supabase.from('golden_bet_history').insert(rows).select();
      if (error) {
        console.error('❌ Failed to insert golden bets:', error);
        throw error;
      }
      console.log(`✅ Inserted ${insertedGolden?.length ?? 0} golden bets`);
    } else {
      console.log(`ℹ️ No new golden bets to insert (all already exist)`);
    }

    // Check what bet builders already exist for this date
    const { data: existingBuilders } = await supabase
      .from('bet_builder_history')
      .select('fixture_id')
      .eq('prediction_date', payload.date);
    
    const existingBuilderIds = new Set(
      (existingBuilders || []).map(e => e.fixture_id)
    );
    console.log(`📋 Found ${existingBuilderIds.size} existing bet builders for ${payload.date}`);

    // Delete pending bet builders (to refresh with new data)
    const { error: delBuilderErr, count: delBuilderCount } = await supabase
      .from('bet_builder_history')
      .delete({ count: 'exact' })
      .eq('prediction_date', payload.date)
      .eq('status', 'pending');
    
    if (delBuilderErr) {
      console.error('❌ Failed to delete bet builders:', delBuilderErr);
    }
    console.log(`✓ Deleted ${delBuilderCount ?? 0} pending bet builders`);

    // Insert Bet Builder (only if doesn't already exist as settled)
    if (betBuilderLegs.length > 0) {
      const compositeFixtureId = betBuilderLegs.map(l => l.fixture_id).join('|');
      
      if (existingBuilderIds.has(compositeFixtureId)) {
        console.log(`⏭️ Skipping duplicate bet builder - already exists for ${payload.date}`);
      } else {
        const combinedOdds = betBuilderLegs.reduce((acc, leg) => acc * leg.odds, 1);
        const avgConfidence = betBuilderLegs.reduce((acc, leg) => acc + leg.probability, 0) / betBuilderLegs.length;
        const avgConfidenceRaw = betBuilderLegs.reduce((acc, leg) => acc + leg.probability_raw, 0) / betBuilderLegs.length;
        
        // Calibrated confidences (for UI display)
        const marketConfidences: Record<string, number> = {};
        betBuilderLegs.forEach(leg => {
          marketConfidences[leg.market] = leg.probability;
        });
        
        // Raw confidences (for debugging/tracking)
        const marketConfidencesRaw: Record<string, number> = {};
        betBuilderLegs.forEach(leg => {
          marketConfidencesRaw[leg.market] = leg.probability_raw;
        });

        const row = {
          fixture_id: compositeFixtureId,
          home_team: betBuilderLegs.map(l => l.home_team).join(' | '),
          away_team: betBuilderLegs.map(l => l.away_team).join(' | '),
          league: betBuilderLegs.map(l => l.league).join(' | '),
          kickoff: betBuilderLegs[0].kickoff,
          markets: betBuilderLegs.map(l => l.market),
          market_confidences: marketConfidences,              // Calibrated
          market_confidences_raw: marketConfidencesRaw,       // Raw
          combined_odds: Math.round(combinedOdds * 100) / 100,
          average_confidence: avgConfidence,                  // Calibrated
          average_confidence_raw: avgConfidenceRaw,           // Raw
          gaffer_reasoning: `Bet Builder with ${betBuilderLegs.length} legs across different fixtures. ${betBuilderLegs.map(l => generateGafferReasoning(l)).join(' ')}`,
          prediction_date: payload.date,
          status: 'pending',
          stake: 10,
        };

        console.log(`💾 Inserting bet builder...`);
        const { error, data: insertedBuilder } = await supabase.from('bet_builder_history').insert(row).select();
        if (error) {
          console.error('❌ Failed to insert bet builder:', error);
          throw error;
        }
        console.log(`✅ Inserted bet builder: ${insertedBuilder?.[0]?.id}`);
      }
    }

    const response = {
      success: true,
      date: payload.date,
      run_id: payload.run_id,
      model_version: payload.model_version,
      processed: {
        predictions_received: payload.predictions.length,
        valid_picks_found: allPicks.length,
        golden_bets_selected: goldenBets.length,
        bet_builder_legs: betBuilderLegs.length,
      },
      golden_bets: goldenBets.map(p => ({
        fixture_id: p.fixture_id,
        match: `${p.home_team} vs ${p.away_team}`,
        market: p.market,
        probability: p.probability,
        odds: p.odds,
        edge: Math.round(p.edge * 100) / 100,
        used_fallback_odds: p.used_fallback,
      })),
      bet_builder: {
        legs: betBuilderLegs.length,
        combined_odds: Math.round(betBuilderLegs.reduce((a, l) => a * l.odds, 1) * 100) / 100 || null,
        fixtures: betBuilderLegs.map(l => `${l.home_team} vs ${l.away_team}`),
      },
    };

    console.log('✅ Daily picks stored successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('ML Predictions error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

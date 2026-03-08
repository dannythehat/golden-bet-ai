import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';

const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN']);
// Called off / cannot be settled as win/loss -> treat as VOID (stake returned)
const VOID_STATUSES = new Set([
  'PST',  // Postponed
  'CANC', // Cancelled
  'ABD',  // Abandoned
  'AWD',  // Awarded
  'WO',   // Walkover
]);

async function fetchFromApi(
  apiKey: string,
  endpoint: string,
  params: Record<string, string | number> = {},
  opts: { retries?: number; retryDelayMs?: number } = {}
): Promise<any> {
  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const retries = opts.retries ?? 3;
  const baseDelayMs = opts.retryDelayMs ?? 600;

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
      });

      if (!response.ok) {
        const retryable = response.status === 429 || (response.status >= 500 && response.status <= 599);
        const msg = `API request failed (${response.status}) ${response.statusText}`;

        if (attempt < retries && retryable) {
          const delayMs = baseDelayMs * Math.pow(2, attempt);
          console.warn(`⚠️ ${msg} — retrying in ${delayMs}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        throw new Error(msg);
      }

      const data = await response.json();
      return data.response || [];
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.warn(`⚠️ API call error — retrying in ${delayMs}ms (attempt ${attempt + 1}/${retries})`, err);
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      break;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('API request failed');
}

function asNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value).replace('%', '').trim());
  return Number.isFinite(n) ? n : 0;
}

function sumStatByType(statsResponse: any[] | null | undefined, type: string): number {
  if (!Array.isArray(statsResponse)) return 0;
  let total = 0;
  for (const teamBlock of statsResponse) {
    const stats = teamBlock?.statistics;
    if (!Array.isArray(stats)) continue;
    const row = stats.find((s: any) => String(s?.type ?? '').toLowerCase() === type.toLowerCase());
    total += asNumber(row?.value);
  }
  return total;
}

async function fetchFixtureTotals(apiKey: string, fixtureId: string): Promise<{ corners?: number; cards?: number }> {
  // API-Football exposes match statistics via a dedicated endpoint. Using it avoids
  // mis-parsing nested structures from /fixtures and prevents false LOST settlements.
  try {
    const statsResponse = await fetchFromApi(apiKey, '/fixtures/statistics', { fixture: fixtureId });
    const corners = sumStatByType(statsResponse, 'Corner Kicks');
    const yellow = sumStatByType(statsResponse, 'Yellow Cards');
    const red = sumStatByType(statsResponse, 'Red Cards');
    const cards = yellow + red;

    return {
      corners: corners > 0 ? corners : undefined,
      cards: cards > 0 ? cards : undefined,
    };
  } catch (err) {
    console.warn(`⚠️ Could not fetch fixture statistics for ${fixtureId}:`, err);
    return {};
  }
}

// Normalize market key to handle all variations (dots, underscores, etc.)
function normalizeMarketKey(market: string): string {
  if (!market) return '';
  return market
    .toLowerCase()
    .replace(/:/g, '_')            // cards:over_2_5 -> cards_over_2_5
    .replace(/\./g, '_')           // over_2.5 → over_2_5
    .replace(/__+/g, '_')          // double underscores
    .trim();
}

// Market result checking - now supports all ACCA markets
function checkBetResult(
  market: string,
  homeGoals: number,
  awayGoals: number,
  corners?: number,
  cards?: number
): 'won' | 'lost' {
  const totalGoals = homeGoals + awayGoals;
  const m = normalizeMarketKey(market);

  // IMPORTANT: keep category context (goals/corners/cards/btts) so "cards:over_2_5"
  // never gets mis-evaluated as "over 2.5 goals".
  const isGoalsMarket = m.startsWith('goals_') || m.includes('_goals') || m.includes('goal');
  const isCornersMarket = m.startsWith('corners_') || m.includes('_corners') || m.includes('corner');
  const isCardsMarket = m.startsWith('cards_') || m.includes('_cards') || m.includes('card');
  const isBttsMarket = m.startsWith('btts_') || m.includes('btts');
  
  console.log(`[checkBetResult] Market: "${market}" → normalized: "${m}", Goals: ${totalGoals}, Corners: ${corners}, Cards: ${cards}`);
  
  // Goals markets - check all variations
  if (isGoalsMarket && (m.includes('over_1_5') || m.includes('over_15'))) {
    const result = totalGoals > 1.5 ? 'won' : 'lost';
    console.log(`  → Over 1.5 goals: ${totalGoals} > 1.5? ${result}`);
    return result;
  }
  if (isGoalsMarket && (m.includes('over_2_5') || m.includes('over_25'))) {
    const result = totalGoals > 2.5 ? 'won' : 'lost';
    console.log(`  → Over 2.5 goals: ${totalGoals} > 2.5? ${result}`);
    return result;
  }
  if (isGoalsMarket && (m.includes('over_3_5') || m.includes('over_35'))) {
    const result = totalGoals > 3.5 ? 'won' : 'lost';
    console.log(`  → Over 3.5 goals: ${totalGoals} > 3.5? ${result}`);
    return result;
  }
  if (isGoalsMarket && (m.includes('over_4_5') || m.includes('over_45'))) {
    const result = totalGoals > 4.5 ? 'won' : 'lost';
    console.log(`  → Over 4.5 goals: ${totalGoals} > 4.5? ${result}`);
    return result;
  }
  
  // BTTS markets
  if (isBttsMarket) {
    if (m.includes('no')) {
      const result = (homeGoals === 0 || awayGoals === 0) ? 'won' : 'lost';
      console.log(`  → BTTS No: home=${homeGoals}, away=${awayGoals}? ${result}`);
      return result;
    }
    const result = (homeGoals > 0 && awayGoals > 0) ? 'won' : 'lost';
    console.log(`  → BTTS Yes: home=${homeGoals} > 0 AND away=${awayGoals} > 0? ${result}`);
    return result;
  }
  
  // Corners markets - NEVER estimate. If actual data is missing, mark as LOST.
  if (isCornersMarket) {
    if (corners === undefined || corners === null) {
      console.log(`  → Corners market "${market}" but actual corners data MISSING → LOST (no estimation)`);
      return 'lost';
    }
    if (m.includes('over_9_5') || m.includes('over_95')) {
      const result = corners > 9.5 ? 'won' : 'lost';
      console.log(`  → Over 9.5 corners: ${corners} > 9.5? ${result}`);
      return result;
    }
    if (m.includes('over_8_5') || m.includes('over_85')) {
      const result = corners > 8.5 ? 'won' : 'lost';
      console.log(`  → Over 8.5 corners: ${corners} > 8.5? ${result}`);
      return result;
    }
    if (m.includes('over_10_5') || m.includes('over_105')) {
      const result = corners > 10.5 ? 'won' : 'lost';
      console.log(`  → Over 10.5 corners: ${corners} > 10.5? ${result}`);
      return result;
    }
  }
  
  // Cards markets - NEVER estimate. If actual data is missing, mark as LOST.
  if (isCardsMarket) {
    if (cards === undefined || cards === null) {
      console.log(`  → Cards market "${market}" but actual cards data MISSING → LOST (no estimation)`);
      return 'lost';
    }
    if (m.includes('over_3_5') || m.includes('over_35')) {
      const result = cards > 3.5 ? 'won' : 'lost';
      console.log(`  → Over 3.5 cards: ${cards} > 3.5? ${result}`);
      return result;
    }
    if (m.includes('over_2_5') || m.includes('over_25')) {
      const result = cards > 2.5 ? 'won' : 'lost';
      console.log(`  → Over 2.5 cards: ${cards} > 2.5? ${result}`);
      return result;
    }
    if (m.includes('over_4_5') || m.includes('over_45')) {
      const result = cards > 4.5 ? 'won' : 'lost';
      console.log(`  → Over 4.5 cards: ${cards} > 4.5? ${result}`);
      return result;
    }
  }
  
  console.log(`  → UNKNOWN MARKET "${market}" - defaulting to lost`);
  return 'lost';
}

// Extract fixture stats from API response
function extractFixtureStats(fixture: any): { corners?: number; cards?: number } {
  const stats = fixture.statistics || [];
  let homeCorners = 0, awayCorners = 0, homeCards = 0, awayCards = 0;
  
  for (const teamStats of stats) {
    const teamCorners = teamStats.statistics?.find((s: any) => s.type === 'Corner Kicks');
    const teamYellow = teamStats.statistics?.find((s: any) => s.type === 'Yellow Cards');
    const teamRed = teamStats.statistics?.find((s: any) => s.type === 'Red Cards');
    
    if (teamStats.team?.id === fixture.teams?.home?.id) {
      homeCorners = parseInt(teamCorners?.value) || 0;
      homeCards = (parseInt(teamYellow?.value) || 0) + (parseInt(teamRed?.value) || 0);
    } else {
      awayCorners = parseInt(teamCorners?.value) || 0;
      awayCards = (parseInt(teamYellow?.value) || 0) + (parseInt(teamRed?.value) || 0);
    }
  }
  
  return {
    corners: homeCorners + awayCorners > 0 ? homeCorners + awayCorners : undefined,
    cards: homeCards + awayCards > 0 ? homeCards + awayCards : undefined,
  };
}

interface AccaSelection {
  teamName: string;
  league: string;
  market: string;
  marketLabel: string;
  successPercent: number;
  opposition: string;
  oppositionStats: number | null;
  kickoff: string;
  isHome: boolean;
  fixtureId?: string;
}

interface AccaResult {
  teamName: string;
  opposition?: string;
  league?: string;
  market: string;
  marketLabel?: string;
  isHome?: boolean;
  hit: boolean;
  void?: boolean;
  score?: string;
  fixtureId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Settle as soon as the match is actually finished (FT/AET/PEN) rather than waiting a fixed
    // number of hours after kickoff. This prevents "it already finished" settlement delays.
    const now = new Date();
    
    // ============= SETTLE GOLDEN BETS =============
    const { data: pendingBets, error: fetchError } = await supabase
      .from('golden_bet_history')
      .select('*')
      .eq('status', 'pending');

    if (fetchError) {
      throw new Error(`Error fetching pending bets: ${fetchError.message}`);
    }

    let settledGoldenBets = 0;
    let checkedGoldenBets = 0;
    const goldenBetResults: any[] = [];

    if (pendingBets && pendingBets.length > 0) {
      console.log(`Found ${pendingBets.length} pending Golden Bets to check for settlement`);

      for (const bet of pendingBets) {
        try {
          checkedGoldenBets++;

            // Skip bets that haven't kicked off yet (avoid unnecessary API calls)
            if (bet.kickoff && new Date(bet.kickoff).getTime() > now.getTime()) {
              console.log(`Match ${bet.fixture_id} hasn't kicked off yet (kickoff: ${bet.kickoff})`);
              continue;
            }
          
          const fixtures = await fetchFromApi(API_KEY, '/fixtures', {
            id: bet.fixture_id,
          });

          if (!fixtures || fixtures.length === 0) {
            console.log(`No fixture data found for ${bet.fixture_id}`);
            continue;
          }

          const fixture = fixtures[0];
          const status = fixture.fixture?.status?.short;

          if (VOID_STATUSES.has(status)) {
            const { error: updateError } = await supabase
              .from('golden_bet_history')
              .update({
                status: 'void',
                result: 'VOID',
                actual_goals_home: null,
                actual_goals_away: null,
                profit_loss: 0,
                settled_at: new Date().toISOString(),
              })
              .eq('id', bet.id);

            if (!updateError) {
              settledGoldenBets++;
              goldenBetResults.push({
                id: bet.id,
                match: `${bet.home_team} vs ${bet.away_team}`,
                score: 'VOID',
                result: 'void',
                profitLoss: 0,
              });
              console.log(`⏸️ VOID Golden Bet: ${bet.home_team} vs ${bet.away_team} (status: ${status})`);
            }

            await new Promise((r) => setTimeout(r, 200));
            continue;
          }

          if (!FINISHED_STATUSES.has(status)) {
            console.log(`Match ${bet.fixture_id} not finished yet (status: ${status})`);
            continue;
          }

          const homeGoals = fixture.goals?.home ?? 0;
          const awayGoals = fixture.goals?.away ?? 0;
          const totals = await fetchFixtureTotals(API_KEY, String(bet.fixture_id));
          
          const result = checkBetResult(bet.market, homeGoals, awayGoals, totals.corners, totals.cards);
          const stake = bet.stake || 10;
          const profitLoss = result === 'won' 
            ? (stake * bet.bookmaker_odds) - stake 
            : -stake;

          const { error: updateError } = await supabase
            .from('golden_bet_history')
            .update({
              status: result,
              result: `${homeGoals}-${awayGoals}`,
              actual_goals_home: homeGoals,
              actual_goals_away: awayGoals,
              profit_loss: profitLoss,
              settled_at: new Date().toISOString(),
            })
            .eq('id', bet.id);

          if (!updateError) {
            settledGoldenBets++;
            goldenBetResults.push({
              id: bet.id,
              match: `${bet.home_team} vs ${bet.away_team}`,
              score: `${homeGoals}-${awayGoals}`,
              result,
              profitLoss,
            });
            console.log(`✓ Settled Golden Bet: ${bet.home_team} vs ${bet.away_team} = ${homeGoals}-${awayGoals} → ${result} (£${profitLoss.toFixed(2)})`);

            // ── Feed the Gaffer's learning log ──
            const actualValueMap: Record<string, number | undefined> = {
              over25: homeGoals + awayGoals,
              btts: (homeGoals > 0 && awayGoals > 0) ? 1 : 0,
              over95corners: totals.corners,
              over35cards: totals.cards,
            };
            const mktNorm = (bet.market || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
            const actualVal = mktNorm.includes('over25') || mktNorm.includes('goal') ? homeGoals + awayGoals
              : mktNorm.includes('btts') ? ((homeGoals > 0 && awayGoals > 0) ? 1 : 0)
              : mktNorm.includes('corner') ? totals.corners
              : mktNorm.includes('card') ? totals.cards
              : undefined;

            await supabase.from('gaffer_learning_log').upsert({
              prediction_date: bet.prediction_date,
              fixture_id: bet.fixture_id,
              home_team: bet.home_team,
              away_team: bet.away_team,
              league: bet.league,
              market: bet.market,
              source: 'golden_bet',
              predicted_probability: bet.ml_confidence ?? 0,
              probability_band: `${Math.floor((bet.ml_confidence ?? 0) / 5) * 5}-${Math.floor((bet.ml_confidence ?? 0) / 5) * 5 + 5}`,
              bookmaker_odds: bet.bookmaker_odds,
              value_edge: bet.value_edge,
              result,
              actual_value: actualVal ?? null,
              settled_at: new Date().toISOString(),
            }, { onConflict: 'prediction_date,fixture_id,market,source' });
          }

          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (err) {
          console.error(`Error processing Golden Bet ${bet.id}:`, err);
        }
      }
    } else {
      console.log('No pending Golden Bets ready for settlement');
    }

    // ============= SETTLE BET BUILDERS =============
    const { data: pendingBetBuilders, error: bbFetchError } = await supabase
      .from('bet_builder_history')
      .select('*')
      .eq('status', 'pending');

    if (bbFetchError) {
      console.error('Error fetching pending Bet Builders:', bbFetchError);
    }

    let settledBetBuilders = 0;
    const betBuilderResults: any[] = [];

    if (pendingBetBuilders && pendingBetBuilders.length > 0) {
      console.log(`Found ${pendingBetBuilders.length} pending Bet Builders to check for settlement`);

      for (const bb of pendingBetBuilders) {
        try {
           // Skip bet builders that haven't kicked off yet (avoid unnecessary API calls)
           if (bb.kickoff && new Date(bb.kickoff).getTime() > now.getTime()) {
             console.log(`Match ${bb.fixture_id} hasn't kicked off yet (kickoff: ${bb.kickoff})`);
             continue;
           }
          let fixture: any = null;
          let fixtures: any[] = [];
          
          // First try direct fixture ID lookup (works for numeric API-Football IDs)
          const fixtureIdNum = parseInt(bb.fixture_id);
          if (!isNaN(fixtureIdNum) && fixtureIdNum > 0) {
            fixtures = await fetchFromApi(API_KEY, '/fixtures', { id: bb.fixture_id });
            if (fixtures && fixtures.length > 0) {
              fixture = fixtures[0];
            }
          }
          
          // Fallback: search by date and scan all fixtures to find match
          if (!fixture) {
            console.log(`Fixture ID lookup failed for ${bb.fixture_id}, trying date-based search...`);
            const matchDate = bb.kickoff ? new Date(bb.kickoff).toISOString().split('T')[0] : bb.prediction_date;
            
            // Search all fixtures for the date
            const dateFixtures = await fetchFromApi(API_KEY, '/fixtures', {
              date: matchDate,
            });
            
            // Find the specific match by matching team names
            const normalizeTeam = (name: string) => 
              name.toLowerCase()
                .replace(/\bfc\b/gi, '')
                .replace(/\bsc\b/gi, '')
                .replace(/\bafc\b/gi, '')
                .replace(/\bunited\b/gi, '')
                .replace(/\bcity\b/gi, '')
                .trim();
                
            const normalizedHome = normalizeTeam(bb.home_team);
            const normalizedAway = normalizeTeam(bb.away_team);
            
            fixture = dateFixtures?.find((f: any) => {
              const fHome = normalizeTeam(f.teams?.home?.name || '');
              const fAway = normalizeTeam(f.teams?.away?.name || '');
              
              const homeMatch = fHome.includes(normalizedHome) || normalizedHome.includes(fHome);
              const awayMatch = fAway.includes(normalizedAway) || normalizedAway.includes(fAway);
              
              return homeMatch && awayMatch;
            });
            
            if (fixture) {
              console.log(`✓ Found fixture via date search: ${fixture.fixture.id} - ${fixture.teams?.home?.name} vs ${fixture.teams?.away?.name}`);
            }
          }

          if (!fixture) {
            console.log(`No fixture data found for Bet Builder ${bb.fixture_id} (${bb.home_team} vs ${bb.away_team})`);
            continue;
          }

          const status = fixture.fixture?.status?.short;

          if (VOID_STATUSES.has(status)) {
            const { error: updateError } = await supabase
              .from('bet_builder_history')
              .update({
                status: 'void',
                result: 'VOID',
                actual_goals_home: null,
                actual_goals_away: null,
                actual_corners: null,
                actual_cards: null,
                btts_result: null,
                profit_loss: 0,
                settled_at: new Date().toISOString(),
              })
              .eq('id', bb.id);

            if (!updateError) {
              settledBetBuilders++;
              betBuilderResults.push({
                id: bb.id,
                match: `${bb.home_team} vs ${bb.away_team}`,
                score: 'VOID',
                markets: (bb.markets as string[])?.length ?? 0,
                result: 'void',
                profitLoss: 0,
              });
              console.log(`⏸️ VOID Bet Builder: ${bb.home_team} vs ${bb.away_team} (status: ${status})`);
            }

            await new Promise((r) => setTimeout(r, 200));
            continue;
          }

          if (!FINISHED_STATUSES.has(status)) {
            console.log(`Match ${bb.fixture_id} not finished yet (status: ${status})`);
            continue;
          }

          const homeGoals = fixture.goals?.home ?? 0;
          const awayGoals = fixture.goals?.away ?? 0;
          const stats = extractFixtureStats(fixture);
          
          // Check each market in the bet builder
          const markets = bb.markets as string[];
          const marketResults: Record<string, boolean> = {};
          let allMarketsHit = true;

          for (const market of markets) {
            const result = checkBetResult(market, homeGoals, awayGoals, stats.corners, stats.cards);
            marketResults[market] = result === 'won';
            if (result === 'lost') allMarketsHit = false;
          }

          const stake = bb.stake || 10;
          const profitLoss = allMarketsHit 
            ? (stake * bb.combined_odds) - stake 
            : -stake;

          const bttsResult = homeGoals > 0 && awayGoals > 0;

          const { error: updateError } = await supabase
            .from('bet_builder_history')
            .update({
              status: allMarketsHit ? 'won' : 'lost',
              result: `${homeGoals}-${awayGoals}`,
              actual_goals_home: homeGoals,
              actual_goals_away: awayGoals,
              actual_corners: stats.corners || null,
              actual_cards: stats.cards || null,
              btts_result: bttsResult,
              profit_loss: profitLoss,
              settled_at: new Date().toISOString(),
            })
            .eq('id', bb.id);

          if (!updateError) {
            settledBetBuilders++;
            betBuilderResults.push({
              id: bb.id,
              match: `${bb.home_team} vs ${bb.away_team}`,
              score: `${homeGoals}-${awayGoals}`,
              markets: markets.length,
              result: allMarketsHit ? 'won' : 'lost',
              profitLoss,
            });
            console.log(`✓ Settled Bet Builder: ${bb.home_team} vs ${bb.away_team} = ${homeGoals}-${awayGoals} → ${allMarketsHit ? 'WON' : 'LOST'} (£${profitLoss.toFixed(2)})`);
          }

          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (err) {
          console.error(`Error processing Bet Builder ${bb.id}:`, err);
        }
      }
    } else {
      console.log('No pending Bet Builders ready for settlement');
    }

    // ============= SETTLE ACCAS =============
    const { data: pendingAccas, error: accaFetchError } = await supabase
      .from('acca_history')
      .select('*')
      .eq('status', 'pending');

    if (accaFetchError) {
      console.error('Error fetching pending ACCAs:', accaFetchError);
    }

    let settledAccas = 0;
    const accaResults: any[] = [];

    if (pendingAccas && pendingAccas.length > 0) {
      console.log(`Found ${pendingAccas.length} pending ACCAs to check for settlement`);

      for (const acca of pendingAccas) {
        try {
          const selections = acca.selections as AccaSelection[];

          // If any leg hasn't even kicked off yet, don't attempt settlement.
          if (selections.some((s) => new Date(s.kickoff).getTime() > now.getTime())) {
            console.log(`ACCA ${acca.id}: Not all matches have kicked off yet`);
            continue;
          }

          // Settle each leg
          const legResults: AccaResult[] = [];
          let allLegsSettled = true;

          for (const selection of selections) {
            // Try to find fixture ID from the selection or lookup by team names
            let fixtureId = selection.fixtureId;
            
            if (!fixtureId) {
              // Try to find from golden_bet_history or bet_builder_history
              const { data: matchingBet } = await supabase
                .from('golden_bet_history')
                .select('fixture_id')
                .eq('prediction_date', acca.prediction_date)
                .or(`home_team.ilike.%${selection.teamName}%,away_team.ilike.%${selection.teamName}%`)
                .limit(1)
                .single();
              
              fixtureId = matchingBet?.fixture_id;
            }

            if (!fixtureId) {
              console.log(`Could not find fixture ID for ${selection.teamName} vs ${selection.opposition}`);
              allLegsSettled = false;
              continue;
            }

            // Fetch fixture result
            const fixtures = await fetchFromApi(API_KEY, '/fixtures', { id: fixtureId });
            
            if (!fixtures || fixtures.length === 0) {
              console.log(`No fixture data for ${fixtureId}`);
              allLegsSettled = false;
              continue;
            }

            const fixture = fixtures[0];
            const status = fixture.fixture?.status?.short;

            if (VOID_STATUSES.has(status)) {
              // Treat this leg as VOID (stake returned at accumulator level)
              legResults.push({
                teamName: selection.teamName,
                opposition: selection.opposition || '',
                league: selection.league || '',
                market: selection.market,
                marketLabel: selection.marketLabel || '',
                isHome: selection.isHome ?? true,
                hit: true,
                void: true,
                score: 'VOID',
                fixtureId: selection.fixtureId || fixtureId,
              });
              console.log(`  Leg: ${selection.teamName} ${selection.marketLabel} = VOID (status: ${status})`);
              await new Promise((r) => setTimeout(r, 250));
              continue;
            }

            if (!FINISHED_STATUSES.has(status)) {
              console.log(`Match ${fixtureId} not finished yet (status: ${status})`);
              allLegsSettled = false;
              continue;
            }

            const homeGoals = fixture.goals?.home ?? 0;
            const awayGoals = fixture.goals?.away ?? 0;
            const stats = extractFixtureStats(fixture);
            
            const result = checkBetResult(selection.market, homeGoals, awayGoals, stats.corners, stats.cards);
            
            // CRITICAL: Store FULL selection context in results to ensure P&L displays correctly
            // This prevents any index mismatch or missing data issues
            legResults.push({
              teamName: selection.teamName,
              opposition: selection.opposition || '',
              league: selection.league || '',
              market: selection.market,
              marketLabel: selection.marketLabel || '',
              isHome: selection.isHome ?? true,
              hit: result === 'won',
              void: false,
              score: `${homeGoals}-${awayGoals}`,
              fixtureId: selection.fixtureId || fixtureId,
            });

            console.log(`  Leg: ${selection.teamName} ${selection.marketLabel} = ${homeGoals}-${awayGoals} → ${result === 'won' ? '✓' : '✗'}`);

            await new Promise(resolve => setTimeout(resolve, 400));
          }

          if (!allLegsSettled || legResults.length < selections.length) {
            console.log(`ACCA ${acca.id}: Not all legs could be settled yet`);
            continue;
          }

          // Calculate ACCA result
          const voidLegs = legResults.filter((r) => r.void).length;
          const legsWon = legResults.filter((r) => !r.void && r.hit).length;
          const legsLost = legResults.filter((r) => !r.void && !r.hit).length;
          const totalLegs = selections.length;
          const activeLegs = totalLegs - voidLegs;

          // Determine outcome:
          // - If any active leg lost → LOST
          // - If ALL legs are void → VOID (stake returned)
          // - If some legs void but all active legs won → WON at reduced odds
          // - If no voids and all won → WON at full odds
          let accaOutcome: 'won' | 'lost' | 'void';
          if (legsLost > 0) {
            accaOutcome = 'lost';
          } else if (activeLegs === 0) {
            // Every single leg was void – full void
            accaOutcome = 'void';
          } else {
            // All active legs won (possibly with some void legs removed)
            accaOutcome = 'won';
          }

          const stake = acca.stake || 10;
          let profitLoss: number;

          if (accaOutcome === 'lost') {
            profitLoss = -stake;
          } else if (accaOutcome === 'void') {
            profitLoss = 0;
          } else {
            // WON: Calculate effective odds
            // If no void legs, use full combined_odds
            // If some void legs, estimate reduced odds using geometric mean:
            // Each leg contributes equally → reduced_odds = combined_odds ^ (activeLegs / totalLegs)
            let effectiveOdds = acca.combined_odds;
            if (voidLegs > 0 && totalLegs > 0) {
              effectiveOdds = Math.pow(acca.combined_odds, activeLegs / totalLegs);
              // Round to 2 decimal places
              effectiveOdds = Math.round(effectiveOdds * 100) / 100;
              console.log(`📐 Reduced odds: ${acca.combined_odds} → ${effectiveOdds} (${voidLegs} void leg(s) removed, ${activeLegs}/${totalLegs} active)`);
            }
            profitLoss = (stake * effectiveOdds) - stake;
          }

          // Update ACCA record
          const { error: updateError } = await supabase
            .from('acca_history')
            .update({
              status: accaOutcome,
              results: legResults,
              legs_won: legsWon,
              legs_lost: legsLost,
              profit_loss: profitLoss,
              settled_at: new Date().toISOString(),
            })
            .eq('id', acca.id);

          if (!updateError) {
            settledAccas++;
            accaResults.push({
              id: acca.id,
              legs: selections.length,
              legsWon,
              legsLost,
              result: accaOutcome,
              odds: acca.combined_odds,
              profitLoss,
            });
            console.log(`✓ Settled ACCA: ${legsWon}/${selections.length} legs hit, ${voidLegs} void → ${accaOutcome.toUpperCase()} (£${profitLoss.toFixed(2)})`);
          }

        } catch (err) {
          console.error(`Error processing ACCA ${acca.id}:`, err);
        }
      }
    } else {
      console.log('No pending ACCAs ready for settlement');
    }

    // ============= UPDATE ML MODEL ACCURACY =============
    if (settledGoldenBets > 0) {
      const today = new Date().toISOString().split('T')[0];
      const markets = ['over_2.5_goals', 'btts', 'over_9.5_corners', 'over_3.5_cards'];
      
      for (const market of markets) {
        const { data: marketBets } = await supabase
          .from('golden_bet_history')
          .select('*')
          .eq('market', market)
          .in('status', ['won', 'lost']);
        
        if (marketBets && marketBets.length > 0) {
          const wins = marketBets.filter(b => b.status === 'won').length;
          const total = marketBets.length;
          const winRate = (wins / total) * 100;
          const totalStaked = marketBets.reduce((sum, b) => sum + (b.stake || 10), 0);
          const totalReturns = marketBets.filter(b => b.status === 'won')
            .reduce((sum, b) => sum + ((b.stake || 10) * (b.bookmaker_odds || 1)), 0);
          const profitLoss = totalReturns - totalStaked;
          const roi = (profitLoss / totalStaked) * 100;
          const avgConfidence = marketBets.reduce((sum, b) => sum + (b.ml_confidence || 0), 0) / total;
          
          const sortedBets = marketBets.sort((a, b) => 
            new Date(b.settled_at || 0).getTime() - new Date(a.settled_at || 0).getTime()
          );
          let currentStreak = 0;
          let bestStreak = 0;
          let tempStreak = 0;
          
          for (const bet of sortedBets) {
            if (bet.status === 'won') {
              tempStreak++;
              if (currentStreak === 0 || sortedBets.indexOf(bet) === 0) currentStreak = tempStreak;
              bestStreak = Math.max(bestStreak, tempStreak);
            } else {
              if (sortedBets.indexOf(bet) === 0) currentStreak = 0;
              tempStreak = 0;
            }
          }

          // A/B test: log both global and cluster model types
          await supabase
            .from('ml_model_accuracy')
            .upsert({
              date: today,
              market,
              model_type: 'global',
              total_predictions: total,
              correct_predictions: wins,
              win_rate: parseFloat(winRate.toFixed(2)),
              roi: parseFloat(roi.toFixed(2)),
              total_staked: totalStaked,
              total_returns: parseFloat(totalReturns.toFixed(2)),
              profit_loss: parseFloat(profitLoss.toFixed(2)),
              avg_confidence: parseFloat(avgConfidence.toFixed(2)),
              current_streak: currentStreak,
              best_streak: bestStreak,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'date,market' });
          
          // Also log per-league cluster accuracy for A/B comparison
          const leagueGroups = new Map<string, typeof marketBets>();
          for (const bet of marketBets) {
            const league = bet.league || 'unknown';
            if (!leagueGroups.has(league)) leagueGroups.set(league, []);
            leagueGroups.get(league)!.push(bet);
          }

          for (const [league, leagueBets] of leagueGroups.entries()) {
            if (leagueBets.length < 3) continue;
            const lWins = leagueBets.filter(b => b.status === 'won').length;
            const lTotal = leagueBets.length;
            const lWinRate = (lWins / lTotal) * 100;
            const lStaked = leagueBets.reduce((s, b) => s + (b.stake || 10), 0);
            const lReturns = leagueBets.filter(b => b.status === 'won')
              .reduce((s, b) => s + ((b.stake || 10) * (b.bookmaker_odds || 1)), 0);
            const lPL = lReturns - lStaked;

            // Determine cluster for this league
            const clusterMap: Record<string, string[]> = {
              'high_scoring': ['Premier League', 'Bundesliga', 'Eredivisie', 'Championship', 'Austrian Bundesliga', 'Swiss Super League', 'Belgian Pro League'],
              'mid_scoring': ['La Liga', 'Serie A', 'Ligue 1', 'Primeira Liga', 'Scottish Premiership', 'MLS'],
              'low_scoring': ['Super Lig', 'Greek Super League', 'Saudi Pro League', 'J1 League'],
            };
            let cluster = 'global';
            for (const [c, leagues] of Object.entries(clusterMap)) {
              if (leagues.some(l => league.toLowerCase().includes(l.toLowerCase()))) { cluster = c; break; }
            }

            await supabase
              .from('ml_model_accuracy')
              .insert({
                date: today,
                market,
                model_type: 'cluster',
                league_cluster: cluster,
                total_predictions: lTotal,
                correct_predictions: lWins,
                win_rate: parseFloat(lWinRate.toFixed(2)),
                roi: parseFloat(((lPL / lStaked) * 100).toFixed(2)),
                total_staked: lStaked,
                total_returns: parseFloat(lReturns.toFixed(2)),
                profit_loss: parseFloat(lPL.toFixed(2)),
                avg_confidence: leagueBets.reduce((s, b) => s + (b.ml_confidence || 0), 0) / lTotal,
              });
          }
          
          console.log(`📊 Updated ${market} accuracy: ${winRate.toFixed(1)}% win rate, ${roi.toFixed(1)}% ROI (+ cluster breakdown)`);
        }
      }
    }

    const summary = {
      success: true,
      message: `Settled ${settledGoldenBets} Golden Bets, ${settledBetBuilders} Bet Builders, ${settledAccas} ACCAs`,
      goldenBets: {
        settled: settledGoldenBets,
        checked: checkedGoldenBets,
        results: goldenBetResults,
      },
      betBuilders: {
        settled: settledBetBuilders,
        results: betBuilderResults,
      },
      accas: {
        settled: settledAccas,
        results: accaResults,
      },
      timestamp: new Date().toISOString(),
    };
    
    console.log('Settlement complete:', JSON.stringify(summary, null, 2));

    // Trigger settlement email if any bets were settled
    const totalSettled = settledGoldenBets + settledBetBuilders + settledAccas;
    if (totalSettled > 0) {
      try {
        const settlements = [
          ...goldenBetResults.map((r: any) => ({
            type: 'Golden Bet',
            homeTeam: r.match.split(' vs ')[0],
            awayTeam: r.match.split(' vs ')[1],
            result: r.result,
            profitLoss: r.profitLoss,
          })),
          ...betBuilderResults.map((r: any) => ({
            type: 'Bet Builder',
            homeTeam: r.match.split(' vs ')[0],
            awayTeam: r.match.split(' vs ')[1],
            result: r.result,
            profitLoss: r.profitLoss,
          })),
          ...accaResults.map((r: any) => ({
            type: 'ACCA',
            homeTeam: 'Accumulator',
            awayTeam: `${r.legsWon}/${r.legsTotal} legs`,
            result: r.result,
            profitLoss: r.profitLoss,
          })),
        ];

        console.log('📧 Triggering settlement email...');
        await fetch(`${SUPABASE_URL}/functions/v1/send-bet-emails`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type: 'settlement',
            data: { settlements },
          }),
        });
      } catch (emailErr) {
        console.error('Failed to send settlement email:', emailErr);
      }
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Settle bets error:', errorMessage);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage,
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

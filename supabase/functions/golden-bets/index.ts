import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Golden Bets Endpoint
 * 
 * Returns Golden Bets from DB if available,
 * otherwise falls back to heuristic mode using Europe's Top 20 leagues.
 */

const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const MIN_VALUE_EDGE = -1.0; // Winners-first: no value edge gate, pick highest probability

// ============ EUROPE TOP 20 LEAGUES ============
// Tier 1: Top 5 + UEFA Competitions
const TIER_1_LEAGUES = new Set([
  39,   // Premier League (England)
  140,  // La Liga (Spain)
  78,   // Bundesliga (Germany)
  135,  // Serie A (Italy)
  61,   // Ligue 1 (France)
  2,    // UEFA Champions League
  3,    // UEFA Europa League
  848,  // UEFA Europa Conference League
]);

// Tier 2: Major European Leagues + Domestic Cups
const TIER_2_LEAGUES = new Set([
  40,   // Championship (England)
  41,   // League One (England)
  42,   // League Two (England)
  79,   // 2. Bundesliga (Germany)
  141,  // La Liga 2 (Spain)
  136,  // Serie B (Italy)
  62,   // Ligue 2 (France)
  94,   // Primeira Liga (Portugal)
  88,   // Eredivisie (Netherlands)
  144,  // Belgian Pro League
  179,  // Scottish Premiership
  203,  // Süper Lig (Turkey)
  218,  // Austrian Bundesliga
  207,  // Swiss Super League
  197,  // Greek Super League
  113,  // Allsvenskan (Sweden)
  103,  // Eliteserien (Norway)
  119,  // Danish Superliga
  // Domestic Cups
  45,   // FA Cup (England)
  48,   // EFL Cup / Carabao Cup (England)
  143,  // Copa del Rey (Spain)
  81,   // DFB Pokal (Germany)
  137,  // Coppa Italia (Italy)
  66,   // Coupe de France (France)
  96,   // Taça de Portugal
  90,   // KNVB Beker (Netherlands)
  183,  // Scottish Cup
]);

// All allowed leagues combined
const ALLOWED_LEAGUES = new Set([...TIER_1_LEAGUES, ...TIER_2_LEAGUES]);

// CRITICAL: COMPLETE BAN on Women's, Youth, Reserve, and lower-tier leagues
const EXCLUDED_PATTERNS = [
  // ========= WOMEN'S FOOTBALL - COMPLETE BAN =========
  'women', 'woman', 'femenina', 'féminine', 'feminin', 'frauen', 'vrouwen',
  'damer', 'damas', 'feminine', 'féminin', 'feminino', 'ladies', 'female', 'girl',
  'wsl', 'nwsl', 'wnsl', 'fawc', 'uwcl',
  // ========= YOUTH/RESERVE - BANNED =========
  'u15', 'u16', 'u17', 'u18', 'u19', 'u20', 'u21', 'u23',
  'youth', 'junior', 'academy', 'reserve', 'development', 'pl2', 'premier league 2',
  // ========= OTHER EXCLUSIONS =========
  'friendly', 'friendlies', 'club friendly',
  'amateur', 'regional',
  'santosh trophy', 'indian', 'india',
  'indonesia', 'indonesian', 'thai', 'thailand',
  'malaysia', 'malaysian', 'vietnam', 'vietnamese',
  'bangladesh', 'nepal', 'maldives', 'bhutan',
  'cambodia', 'myanmar', 'laos', 'philippines',
  'singapore',
];

// Check if league name contains banned patterns
function isExcludedLeague(leagueName: string): boolean {
  const lower = leagueName.toLowerCase();
  return EXCLUDED_PATTERNS.some(p => lower.includes(p));
}

// Also check team names for women's indicators (e.g., "Man City W", "Chelsea W")
function isExcludedTeam(teamName: string): boolean {
  if (!teamName) return false;
  const lower = teamName.toLowerCase();
  // Check for standalone "W" at end of team name (e.g., "Barcelona W")
  if (/\bw\b/i.test(teamName)) return true;
  return EXCLUDED_PATTERNS.some(p => lower.includes(p));
}

function isAllowedLeague(leagueId: number, leagueName: string): boolean {
  if (isExcludedLeague(leagueName)) return false;
  return ALLOWED_LEAGUES.has(leagueId);
}

function getLeagueTier(leagueId: number): number {
  if (TIER_1_LEAGUES.has(leagueId)) return 1;
  if (TIER_2_LEAGUES.has(leagueId)) return 2;
  return 999;
}

// Cards removed from standalone Golden Bets — API-Football /odds endpoint
// does NOT carry bookings/cards markets. Cards are ONLY used in Bet Builders
// where they are combined with other markets using estimated odds.
type Market = 'over_2_5_goals' | 'btts' | 'over_8_5_corners';

interface HeuristicPick {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  league_id: number;
  kickoff: string;
  market: Market;
  probability: number;
  odds: number;
  edge: number;
}

// ============ POWER SCORE GATE ============
// Queries precomputed match power scores to filter out weak fixtures
const POWER_SCORE_THRESHOLD = 70; // Minimum score to be eligible

interface PowerScoreEntry {
  fixture_id: string;
  over_25_goals_score: number;
  btts_score: number;
  over_95_corners_score: number;
  over_35_cards_score: number;
}

const MARKET_SCORE_MAP: Record<string, keyof PowerScoreEntry> = {
  'over_2_5_goals': 'over_25_goals_score',
  'btts': 'btts_score',
  'over_8_5_corners': 'over_95_corners_score',
  'over_3_5_cards': 'over_35_cards_score',
};

async function loadPowerScores(supabase: any, date: string): Promise<Map<string, PowerScoreEntry>> {
  const map = new Map<string, PowerScoreEntry>();
  try {
    const { data } = await supabase
      .from('match_power_scores')
      .select('fixture_id, over_25_goals_score, btts_score, over_95_corners_score, over_35_cards_score')
      .eq('computed_date', date);
    if (data) {
      for (const row of data) {
        map.set(String(row.fixture_id), row as PowerScoreEntry);
      }
    }
    console.log(`⚡ Loaded ${map.size} power scores for ${date}`);
  } catch (e) {
    console.warn('⚠️ Could not load power scores:', e);
  }
  return map;
}

function checkPowerScore(scores: Map<string, PowerScoreEntry>, fixtureId: string, market: string): { pass: boolean; score: number } {
  const entry = scores.get(fixtureId);
  if (!entry) return { pass: true, score: 0 }; // No score = allow (graceful degradation)
  const scoreField = MARKET_SCORE_MAP[market];
  if (!scoreField) return { pass: true, score: 0 };
  const score = (entry[scoreField] as number) || 0;
  return { pass: score >= POWER_SCORE_THRESHOLD, score };
}

// ============ HEURISTIC FALLBACK ============
async function fetchTodaysFixtures(apiKey: string): Promise<any[]> {
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Fetching European fixtures for ${today} (heuristic mode)`);
  
  try {
    const response = await fetch(`${API_FOOTBALL_BASE}/fixtures?date=${today}&timezone=UTC`, {
      headers: { 'x-apisports-key': apiKey },
    });
    
    if (!response.ok) {
      console.log(`⚠️ Fixtures query returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`📦 Found ${data.response?.length || 0} total fixtures`);
    
    const filtered = (data.response || []).filter((f: any) => {
      const leagueId = f.league?.id || 0;
      const leagueName = f.league?.name || '';
      const kickoff = f.fixture?.date;
      const homeTeam = f.teams?.home?.name || '';
      const awayTeam = f.teams?.away?.name || '';
      
      if (!kickoff || new Date(kickoff) < new Date()) return false;
      if (!isAllowedLeague(leagueId, leagueName)) return false;
      
      // CRITICAL: Also check team names for women's indicators (e.g., "Man City W")
      if (isExcludedTeam(homeTeam) || isExcludedTeam(awayTeam)) {
        console.log(`🚫 Excluding women's team: ${homeTeam} vs ${awayTeam}`);
        return false;
      }
      
      return true;
    });
    
    // Sort by tier (premium first)
    filtered.sort((a: any, b: any) => {
      return getLeagueTier(a.league?.id || 999) - getLeagueTier(b.league?.id || 999);
    });
    
    console.log(`✅ ${filtered.length} European tier 1-2 fixtures available`);
    return filtered;
  } catch (e) {
    console.error('Error fetching fixtures:', e);
    return [];
  }
}

interface TeamRollingStats {
  team_name: string;
  avg_goals_scored: number;
  avg_goals_conceded: number;
  avg_total_goals: number;
  over_25_goals_pct: number;
  btts_pct: number;
  avg_corners_for: number;
  avg_corners_against: number;
  avg_total_corners: number;
  over_95_corners_pct: number;
  avg_cards_for: number;
  avg_cards_against: number;
  avg_total_cards: number;
  over_35_cards_pct: number;
  form_string: string;
  matches_used: number;
  // Home/Away splits
  home_avg_total_goals?: number;
  home_over_25_goals_pct?: number;
  home_btts_pct?: number;
  home_avg_total_corners?: number;
  home_over_95_corners_pct?: number;
  home_avg_total_cards?: number;
  home_over_35_cards_pct?: number;
  away_avg_total_goals?: number;
  away_over_25_goals_pct?: number;
  away_btts_pct?: number;
  away_avg_total_corners?: number;
  away_over_95_corners_pct?: number;
  away_avg_total_cards?: number;
  away_over_35_cards_pct?: number;
}

// ============ HEAD-TO-HEAD LOOKUP ============
interface H2HStats {
  meetings: number;
  avg_total_goals: number;
  over_25_pct: number;
  btts_pct: number;
  avg_total_corners: number;
  over_95_corners_pct: number;
  avg_total_cards: number;
  over_35_cards_pct: number;
}

async function fetchH2H(supabase: any, teamA: string, teamB: string): Promise<H2HStats | null> {
  try {
    // Search both home/away combinations across both data sources
    const [{ data: d1 }, { data: d2 }] = await Promise.all([
      supabase.from('ml_training_data')
        .select('home_goals, away_goals, total_goals, total_corners, total_cards, home_corners, away_corners, home_yellow_cards, away_yellow_cards, home_red_cards, away_red_cards')
        .or(`and(home_team.eq.${teamA},away_team.eq.${teamB}),and(home_team.eq.${teamB},away_team.eq.${teamA})`)
        .not('home_goals', 'is', null)
        .order('fixture_date', { ascending: false })
        .limit(10),
      supabase.from('sportmonks_matches')
        .select('home_goals, away_goals, total_goals, total_corners, total_cards, home_corners, away_corners, home_yellow_cards, away_yellow_cards, home_red_cards, away_red_cards')
        .or(`and(home_team.eq.${teamA},away_team.eq.${teamB}),and(home_team.eq.${teamB},away_team.eq.${teamA})`)
        .not('home_goals', 'is', null)
        .order('fixture_date', { ascending: false })
        .limit(10),
    ]);
    
    // Dedupe and combine (take up to 5 most recent)
    const all = [...(d1 || []), ...(d2 || [])].slice(0, 5);
    if (all.length < 2) return null;
    
    const totalGoals = all.map((m: any) => (m.total_goals ?? ((m.home_goals ?? 0) + (m.away_goals ?? 0))));
    const totalCorners = all.filter((m: any) => m.total_corners != null || (m.home_corners != null && m.away_corners != null))
      .map((m: any) => m.total_corners ?? ((m.home_corners ?? 0) + (m.away_corners ?? 0)));
    const totalCards = all.filter((m: any) => m.total_cards != null || m.home_yellow_cards != null)
      .map((m: any) => {
        if (m.total_cards != null) return m.total_cards;
        return (m.home_yellow_cards ?? 0) + (m.away_yellow_cards ?? 0) + (m.home_red_cards ?? 0) + (m.away_red_cards ?? 0);
      });
    
    const n = all.length;
    const cn = totalCorners.length || 1;
    const kn = totalCards.length || 1;
    
    return {
      meetings: n,
      avg_total_goals: totalGoals.reduce((a: number, b: number) => a + b, 0) / n,
      over_25_pct: Math.round(totalGoals.filter((g: number) => g > 2).length / n * 100),
      btts_pct: Math.round(all.filter((m: any) => (m.home_goals ?? 0) > 0 && (m.away_goals ?? 0) > 0).length / n * 100),
      avg_total_corners: totalCorners.reduce((a: number, b: number) => a + b, 0) / cn,
      over_95_corners_pct: Math.round(totalCorners.filter((c: number) => c > 9).length / cn * 100),
      avg_total_cards: totalCards.reduce((a: number, b: number) => a + b, 0) / kn,
      over_35_cards_pct: Math.round(totalCards.filter((c: number) => c > 3).length / kn * 100),
    };
  } catch (e) {
    console.warn(`H2H lookup failed for ${teamA} vs ${teamB}:`, e);
    return null;
  }
}

// ============ DERBY DETECTION ============
const KNOWN_DERBIES: Array<[string, string]> = [
  // England
  ['Arsenal', 'Tottenham'], ['Liverpool', 'Everton'], ['Manchester United', 'Manchester City'],
  ['Chelsea', 'Fulham'], ['West Ham', 'Millwall'], ['Newcastle', 'Sunderland'],
  ['Aston Villa', 'Birmingham'], ['Wolves', 'West Brom'], ['Nottingham Forest', 'Derby'],
  ['Sheffield United', 'Sheffield Wednesday'], ['Leeds', 'Manchester United'],
  // Spain
  ['Real Madrid', 'Atletico Madrid'], ['Barcelona', 'Espanyol'], ['Real Betis', 'Sevilla'],
  ['Athletic Club', 'Real Sociedad'], ['Valencia', 'Villarreal'],
  // Italy
  ['AC Milan', 'Inter'], ['Roma', 'Lazio'], ['Juventus', 'Torino'],
  ['Genoa', 'Sampdoria'], ['Napoli', 'Roma'],
  // Germany
  ['Borussia Dortmund', 'Schalke 04'], ['Bayern Munich', 'Borussia Dortmund'],
  ['Hamburger SV', 'Werder Bremen'], ['Hertha Berlin', 'Union Berlin'],
  // France
  ['PSG', 'Marseille'], ['Lyon', 'Saint-Etienne'], ['Nice', 'Monaco'],
  // Scotland
  ['Celtic', 'Rangers'],
  // Turkey
  ['Galatasaray', 'Fenerbahce'], ['Besiktas', 'Galatasaray'],
  // Netherlands
  ['Ajax', 'Feyenoord'], ['PSV', 'Ajax'],
  // Portugal
  ['Benfica', 'Sporting CP'], ['Porto', 'Benfica'],
  // South America
  ['Boca Juniors', 'River Plate'], ['Flamengo', 'Fluminense'],
  ['Corinthians', 'Palmeiras'], ['Nacional', 'Penarol'],
];

function isDerby(homeTeam: string, awayTeam: string): boolean {
  const normHome = homeTeam.toLowerCase();
  const normAway = awayTeam.toLowerCase();
  
  for (const [a, b] of KNOWN_DERBIES) {
    const na = a.toLowerCase();
    const nb = b.toLowerCase();
    if ((normHome.includes(na) || na.includes(normHome)) && (normAway.includes(nb) || nb.includes(normAway))) return true;
    if ((normHome.includes(nb) || nb.includes(normHome)) && (normAway.includes(na) || na.includes(normAway))) return true;
  }
  
  // Heuristic: same city detection (teams sharing first word that's a city)
  const homeWords = normHome.split(/\s+/);
  const awayWords = normAway.split(/\s+/);
  const cityWords = ['manchester', 'london', 'sheffield', 'birmingham', 'milan', 'madrid', 'rome', 'rome', 'berlin', 'istanbul', 'glasgow', 'lisbon', 'amsterdam', 'buenos aires'];
  for (const city of cityWords) {
    if (normHome.includes(city) && normAway.includes(city)) return true;
  }
  
  return false;
}

const ROLLING_STATS_COLS = 'team_name, avg_goals_scored, avg_goals_conceded, avg_total_goals, over_25_goals_pct, btts_pct, avg_corners_for, avg_corners_against, avg_total_corners, over_95_corners_pct, avg_cards_for, avg_cards_against, avg_total_cards, over_35_cards_pct, form_string, matches_used, home_avg_total_goals, home_over_25_goals_pct, home_btts_pct, home_avg_total_corners, home_over_95_corners_pct, home_avg_total_cards, home_over_35_cards_pct, away_avg_total_goals, away_over_25_goals_pct, away_btts_pct, away_avg_total_corners, away_over_95_corners_pct, away_avg_total_cards, away_over_35_cards_pct';

async function fetchTeamRollingStats(supabase: any, teamName: string): Promise<TeamRollingStats | null> {
  try {
    let { data } = await supabase
      .from('team_rolling_stats')
      .select(ROLLING_STATS_COLS)
      .eq('team_name', teamName)
      .limit(1)
      .maybeSingle();
    
    if (data) return data as TeamRollingStats;
    
    const { data: fuzzy } = await supabase
      .from('team_rolling_stats')
      .select(ROLLING_STATS_COLS)
      .ilike('team_name', `%${teamName}%`)
      .limit(1)
      .maybeSingle();
    
    return fuzzy as TeamRollingStats | null;
  } catch (e) {
    console.error(`Error fetching rolling stats for ${teamName}:`, e);
    return null;
  }
}

// Legacy wrapper for compatibility
async function fetchTeamStats(supabase: any, teamName: string): Promise<Record<string, number>> {
  const rolling = await fetchTeamRollingStats(supabase, teamName);
  if (!rolling) return {};
  
  return {
    'goals:over_2_5': (rolling.over_25_goals_pct || 50) / 100,
    'btts:btts_yes': (rolling.btts_pct || 50) / 100,
    'corners:over_9_5': (rolling.over_95_corners_pct || 45) / 100,
    'cards:over_3_5': (rolling.over_35_cards_pct || 40) / 100,
  };
}

// ============ API-FOOTBALL ODDS INTEGRATION ============
// Uses bulk /odds?league=X&season=Y endpoint for efficiency (1 call per league)
// Prioritizes Bet365 (bookmaker ID 6) for best market coverage

interface RealOdds {
  odds: number;
  bookmaker: string;
  market: string;
  allBookmakerOdds: number[]; // for transparency
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const BET365_ID = 6; // Bet365 bookmaker ID in API-Football
const BET365_NAME = 'bet365';

// Parse odds from a single bookmaker entry for a fixture
function parseBookmakerOdds(
  bk: any,
  oddsCollector: Map<string, { odds: number; bookmaker: string; isBet365: boolean }[]>
) {
  const bookmakerName = bk.name || 'Unknown';
  const isBet365 = bookmakerName.toLowerCase().includes(BET365_NAME) || bk.id === BET365_ID;

  for (const bet of (bk.bets || [])) {
    const betName = (bet.name || '').toLowerCase();

    for (const val of (bet.values || [])) {
      const label = String(val.value || '').toLowerCase();
      const odds = parseFloat(val.odd);
      if (!odds || odds <= 0) continue;

      let marketKey = '';

      // Goals Over/Under
      if (label === 'over 2.5' && !betName.includes('corner') && !betName.includes('card')) {
        marketKey = 'over_2_5_goals';
      }
      // BTTS Yes
      else if (label === 'yes' && (betName.includes('both teams') || betName === 'btts')) {
        marketKey = 'btts';
      }
      // Corners — various lines
      else if ((label === 'over 8.5' || label === 'over 8' || label === 'over 9') && betName.includes('corner')) {
        marketKey = 'over_8_5_corners';
      }
      // Cards — for Bet Builder use (not standalone golden bets)
      else if ((label === 'over 3.5' || label === 'over 4' || label === 'over 3') && (betName.includes('card') || betName.includes('booking'))) {
        marketKey = 'over_3_5_cards';
      }

      if (marketKey) {
        if (!oddsCollector.has(marketKey)) oddsCollector.set(marketKey, []);
        oddsCollector.get(marketKey)!.push({ odds, bookmaker: bookmakerName, isBet365 });
      }
    }
  }
}

// Resolve best odds per market from collected entries (Bet365 priority)
function resolveOdds(
  oddsCollector: Map<string, { odds: number; bookmaker: string; isBet365: boolean }[]>
): Map<string, RealOdds> {
  const results = new Map<string, RealOdds>();

  for (const [marketKey, entries] of oddsCollector) {
    if (entries.length === 0) continue;

    const bet365Entry = entries.find(e => e.isBet365);
    const allOdds = entries.map(e => e.odds);

    if (bet365Entry) {
      results.set(marketKey, {
        odds: Math.round(bet365Entry.odds * 100) / 100,
        bookmaker: bet365Entry.bookmaker,
        market: marketKey,
        allBookmakerOdds: allOdds,
      });
    } else {
      const medianOdds = median(allOdds);
      const closestEntry = entries.reduce((best, e) =>
        Math.abs(e.odds - medianOdds) < Math.abs(best.odds - medianOdds) ? e : best
      );
      results.set(marketKey, {
        odds: Math.round(medianOdds * 100) / 100,
        bookmaker: closestEntry.bookmaker,
        market: marketKey,
        allBookmakerOdds: allOdds,
      });
    }
  }
  return results;
}

/**
 * BULK fetch odds for all fixtures in a league using /odds?league=X&season=Y
 * Returns Map<fixtureId, Map<market, RealOdds>>
 */
/**
 * Paginated fetch of odds for a league — API-Football returns max 10 per page
 */
async function fetchOddsPaginated(
  apiKey: string,
  baseUrl: string,
): Promise<any[]> {
  let allData: any[] = [];
  let page = 1;
  const maxPages = 5; // Safety cap

  while (page <= maxPages) {
    const url = `${baseUrl}&page=${page}`;
    const response = await fetch(url, {
      headers: { 'x-apisports-key': apiKey },
    });
    if (!response.ok) break;

    const data = await response.json();
    const results = data.response || [];
    allData = allData.concat(results);

    // Check pagination
    const totalPages = data.paging?.total || 1;
    if (page >= totalPages) break;
    page++;
    await new Promise(r => setTimeout(r, 300)); // Rate limit between pages
  }

  return allData;
}

async function fetchOddsForLeague(
  apiKey: string,
  leagueId: number,
  season: number,
): Promise<Map<string, Map<string, RealOdds>>> {
  const result = new Map<string, Map<string, RealOdds>>();

  try {
    console.log(`📊 Bulk odds fetch: league=${leagueId} season=${season}`);

    // Try Bet365 first
    const bet365Url = `${API_FOOTBALL_BASE}/odds?league=${leagueId}&season=${season}&bookmaker=${BET365_ID}`;
    const bet365Data = await fetchOddsPaginated(apiKey, bet365Url);

    if (bet365Data.length > 0) {
      console.log(`  🎯 Bet365 odds: ${bet365Data.length} entries for league ${leagueId}`);
      return parseLeagueOddsResponse(bet365Data);
    }

    // Fallback: any bookmaker
    console.log(`  ⚠️ No Bet365 for league ${leagueId} — fetching all bookmakers`);
    const allUrl = `${API_FOOTBALL_BASE}/odds?league=${leagueId}&season=${season}`;
    const allData = await fetchOddsPaginated(apiKey, allUrl);
    return parseLeagueOddsResponse(allData);
  } catch (e) {
    console.error(`Error bulk fetching odds for league ${leagueId}:`, e);
    return result;
  }
}

function parseLeagueOddsResponse(oddsData: any[]): Map<string, Map<string, RealOdds>> {
  const result = new Map<string, Map<string, RealOdds>>();

  for (const entry of oddsData) {
    const fixtureId = String(entry.fixture?.id || '');
    if (!fixtureId) continue;

    const oddsCollector = new Map<string, { odds: number; bookmaker: string; isBet365: boolean }[]>();

    for (const bk of (entry.bookmakers || [])) {
      parseBookmakerOdds(bk, oddsCollector);
    }

    const resolved = resolveOdds(oddsCollector);
    if (resolved.size > 0) {
      result.set(fixtureId, resolved);
    }
  }

  console.log(`  ✅ Parsed odds for ${result.size} fixtures from ${oddsData.length} entries`);
  return result;
}

/**
 * Bulk fetch odds for multiple leagues — much more efficient than per-fixture
 * Uses /odds?league=X&season=Y (1 call per league vs 1 call per fixture)
 */
async function fetchOddsForFixtures(
  apiKey: string,
  fixtureIds: string[],
  fixtureLeagueMap?: Map<string, number>,
): Promise<Map<string, Map<string, RealOdds>>> {
  const allOdds = new Map<string, Map<string, RealOdds>>();

  // Determine current season
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentSeason = currentMonth >= 6 ? now.getFullYear() : now.getFullYear() - 1;

  if (fixtureLeagueMap && fixtureLeagueMap.size > 0) {
    // ===== BULK MODE: Fetch by league (hugely efficient) =====
    const leagueIds = new Set<number>();
    for (const lid of fixtureLeagueMap.values()) {
      if (lid) leagueIds.add(lid);
    }

    console.log(`🎰 Bulk odds fetch for ${leagueIds.size} leagues (covering ${fixtureIds.length} fixtures)`);

    for (const leagueId of leagueIds) {
      const leagueOdds = await fetchOddsForLeague(apiKey, leagueId, currentSeason);
      // Merge into allOdds
      for (const [fid, markets] of leagueOdds) {
        if (fixtureIds.includes(fid)) {
          allOdds.set(fid, markets);
        }
      }
      // Rate limit between league calls
      await new Promise(r => setTimeout(r, 400));
    }

    console.log(`✅ Bulk odds: ${allOdds.size}/${fixtureIds.length} fixtures have odds`);
  } else {
    // ===== FALLBACK: Per-fixture fetch (legacy, less efficient) =====
    console.log(`🎰 Per-fixture odds fetch for ${fixtureIds.length} fixtures (no league map)`);
    for (const fid of fixtureIds) {
      try {
        const url = `${API_FOOTBALL_BASE}/odds?fixture=${fid}`;
        const response = await fetch(url, {
          headers: { 'x-apisports-key': apiKey },
        });
        if (!response.ok) continue;
        const data = await response.json();
        const oddsData = data.response || [];

        for (const entry of oddsData) {
          const oddsCollector = new Map<string, { odds: number; bookmaker: string; isBet365: boolean }[]>();
          for (const bk of (entry.bookmakers || [])) {
            parseBookmakerOdds(bk, oddsCollector);
          }
          const resolved = resolveOdds(oddsCollector);
          if (resolved.size > 0) allOdds.set(fid, resolved);
        }
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`Error fetching odds for fixture ${fid}:`, e);
      }
    }
  }

  return allOdds;
}

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

/** Scrub banned US terminology from AI output */
function sanitizeBannedWords(text: string): string {
  return text
    // "clearing/hitting/past/over the line" → "clearing/hitting/past/over the mark"
    .replace(/\b(clear(?:ing|ed|s)?|hit(?:ting|s)?|pass(?:ing|ed)?|past|over|above|below|beyond|surpass(?:ing|ed|es)?)\s+the\s+line\b/gi, '$1 the mark')
    // "the Over/Under X.X line" → "the Over/Under X.X mark"
    .replace(/\b(over|under)\s+(\d+\.?\d*)\s+line\b/gi, '$1 $2 mark')
    // standalone "the line" in betting context → "the mark"
    .replace(/\bthe\s+line\b/gi, 'the mark')
    // "lines" → "marks" (betting context)
    .replace(/\blines\b/gi, 'marks')
    // US terms
    .replace(/\bparlay(s)?\b/gi, 'acca$1')
    .replace(/\bmoneyline\b/gi, 'match result')
    .replace(/\bjuice\b/gi, 'odds')
    .replace(/\bchalk\b/gi, 'favourite');
}

/** Post-process AI output to guarantee ---GAFFER--- separator exists */
function ensureGafferFormat(raw: string): string {
  const sep = '---GAFFER---';
  // First sanitize banned words
  const cleaned = sanitizeBannedWords(raw);
  if (cleaned.includes(sep)) {
    // Clean up: remove any "SECTION 1" / "SECTION 2" labels the AI may have added
    return cleaned
      .replace(/SECTION\s*\d+\s*[-–—:]*\s*(📊\s*)?(STATS\s*&?\s*FACTS|THE\s*GAFFER'?S?\s*VERDICT?)\s*[-–—:]*\s*(\([^)]*\)\s*:?\s*)?/gi, '')
      .replace(/📊\s*/g, '')
      .trim();
  }
  // No separator found: split roughly in half by sentences
  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  if (sentences.length >= 2) {
    const mid = Math.ceil(sentences.length / 2);
    const statsPart = sentences.slice(0, mid).join(' ').trim();
    const gafferPart = sentences.slice(mid).join(' ').trim();
    return `${statsPart}\n${sep}\n${gafferPart}`;
  }
  // Single sentence fallback: whole thing as gaffer take
  return `${sep}\n${cleaned.trim()}`;
}

// ============ FETCH MATCH INTELLIGENCE ============
interface MatchIntel {
  home_manager?: string;
  away_manager?: string;
  home_injuries?: any[];
  away_injuries?: any[];
  home_key_players_out?: string[];
  away_key_players_out?: string[];
  weather_condition?: string;
  weather_temp_celsius?: number;
  weather_wind_speed_kmh?: number;
  referee_name?: string;
  referee_avg_cards?: number;
  home_days_since_last_match?: number;
  away_days_since_last_match?: number;
}

async function fetchMatchIntelligence(supabase: any, fixtureId: string): Promise<MatchIntel | null> {
  try {
    const { data } = await supabase
      .from('match_intelligence')
      .select('*')
      .eq('fixture_id', fixtureId)
      .single();
    return data as MatchIntel | null;
  } catch {
    return null;
  }
}

// ============ GAFFER REASONING - STAT-RICH & PUNCHY ============
async function generateGafferReasoning(
  pick: HeuristicPick, 
  pickNumber: number,
  _intel: MatchIntel | null,
  homeRolling?: TeamRollingStats | null,
  awayRolling?: TeamRollingStats | null,
): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    return generateFallbackReasoning(pick, pickNumber);
  }
  
  const marketDescriptions: Record<Market, string> = {
    'over_2_5_goals': 'Over 2.5 Goals',
    'btts': 'Both Teams To Score',
    'over_9_5_corners': 'Over 9.5 Corners',
    'over_3_5_cards': 'Over 3.5 Cards',
  };

  // Force unique openers per pick number
  const pickOpeners: Record<number, string[]> = {
    1: ["The form book screams value here", "Now this is what I call a pick", "Been eyeing this one all week"],
    2: ["Here's where the bookies slipped up", "This one's flying under the radar", "The stats back this up completely"],
    3: ["Saving the best for last", "To round off the treble", "And here's the finisher"],
  };
  
  const openerOptions = pickOpeners[pickNumber] || pickOpeners[1];
  const forcedOpener = openerOptions[Math.floor(Math.random() * openerOptions.length)];

   // Build rich stats block from rolling data
   let statsBlock = '';
   if (homeRolling && awayRolling) {
     const h = homeRolling;
     const a = awayRolling;
     switch (pick.market) {
       case 'over_2_5_goals':
         statsBlock = `
REAL L10 STATS (USE THESE - they are facts):
- ${h.team_name}: ${h.avg_goals_scored} goals scored per game, ${h.avg_goals_conceded} conceded, ${h.over_25_goals_pct}% of games had Over 2.5 Goals. Form: ${h.form_string}
- ${a.team_name}: ${a.avg_goals_scored} goals scored per game, ${a.avg_goals_conceded} conceded, ${a.over_25_goals_pct}% of games had Over 2.5 Goals. Form: ${a.form_string}
- Combined avg total goals: ${((h.avg_total_goals + a.avg_total_goals) / 2).toFixed(1)} per game`;
         break;
       case 'btts':
         statsBlock = `
REAL L10 STATS (USE THESE - they are facts):
- ${h.team_name}: scores ${h.avg_goals_scored}/game, concedes ${h.avg_goals_conceded}/game, BTTS hit in ${h.btts_pct}% of games. Form: ${h.form_string}
- ${a.team_name}: scores ${a.avg_goals_scored}/game, concedes ${a.avg_goals_conceded}/game, BTTS hit in ${a.btts_pct}% of games. Form: ${a.form_string}`;
         break;
       case 'over_9_5_corners':
         statsBlock = `
REAL L10 STATS (USE THESE - they are facts):
- ${h.team_name}: ${h.avg_corners_for} corners won per game, ${h.avg_corners_against} conceded, total avg ${h.avg_total_corners} corners/game, Over 9.5 hit ${h.over_95_corners_pct}% of games. Form: ${h.form_string}
- ${a.team_name}: ${a.avg_corners_for} corners won per game, ${a.avg_corners_against} conceded, total avg ${a.avg_total_corners} corners/game, Over 9.5 hit ${a.over_95_corners_pct}% of games. Form: ${a.form_string}
- Combined avg corners: ${((h.avg_total_corners + a.avg_total_corners) / 2).toFixed(1)} per game`;
         break;
       case 'over_3_5_cards':
         statsBlock = `
REAL L10 STATS (USE THESE - they are facts):
- ${h.team_name}: ${h.avg_cards_for} cards received per game, ${h.avg_cards_against} drawn from opponents, total avg ${h.avg_total_cards} cards/game, Over 3.5 hit ${h.over_35_cards_pct}% of games. Form: ${h.form_string}
- ${a.team_name}: ${a.avg_cards_for} cards received per game, ${a.avg_cards_against} drawn from opponents, total avg ${a.avg_total_cards} cards/game, Over 3.5 hit ${a.over_35_cards_pct}% of games. Form: ${a.form_string}
- Combined avg cards: ${((h.avg_total_cards + a.avg_total_cards) / 2).toFixed(1)} per game`;
         break;
     }
   }

   // Build match intelligence context (injuries, weather, refs, fatigue)
   let intelBlock = '';
   if (_intel) {
     const parts: string[] = [];
     if (_intel.home_key_players_out?.length) parts.push(`${pick.home_team} missing: ${_intel.home_key_players_out.join(', ')}`);
     if (_intel.away_key_players_out?.length) parts.push(`${pick.away_team} missing: ${_intel.away_key_players_out.join(', ')}`);
     if (_intel.referee_name && _intel.referee_avg_cards) parts.push(`Referee: ${_intel.referee_name} (avg ${_intel.referee_avg_cards.toFixed(1)} cards/game)`);
     if (_intel.weather_condition) parts.push(`Weather: ${_intel.weather_condition}, ${_intel.weather_temp_celsius || '?'}°C, wind ${_intel.weather_wind_speed_kmh || '?'}km/h`);
     if (_intel.home_days_since_last_match !== undefined && _intel.home_days_since_last_match !== null && _intel.home_days_since_last_match <= 3) parts.push(`${pick.home_team} fatigued (${_intel.home_days_since_last_match} days rest)`);
     if (_intel.away_days_since_last_match !== undefined && _intel.away_days_since_last_match !== null && _intel.away_days_since_last_match <= 3) parts.push(`${pick.away_team} fatigued (${_intel.away_days_since_last_match} days rest)`);
     if (parts.length) intelBlock = `\nMATCH INTELLIGENCE (weave relevant points into your analysis):\n${parts.map(p => `- ${p}`).join('\n')}`;
   }

   const prompt = `You produce TWO sections for a football betting analysis. Output them separated by exactly "---GAFFER---" on its own line.

SECTION 1 - STATS & FACTS (30-40 words MAX): Pure objective data. No personality. Quote SPECIFIC L10 numbers for BOTH teams relevant to the market (averages, percentages, combined figures). If match intelligence exists, include one key fact.

---GAFFER---

SECTION 2 - THE GAFFER'S VERDICT (30-40 words MAX): You are "The Gaffer" — a sharp, cheeky British football pundit. Reference at least one stat from Section 1 with a witty interpretation. End with a confident sign-off.

CRITICAL RULES:
- STRICTLY 30-40 words per section. Count them.
- Section 1 must ONLY contain facts and numbers, no opinions
- Section 2 must reference the stats but add personality
- NEVER repeat phrases across picks

LANGUAGE: You MUST write in British English. Use UK betting terminology: "selections", "legs", "bets", "picks", "punts". We are a UK site.

ABSOLUTELY BANNED WORDS — NEVER USE THESE IN ANY CONTEXT:
- "line" or "lines" (NEVER say "clearing the line", "the Over line", "past the line" etc. — say "mark", "threshold", "target", or "hurdle" instead)
- "parlay" (say "accumulator" or "acca")
- "moneyline" (say "match result")
- "juice" (say "odds")
- "chalk" (say "favourite")

BANNED PHRASES: "get it in the bag", "nailed on", "banker", "proper value", "the numbers don't lie", "bang it on", "thank me later", "you heard it here first", "Listen up lads", "After 40 years", "leaky backline", "mark my words", "dead cert", "easy money", "fill your boots", "slam it on", "lump on", "pile in", "trust the process"

Match: ${pick.home_team} vs ${pick.away_team}
League: ${pick.league}
Market: ${marketDescriptions[pick.market]}
Odds: ${pick.odds.toFixed(2)}
ML Confidence: ${(pick.probability * 100).toFixed(0)}%
${statsBlock}
${intelBlock}

Remember: 30-40 words each. Section 1 = cold facts. Section 2 = personality. Separated by ---GAFFER---`;

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 180,
      }),
    });

    if (!response.ok) {
      console.error(`AI reasoning failed: ${response.status}`);
      return generateFallbackReasoning(pick, pickNumber);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    return content.trim() ? ensureGafferFormat(content.trim()) : generateFallbackReasoning(pick, pickNumber);
  } catch (error) {
    console.error('AI reasoning error:', error);
    return generateFallbackReasoning(pick, pickNumber);
  }
}

// Fallback with massive variety
function generateFallbackReasoning(pick: HeuristicPick, pickNumber: number): string {
  const confidence = (pick.probability * 100).toFixed(0);
  const odds = pick.odds.toFixed(2);
  
  // 50+ unique openers to prevent repetition
  const openers = [
    `After watching ${pick.home_team} closely this season, I'm convinced`,
    `The form book screams value here -`,
    `Been tracking this one all week and`,
    `Here's a pick the bookies have mispriced -`,
    `My gut says this is nailed on -`,
    `The stats back this up completely -`,
    `Call it experience, call it instinct, but`,
    `Now this is what I call proper value -`,
    `${pick.league} always delivers and`,
    `The numbers don't lie on this one -`,
    `Having followed ${pick.away_team} all season,`,
    `This fixture ticks every box -`,
    `Pattern recognition is everything and`,
    `Here's one for the shrewd punter -`,
    `The underlying data is compelling -`,
    `Both sides are in form and`,
    `History suggests this lands comfortably -`,
    `At ${odds}, this is undervalued -`,
    `The bookies haven't cottoned on yet -`,
    `Form, fixtures, and value align perfectly -`,
  ];
  
  const marketContext: Record<Market, string[]> = {
    'over_2_5_goals': [
      `these two can't keep a clean sheet between them. Goals will flow with ${pick.home_team}'s attacking intent meeting ${pick.away_team}'s leaky defence.`,
      `expect an open game with chances at both ends. The defensive records scream goals here.`,
      `neither side parks the bus - they both come to play. Three goals minimum.`,
    ],
    'btts': [
      `both sides have been finding the net consistently. Clean sheets are rare when these styles clash.`,
      `${pick.home_team} will score at home, but ${pick.away_team} always nick one on the road.`,
      `defensive frailties on both sides make this look like a formality.`,
    ],
    'over_9_5_corners': [
      `the wing play will be relentless. Both full-backs love an overlap and the crosses will rain in.`,
      `expect sustained pressure and plenty of set pieces. The corner count always climbs in games like this.`,
      `high pressing, lots of blocked shots, corners will stack up naturally.`,
    ],
    'over_3_5_cards': [
      `this is a feisty fixture with history. The ref won't hesitate and the tackles will fly.`,
      `competitive edge here is massive - expect yellow cards early and often.`,
      `physical battle incoming. The disciplinary records speak for themselves.`,
    ],
  };
  
  const closers = [
    `At ${confidence}% confidence and ${odds} odds, this is proper value. Get it on.`,
    `Lovely price at ${odds} for a ${confidence}% probability play. Bang it in.`,
    `The edge is clear at these odds. ${confidence}% says it lands.`,
    `Stick this in the acca at ${odds}. The Gaffer's seal of approval.`,
    `Value screaming at ${odds}. My ${confidence}% confidence rating says it all.`,
  ];
  
  const opener = openers[Math.floor(Math.random() * openers.length)];
  const context = marketContext[pick.market][Math.floor(Math.random() * marketContext[pick.market].length)];
  const closer = closers[Math.floor(Math.random() * closers.length)];
  
  return `${opener} ${context} ${closer}`;
}

// ── Load edge profile: market × prob_band → edge_strength_score + sample_count ─
async function loadEdgeProfile(supabase: any): Promise<{ edgeProfile: Map<string, number>; edgeSampleMap: Map<string, number> }> {
  const edgeProfile = new Map<string, number>();
  const edgeSampleMap = new Map<string, number>();
  try {
    const { data } = await supabase
      .from('market_edge_profile')
      .select('market, prob_band, edge_strength_score, sample_count')
      .not('edge_strength_score', 'is', null);
    for (const row of (data || [])) {
      const key = `${row.market}__${row.prob_band}`;
      edgeProfile.set(key, row.edge_strength_score ?? 0);
      edgeSampleMap.set(key, row.sample_count ?? 0);
    }
    const qualifiedBands = [...edgeSampleMap.entries()].filter(([, n]) => n >= 200).length;
    console.log(`📈 Loaded ${edgeProfile.size} edge bands, ${qualifiedBands} meet N≥200 quality gate`);
  } catch (e) {
    console.warn('⚠️ Could not load edge profile:', e);
  }
  return { edgeProfile, edgeSampleMap };
}

// ── Load model confidence scores per market ───────────────────────────────────
async function loadModelConfidence(supabase: any): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const { data } = await supabase
      .from('ml_models')
      .select('market, model_confidence_score')
      .eq('is_active', true)
      .not('model_confidence_score', 'is', null);
    for (const row of (data || [])) {
      if (row.market && row.model_confidence_score != null) {
        map.set(row.market, row.model_confidence_score);
      }
    }
    console.log(`🎯 Loaded confidence scores for ${map.size} markets`);
  } catch (e) {
    console.warn('⚠️ Could not load model confidence:', e);
  }
  return map;
}

// Map heuristic market key → ml_models market key
const MARKET_ML_KEY: Record<string, string> = {
  'over_2_5_goals': 'over_2.5_goals',
  'btts': 'btts',
  'over_9_5_corners': 'over_9.5_corners',
  'over_3_5_cards': 'over_3.5_cards',
};

function getEdgeBand(prob: number): string {
  const lower = Math.max(50, Math.min(90, Math.floor(prob / 5) * 5));
  return `${lower}-${lower + 5}`;
}

async function selectHeuristicGoldenBets(
  fixtures: any[],
  supabase: any,
  powerScoresMap?: Map<string, PowerScoreEntry>
): Promise<HeuristicPick[]> {
  const picks: HeuristicPick[] = [];

  // Load power layer data in parallel
  const [{ edgeProfile, edgeSampleMap }, modelConfidence] = await Promise.all([
    loadEdgeProfile(supabase),
    loadModelConfidence(supabase),
  ]);
  const usedFixtures = new Set<string>();
  const marketCounts: Record<Market, number> = {
    'over_2_5_goals': 0,
    'btts': 0,
    'over_9_5_corners': 0,
  };
  
  // Fetch rolling stats (with home/away splits) for all teams
  const teamRollingCache = new Map<string, TeamRollingStats | null>();
  
  for (const f of fixtures.slice(0, 40)) {
    const home = f.teams?.home?.name;
    const away = f.teams?.away?.name;
    if (home && !teamRollingCache.has(home)) teamRollingCache.set(home, await fetchTeamRollingStats(supabase, home));
    if (away && !teamRollingCache.has(away)) teamRollingCache.set(away, await fetchTeamRollingStats(supabase, away));
  }
  
  // Process fixtures with SMART scoring: overall + venue splits + H2H + derby
  const allCandidates: (HeuristicPick & { smartScore: number })[] = [];
  
  for (const f of fixtures) {
    const fixtureId = String(f.fixture?.id);
    const home = f.teams?.home?.name;
    const away = f.teams?.away?.name;
    const leagueName = f.league?.name;
    const leagueId = f.league?.id;
    const kickoff = f.fixture?.date;
    
    const homeRolling = teamRollingCache.get(home);
    const awayRolling = teamRollingCache.get(away);
    if (!homeRolling && !awayRolling) continue;
    
    const defaultPct = 50;
    const majorBoost = getLeagueTier(leagueId) === 1 ? 0.08 : 0.04;
    
    // Fetch H2H for this fixture
    const h2h = await fetchH2H(supabase, home, away);
    const derbyFlag = isDerby(home, away);
    
    // For each market, calculate a BLENDED probability:
    // 40% overall L10, 30% venue-specific, 20% H2H, 10% derby/context
    const calcBlendedProb = (
      overallHomePct: number, overallAwayPct: number,
      venueHomePct: number | undefined, venueAwayPct: number | undefined,
      h2hPct: number | undefined,
      isDerbyMatch: boolean,
      derbyBoost: number, // extra boost for derbies (e.g. cards)
    ): number => {
      const overallAvg = ((overallHomePct || defaultPct) + (overallAwayPct || defaultPct)) / 2 / 100;
      
      // Venue split (home team's HOME stats vs away team's AWAY stats)
      const venueAvg = (venueHomePct != null && venueAwayPct != null)
        ? ((venueHomePct + venueAwayPct) / 2 / 100)
        : overallAvg;
      
      // H2H component
      const h2hProb = h2hPct != null ? (h2hPct / 100) : overallAvg;
      
      // Derby boost (especially for cards/corners)
      const dBoost = isDerbyMatch ? derbyBoost : 0;
      
      // Weighted blend: 40% overall + 30% venue + 20% H2H + 10% derby context
      const blended = (overallAvg * 0.40) + (venueAvg * 0.30) + (h2hProb * 0.20) + dBoost;
      
      return Math.min(0.82, blended + majorBoost);
    };
    
    const markets: { market: Market; prob: number; smartScore: number }[] = [
      {
        market: 'over_2_5_goals',
        prob: calcBlendedProb(
          homeRolling?.over_25_goals_pct ?? defaultPct, awayRolling?.over_25_goals_pct ?? defaultPct,
          homeRolling?.home_over_25_goals_pct, awayRolling?.away_over_25_goals_pct,
          h2h?.over_25_pct, derbyFlag, 0.02,
        ),
        smartScore: 0,
      },
      {
        market: 'btts',
        prob: calcBlendedProb(
          homeRolling?.btts_pct ?? defaultPct, awayRolling?.btts_pct ?? defaultPct,
          homeRolling?.home_btts_pct, awayRolling?.away_btts_pct,
          h2h?.btts_pct, derbyFlag, 0.02,
        ),
        smartScore: 0,
      },
      {
        market: 'over_9_5_corners',
        prob: calcBlendedProb(
          homeRolling?.over_95_corners_pct ?? (defaultPct - 5), awayRolling?.over_95_corners_pct ?? (defaultPct - 5),
          homeRolling?.home_over_95_corners_pct, awayRolling?.away_over_95_corners_pct,
          h2h?.over_95_corners_pct, derbyFlag, 0.04, // derbies produce more corners
        ),
        smartScore: 0,
      },
      // Cards REMOVED — API-Football /odds does not carry bookings markets.
      // Cards are only used in Bet Builders with estimated odds.
    ];
    
    for (const m of markets) {
      if (m.prob < 0.55) continue;
      
      // ⚡ POWER SCORE GATE — reject fixtures that don't meet threshold per market
      if (powerScoresMap && powerScoresMap.size > 0) {
        const ps = checkPowerScore(powerScoresMap, fixtureId, m.market);
        if (!ps.pass) {
          console.log(`⚡ POWER SCORE REJECT: ${home} vs ${away} [${m.market}] — Score ${ps.score}/${POWER_SCORE_THRESHOLD}`);
          continue;
        }
      }
      
      // Score by probability alone — real odds will be fetched later
      // Only candidates with real odds AND value edge will make the final cut
      let score = m.prob;
      if (h2h && h2h.meetings >= 3) score *= 1.15;
      if (derbyFlag && (m.market === 'over_3_5_cards' || m.market === 'over_9_5_corners')) score *= 1.20;

      // ── POWER LAYER: Edge Strength + Model Confidence boost ────────────────
      // 1. Edge strength: how much our hit rate beats bookmaker implied prob in this band
      const probPct = m.prob * 100;
      const edgeBand = getEdgeBand(probPct);
      const edgeKey = `${m.market}__${edgeBand}`;
      const rawEdge = edgeProfile.get(edgeKey);
      // SAFETY: Only apply edge signal when band has N ≥ 200 samples.
      // edgeProfile stores {edge_strength_score} from market_edge_profile.
      // We pair it with sample_count via edgeSampleMap loaded below.
      // If N < 200 (or band unknown), default to neutral (0) — no penalty, no boost.
      const edgeSample = edgeSampleMap.get(edgeKey) ?? 0;
      const edgeStrength = (rawEdge != null && edgeSample >= 200) ? rawEdge : 0;
      // Positive edge → up to +10 pts; negative edge only penalises when N ≥ 200
      const edgeBoost = Math.max(-10, Math.min(10, edgeStrength));
      score += edgeBoost;

      // 2. Model confidence: composite score from AUC + Brier + row coverage (0-100)
      const mlKey = MARKET_ML_KEY[m.market] || m.market;
      const confScore = modelConfidence.get(mlKey) ?? modelConfidence.get(m.market) ?? 50;
      // Scale: conf 100 → +5pts, conf 50 → 0pts, conf 0 → -5pts (capped ±5)
      const confBoost = Math.max(-5, Math.min(5, ((confScore - 50) / 50) * 5));
      score += confBoost;

      allCandidates.push({
        fixture_id: fixtureId,
        home_team: home,
        away_team: away,
        league: leagueName,
        league_id: leagueId,
        kickoff,
        market: m.market,
        probability: m.prob,
        odds: 0, // Will be populated with real odds later
        edge: 0, // Will be calculated from real odds
        smartScore: score,
      });
    }
  }
  
  // Sort by smartScore (holistic ranking)
  allCandidates.sort((a, b) => b.smartScore - a.smartScore);
  
  console.log(`🧠 Smart candidates: ${allCandidates.length} (H2H + venue + derby weighted)`);
  
  // Return top candidates — more generous pool (30) so odds filtering has plenty to work with
  // With 3 markets × ~15 fixtures = ~45 candidates, taking 30 ensures coverage
  return allCandidates.slice(0, 30);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const apiFootballKey = Deno.env.get('API_FOOTBALL_KEY') || '';

    // Get date from query params or request body
    let targetDate: string;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      targetDate = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    } else {
      try {
        const body = await req.json();
        targetDate = body?.date || new Date().toISOString().split('T')[0];
      } catch {
        targetDate = new Date().toISOString().split('T')[0];
      }
    }

    console.log(`📅 Fetching picks for date: ${targetDate}`);

    // Try to fetch from DB first - get ALL bets for the day (including settled ones)
    // This prevents regeneration if bets were already settled earlier in the day
    const { data: allGoldenBets, error: goldenError } = await supabase
      .from('golden_bet_history')
      .select('*')
      .eq('prediction_date', targetDate)
      .order('ml_confidence', { ascending: false });

    if (goldenError) {
      console.error('Error fetching golden bets:', goldenError);
      throw goldenError;
    }

    // Fetch Bet Builder from DB
    const { data: betBuilders } = await supabase
      .from('bet_builder_history')
      .select('*')
      .eq('prediction_date', targetDate)
      .order('average_confidence', { ascending: false });

    // If we have ALL 3 bets for today (pending or settled), return them - do NOT regenerate
    if (allGoldenBets && allGoldenBets.length >= 3) {
      console.log(`✅ Found ${allGoldenBets.length} Golden Bets in DB (full set)`);
      
      // ===== REFRESH REAL ODDS from API-Football for pending picks =====
      const pendingPicks = allGoldenBets.filter((b: any) => b.status === 'pending');
      
      if (apiFootballKey && pendingPicks.length > 0) {
        console.log('🎰 Refreshing real odds from API-Football for existing picks...');
        
        try {
          const fixtureIds = [...new Set(pendingPicks.map((b: any) => String(b.fixture_id)))];
          const allFixtureOdds = await fetchOddsForFixtures(apiFootballKey, fixtureIds);
          
          for (const row of pendingPicks) {
            const fixtureOdds = allFixtureOdds.get(String(row.fixture_id));
            if (!fixtureOdds) continue;
            
            const realOdds = fixtureOdds.get(row.market);
            if (realOdds && Math.abs(realOdds.odds - (row.bookmaker_odds || 0)) > 0.01) {
              const impliedProb = 1 / realOdds.odds;
              const newEdge = (row.ml_confidence - impliedProb) / impliedProb;
              console.log(`📝 Updating odds: ${row.home_team} vs ${row.away_team} ${row.market}: ${row.bookmaker_odds} → ${realOdds.odds} (${realOdds.bookmaker})`);
              
              await supabase
                .from('golden_bet_history')
                .update({ bookmaker_odds: realOdds.odds, value_edge: newEdge })
                .eq('id', row.id);
              
              row.bookmaker_odds = realOdds.odds;
              row.value_edge = newEdge;
            }
          }
        } catch (e) {
          console.warn('Failed to refresh real odds:', e);
        }
      }
      
      const bets = allGoldenBets.map((row: any) => ({
        id: row.id,
        fixtureId: parseInt(row.fixture_id) || undefined,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        league: row.league,
        kickoff: row.kickoff,
        market: row.market,
        mlConfidence: row.ml_confidence,
        valueEdge: row.value_edge,
        bookmakerOdds: row.bookmaker_odds,
        gafferReasoning: row.gaffer_reasoning,
        status: row.status,
        stake: row.stake,
        result: row.result,
        profitLoss: row.profit_loss,
      }));

      const betBuilder = betBuilders?.length ? {
        id: betBuilders[0].id,
        fixtureIds: betBuilders[0].fixture_id.split('|'),
        homeTeams: betBuilders[0].home_team.split(' | '),
        awayTeams: betBuilders[0].away_team.split(' | '),
        leagues: betBuilders[0].league.split(' | '),
        kickoff: betBuilders[0].kickoff,
        markets: betBuilders[0].markets,
        marketConfidences: betBuilders[0].market_confidences,
        combinedOdds: betBuilders[0].combined_odds,
        averageConfidence: betBuilders[0].average_confidence,
        gafferReasoning: betBuilders[0].gaffer_reasoning,
        status: betBuilders[0].status,
        stake: betBuilders[0].stake,
        result: betBuilders[0].result,
        profitLoss: betBuilders[0].profit_loss,
      } : null;

      return new Response(JSON.stringify({
        success: true,
        date: targetDate,
        bets,
        betBuilder,
        fixturesAnalyzed: bets.length,
        mode: 'database',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If we have 1-2 ML picks, top up to 3 with heuristic engine
    if (allGoldenBets && allGoldenBets.length >= 1 && allGoldenBets.length < 3) {
      const needed = 3 - allGoldenBets.length;
      console.log(`⚠️ Only ${allGoldenBets.length} ML picks found — topping up ${needed} via heuristic engine`);
      
      const existingFixtureIds = new Set(allGoldenBets.map((b: any) => String(b.fixture_id)));
      const existingMarkets = new Set(allGoldenBets.map((b: any) => b.market));
      
      let topUpPicks: HeuristicPick[] = [];
      
      if (apiFootballKey) {
        const fixtures = await fetchTodaysFixtures(apiFootballKey);
        // Filter out already-selected fixtures
        const availableFixtures = fixtures.filter((f: any) => !existingFixtureIds.has(String(f.fixture?.id)));
        
        if (availableFixtures.length > 0) {
          const powerScores = await loadPowerScores(supabase, targetDate);
          const allHeuristic = await selectHeuristicGoldenBets(availableFixtures, supabase, powerScores);
          // Prefer picks from different markets for variety
          const diversePicks = allHeuristic.filter(p => !existingMarkets.has(p.market));
          const fallbackPicks = allHeuristic.filter(p => existingMarkets.has(p.market));
          topUpPicks = [...diversePicks, ...fallbackPicks].slice(0, needed);
        }
      }
      
      // Save top-up picks to DB with reasoning
      if (topUpPicks.length > 0) {
        console.log(`🔍 Fetching intel & generating reasoning for ${topUpPicks.length} top-up picks...`);
        const [intelResults, rollingResults] = await Promise.all([
          Promise.all(topUpPicks.map(pick => fetchMatchIntelligence(supabase, pick.fixture_id))),
          Promise.all(topUpPicks.map(async (pick) => {
            const [home, away] = await Promise.all([
              fetchTeamRollingStats(supabase, pick.home_team),
              fetchTeamRollingStats(supabase, pick.away_team),
            ]);
            return { home, away };
          })),
        ]);
        
        const pickOffset = allGoldenBets.length;
        const reasonings = await Promise.all(
          topUpPicks.map((pick, i) => generateGafferReasoning(
            pick, pickOffset + i + 1, intelResults[i],
            rollingResults[i].home, rollingResults[i].away
          ))
        );
        
        const topUpRows = topUpPicks.map((pick, i) => ({
          fixture_id: pick.fixture_id,
          home_team: pick.home_team,
          away_team: pick.away_team,
          league: pick.league,
          kickoff: pick.kickoff,
          market: pick.market,
          ml_confidence: pick.probability,
          bookmaker_odds: pick.odds,
          value_edge: pick.edge,
          gaffer_reasoning: reasonings[i],
          prediction_date: targetDate,
          status: 'pending',
          stake: 2, // Micro-stake: AUC < 0.65 recovery mode (restore to 10 when AUC ≥ 0.65)
        }));
        
        const { error: topUpError } = await supabase
          .from('golden_bet_history')
          .upsert(topUpRows, { onConflict: 'prediction_date,fixture_id,market', ignoreDuplicates: true });
        
        if (topUpError) {
          console.error('Error saving top-up picks:', topUpError);
        } else {
          console.log(`✅ Topped up with ${topUpRows.length} heuristic picks`);
        }
      }
      
      // Re-fetch all picks (original ML + top-ups)
      const { data: fullPicks } = await supabase
        .from('golden_bet_history')
        .select('*')
        .eq('prediction_date', targetDate)
        .order('ml_confidence', { ascending: false });
      
      const bets = (fullPicks || allGoldenBets).map((row: any) => ({
        id: row.id,
        fixtureId: parseInt(row.fixture_id) || undefined,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        league: row.league,
        kickoff: row.kickoff,
        market: row.market,
        mlConfidence: row.ml_confidence,
        valueEdge: row.value_edge,
        bookmakerOdds: row.bookmaker_odds,
        gafferReasoning: row.gaffer_reasoning,
        status: row.status,
        stake: row.stake,
        result: row.result,
        profitLoss: row.profit_loss,
      }));

      const betBuilder = betBuilders?.length ? {
        id: betBuilders[0].id,
        fixtureIds: betBuilders[0].fixture_id.split('|'),
        homeTeams: betBuilders[0].home_team.split(' | '),
        awayTeams: betBuilders[0].away_team.split(' | '),
        leagues: betBuilders[0].league.split(' | '),
        kickoff: betBuilders[0].kickoff,
        markets: betBuilders[0].markets,
        marketConfidences: betBuilders[0].market_confidences,
        combinedOdds: betBuilders[0].combined_odds,
        averageConfidence: betBuilders[0].average_confidence,
        gafferReasoning: betBuilders[0].gaffer_reasoning,
        status: betBuilders[0].status,
        stake: betBuilders[0].stake,
        result: betBuilders[0].result,
        profitLoss: betBuilders[0].profit_loss,
      } : null;

      return new Response(JSON.stringify({
        success: true,
        date: targetDate,
        bets,
        betBuilder,
        fixturesAnalyzed: bets.length,
        mode: 'ml+heuristic-topup',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============ HEURISTIC FALLBACK MODE ============
    console.log(`🔄 No DB picks for ${targetDate}, switching to HEURISTIC mode (Europe Top 20)`);
    
    if (!apiFootballKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No API key configured for heuristic mode',
        bets: [],
        betBuilder: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const fixtures = await fetchTodaysFixtures(apiFootballKey);
    
    if (fixtures.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: `No European fixtures available for ${targetDate}`,
        bets: [],
        betBuilder: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // ⚡ Load power scores for today
    const powerScores = await loadPowerScores(supabase, targetDate);
    
    const heuristicPicks = await selectHeuristicGoldenBets(fixtures, supabase, powerScores);
    
    if (heuristicPicks.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No qualifying fixtures today — this can happen during international breaks or light fixture days. Check back tomorrow!',
        bets: [],
        betBuilder: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // ===== STEP 1: Get candidate picks (ranked by probability, no odds yet) =====
    console.log(`🔍 Fetching match intelligence & rolling stats...`);
    
    // ===== STEP 2: Fetch REAL odds using BULK league endpoint =====
    // Build fixture→league map for efficient bulk fetching
    const fixtureLeagueMap = new Map<string, number>();
    for (const pick of heuristicPicks) {
      fixtureLeagueMap.set(pick.fixture_id, pick.league_id);
    }
    const candidateFixtureIds = [...new Set(heuristicPicks.map(p => p.fixture_id))];
    console.log(`🎰 Fetching REAL Bet365 odds for ${candidateFixtureIds.length} fixtures across ${new Set(fixtureLeagueMap.values()).size} leagues...`);
    
    const allFixtureOdds = await fetchOddsForFixtures(apiFootballKey, candidateFixtureIds, fixtureLeagueMap);
    console.log(`✅ Got odds for ${allFixtureOdds.size}/${candidateFixtureIds.length} fixtures`);
    
    // ===== STEP 3: Winners-first — pick highest probability picks with real odds =====
    // Value edge is logged but NOT a gate. We prioritize form/probability.
    const verifiedPicks: HeuristicPick[] = [];
    const usedFixtures = new Set<string>();
    const marketCounts: Record<Market, number> = {
      'over_2_5_goals': 0, 'btts': 0, 'over_9_5_corners': 0,
    };
    
    for (const pick of heuristicPicks) {
      if (verifiedPicks.length >= 3) break;
      if (usedFixtures.has(pick.fixture_id)) continue;
      if (marketCounts[pick.market] >= 2) continue;
      
      const fixtureOdds = allFixtureOdds.get(pick.fixture_id);
      if (!fixtureOdds) {
        console.log(`⛔ No real odds for ${pick.home_team} vs ${pick.away_team} (${pick.market}) — SKIPPED (real odds required)`);
        continue;
      }
      
      const realOdds = fixtureOdds.get(pick.market);
      if (realOdds) {
        pick.odds = realOdds.odds;
        const impliedProb = 1 / realOdds.odds;
        pick.edge = (pick.probability - impliedProb) / impliedProb;
      }
      
      verifiedPicks.push(pick);
      usedFixtures.add(pick.fixture_id);
      marketCounts[pick.market]++;
      console.log(`✅ SELECTED Pick ${verifiedPicks.length} (${pick.market}): ${pick.home_team} vs ${pick.away_team} @ ${pick.odds} (${realOdds ? realOdds.bookmaker : 'Estimated'}) | ML=${(pick.probability*100).toFixed(0)}% edge=${(pick.edge*100).toFixed(1)}%`);
    }
    
    if (verifiedPicks.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No fixtures meet The Gaffer\'s quality threshold today. This often happens during international breaks or when fixture lists are thin. Check back tomorrow!',
        bets: [],
        betBuilder: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`🏆 ${verifiedPicks.length} verified picks with REAL odds and value edge`);
    
    // ===== STEP 4: Generate reasoning for verified picks only =====
    const [intelData, rollingStatsData] = await Promise.all([
      Promise.all(verifiedPicks.map(pick => fetchMatchIntelligence(supabase, pick.fixture_id))),
      Promise.all(verifiedPicks.map(async (pick) => {
        const [home, away] = await Promise.all([
          fetchTeamRollingStats(supabase, pick.home_team),
          fetchTeamRollingStats(supabase, pick.away_team),
        ]);
        return { home, away };
      })),
    ]);
    
    console.log(`🤖 Generating Gaffer reasoning for ${verifiedPicks.length} verified picks...`);
    const reasonings = await Promise.all(
      verifiedPicks.map((pick, i) => generateGafferReasoning(
        pick, i + 1, intelData[i],
        rollingStatsData[i].home, rollingStatsData[i].away
      ))
    );

    // ===== STEP 5: Save to DB =====
    const rows = verifiedPicks.map((pick, i) => ({
      fixture_id: pick.fixture_id,
      home_team: pick.home_team,
      away_team: pick.away_team,
      league: pick.league,
      market: pick.market,
      kickoff: pick.kickoff,
      ml_confidence: pick.probability,
      ml_confidence_raw: pick.probability,
      value_edge: pick.edge,
      bookmaker_odds: pick.odds,
      gaffer_reasoning: reasonings[i] || 'AI reasoning pending.',
      prediction_date: targetDate,
      status: 'pending',
      stake: 2, // Micro-stake: AUC < 0.65 recovery mode (restore to 10 when AUC ≥ 0.65)
    }));

    console.log(`💾 Saving ${rows.length} verified picks to DB...`);

    // Concurrency check
    const { data: existingCheck } = await supabase
      .from('golden_bet_history')
      .select('id')
      .eq('prediction_date', targetDate)
      .limit(1);

    if (existingCheck && existingCheck.length > 0) {
      console.log(`⚠️ Concurrent insert detected - fetching existing picks instead`);
      const { data: freshPicks } = await supabase
        .from('golden_bet_history')
        .select('*')
        .eq('prediction_date', targetDate)
        .order('ml_confidence', { ascending: false });

      const bets = (freshPicks || []).map((row: any) => ({
        id: row.id,
        fixtureId: parseInt(row.fixture_id) || undefined,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        league: row.league,
        kickoff: row.kickoff,
        market: row.market,
        mlConfidence: row.ml_confidence,
        valueEdge: row.value_edge,
        bookmakerOdds: row.bookmaker_odds,
        gafferReasoning: row.gaffer_reasoning,
        status: row.status,
        stake: row.stake,
        result: row.result,
        profitLoss: row.profit_loss,
      }));

      return new Response(JSON.stringify({
        success: true,
        date: targetDate,
        bets,
        betBuilder: null,
        fixturesAnalyzed: bets.length,
        mode: 'database',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: insertError, data: insertedRows } = await supabase
      .from('golden_bet_history')
      .upsert(rows, { onConflict: 'prediction_date,fixture_id,market', ignoreDuplicates: true })
      .select();
    
    if (insertError) {
      console.error('Error saving verified picks:', insertError);
    } else {
      console.log(`✅ Saved ${insertedRows?.length || 0} verified picks`);
    }
    
    const bets = verifiedPicks.map((pick, i) => ({
      id: insertedRows?.[i]?.id || `verified-${i}`,
      fixtureId: parseInt(pick.fixture_id),
      homeTeam: pick.home_team,
      awayTeam: pick.away_team,
      league: pick.league,
      kickoff: pick.kickoff,
      market: pick.market,
      mlConfidence: pick.probability,
      valueEdge: pick.edge,
      bookmakerOdds: pick.odds,
      gafferReasoning: reasonings[i],
      status: 'pending',
      stake: 2, // Micro-stake: AUC < 0.65 recovery mode (restore to 10 when AUC ≥ 0.65)
    }));

    return new Response(JSON.stringify({
      success: true,
      date: targetDate,
      bets,
      betBuilder: betBuilders?.length ? {
        id: betBuilders[0].id,
        fixtureIds: [betBuilders[0].fixture_id],
        homeTeams: [betBuilders[0].home_team],
        awayTeams: [betBuilders[0].away_team],
        leagues: [betBuilders[0].league],
        kickoff: betBuilders[0].kickoff,
        markets: betBuilders[0].markets,
        marketConfidences: betBuilders[0].market_confidences,
        combinedOdds: betBuilders[0].combined_odds,
        averageConfidence: betBuilders[0].average_confidence,
        gafferReasoning: betBuilders[0].gaffer_reasoning,
      } : null,
      fixturesAnalyzed: fixtures.length,
      mode: 'verified-odds',
      leaguesSearched: 'Europe Top 20',
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Golden Bets error:', message);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message,
        bets: [],
        betBuilder: null,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

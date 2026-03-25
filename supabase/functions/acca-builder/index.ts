import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Odds API removed — using API-Football bulk odds (unified with golden-bets)
const API_FOOTBALL_BASE_ACCA = 'https://v3.football.api-sports.io';

// ====== TIERED LEAGUE SYSTEM ======
// TIER 1: Top 30 leagues worldwide — try these FIRST
const TIER_1_LEAGUES = [
  // Top 5 European + UEFA
  'premier league', 'la liga', 'bundesliga', 'ligue 1', 'serie a',
  'champions league', 'europa league', 'conference league',
  // Strong European
  'championship', 'league one', 'league two',
  'eredivisie', 'primeira liga', 'super lig',
  'scottish premiership', 'jupiler', 'belgian pro league',
  'austrian bundesliga', 'danish superliga',
  '2. bundesliga', 'serie b', 'ligue 2', 'la liga 2', 'segunda',
  // Top non-European
  'mls', 'liga mx', 'brasileirao', 'argentine primera',
  'j1 league', 'saudi pro league', 'k league',
  'a-league',
];

// TIER 2: Secondary professional leagues — fallback only if Tier 1 < 3 legs
const TIER_2_LEAGUES = [
  'ekstraklasa', 'czech first league', 'slovak super liga',
  'greek super league', 'super league greece',
  'allsvenskan', 'eliteserien', 'swiss super league',
  'romanian liga', 'croatian', 'serbian super', 'bulgarian first',
  'hungarian', 'ukrainian premier', 'russian premier',
  'colombian primera', 'chilean primera', 'uruguayan primera',
  'ecuadorian', 'peruvian primera', 'qatari', 'uae pro',
  'indian super league', 'thai league', 'k league 2', 'j2 league',
  'eerste divisie', 'liga portugal 2',
  // Cups (top tier only)
  'dfb pokal', 'fa cup', 'copa del rey', 'coupe de france', 'coppa italia',
  'carabao cup', 'efl cup',
];

// HARD BLOCK: These patterns = NEVER select, regardless of tier
const HARD_BLOCKED_LEAGUE_PATTERNS = [
  /non.?league/i, /isthmian/i, /southern league/i, /northern league/i,
  /northern premier/i, /southern premier/i, /vanarama/i, /national league/i,
  /highland league/i, /lowland league/i,
  /regional/i, /oberliga/i, /3\.\s*lig/i, /tercera/i, /amateur/i,
  /campeonato de portugal/i, /derde divisie/i, /gamma ethniki/i,
  /serie [c-d]/i, /primera división rfef/i, /segunda división rfef/i,
  /4th division/i, /5th division/i, /6th division/i,
  /county/i, /parish/i, /sunday/i,
  // Continental Asian/African cups — most bookies don't list these
  /afc champions/i, /afc cup/i, /caf champions/i, /caf confederation/i,
];

// Patterns that indicate NON-European leagues
const NON_EUROPEAN_PATTERNS = [
  /serie a.*brazil/i, /brasileir/i, /campeonato brasileiro/i,
  /serie a.*argentin/i, /serie a.*colomb/i, /serie a.*ecuad/i,
  /super league.*chin/i, /super league.*india/i, /super league.*saudi/i,
];

// Countries whose leagues share European league names but are NOT European
const NON_EUROPEAN_COUNTRIES = new Set([
  'uganda', 'kenya', 'south-africa', 'south africa', 'nigeria', 'ghana', 'tanzania',
  'cameroon', 'egypt', 'morocco', 'tunisia', 'algeria', 'senegal', 'ivory-coast',
  'ivory coast', 'ethiopia', 'zambia', 'zimbabwe', 'mozambique', 'angola', 'mali',
  'guinea', 'gambia', 'congo', 'congo-dr', 'dr-congo', 'democratic republic of congo',
  'burkina-faso', 'burkina faso', 'benin', 'togo', 'niger', 'chad', 'gabon',
  'equatorial-guinea', 'equatorial guinea', 'mauritania', 'sierra-leone', 'sierra leone',
  'liberia', 'madagascar', 'malawi', 'rwanda', 'burundi', 'botswana', 'namibia',
  'lesotho', 'swaziland', 'eswatini', 'cape-verde', 'cape verde', 'comoros', 'djibouti',
  'eritrea', 'somalia', 'south-sudan', 'south sudan', 'sudan', 'libya',
  'india', 'china', 'thailand', 'vietnam', 'indonesia', 'malaysia', 'singapore',
  'japan', 'south-korea', 'south korea', 'australia', 'new-zealand', 'new zealand',
  'saudi-arabia', 'saudi arabia', 'qatar', 'uae', 'united arab emirates', 'bahrain', 'oman',
  'usa', 'united states', 'canada', 'mexico', 'brazil', 'argentina', 'colombia',
  'chile', 'peru', 'ecuador', 'paraguay', 'uruguay', 'bolivia', 'venezuela',
  'costa-rica', 'costa rica', 'honduras', 'el-salvador', 'el salvador', 'guatemala', 'panama',
  'jamaica', 'trinidad-and-tobago', 'trinidad and tobago',
  'iran', 'iraq', 'jordan', 'kuwait', 'lebanon', 'palestine', 'syria', 'yemen',
  'uzbekistan', 'kazakhstan', 'kyrgyzstan', 'tajikistan', 'turkmenistan',
  'myanmar', 'cambodia', 'laos', 'philippines', 'bangladesh', 'nepal', 'sri-lanka', 'sri lanka',
]);

// Known Brazilian / South American team names to disambiguate bare "Serie A"
const SOUTH_AMERICAN_TEAMS = new Set([
  'flamengo', 'palmeiras', 'corinthians', 'são paulo', 'sao paulo', 'santos',
  'fluminense', 'botafogo', 'vasco', 'gremio', 'grêmio', 'internacional',
  'atletico mineiro', 'atlético mineiro', 'cruzeiro', 'fortaleza', 'bahia',
  'athletico paranaense', 'athletico-pr', 'sport recife', 'ceara', 'ceará',
  'goias', 'goiás', 'coritiba', 'cuiaba', 'cuiabá', 'america mineiro',
  'bragantino', 'rb bragantino', 'juventude', 'chapecoense', 'chapecoense-sc',
  'mirassol', 'novorizontino', 'ponte preta', 'guarani', 'avaí', 'avai',
  'criciuma', 'criciúma', 'operario', 'operário', 'vila nova', 'sport',
  'boca juniors', 'river plate', 'racing club', 'independiente', 'san lorenzo',
  'estudiantes', 'velez sarsfield', 'talleres', 'godoy cruz', 'argentinos juniors',
  'lanus', 'defensa y justicia', 'banfield', 'rosario central', 'newells',
  'penarol', 'nacional', 'cerro porteno', 'olimpia', 'libertad',
  'liga de quito', 'barcelona sc', 'emelec', 'deportivo cali', 'millonarios',
  'atletico nacional', 'junior barranquilla', 'alianza lima', 'sporting cristal',
  'universitario', 'colo colo', 'universidad de chile', 'universidad catolica',
]);

function isSouthAmericanTeam(teamName: string): boolean {
  const lower = teamName.toLowerCase().trim();
  if (SOUTH_AMERICAN_TEAMS.has(lower)) return true;
  for (const sa of SOUTH_AMERICAN_TEAMS) {
    if (lower.includes(sa) || sa.includes(lower)) return true;
  }
  return false;
}

function isEuropeanLeague(leagueName: string, homeTeam?: string, awayTeam?: string, leagueCountry?: string): boolean {
  const lower = leagueName.toLowerCase().trim();
  // If we know the country and it's non-European, reject immediately
  if (leagueCountry && NON_EUROPEAN_COUNTRIES.has(leagueCountry.toLowerCase().trim())) return false;
  if (NON_EUROPEAN_PATTERNS.some(p => p.test(lower))) return false;
  if (lower === 'serie a' || lower === 'super league') {
    if (homeTeam && isSouthAmericanTeam(homeTeam)) return false;
    if (awayTeam && isSouthAmericanTeam(awayTeam)) return false;
    return true;
  }
  // "Premier League" — ONLY accept if country is explicitly England
  // Malta, Georgia, Belarus etc. all have "Premier League" but must be blocked
  if (lower === 'premier league') {
    if (!leagueCountry) return false; // No country context = reject to be safe
    const countryLower = leagueCountry.toLowerCase().trim();
    if (countryLower !== 'england') return false;
  }

  // Block small/minor European nation league names that share tier-1 names
  const MINOR_EUROPEAN_LEAGUE_COUNTRIES = new Set([
    'malta', 'gibraltar', 'andorra', 'san marino', 'liechtenstein',
    'faroe islands', 'luxembourg', 'moldova', 'armenia', 'georgia',
    'azerbaijan', 'belarus', 'northern ireland', 'wales', 'republic of ireland',
    'latvia', 'lithuania', 'estonia', 'kosovo', 'north macedonia',
    'albania', 'bosnia', 'montenegro', 'cyprus',
  ]);
  if (leagueCountry && MINOR_EUROPEAN_LEAGUE_COUNTRIES.has(leagueCountry.toLowerCase().trim())) {
    // Only allow UEFA competitions for these countries
    const isUefaComp = lower.includes('champions league') || lower.includes('europa league') || lower.includes('conference league');
    if (!isUefaComp) return false;
  }
  if (lower === 'serie a italy' || lower === 'italian serie a') return true;
  if (lower.includes('super league switzerland') || lower === 'swiss super league') return true;
  return TIER_1_LEAGUES.some(wl => lower.includes(wl)) || TIER_2_LEAGUES.some(wl => lower.includes(wl));
}

interface BookmakerInfo {
  key: string;
  title: string;
}

interface RegionalStat {
  id: string;
  team_id: number;
  team_name: string;
  league_name: string;
  region: string;
  category: string;
  market: string;
  success_percent: number;
  avg_per_game: number;
  matches_sampled: number;
}

interface TodaysFixture {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  league_country?: string;
  kickoff: string;
}

interface AccaSelection {
  teamName: string;
  league: string;
  market: string;
  marketLabel: string;
  successPercent: number;
  teamSuccessPercent?: number;
  teamRank?: number;
  opposition: string;
  oppositionStats: number | null;
  oppositionRank?: number;
  kickoff: string;
  isHome: boolean;
  fixtureId?: string;
  gafferComment?: string;
  legOdds?: number;
  legBookmaker?: BookmakerInfo;
}

// FIXED 3-LEG ACCA: One leg per market — lower risk, lower odds treble
const ALL_MARKETS = [
  { category: 'goals', market: 'over_1_5' },
  { category: 'corners', market: 'over_8_5' },
  { category: 'cards', market: 'over_3_5' },
];

const MARKET_LABELS: Record<string, string> = {
  'goals:over_1_5': 'Over 1.5 Goals',
  'corners:over_8_5': 'Over 8.5 Corners',
  'cards:over_3_5': 'Over 3.5 Cards',
};

// No fallback odds — all selections MUST have verified real bookmaker odds

// Market difficulty - higher = harder = more value
const MARKET_DIFFICULTY: Record<string, number> = {
  'goals:over_1_5': 1,
  'corners:over_8_5': 2,
  'cards:over_3_5': 3,
};

const MIN_SUCCESS_PERCENT = 50;
const MIN_OPPOSITION_STATS = 20;
const DEFAULT_OPPOSITION_STATS = 50;
const MAX_RANK_THRESHOLD = 100;
const REQUESTED_LEGS = 3; // Exactly 3 legs — one per market
const MIN_LEGS = 3; // All 3 must be filled
const MIN_LEG_ODDS = 1.10; // Lower threshold for lower-risk markets
const MAX_LEG_ODDS = 2.50;

// Minimum COMBINED rolling averages per market — if the fixture average is below these,
// the selection is rejected regardless of form table success percent.
const MIN_ROLLING_AVG: Record<string, { field: string; threshold: number; direction: 'above' | 'below' }> = {
  'goals:over_1_5': { field: 'avg_total_goals', threshold: 1.6, direction: 'above' },
  'corners:over_8_5': { field: 'avg_total_corners', threshold: 8.5, direction: 'above' },
  'cards:over_3_5': { field: 'avg_total_cards', threshold: 3.2, direction: 'above' },
};

const EXCLUDED_LEAGUE_PATTERNS = [
  /women/i, /woman/i, /femenina/i, /féminine/i, /feminin/i, /frauen/i,
  /vrouwen/i, /damer/i, /damas/i, /feminine/i, /feminino/i,
  /\bW\b/, /\bWSL\b/i, /\bNWSL\b/i, /\bFAWC\b/i, /\bUWCL\b/i,
  /ladies/i, /female/i, /girl/i,
  /u\s?15/i, /u\s?16/i, /u\s?17/i, /u\s?18/i, /u\s?19/i, /u\s?20/i, /u\s?21/i, /u\s?23/i,
  /under\s?\d+/i, /youth/i, /junior/i, /academy/i, /reserve/i,
  /\bII\b/, /\bIII\b/, /\bB\b$/, /development/i, /premier league 2/i, /efl trophy/i, /pl2/i,
  /friendly/i, /friendlies/i,
];

function isExcludedLeague(name: string): boolean {
  if (EXCLUDED_LEAGUE_PATTERNS.some(p => p.test(name))) return true;
  if (HARD_BLOCKED_LEAGUE_PATTERNS.some(p => p.test(name))) return true;
  return false;
}

function isExcludedTeam(name: string): boolean {
  return EXCLUDED_LEAGUE_PATTERNS.some(p => p.test(name));
}

// League names that are ambiguous without country context
const AMBIGUOUS_LEAGUE_NAMES = new Set([
  'premier league', 'ligue 1', 'ligue 2', 'serie a', 'serie b',
  'super league', 'first division', 'segunda', 'primera',
]);

// Countries whose "Premier League" / "Ligue 1" / "Serie A" are Tier 1
const TIER1_COUNTRY_LEAGUES: Record<string, string[]> = {
  'england': ['premier league', 'championship', 'league one', 'league two'],
  'spain': ['la liga', 'la liga 2', 'segunda'],
  'germany': ['bundesliga', '2. bundesliga'],
  'italy': ['serie a', 'serie b'],
  'france': ['ligue 1', 'ligue 2'],
  'portugal': ['primeira liga'],
  'netherlands': ['eredivisie'],
  'turkey': ['super lig', 'süper lig'],
  'scotland': ['scottish premiership'],
  'belgium': ['jupiler', 'belgian pro league'],
  'usa': ['mls'],
  'mexico': ['liga mx'],
  'brazil': ['brasileirao', 'brasileirão'],
  'argentina': ['argentine primera', 'primera división'],
  'japan': ['j1 league'],
  'saudi arabia': ['saudi pro league'],
  'south korea': ['k league'],
  'australia': ['a-league'],
};

function getLeagueTier(leagueName: string, leagueCountry?: string): 1 | 2 | 3 {
  const lower = leagueName.toLowerCase().trim();
  // Hard blocked = tier 3 (never use)
  if (HARD_BLOCKED_LEAGUE_PATTERNS.some(p => p.test(lower))) return 3;
  if (EXCLUDED_LEAGUE_PATTERNS.some(p => p.test(lower))) return 3;
  
  const countryLower = leagueCountry?.toLowerCase().trim() || '';
  
  // Check country for non-European disambiguation
  if (countryLower && NON_EUROPEAN_COUNTRIES.has(countryLower)) {
    // Only allow specific non-European Tier 1 leagues
    const countryLeagues = TIER1_COUNTRY_LEAGUES[countryLower];
    if (countryLeagues && countryLeagues.some(cl => lower.includes(cl))) return 1;
    if (TIER_2_LEAGUES.some(t2 => lower.includes(t2))) return 2;
    return 3; // Unknown non-European league = block
  }
  
  // Ambiguous league names without country context = block (could be African/Asian)
  if (!countryLower && AMBIGUOUS_LEAGUE_NAMES.has(lower)) return 3;
  
  // UEFA competitions are always Tier 1 (but NOT AFC Champions League — most bookies don't list it)
  if ((lower.includes('champions league') || lower.includes('europa league') || lower.includes('conference league')) && !lower.includes('afc')) return 1;
  
  // Known Tier 1 country match
  if (countryLower) {
    const countryLeagues = TIER1_COUNTRY_LEAGUES[countryLower];
    if (countryLeagues && countryLeagues.some(cl => lower.includes(cl))) return 1;
  }
  
  if (TIER_1_LEAGUES.some(t1 => lower.includes(t1))) return 1;
  if (TIER_2_LEAGUES.some(t2 => lower.includes(t2))) return 2;
  // European whitelist check (Serie A disambiguation etc.)
  if (isEuropeanLeague(lower, undefined, undefined, leagueCountry)) return 2;
  return 3; // Unknown league = block
}

const makeMarketKey = (category: string, market: string) => `${category}:${market}`;

// ============ API-FOOTBALL BULK ODDS (UNIFIED) ============
const BET365_ID_ACCA = 6;
const BET365_NAME_ACCA = 'bet365';

interface RealOddsAcca {
  odds: number;
  bookmaker: string;
  market: string;
}

function medianAcca(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function parseBookmakerOddsAcca(
  bk: any,
  oddsCollector: Map<string, { odds: number; bookmaker: string; isBet365: boolean }[]>
) {
  const bookmakerName = bk.name || 'Unknown';
  const isBet365 = bookmakerName.toLowerCase().includes(BET365_NAME_ACCA) || bk.id === BET365_ID_ACCA;

  for (const bet of (bk.bets || [])) {
    const betName = (bet.name || '').toLowerCase();
    for (const val of (bet.values || [])) {
      const label = String(val.value || '').toLowerCase();
      const odds = parseFloat(val.odd);
      if (!odds || odds <= 0) continue;

      let marketKey = '';
      // Goals lines (Over)
      if (label === 'over 1.5' && !betName.includes('corner') && !betName.includes('card')) marketKey = 'goals:over_1_5';
      else if (label === 'over 2.5' && !betName.includes('corner') && !betName.includes('card')) marketKey = 'goals:over_2_5';
      // Goals lines (Under)
      else if (label === 'under 2.5' && !betName.includes('corner') && !betName.includes('card')) marketKey = 'goals:under_2_5';
      // Corners (Over)
      else if ((label === 'over 8.5' || label === 'over 8' || label === 'over 9') && betName.includes('corner')) marketKey = 'corners:over_8_5';
      // Corners (Under)
      else if ((label === 'under 9.5' || label === 'under 9' || label === 'under 10') && betName.includes('corner')) marketKey = 'corners:under_9_5';
      // Cards (Over)
      else if ((label === 'over 2.5') && (betName.includes('card') || betName.includes('booking'))) marketKey = 'cards:over_2_5';
      else if ((label === 'over 3.5' || label === 'over 3' || label === 'over 4') && (betName.includes('card') || betName.includes('booking'))) marketKey = 'cards:over_3_5';
      // Cards (Under)
      else if ((label === 'under 2.5') && (betName.includes('card') || betName.includes('booking'))) marketKey = 'cards:under_2_5';

      if (marketKey) {
        if (!oddsCollector.has(marketKey)) oddsCollector.set(marketKey, []);
        oddsCollector.get(marketKey)!.push({ odds, bookmaker: bookmakerName, isBet365 });
      }
    }
  }
}

function resolveOddsAcca(
  oddsCollector: Map<string, { odds: number; bookmaker: string; isBet365: boolean }[]>
): Map<string, RealOddsAcca> {
  const results = new Map<string, RealOddsAcca>();
  for (const [marketKey, entries] of oddsCollector) {
    if (entries.length === 0) continue;
    const bet365Entry = entries.find(e => e.isBet365);
    const allOdds = entries.map(e => e.odds);
    if (bet365Entry) {
      results.set(marketKey, { odds: Math.round(bet365Entry.odds * 100) / 100, bookmaker: bet365Entry.bookmaker, market: marketKey });
    } else {
      const med = medianAcca(allOdds);
      const closest = entries.reduce((best, e) => Math.abs(e.odds - med) < Math.abs(best.odds - med) ? e : best);
      results.set(marketKey, { odds: Math.round(med * 100) / 100, bookmaker: closest.bookmaker, market: marketKey });
    }
  }
  return results;
}

async function fetchOddsPaginatedAcca(apiKey: string, baseUrl: string): Promise<any[]> {
  let allData: any[] = [];
  let page = 1;
  const maxPages = 5;
  while (page <= maxPages) {
    const url = `${baseUrl}&page=${page}`;
    const response = await fetch(url, { headers: { 'x-apisports-key': apiKey } });
    if (!response.ok) break;
    const data = await response.json();
    allData = allData.concat(data.response || []);
    const totalPages = data.paging?.total || 1;
    if (page >= totalPages) break;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }
  return allData;
}

// Bulk odds cache per league (fixtureId -> market -> odds)
async function fetchOddsForLeagueAcca(apiKey: string, leagueId: number, season: number): Promise<Map<string, Map<string, RealOddsAcca>>> {
  try {
    console.log(`📊 ACCA Bulk odds: league=${leagueId} season=${season}`);
    const bet365Url = `${API_FOOTBALL_BASE_ACCA}/odds?league=${leagueId}&season=${season}&bookmaker=${BET365_ID_ACCA}`;
    const bet365Data = await fetchOddsPaginatedAcca(apiKey, bet365Url);
    if (bet365Data.length > 0) {
      return parseLeagueOddsResponseAcca(bet365Data);
    }
    const allUrl = `${API_FOOTBALL_BASE_ACCA}/odds?league=${leagueId}&season=${season}`;
    const allData = await fetchOddsPaginatedAcca(apiKey, allUrl);
    return parseLeagueOddsResponseAcca(allData);
  } catch (e) {
    console.error(`Error bulk fetching ACCA odds for league ${leagueId}:`, e);
    return new Map();
  }
}

function parseLeagueOddsResponseAcca(oddsData: any[]): Map<string, Map<string, RealOddsAcca>> {
  const result = new Map<string, Map<string, RealOddsAcca>>();
  for (const entry of oddsData) {
    const fixtureId = String(entry.fixture?.id || '');
    if (!fixtureId) continue;
    const oddsCollector = new Map<string, { odds: number; bookmaker: string; isBet365: boolean }[]>();
    for (const bk of (entry.bookmakers || [])) {
      parseBookmakerOddsAcca(bk, oddsCollector);
    }
    const resolved = resolveOddsAcca(oddsCollector);
    if (resolved.size > 0) result.set(fixtureId, resolved);
  }
  return result;
}

// ============ FIXTURES ============

async function fetchTodaysFixturesFromApiFootball(date: string, apiKey: string): Promise<TodaysFixture[]> {
  try {
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${encodeURIComponent(date)}`, {
      headers: { 'x-apisports-key': apiKey, 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'v3.football.api-sports.io' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const fixtures = Array.isArray(json?.response) ? json.response : [];
    const map = new Map<string, TodaysFixture>();
    for (const f of fixtures) {
      const id = String(f?.fixture?.id ?? '');
      const home = f?.teams?.home?.name;
      const away = f?.teams?.away?.name;
      const league = f?.league?.name;
      const leagueCountry = f?.league?.country;
      const kickoff = f?.fixture?.date;
      if (!id || !home || !away || !league || !kickoff) continue;
      const key = `${String(home).toLowerCase().trim()}-${String(away).toLowerCase().trim()}`;
      if (!map.has(key)) map.set(key, { fixture_id: id, home_team: home, away_team: away, league, league_country: leagueCountry, kickoff });
    }
    return Array.from(map.values());
  } catch { return []; }
}

interface MatchIntelligence {
  fixture_id: string;
  home_team: string;
  away_team: string;
  home_injury_count?: number;
  away_injury_count?: number;
  home_injuries_detailed?: Array<{ player: string; position: string; type: string }>;
  away_injuries_detailed?: Array<{ player: string; position: string; type: string }>;
  home_key_players_out?: string[];
  away_key_players_out?: string[];
  referee_avg_cards?: number;
  referee_name?: string;
  is_adverse_weather?: boolean;
  weather_impact?: string[];
}

// ============ MAIN ============

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];

    // ===== Return existing ACCA if one exists for today =====
    const { data: existingAccaData } = await supabase
      .from('acca_history')
      .select('*')
      .eq('prediction_date', today)
      .single();

    if (existingAccaData) {
      console.log(`📦 Returning existing ACCA for ${today}`);
      return new Response(JSON.stringify({
        success: true,
        selections: existingAccaData.selections as any[],
        combined_odds: existingAccaData.combined_odds,
        average_confidence: existingAccaData.average_confidence,
        selection_count: existingAccaData.selection_count,
        gaffer_reasoning: existingAccaData.gaffer_reasoning,
        saved: true,
        fromHistory: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== Gather today's fixtures =====
    const [miResult, gbResult, bbResult] = await Promise.all([
      supabase.from('match_intelligence').select('fixture_id, home_team, away_team, league, kickoff').eq('fixture_date', today),
      supabase.from('golden_bet_history').select('fixture_id, home_team, away_team, league, kickoff').eq('prediction_date', today),
      supabase.from('bet_builder_history').select('fixture_id, home_team, away_team, league, kickoff').eq('prediction_date', today),
    ]);

    const fixtureMap = new Map<string, TodaysFixture>();
    const addFixtures = (arr: any[] | null) => {
      if (!arr) return;
      arr.forEach(f => {
        const key = `${f.home_team}-${f.away_team}`.toLowerCase();
        if (!fixtureMap.has(key)) fixtureMap.set(key, { fixture_id: f.fixture_id, home_team: f.home_team, away_team: f.away_team, league: f.league, kickoff: f.kickoff });
      });
    };
    addFixtures(miResult.data);
    addFixtures(gbResult.data);
    addFixtures(bbResult.data);

    let todaysFixtures = Array.from(fixtureMap.values());
    
    // Always fetch from API Football to get full fixture list
    const apiKey = Deno.env.get('API_FOOTBALL_KEY');
    if (apiKey) {
      const apiFixtures = await fetchTodaysFixturesFromApiFootball(today, apiKey);
      for (const f of apiFixtures) {
        const key = `${f.home_team}-${f.away_team}`.toLowerCase();
        if (!fixtureMap.has(key)) {
          fixtureMap.set(key, f);
          todaysFixtures.push(f);
        }
      }
    }

    if (todaysFixtures.length === 0) {
      return new Response(JSON.stringify({ success: true, noAcca: true, reason: 'no_fixtures', message: "No matches on today's schedule. Check back tomorrow, son!" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== Filter: exclude women's/youth/reserves/non-league, only future games =====
    const now = new Date();
    const validFixtures = todaysFixtures.filter(f => {
      if (isExcludedLeague(f.league)) return false;
      if (isExcludedTeam(f.home_team) || isExcludedTeam(f.away_team)) return false;
      // Block tier 3 (unknown/semi-pro) entirely
      if (getLeagueTier(f.league, f.league_country) === 3) return false;
      // Only include fixtures that haven't started yet
      if (new Date(f.kickoff) <= now) return false;
      // Kickoff gate: 12:00 EET to 23:59 EET = 10:00 UTC to 21:59 UTC
      const kickoffUTCHour = new Date(f.kickoff).getUTCHours();
      if (kickoffUTCHour < 10 || kickoffUTCHour >= 22) return false;
      return true;
    });

    // ===== TIERED PRIORITY: Tier 1 first, then Tier 2 fallback =====
    const tier1Fixtures = validFixtures.filter(f => getLeagueTier(f.league, f.league_country) === 1);
    const tier2Fixtures = validFixtures.filter(f => getLeagueTier(f.league, f.league_country) === 2);

    console.log(`📊 ${todaysFixtures.length} total → ${validFixtures.length} valid → ${tier1Fixtures.length} Tier 1 + ${tier2Fixtures.length} Tier 2`);
    // Log Tier 1 fixtures for debugging
    for (const f of tier1Fixtures) {
      console.log(`  🏟️ T1: ${f.home_team} vs ${f.away_team} (${f.league}) [${f.league_country || 'no country'}]`);
    }

    if (validFixtures.length === 0) {
      return new Response(JSON.stringify({ success: true, noAcca: true, reason: 'no_valid', message: "No qualifying fixtures today — this can happen during international breaks or light fixture days. Check back tomorrow!" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== Fetch ALL market stats =====
    const allMarketKeys = new Set(ALL_MARKETS.map(f => makeMarketKey(f.category, f.market)));

    const statsResults = await Promise.all(
      ALL_MARKETS.map(async (f) => {
        const { data } = await supabase
          .from('regional_stats')
          .select('*')
          .eq('category', f.category)
          .eq('market', f.market)
          .order('success_percent', { ascending: false })
          .range(0, 4999);
        return (data || []) as RegionalStat[];
      })
    );
    const allStats = statsResults.flat();

    // ===== FALLBACK: Supplement with team_rolling_stats for leagues not in regional_stats =====
    const teamsInRegionalStats = new Set(allStats.map(s => s.team_name.toLowerCase().trim()));
    const { data: rollingStatsRaw } = await supabase
      .from('team_rolling_stats')
      .select('team_name, league, team_id, matches_used, over_15_goals_pct, over_25_goals_pct, btts_pct, over_95_corners_pct, over_35_cards_pct, avg_total_goals, avg_total_corners, avg_total_cards, region')
      .gte('matches_used', 5)
      .gt('last_updated', new Date(Date.now() - 14 * 86400000).toISOString())
      .range(0, 4999);

    if (rollingStatsRaw) {
      let rollingAdded = 0;
      for (const rs of rollingStatsRaw) {
        const normName = rs.team_name.toLowerCase().trim();
        if (teamsInRegionalStats.has(normName)) continue; // Already covered by regional_stats

        // Convert rolling stats into RegionalStat-compatible entries for each market
        const marketMap: Array<{ category: string; market: string; successPct: number; avgPerGame: number }> = [
          { category: 'goals', market: 'over_1_5', successPct: rs.over_15_goals_pct || 0, avgPerGame: rs.avg_total_goals || 0 },
          { category: 'corners', market: 'over_8_5', successPct: rs.over_95_corners_pct || 0, avgPerGame: rs.avg_total_corners || 0 },
          { category: 'cards', market: 'over_3_5', successPct: rs.over_35_cards_pct || 0, avgPerGame: rs.avg_total_cards || 0 },
        ];

        for (const m of marketMap) {
          if (m.successPct >= 40) { // Lower threshold — the main filter will apply MIN_SUCCESS_PERCENT later
            allStats.push({
              id: `rolling-${rs.team_id}-${m.category}-${m.market}`,
              team_id: rs.team_id,
              team_name: rs.team_name,
              league_name: rs.league,
              region: rs.region || 'european',
              category: m.category,
              market: m.market,
              success_percent: m.successPct,
              avg_per_game: m.avgPerGame,
              matches_sampled: rs.matches_used,
            });
            rollingAdded++;
          }
        }
      }
      console.log(`📊 Added ${rollingAdded} entries from team_rolling_stats as fallback (${rollingStatsRaw.length} teams checked)`);
    }

    if (allStats.length === 0) {
      return new Response(JSON.stringify({ success: true, noAcca: true, reason: 'no_stats', message: 'Form tables are being updated. Check back later!' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build ranking maps
    const rankingsByMarket = new Map<string, Map<string, number>>();
    const marketGroups = new Map<string, RegionalStat[]>();
    allStats.forEach(stat => {
      const key = makeMarketKey(stat.category, stat.market);
      if (!marketGroups.has(key)) marketGroups.set(key, []);
      marketGroups.get(key)!.push(stat);
    });
    marketGroups.forEach((stats, market) => {
      stats.sort((a, b) => b.success_percent - a.success_percent);
      const rankMap = new Map<string, number>();
      stats.forEach((s, i) => rankMap.set(s.team_name.toLowerCase().trim(), i + 1));
      rankingsByMarket.set(market, rankMap);
    });

    const getTeamRank = (teamName: string, category: string, market: string): number | undefined => {
      const norm = teamName.toLowerCase().trim();
      const ranks = rankingsByMarket.get(makeMarketKey(category, market));
      if (!ranks) return undefined;
      if (ranks.has(norm)) return ranks.get(norm);
      for (const [key, rank] of ranks) {
        if (norm.includes(key) || key.includes(norm)) return rank;
      }
      return undefined;
    };

    // Form stats lookup
    const formStatsByTeam = new Map<string, RegionalStat[]>();
    allStats.forEach(stat => {
      const key = stat.team_name.toLowerCase().trim();
      if (!formStatsByTeam.has(key)) formStatsByTeam.set(key, []);
      formStatsByTeam.get(key)!.push(stat);
    });

    const findFormStats = (teamName: string): RegionalStat[] | undefined => {
      const norm = teamName.toLowerCase().trim();
      if (formStatsByTeam.has(norm)) return formStatsByTeam.get(norm);
      for (const [key, stats] of formStatsByTeam) {
        if (key.length < 4) continue;
        if (norm.includes(key) || key.includes(norm)) return stats;
      }
      const words = norm.split(/\s+/).filter(w => w.length >= 4);
      if (words.length > 0) {
        const lastWord = words[words.length - 1];
        for (const [key, stats] of formStatsByTeam) {
          if (key.includes(lastWord) || lastWord.includes(key)) {
            const keyWords = key.split(/\s+/).filter(w => w.length >= 3);
            const firstWord = words[0];
            const keyFirstWord = keyWords[0] || '';
            if (firstWord === keyFirstWord || firstWord.includes(keyFirstWord) || keyFirstWord.includes(firstWord) || words.length === 1) return stats;
          }
        }
      }
      return undefined;
    };

    // Match intelligence
    const { data: matchIntelData } = await supabase.from('match_intelligence').select('*').eq('fixture_date', today);
    const matchIntelMap = new Map<string, MatchIntelligence>();
    if (matchIntelData) matchIntelData.forEach((intel: MatchIntelligence) => matchIntelMap.set(`${intel.home_team}-${intel.away_team}`.toLowerCase(), intel));

    // ===== H2H + DERBY DETECTION =====
    // Known derby pairs — derbies produce more cards/corners
    const KNOWN_DERBIES: Array<[string, string]> = [
      ['Arsenal', 'Tottenham'], ['Liverpool', 'Everton'], ['Manchester United', 'Manchester City'],
      ['Chelsea', 'Fulham'], ['West Ham', 'Millwall'], ['Newcastle', 'Sunderland'],
      ['Real Madrid', 'Atletico Madrid'], ['Barcelona', 'Espanyol'], ['Real Betis', 'Sevilla'],
      ['AC Milan', 'Inter'], ['Roma', 'Lazio'], ['Juventus', 'Torino'],
      ['Borussia Dortmund', 'Schalke 04'], ['Bayern Munich', 'Borussia Dortmund'],
      ['PSG', 'Marseille'], ['Lyon', 'Saint-Etienne'], ['Celtic', 'Rangers'],
      ['Galatasaray', 'Fenerbahce'], ['Ajax', 'Feyenoord'], ['Benfica', 'Sporting CP'],
      ['Boca Juniors', 'River Plate'], ['Flamengo', 'Fluminense'], ['Corinthians', 'Palmeiras'],
    ];
    
    const checkDerby = (home: string, away: string): boolean => {
      const h = home.toLowerCase(), a = away.toLowerCase();
      for (const [x, y] of KNOWN_DERBIES) {
        const nx = x.toLowerCase(), ny = y.toLowerCase();
        if ((h.includes(nx) || nx.includes(h)) && (a.includes(ny) || ny.includes(a))) return true;
        if ((h.includes(ny) || ny.includes(h)) && (a.includes(nx) || nx.includes(a))) return true;
      }
      return false;
    };

    // H2H cache for today's fixtures
    const h2hCache = new Map<string, { avg_goals: number; avg_corners: number; avg_cards: number; meetings: number } | null>();
    const getH2H = async (home: string, away: string) => {
      const key = `${home}|${away}`;
      if (h2hCache.has(key)) return h2hCache.get(key)!;
      try {
        const { data } = await supabase.from('ml_training_data')
          .select('total_goals, total_corners, total_cards')
          .or(`and(home_team.eq.${home},away_team.eq.${away}),and(home_team.eq.${away},away_team.eq.${home})`)
          .not('home_goals', 'is', null)
          .order('fixture_date', { ascending: false })
          .limit(5);
        if (!data || data.length < 2) { h2hCache.set(key, null); return null; }
        const goals = data.map((m: any) => m.total_goals ?? 0);
        const corners = data.filter((m: any) => m.total_corners != null).map((m: any) => m.total_corners);
        const cards = data.filter((m: any) => m.total_cards != null).map((m: any) => m.total_cards);
        const result = {
          avg_goals: goals.reduce((a: number, b: number) => a + b, 0) / goals.length,
          avg_corners: corners.length > 0 ? corners.reduce((a: number, b: number) => a + b, 0) / corners.length : 0,
          avg_cards: cards.length > 0 ? cards.reduce((a: number, b: number) => a + b, 0) / cards.length : 0,
          meetings: data.length,
        };
        h2hCache.set(key, result);
        return result;
      } catch { h2hCache.set(key, null); return null; }
    };

    // ===== Validate combined avg_per_game from regional_stats (form tables) =====
    // Uses the FORM TABLE avg_per_game as the source of truth for average validation.
    // team_rolling_stats has incomplete corners/cards data so we use regional_stats instead.
    const passesAvgCheck = (teamAvgPerGame: number, oppAvgPerGame: number | null, marketKey: string): boolean => {
      const rule = MIN_ROLLING_AVG[marketKey];
      if (!rule) return true;

      // avg_per_game in regional_stats = average total in the team's matches (match-level, not per-team)
      // If we have both team and opposition data, average them; otherwise use team's alone
      const vals: number[] = [teamAvgPerGame];
      if (oppAvgPerGame != null && oppAvgPerGame > 0) vals.push(oppAvgPerGame);

      const combinedAvg = vals.reduce((a, b) => a + b, 0) / vals.length;

      if (rule.direction === 'below') {
        // Under markets: avg must be BELOW threshold
        if (combinedAvg > rule.threshold) {
          console.log(`🚫 Rolling reject: avg_per_game ${combinedAvg.toFixed(1)} > ${rule.threshold} for ${marketKey} (under)`);
          return false;
        }
      } else {
        // Over markets: avg must be ABOVE threshold
        if (combinedAvg < rule.threshold) {
          console.log(`🚫 Rolling reject: avg_per_game ${combinedAvg.toFixed(1)} < ${rule.threshold} for ${marketKey}`);
          return false;
        }
      }
      return true;
    };

    // Process European fixtures first, then fill remaining with non-European
    interface FixtureCandidate {
      teamName: string;
      league: string;
      opposition: string;
      kickoff: string;
      isHome: boolean;
      fixtureId?: string;
      isEuropean: boolean;
      qualifyingMarkets: Array<{
        market: string;
        marketLabel: string;
        category: string;
        successPercent: number;
        teamSuccessPercent: number;
        teamRank: number;
        oppositionStats: number;
        oppositionRank?: number;
        difficulty: number;
      }>;
    }

    const buildCandidatesFromFixtures = (fixtures: TodaysFixture[], isEuropean: boolean): FixtureCandidate[] => {
      const result: FixtureCandidate[] = [];
      for (const fixture of fixtures) {
        let anyTeamFound = false;
        for (const isHome of [true, false]) {
          const teamName = isHome ? fixture.home_team : fixture.away_team;
          const oppName = isHome ? fixture.away_team : fixture.home_team;

          const teamStats = findFormStats(teamName);
          if (!teamStats?.length) {
            if (isHome) console.log(`⚠️ No form stats for: ${teamName} (${fixture.league})`);
            continue;
          }
          anyTeamFound = true;
          // Debug: log what markets this team has
          if (teamName.toLowerCase().includes('rio ave') || teamName.toLowerCase().includes('bastia') || teamName.toLowerCase().includes('kasim')) {
            console.log(`🔍 ${teamName}: ${teamStats.length} stats — ${teamStats.map(s => `${s.category}:${s.market}=${s.success_percent}%`).join(', ')}`);
          }

          const oppStats = findFormStats(oppName);
          const qualifyingMarkets: FixtureCandidate['qualifyingMarkets'] = [];

          for (const stat of teamStats) {
            const statKey = makeMarketKey(stat.category, stat.market);
            if (!allMarketKeys.has(statKey)) { continue; }
            if (stat.success_percent < MIN_SUCCESS_PERCENT) { continue; }

            // CRITICAL: Validate combined avg_per_game meets market threshold
            const oppMarketStatForAvg = oppStats?.find(s => s.category === stat.category && s.market === stat.market);
            if (!passesAvgCheck(stat.avg_per_game, oppMarketStatForAvg?.avg_per_game ?? null, statKey)) continue;

            const teamRank = getTeamRank(stat.team_name, stat.category, stat.market);
            if (!teamRank || teamRank > MAX_RANK_THRESHOLD) continue;

            const oppMarketStat = oppStats?.find(s => s.category === stat.category && s.market === stat.market);
            const oppSuccessPercent = oppMarketStat?.success_percent ?? DEFAULT_OPPOSITION_STATS;
            if (oppSuccessPercent < MIN_OPPOSITION_STATS && oppMarketStat) continue;

            const combinedConfidence = Math.round((stat.success_percent + oppSuccessPercent) / 2);
            if (combinedConfidence < MIN_SUCCESS_PERCENT) continue;

            const oppositionRank = getTeamRank(oppName, stat.category, stat.market);
            const difficulty = MARKET_DIFFICULTY[statKey] || 1;

            qualifyingMarkets.push({
              market: statKey,
              marketLabel: MARKET_LABELS[statKey] || stat.market,
              category: stat.category,
              successPercent: combinedConfidence,
              teamSuccessPercent: stat.success_percent,
              teamRank,
              oppositionStats: oppSuccessPercent,
              oppositionRank,
              difficulty,
            });
          }

          if (qualifyingMarkets.length > 0) {
            result.push({
              teamName,
              league: fixture.league,
              opposition: oppName,
              kickoff: fixture.kickoff,
              isHome,
              fixtureId: fixture.fixture_id,
              isEuropean,
              qualifyingMarkets,
            });
          }
        }
      }
      return result;
    };

    const tier1Candidates = buildCandidatesFromFixtures(tier1Fixtures, true);
    const tier2Candidates = buildCandidatesFromFixtures(tier2Fixtures, false);

    console.log(`🎯 ${tier1Candidates.length} Tier 1 candidates, ${tier2Candidates.length} Tier 2 candidates`);

    // For each candidate, create a selection for EACH qualifying market (not just the hardest)
    // This allows fallback: if cards gets rejected for no odds, goals/corners can still be used
    const expandCandidate = (fc: FixtureCandidate): (AccaSelection & { isEuropean: boolean })[] => {
      const matchIntel = matchIntelMap.get(`${fc.isHome ? fc.teamName : fc.opposition}-${fc.isHome ? fc.opposition : fc.teamName}`.toLowerCase());

      // Sort markets: non-cards first (they have odds), then cards; within each group by difficulty desc then confidence desc
      const sorted = [...fc.qualifyingMarkets].sort((a, b) => {
        const aIsCards = a.category === 'cards' ? 1 : 0;
        const bIsCards = b.category === 'cards' ? 1 : 0;
        if (aIsCards !== bIsCards) return aIsCards - bIsCards; // Non-cards first
        if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty;
        return b.successPercent - a.successPercent;
      });

      return sorted.map(qm => ({
        teamName: fc.teamName,
        league: fc.league,
        market: qm.market,
        marketLabel: qm.marketLabel,
        successPercent: qm.successPercent,
        teamSuccessPercent: qm.teamSuccessPercent,
        teamRank: qm.teamRank,
        opposition: fc.opposition,
        oppositionStats: qm.oppositionStats,
        oppositionRank: qm.oppositionRank,
        kickoff: fc.kickoff,
        isHome: fc.isHome,
        fixtureId: fc.fixtureId,
        isEuropean: fc.isEuropean,
        gafferComment: undefined,
      }));
    };

    const tier1Selections = tier1Candidates.flatMap(expandCandidate);
    const tier2Selections = tier2Candidates.flatMap(expandCandidate);

    // Sort both by SMART score: form stats + opposition + H2H + derby bonus
    const scoreSelection = async (s: AccaSelection): Promise<number> => {
      let score = s.successPercent + (s.oppositionStats || 0) + (MARKET_DIFFICULTY[s.market] || 0) * 5;
      const homeTeam = s.isHome ? s.teamName : s.opposition;
      const awayTeam = s.isHome ? s.opposition : s.teamName;
      
      // H2H bonus: if historical meetings support this market
      const h2h = await getH2H(homeTeam, awayTeam);
      if (h2h && h2h.meetings >= 2) {
        const marketRule = MIN_ROLLING_AVG[s.market];
        if (marketRule) {
          const h2hField = s.market.includes('goals') ? h2h.avg_goals : s.market.includes('corners') ? h2h.avg_corners : h2h.avg_cards;
          if (h2hField >= marketRule.threshold) score += 10; // H2H supports this market
        }
      }
      
      // Derby bonus for cards/corners markets
      if (checkDerby(homeTeam, awayTeam)) {
        if (s.market.includes('cards')) score += 15;
        else if (s.market.includes('corners')) score += 10;
        else score += 5;
      }
      
      return score;
    };
    
    // Score all selections
    const tier1Scored = await Promise.all(tier1Selections.map(async s => ({ s, score: await scoreSelection(s) })));
    const tier2Scored = await Promise.all(tier2Selections.map(async s => ({ s, score: await scoreSelection(s) })));
    tier1Scored.sort((a, b) => b.score - a.score);
    tier2Scored.sort((a, b) => b.score - a.score);
    const tier1SelectionsSorted = tier1Scored.map(x => x.s);
    const tier2SelectionsSorted = tier2Scored.map(x => x.s);

    // ===== CROSS-PRODUCT EXCLUSION: Don't reuse ANY fixture from Golden Bets/Bet Builder =====
    // The user's bookie may not list exotic leagues, so we block the ENTIRE fixture (all markets)
    const excludedFixtureIds = new Set<string>();
    const excludedFixtureKeys = new Set<string>(); // "home-away" normalized keys
    
    const addExcludedFixture = (fixtureId: string | null, homeTeam: string, awayTeam: string) => {
      if (fixtureId) excludedFixtureIds.add(fixtureId);
      excludedFixtureKeys.add(`${homeTeam}-${awayTeam}`.toLowerCase());
      excludedFixtureKeys.add(`${awayTeam}-${homeTeam}`.toLowerCase());
    };
    
    // Collect Golden Bet fixtures (block entire fixture)
    if (gbResult.data) {
      for (const gb of gbResult.data as any[]) {
        addExcludedFixture(gb.fixture_id ? String(gb.fixture_id) : null, gb.home_team, gb.away_team);
      }
    }
    // Collect Bet Builder fixtures (block entire fixture)
    if (bbResult.data) {
      for (const bb of bbResult.data as any[]) {
        const fids = bb.fixture_id ? String(bb.fixture_id).split('|') : [];
        const homeTeams = String(bb.home_team).split(' | ');
        const awayTeams = String(bb.away_team).split(' | ');
        for (let i = 0; i < homeTeams.length; i++) {
          const h = (homeTeams[i] || '').trim();
          const a = (awayTeams[i] || '').trim();
          const fid = (fids[i] || '').trim() || null;
          addExcludedFixture(fid, h, a);
        }
      }
    }
    
    console.log(`🚫 Excluding ${excludedFixtureIds.size} fixture IDs + ${excludedFixtureKeys.size} team keys from Golden Bets/Bet Builder`);

    // ===== FETCH ODDS FOR CANDIDATE FIXTURES ONLY =====
    const API_FOOTBALL_KEY = Deno.env.get('API_FOOTBALL_KEY');
    const now2 = new Date();
    const season = now2.getMonth() >= 6 ? now2.getFullYear() : now2.getFullYear() - 1; // European seasons start mid-year
    const leagueOddsCache = new Map<string, Map<string, RealOddsAcca>>();
    const fixtureLeagueMap = new Map<string, number>();

    if (API_FOOTBALL_KEY) {
      try {
        // Build fixture→league mapping from today's fixtures
        const fixtureRes = await fetch(`${API_FOOTBALL_BASE_ACCA}/fixtures?date=${today}&timezone=UTC`, {
          headers: { 'x-apisports-key': API_FOOTBALL_KEY },
        });
        if (fixtureRes.ok) {
          const fixtureJson = await fixtureRes.json();
          for (const f of (fixtureJson.response || [])) {
            const fId = String(f.fixture?.id || '');
            const lId = f.league?.id;
            if (fId && lId) fixtureLeagueMap.set(fId, lId);
          }
        }
      } catch (e) { console.warn('Fixture-league mapping failed:', e); }

      // Fetch odds for ALL valid fixture leagues (not just candidates with form stats)
      // This ensures we can find legs even when form stats are limited
      const candidateLeagueIds = new Set<number>();
      for (const f of validFixtures) {
        const fId = f.fixture_id;
        if (fId && fixtureLeagueMap.has(fId)) candidateLeagueIds.add(fixtureLeagueMap.get(fId)!);
      }

      console.log(`🎰 ACCA: Fetching bulk odds for ${candidateLeagueIds.size} candidate leagues`);
      for (const leagueId of candidateLeagueIds) {
        const leagueOdds = await fetchOddsForLeagueAcca(API_FOOTBALL_KEY, leagueId, season);
        for (const [fId, markets] of leagueOdds) {
          for (const [mKey, odds] of markets) {
            if (!leagueOddsCache.has(fId)) leagueOddsCache.set(fId, new Map());
            leagueOddsCache.get(fId)!.set(mKey, odds);
          }
        }
        await new Promise(r => setTimeout(r, 200));
      }
      console.log(`🎰 Odds cached for ${leagueOddsCache.size} fixtures`);
    }

    // Helper: resolve odds for a selection — REAL ODDS ONLY, no estimated fallback
    const getOddsForSelection = (fixtureId: string | undefined, market: string, _league?: string, _leagueCountry?: string): { odds: number; bookmaker: BookmakerInfo } | null => {
      if (!fixtureId) return null;
      const fixtureOdds = leagueOddsCache.get(fixtureId);
      const marketOdds = fixtureOdds?.get(market);
      if (marketOdds && marketOdds.odds >= MIN_LEG_ODDS && marketOdds.odds <= MAX_LEG_ODDS) {
        return { odds: marketOdds.odds, bookmaker: { key: 'bet365', title: marketOdds.bookmaker } };
      }
      // No real bookmaker odds = REJECT (no estimated fallback allowed)
      return null;
    };

    // ===== SELECTION WITH ODDS-AWARE LOGIC =====
    const fixtureIdsSeen = new Set<string>();
    const fixtureKeysSeen = new Set<string>();
    const marketCounts: Record<string, number> = {};
    const selected: AccaSelection[] = [];

    const tryAddCandidate = (c: AccaSelection & { isEuropean?: boolean }): boolean => {
      const fId = (c as any).fixtureId;
      const fKey = `${c.teamName}-${c.opposition}`.toLowerCase();
      const rKey = `${c.opposition}-${c.teamName}`.toLowerCase();
      
      // Check cross-product exclusion (entire fixture blocked, regardless of market)
      if (fId && excludedFixtureIds.has(fId)) {
        console.log(`🚫 ACCA skip ${c.teamName}: fixture already used in Golden Bets/Bet Builder`);
        return false;
      }
      if (excludedFixtureKeys.has(fKey) || excludedFixtureKeys.has(rKey)) {
        console.log(`🚫 ACCA skip ${c.teamName} vs ${c.opposition}: fixture already used in Golden Bets/Bet Builder`);
        return false;
      }
      if (fId && fixtureIdsSeen.has(fId)) return false;
      if (fixtureKeysSeen.has(fKey) || fixtureKeysSeen.has(rKey)) return false;
      const mc = marketCounts[c.market] || 0;
      if (mc >= 1) return false; // Exactly 1 leg per market

      // Check odds BEFORE committing
      const oddsResult = getOddsForSelection(fId, c.market, c.league);
      if (!oddsResult) {
        console.log(`❌ REJECTED ${c.teamName}: ${c.marketLabel} — no valid odds`);
        return false; // Don't mark fixture as seen — another market for same fixture can try
      }

      c.legOdds = oddsResult.odds;
      c.legBookmaker = oddsResult.bookmaker;
      console.log(`✅ ${c.teamName}: ${c.marketLabel} @ ${oddsResult.odds} (${oddsResult.bookmaker.title})`);

      if (fId) fixtureIdsSeen.add(fId);
      fixtureKeysSeen.add(fKey);
      marketCounts[c.market] = mc + 1;
      selected.push(c);
      return true;
    };

    // TIERED SELECTION: Tier 1 first, then fill remaining from Tier 2
    for (const c of tier1SelectionsSorted) {
      if (selected.length >= REQUESTED_LEGS) break;
      tryAddCandidate(c);
    }
    console.log(`🏆 After Tier 1: ${selected.length} legs selected`);
    if (selected.length < REQUESTED_LEGS) {
      for (const c of tier2SelectionsSorted) {
        if (selected.length >= REQUESTED_LEGS) break;
        tryAddCandidate(c);
      }
      console.log(`📋 After Tier 2 fallback: ${selected.length} legs selected`);
    }

    // ===== ODDS-FIRST FALLBACK: Scan ALL valid fixtures with rolling stats + real odds =====
    // When normal candidates fail (cross-product exclusion, missing form stats), try any fixture with odds
    if (selected.length < MIN_LEGS && rollingStatsRaw) {
      console.log(`🔄 Odds-first fallback: need ${MIN_LEGS - selected.length} more leg(s) — scanning ALL valid fixtures with rolling stats`);
      
      const oddsFirstCandidates: (AccaSelection & { isEuropean?: boolean })[] = [];
      
      // Build a map of rolling stats by team name for fast lookup
      const rollingByTeam = new Map<string, typeof rollingStatsRaw[0]>();
      for (const rs of rollingStatsRaw) {
        if ((rs.matches_used || 0) < 5) continue;
        rollingByTeam.set(rs.team_name.toLowerCase().trim(), rs);
      }
      
      for (const fixture of validFixtures) {
        // Skip excluded fixtures
        if (excludedFixtureIds.has(fixture.fixture_id)) continue;
        const fKey = `${fixture.home_team}-${fixture.away_team}`.toLowerCase();
        const rKey = `${fixture.away_team}-${fixture.home_team}`.toLowerCase();
        if (excludedFixtureKeys.has(fKey) || excludedFixtureKeys.has(rKey)) continue;
        
        // Check if this fixture has ANY odds in the cache
        const fixtureOdds = leagueOddsCache.get(fixture.fixture_id);
        if (!fixtureOdds) continue;
        
        for (const isHome of [true, false]) {
          const teamName = isHome ? fixture.home_team : fixture.away_team;
          const oppName = isHome ? fixture.away_team : fixture.home_team;
          
          // Find rolling stats for team (fuzzy match)
          const teamLower = teamName.toLowerCase().trim();
          let teamRolling = rollingByTeam.get(teamLower);
          if (!teamRolling) {
            for (const [key, rs] of rollingByTeam) {
              if (key.length >= 4 && (teamLower.includes(key) || key.includes(teamLower))) {
                teamRolling = rs; break;
              }
            }
          }
          if (!teamRolling) continue;
          
          const oppLower = oppName.toLowerCase().trim();
          let oppRolling = rollingByTeam.get(oppLower);
          if (!oppRolling) {
            for (const [key, rs] of rollingByTeam) {
              if (key.length >= 4 && (oppLower.includes(key) || key.includes(oppLower))) {
                oppRolling = rs; break;
              }
            }
          }
          
          // Try Over 2.5 Goals (primary fallback market)
          const overPct = teamRolling.over_25_goals_pct || 0;
          if (overPct < 50) continue;
          const avgGoals = teamRolling.avg_total_goals || 0;
          if (avgGoals < 2.2) continue;
          
          const oppOverPct = oppRolling?.over_25_goals_pct ?? 50;
          const combinedConf = Math.round((overPct + oppOverPct) / 2);
          if (combinedConf < 45) continue; // Slightly relaxed for fallback
          
          // Check odds exist and are in range
          const goalsOdds = fixtureOdds.get('goals:over_2_5');
          if (!goalsOdds || goalsOdds.odds < MIN_LEG_ODDS || goalsOdds.odds > MAX_LEG_ODDS) continue;
          
          const isEuropean = isEuropeanLeague(fixture.league, fixture.home_team, fixture.away_team, fixture.league_country);
          
          oddsFirstCandidates.push({
            teamName,
            league: fixture.league,
            market: 'goals:over_2_5',
            marketLabel: 'Over 2.5 Goals',
            successPercent: combinedConf,
            teamSuccessPercent: overPct,
            opposition: oppName,
            oppositionStats: oppOverPct,
            kickoff: fixture.kickoff,
            isHome,
            fixtureId: fixture.fixture_id,
            isEuropean,
          });
          
          // Also try Over 8.5 Corners
          const cornerPct = teamRolling.over_95_corners_pct || 0;
          if (cornerPct >= 50 && (teamRolling.avg_total_corners || 0) >= 8.5) {
            const cornersOdds = fixtureOdds.get('corners:over_8_5');
            if (cornersOdds && cornersOdds.odds >= MIN_LEG_ODDS && cornersOdds.odds <= MAX_LEG_ODDS) {
              const oppCornerPct = oppRolling?.over_95_corners_pct ?? 50;
              oddsFirstCandidates.push({
                teamName,
                league: fixture.league,
                market: 'corners:over_8_5',
                marketLabel: 'Over 8.5 Corners',
                successPercent: Math.round((cornerPct + oppCornerPct) / 2),
                teamSuccessPercent: cornerPct,
                opposition: oppName,
                oppositionStats: oppCornerPct,
                kickoff: fixture.kickoff,
                isHome,
                fixtureId: fixture.fixture_id,
                isEuropean,
              });
            }
          }
        }
      }
      
      // Sort by confidence then odds value
      oddsFirstCandidates.sort((a, b) => b.successPercent - a.successPercent);
      console.log(`🔄 ${oddsFirstCandidates.length} odds-first candidates found`);
      for (const c of oddsFirstCandidates.slice(0, 10)) {
        console.log(`  🔄 ${c.teamName} vs ${c.opposition}: ${c.marketLabel} (${c.successPercent}%) [${c.league}]`);
      }
      
      for (const c of oddsFirstCandidates) {
        if (selected.length >= REQUESTED_LEGS) break;
        tryAddCandidate(c);
      }
      console.log(`🔄 After odds-first fallback: ${selected.length} legs selected`);
    }

    // No under markets fallback — fixed 3-leg treble only

    if (selected.length === 0) {
      return new Response(JSON.stringify({ success: true, noAcca: true, reason: 'no_candidates', message: "No teams qualify from the form tables today. Check back tomorrow!" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const finalSelected = selected.slice(0, REQUESTED_LEGS);

    if (finalSelected.length < MIN_LEGS) {
      return new Response(JSON.stringify({ success: true, noAcca: true, reason: 'not_enough_legs', message: `Only ${finalSelected.length} leg(s) qualify today — need at least ${MIN_LEGS} for an ACCA. Check back tomorrow!` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let combinedOdds = 1;
    for (const sel of finalSelected) {
      combinedOdds *= sel.legOdds!;
    }
    combinedOdds = Math.round(combinedOdds * 100) / 100;

    // Generate AI-powered leg reasoning for each selection
    console.log(`🤖 Generating AI reasoning for ${finalSelected.length} ACCA legs...`);
    await Promise.all(finalSelected.map(async (sel) => {
      const homeTeam = sel.isHome ? sel.teamName : sel.opposition;
      const awayTeam = sel.isHome ? sel.opposition : sel.teamName;
      const intel = matchIntelMap.get(`${homeTeam}-${awayTeam}`.toLowerCase()) || null;
      sel.gafferComment = await generateLegReasoningAI(sel, supabase, intel);
    }));

    const avgConfidence = Math.round(finalSelected.reduce((sum, s) => sum + s.successPercent, 0) / finalSelected.length);
    const gafferReasoning = await generateGafferReasoningAI(finalSelected, combinedOdds, supabase);

    console.log(`✅ ACCA: ${finalSelected.length} legs @ ${combinedOdds} odds`);

    // Save to history (2+ legs only)
    const shouldSave = finalSelected.length >= MIN_LEGS;

    if (shouldSave) {
      const { data: existing } = await supabase.from('acca_history').select('id').eq('prediction_date', today).single();
      if (!existing) {
        const { data: inserted, error: insertError } = await supabase
          .from('acca_history')
          .insert({
            prediction_date: today,
            selections: finalSelected,
            combined_odds: combinedOdds,
            average_confidence: avgConfidence,
            selection_count: finalSelected.length,
            gaffer_reasoning: gafferReasoning,
            stake: 10, // €10 fixed stake
            status: 'pending',
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Failed to save ACCA:', insertError);
        } else {
          console.log(`💾 Saved ${finalSelected.length}-leg ACCA`);
          if (inserted) {
            fetch(`${supabaseUrl}/functions/v1/capture-bet-proof`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
              body: JSON.stringify({
                betType: 'acca',
                betId: inserted.id,
                selections: finalSelected.map(s => ({ teamName: s.teamName, market: s.marketLabel || s.market, confidence: s.successPercent, odds: s.legOdds })),
                odds: combinedOdds,
                confidence: avgConfidence,
                gafferReasoning,
              }),
            }).catch(e => console.warn('Proof capture failed:', e));
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      selections: finalSelected,
      combined_odds: combinedOdds,
      average_confidence: avgConfidence,
      selection_count: finalSelected.length,
      gaffer_reasoning: gafferReasoning,
      saved: shouldSave,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('ACCA Builder error:', msg);
    return new Response(JSON.stringify({ error: msg, success: false }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// ============ AI-POWERED COMMENTARY ENGINE ============

/** Post-process AI output to guarantee ---GAFFER--- separator exists */
function ensureGafferFormat(raw: string): string {
  const sep = '---GAFFER---';
  if (raw.includes(sep)) {
    return raw
      .replace(/SECTION\s*\d+\s*[-–—:]*\s*(📊\s*)?(STATS\s*&?\s*FACTS|THE\s*GAFFER'?S?\s*VERDICT?)\s*[-–—:]*\s*(\([^)]*\)\s*:?\s*)?/gi, '')
      .replace(/📊\s*/g, '')
      .trim();
  }
  const sentences = raw.split(/(?<=[.!?])\s+/);
  if (sentences.length >= 2) {
    const mid = Math.ceil(sentences.length / 2);
    return `${sentences.slice(0, mid).join(' ').trim()}\n${sep}\n${sentences.slice(mid).join(' ').trim()}`;
  }
  return `${sep}\n${raw.trim()}`;
}

async function generateLegReasoningAI(
  sel: AccaSelection,
  supabaseClient: any,
  matchIntel?: MatchIntelligence | null,
): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  const homeTeam = sel.isHome ? sel.teamName : sel.opposition;
  const awayTeam = sel.isHome ? sel.opposition : sel.teamName;

  let statsBlock = '';
  let intelBlock = '';

  try {
    const [{ data: homeRolling }, { data: awayRolling }] = await Promise.all([
      supabaseClient.from('team_rolling_stats')
        .select('team_name, avg_goals_scored, avg_goals_conceded, avg_total_goals, over_25_goals_pct, btts_pct, avg_corners_for, avg_corners_against, avg_total_corners, over_95_corners_pct, avg_cards_for, avg_cards_against, avg_total_cards, over_35_cards_pct, form_string')
        .eq('team_name', homeTeam).limit(1).maybeSingle(),
      supabaseClient.from('team_rolling_stats')
        .select('team_name, avg_goals_scored, avg_goals_conceded, avg_total_goals, over_25_goals_pct, btts_pct, avg_corners_for, avg_corners_against, avg_total_corners, over_95_corners_pct, avg_cards_for, avg_cards_against, avg_total_cards, over_35_cards_pct, form_string')
        .eq('team_name', awayTeam).limit(1).maybeSingle(),
    ]);

    const h = homeRolling || (await supabaseClient.from('team_rolling_stats')
      .select('team_name, avg_goals_scored, avg_goals_conceded, avg_total_goals, over_25_goals_pct, btts_pct, avg_corners_for, avg_corners_against, avg_total_corners, over_95_corners_pct, avg_cards_for, avg_cards_against, avg_total_cards, over_35_cards_pct, form_string')
      .ilike('team_name', `%${homeTeam}%`).limit(1).maybeSingle()).data;
    const a = awayRolling || (await supabaseClient.from('team_rolling_stats')
      .select('team_name, avg_goals_scored, avg_goals_conceded, avg_total_goals, over_25_goals_pct, btts_pct, avg_corners_for, avg_corners_against, avg_total_corners, over_95_corners_pct, avg_cards_for, avg_cards_against, avg_total_cards, over_35_cards_pct, form_string')
      .ilike('team_name', `%${awayTeam}%`).limit(1).maybeSingle()).data;

    if (h && a) {
      const cat = sel.market.split(':')[0];
      if (cat === 'goals') {
        statsBlock = `HOME - ${h.team_name} (L10): avg ${h.avg_goals_scored} goals scored/gm, avg ${h.avg_goals_conceded} conceded/gm, total avg ${h.avg_total_goals} goals/gm, O1.5 hit rate high, O2.5 ${h.over_25_goals_pct}%, form ${h.form_string}. AWAY - ${a.team_name} (L10): avg ${a.avg_goals_scored} goals scored/gm, avg ${a.avg_goals_conceded} conceded/gm, total avg ${a.avg_total_goals} goals/gm, O2.5 ${a.over_25_goals_pct}%, form ${a.form_string}. COMBINED: avg ${((h.avg_total_goals + a.avg_total_goals) / 2).toFixed(1)} goals/gm across both teams' L10.`;
      } else if (cat === 'corners') {
        statsBlock = `HOME - ${h.team_name} (L10): avg ${h.avg_corners_for} corners won/gm, avg ${h.avg_corners_against} conceded/gm, total avg ${h.avg_total_corners} corners/gm, O9.5 ${h.over_95_corners_pct}%, form ${h.form_string}. AWAY - ${a.team_name} (L10): avg ${a.avg_corners_for} corners won/gm, avg ${a.avg_corners_against} conceded/gm, total avg ${a.avg_total_corners} corners/gm, O9.5 ${a.over_95_corners_pct}%. COMBINED: avg ${((h.avg_total_corners + a.avg_total_corners) / 2).toFixed(1)} corners/gm across both teams' L10.`;
      } else if (cat === 'cards') {
        statsBlock = `HOME - ${h.team_name} (L10): avg ${h.avg_cards_for} cards committed/gm, avg ${h.avg_cards_against} opponent cards/gm, total avg ${h.avg_total_cards} cards/gm, O3.5 ${h.over_35_cards_pct}%, form ${h.form_string}. AWAY - ${a.team_name} (L10): avg ${a.avg_cards_for} cards committed/gm, avg ${a.avg_cards_against} opponent cards/gm, total avg ${a.avg_total_cards} cards/gm, O3.5 ${a.over_35_cards_pct}%. COMBINED: avg ${((h.avg_total_cards + a.avg_total_cards) / 2).toFixed(1)} cards/gm across both teams' L10.`;
      }
    }
  } catch (e) { console.warn('Stats fetch failed:', e); }

  if (matchIntel) {
    const parts: string[] = [];
    if ((matchIntel as any).home_injury_count > 2) parts.push(`${matchIntel.home_team}: ${(matchIntel as any).home_injury_count} injuries`);
    if ((matchIntel as any).away_injury_count > 2) parts.push(`${matchIntel.away_team}: ${(matchIntel as any).away_injury_count} injuries`);
    if (matchIntel.referee_name) parts.push(`Ref: ${matchIntel.referee_name}${matchIntel.referee_avg_cards ? ` (${matchIntel.referee_avg_cards.toFixed(1)} cards/gm)` : ''}`);
    if ((matchIntel as any).weather_condition) parts.push(`Weather: ${(matchIntel as any).weather_condition}`);
    if (parts.length) intelBlock = parts.join('. ');
  }

  if (!apiKey) return `${sel.teamName} ${sel.marketLabel} @ ${sel.legOdds?.toFixed(2) || '?'}. ${statsBlock || 'Solid form.'}`;

  const prompt = `You produce TWO sections for a football ACCA leg analysis. Output separated by exactly "---GAFFER---" on its own line.

ABSOLUTE RULE: This bet has ALREADY been selected by our data engine. Your job is to SUPPORT the pick with the best stats. You MUST frame everything positively toward ${sel.marketLabel}. NEVER say the stats are low, poor, unlikely, or use words like "low-octane", "modest", "underwhelming". If a combined average is close to the threshold, frame it as "right on the mark" or "consistently hitting". If one team is weaker, focus on the STRONGER team's stats. NEVER contradict the selected market.

SECTION 1 - 📊 STATS & FACTS (30-40 words MAX): Quote SPECIFIC L10 numbers for BOTH teams relevant to ${sel.marketLabel}. Emphasise the strongest stats that SUPPORT this market. Combined average, % hitting threshold, form runs.
---GAFFER---
SECTION 2 - THE GAFFER (30-40 words MAX): Witty, confident pundit take explaining WHY this market lands. Reference at least one specific number. Unique vocabulary. No cliché openers.

CRITICAL: STRICTLY 30-40 words per section. NEVER undermine the pick.

LANGUAGE: British English ONLY. Use "selections", "legs", "bets", "picks". NEVER say "lines" (US term for bets), "parlay", "moneyline", "juice", or "chalk".

BANNED: "get it in the bag", "nailed on", "banker", "proper value", "the numbers don't lie", "bang it on", "thank me later", "Listen up lads", "After 40 years", "leaky backline", "dead cert", "easy money", "fill your boots", "slam it on", "lump on", "pile in", "mark my words", "trust the process", "low-octane", "modest", "underwhelming", "unlikely", "questionable", "risky"

Match: ${homeTeam} vs ${awayTeam} (${sel.league}). Market: ${sel.marketLabel} @ ${sel.legOdds?.toFixed(2) || '?'}.
${statsBlock ? `RAW DATA: ${statsBlock}` : ''}
${intelBlock ? `INTEL: ${intelBlock}` : ''}`;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }], temperature: 0.85, max_tokens: 200 }),
    });
    if (res.ok) {
      const d = await res.json();
      const c = d.choices?.[0]?.message?.content?.trim();
      if (c) return ensureGafferFormat(c);
    }
  } catch (e) { console.warn('AI leg fail:', e); }

  return `${sel.teamName} ${sel.marketLabel} @ ${sel.legOdds?.toFixed(2) || '?'}. ${statsBlock || 'Strong form table data.'}`;
}

async function generateGafferReasoningAI(selections: AccaSelection[], odds: number, supabaseClient?: any): Promise<string> {
  const avgCombined = Math.round(selections.reduce((sum, s) => sum + s.successPercent, 0) / selections.length);
  const selCount = selections.length;
  const typeLabel = selCount === 2 ? 'double' : selCount === 3 ? 'treble' : '4-fold';
  
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) return `This ${typeLabel} at ${odds.toFixed(2)} gives ${avgCombined}% average confidence. Data-backed selections.`;

  let statsContext = '';
  if (supabaseClient) {
    try {
      const teamNames = [...new Set(selections.flatMap(s => [s.teamName, s.opposition]))];
      const { data: rollingStats } = await supabaseClient.from('team_rolling_stats')
        .select('team_name, avg_goals_scored, avg_goals_conceded, avg_total_corners, avg_total_cards, btts_pct, over_25_goals_pct, form_string')
        .in('team_name', teamNames);
      if (rollingStats?.length) {
        statsContext = '\nTEAM DATA:\n' + rollingStats.map((r: any) => 
          `${r.team_name}: ${r.avg_goals_scored} goals/gm, ${r.avg_goals_conceded} conceded, corners ${r.avg_total_corners}, cards ${r.avg_total_cards}, BTTS ${r.btts_pct}%, O2.5 ${r.over_25_goals_pct}%, form ${r.form_string}`
        ).join('\n');
      }
    } catch (e) { console.warn('Stats fetch for ACCA reasoning:', e); }
  }

  const legsDesc = selections.map((s, i) => 
    `Leg ${i+1}: ${s.teamName} vs ${s.opposition} (${s.league}) - ${s.marketLabel} @ ${s.legOdds?.toFixed(2) || '?'} (${s.successPercent}%)`
  ).join('\n');

  const openers = ["Right then, here's the accumulator", "The form tables have spoken", "This one's been brewing all morning", "Get your slip ready for this beauty"];
  const forcedOpener = openers[Math.floor(Math.random() * openers.length)];

  const prompt = `You produce TWO sections for an ACCA analysis. Output separated by exactly "---GAFFER---" on its own line.

ABSOLUTE RULE: Every leg has ALREADY been selected by our data engine. Your job is to SUPPORT each pick. NEVER say stats are low, poor, unlikely, or contradict any selection. Frame everything positively. If averages are close to thresholds, say "consistently around" or "right on the mark". Focus on the STRONGEST supporting stats for each leg.

SECTION 1 - 📊 STATS & FACTS (30-40 words MAX): For each leg, one key L10 stat per team. Quote SPECIFIC numbers. Combined averages where relevant.
---GAFFER---
SECTION 2 - THE GAFFER'S VERDICT (30-40 words MAX): Connect the legs into a coherent, CONFIDENT narrative. Reference at least 2 specific stats. Unique closer about the ${odds.toFixed(2)} combined odds.

CRITICAL: STRICTLY 30-40 words per section. NEVER undermine any pick.

LANGUAGE: British English ONLY. Use "selections", "legs", "bets", "picks". NEVER say "lines" (US term for bets), "parlay", "moneyline", "juice", or "chalk".

BANNED: "get it in the bag", "nailed on", "banker", "proper value", "the numbers don't lie", "bang it on", "thank me later", "Listen up lads", "After 40 years", "dead cert", "easy money", "fill your boots", "slam it on", "lump on", "pile in", "mark my words", "trust the process", "no-brainer", "low-octane", "modest", "underwhelming", "unlikely", "questionable", "risky"

ACCA: ${typeLabel} @ ${odds.toFixed(2)} combined. Avg confidence: ${avgCombined}%.
${legsDesc}
${statsContext}`;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'google/gemini-3-flash-preview', messages: [{ role: 'user', content: prompt }], temperature: 0.85, max_tokens: 350 }),
    });
    if (!res.ok) throw new Error(`AI ${res.status}`);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (content) return ensureGafferFormat(content);
  } catch (e) { console.warn('ACCA AI fallback:', e); }

  return `${forcedOpener}. This ${typeLabel} at ${odds.toFixed(2)} combined gives us ${avgCombined}% average confidence across ${selCount} data-backed legs. Pure form-table selections with proper value.`;
}

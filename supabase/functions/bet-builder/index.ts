import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============ ML JSON CONFIGURATION ============
// Fetch from Supabase Storage (public bucket) instead of Cloudflare tunnel
const SUPABASE_PROJECT_ID = 'ffonednbxcfhzxardvry';
const ML_JSON_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/ml-models/latest/predictions_all_markets.json`;

const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

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
// Odds API removed — using API-Football bulk odds (unified with golden-bets)

// ML Probability Thresholds (minimums for bet builder)
// UPDATED: Using EASIER thresholds - Over 2.5 Goals, Over 8.5 Corners, Over 2.5 Cards
const BB_THRESHOLDS = {
  over_2_5_cards: 0.65,    // Easier: 2.5 cards instead of 3.5
  over_8_5_corners: 0.65,  // Easier: 8.5 corners instead of 9.5
  btts: 0.62,
  over_2_5_goals: 0.65,    // Slightly relaxed
};

// Cache for ML predictions (30 min TTL)
const ML_CACHE = new Map<string, { data: Map<string, MLPrediction>; timestamp: number }>();
const ML_CACHE_TTL = 30 * 60 * 1000;

// Bookmaker logos
const BOOKMAKER_LOGOS: Record<string, string> = {
  bet365: 'https://cdn.freebiesupply.com/logos/large/2x/bet365-logo-png-transparent.png',
  williamhill: 'https://cdn.freebiesupply.com/logos/large/2x/william-hill-logo-png-transparent.png',
  paddypower: 'https://upload.wikimedia.org/wikipedia/en/d/d8/Paddy_Power_logo.svg',
  betfair: 'https://cdn.freebiesupply.com/logos/large/2x/betfair-logo-png-transparent.png',
  unibet: 'https://cdn.freebiesupply.com/logos/large/2x/unibet-logo-png-transparent.png',
  betway: 'https://cdn.freebiesupply.com/logos/large/2x/betway-logo-png-transparent.png',
  ladbrokes: 'https://cdn.freebiesupply.com/logos/large/2x/ladbrokes-logo-png-transparent.png',
};

// (Odds API sport keys removed — using API-Football bulk odds)

// Known Brazilian teams to help identify Brazilian Serie A
const BRAZILIAN_TEAMS = new Set([
  'corinthians', 'palmeiras', 'flamengo', 'santos', 'sao paulo', 'são paulo',
  'gremio', 'grêmio', 'internacional', 'atletico mineiro', 'atlético mineiro',
  'cruzeiro', 'fluminense', 'botafogo', 'vasco', 'bahia', 'fortaleza', 
  'sport recife', 'vitoria', 'vitória', 'ceara', 'ceará', 'goias', 'goiás',
  'athletico paranaense', 'cuiaba', 'cuiabá', 'bragantino', 'juventude',
  'america mineiro', 'américa mineiro', 'coritiba', 'avaí', 'avai', 'chapecoense',
  'remo', 'paysandu', 'guarani', 'ponte preta', 'nautico', 'náutico'
]);

// Known Italian teams to help identify Italian Serie A
const ITALIAN_TEAMS = new Set([
  'juventus', 'inter', 'milan', 'ac milan', 'inter milan', 'napoli', 'roma',
  'lazio', 'atalanta', 'fiorentina', 'torino', 'bologna', 'sassuolo', 'udinese',
  'verona', 'empoli', 'lecce', 'monza', 'salernitana', 'spezia', 'sampdoria',
  'cagliari', 'genoa', 'parma', 'venezia', 'frosinone', 'como'
]);

// ============ LEAGUE NAME CORRECTION ============
// Fixes ambiguous league names like "Serie A" based on team names
function getCorrectLeagueName(league: string, homeTeam: string, awayTeam: string): string {
  const leagueLower = league.toLowerCase();
  const homeLower = homeTeam.toLowerCase();
  const awayLower = awayTeam.toLowerCase();
  
  // Handle ambiguous "Serie A" - could be Italian or Brazilian
  if (leagueLower === 'serie a' || leagueLower === 'série a') {
    const isBrazilian = [...BRAZILIAN_TEAMS].some(t => homeLower.includes(t) || awayLower.includes(t));
    const isItalian = [...ITALIAN_TEAMS].some(t => homeLower.includes(t) || awayLower.includes(t));
    
    if (isBrazilian && !isItalian) {
      console.log(`🇧🇷 Corrected league: "Serie A" → "Brazilian Serie A" for ${homeTeam} vs ${awayTeam}`);
      return 'Brazilian Serie A';
    }
    if (isItalian && !isBrazilian) {
      console.log(`🇮🇹 Corrected league: "Serie A" → "Italian Serie A" for ${homeTeam} vs ${awayTeam}`);
      return 'Italian Serie A';
    }
  }
  
  return league;
}

interface MLMarketPrediction {
  probability: number;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

interface MLPrediction {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  league_id: number;
  kickoff: string;
  markets: {
    over_2_5_goals?: MLMarketPrediction;
    btts?: MLMarketPrediction;
    over_8_5_corners?: MLMarketPrediction;
    over_9_5_corners?: MLMarketPrediction; // Keep for backwards compat
    over_2_5_cards?: MLMarketPrediction;
    over_3_5_cards?: MLMarketPrediction; // Keep for backwards compat
  };
}

interface BetBuilderCandidate {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  leagueId: number;
  kickoff: string;
  markets: string[];
  marketConfidences: {
    over_25_goals?: number;
    btts?: number;
    over_85_corners?: number;
    over_25_cards?: number;
  };
  combinedOdds: number;
  averageConfidence: number;
}

interface BookmakerInfo {
  key: string;
  title: string;
  logo?: string;
  lastUpdate?: string;
}

// ============ ML API FETCH ============
type FetchMLResult = {
  predictions: Map<string, MLPrediction> | null;
  feedDate?: string;
  generatedAt?: string;
  modelVersion?: string;
  error?: 'fetch_failed' | 'date_mismatch' | 'invalid_payload';
};

async function fetchMLPredictions(date: string): Promise<FetchMLResult> {
  const cacheKey = `all-markets_${date}`;
  const cached = ML_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ML_CACHE_TTL) {
    console.log(`📦 ML Cache hit: ${cacheKey}`);
    return { predictions: cached.data, feedDate: date };
  }

  try {
    console.log(`🤖 Fetching ML predictions from ${ML_JSON_URL}`);
    
    const response = await fetch(ML_JSON_URL);

    if (!response.ok) {
      console.error(`ML JSON fetch error: ${response.status}`);
      return { predictions: null, error: 'fetch_failed' };
    }

    const data = await response.json();
    const feedDate = data?.date;
    const generatedAt = typeof data?.generated_at === 'string' ? data.generated_at : undefined;
    const modelVersion = typeof data?.model_version === 'string' ? data.model_version : undefined;

    if (!isISODate(feedDate)) {
      console.error(`❌ ML feed invalid payload (missing/invalid date). Got ${String(feedDate)}`);
      return { predictions: null, feedDate: String(feedDate ?? ''), generatedAt, modelVersion, error: 'invalid_payload' };
    }

    if (feedDate !== date) {
      console.error(`❌ ML feed date mismatch. Expected ${date}, got ${feedDate}`);
      return { predictions: null, feedDate, generatedAt, modelVersion, error: 'date_mismatch' };
    }

    const map = new Map<string, MLPrediction>();

    for (const raw of data.predictions || []) {
      const fixtureId = String(raw?.fixture_id ?? raw?.fixtureId ?? '');
      if (!fixtureId || fixtureId === '0') continue;

      const homeTeam = raw?.home_team ?? raw?.homeTeam;
      const awayTeam = raw?.away_team ?? raw?.awayTeam;
      const league = raw?.league;
      const leagueId = asNumber(raw?.league_id ?? raw?.leagueId);
      const kickoff = raw?.kickoff;

      if (
        typeof homeTeam !== 'string' ||
        typeof awayTeam !== 'string' ||
        typeof league !== 'string' ||
        typeof kickoff !== 'string' ||
        leagueId === null ||
        !raw?.markets ||
        typeof raw.markets !== 'object'
      ) {
        continue;
      }

      const markets: any = {};
      for (const [k, v] of Object.entries(raw.markets)) {
        const p = asNumber((v as any)?.probability ?? (v as any)?.prob);
        if (p !== null) markets[k] = { probability: p };
      }
      if (Object.keys(markets).length === 0) continue;

      map.set(fixtureId, {
        fixture_id: fixtureId,
        home_team: homeTeam,
        away_team: awayTeam,
        league,
        league_id: leagueId,
        kickoff,
        markets,
      });
    }

    ML_CACHE.set(cacheKey, { data: map, timestamp: Date.now() });
    console.log(`✅ Cached ${map.size} ML predictions for bet builder`);
    return { predictions: map, feedDate, generatedAt, modelVersion };
  } catch (error) {
    console.error('ML API fetch failed:', error);
    return { predictions: null, error: 'fetch_failed' };
  }
}

// ============ FRIENDLY MATCH EXCLUSION ============
function isFriendlyMatch(league: string): boolean {
  const leagueLower = league.toLowerCase();
  return leagueLower.includes('friendly') || leagueLower.includes('friendlies');
}

// ============ LEAGUE TIER PRIORITIZATION ============
// Tier 1: Premium UEFA Cups & International Competitions
const TIER_1_LEAGUES = new Set([
  2,    // UEFA Champions League
  3,    // UEFA Europa League
  848,  // UEFA Europa Conference League
  4,    // UEFA European Championship
  5,    // UEFA Nations League
  1,    // FIFA World Cup
  15,   // FIFA Club World Cup
  531,  // UEFA Super Cup
]);

// Tier 2: Top 5 European Leagues (Top Divisions ONLY)
const TIER_2_LEAGUES = new Set([
  39,   // Premier League (England)
  140,  // La Liga (Spain)
  78,   // Bundesliga (Germany)
  135,  // Serie A (Italy)
  61,   // Ligue 1 (France)
]);

// Tier 3: Second-tier European leagues & Major International Competitions
const TIER_3_LEAGUES = new Set([
  40,   // Championship (England)
  141,  // La Liga 2 (Spain)
  79,   // 2. Bundesliga (Germany)
  136,  // Serie B (Italy)
  62,   // Ligue 2 (France)
  94,   // Primeira Liga (Portugal)
  88,   // Eredivisie (Netherlands)
  179,  // Scottish Premiership
  144,  // Belgian Pro League
  203,  // Süper Lig (Turkey)
  235,  // Russian Premier League
  // Major Cup Competitions
  45,   // FA Cup
  48,   // League Cup (EFL)
  143,  // Copa del Rey
  81,   // DFB Pokal
  137,  // Coppa Italia
  66,   // Coupe de France
  // South American Top Leagues
  71,   // Brasileirão Série A
  128,  // Argentine Liga Profesional
  13,   // Copa Libertadores
  11,   // Copa Sudamericana
]);

// Tier 4: Other established leagues (Americas, Asia top)
const TIER_4_LEAGUES = new Set([
  253,  // MLS (USA)
  262,  // Liga MX (Mexico)
  307,  // Saudi Pro League
  98,   // J1 League (Japan)
  292,  // K League 1 (South Korea)
  72,   // Brasileirão Série B
  // More European second divisions
  41,   // League One (England)
  42,   // League Two (England)
  113,  // Allsvenskan (Sweden)
  103,  // Eliteserien (Norway)
  119,  // Danish Superliga
  218,  // Austrian Bundesliga
  197,  // Super League (Greece)
  207,  // Swiss Super League
]);

// League names to exclude entirely (low-tier, unpredictable)
// CRITICAL: COMPLETE BAN on Women's, Youth, Reserve, and lower-tier leagues
const EXCLUDED_LEAGUE_PATTERNS = [
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
  'santosh trophy',
  'indian super league', 'i-league',
  'liga 2 indonesia', 'liga 1 indonesia',
  'thailand league', 'thai league',
  'malaysia super league', 'malaysian',
  'vietnam', 'cambodia', 'myanmar', 'laos',
  'bangladesh', 'nepal', 'maldives', 'bhutan',
];

function getLeagueTier(leagueId: number, leagueName: string): number {
  const nameLower = leagueName.toLowerCase();
  for (const pattern of EXCLUDED_LEAGUE_PATTERNS) {
    if (nameLower.includes(pattern)) return 999;
  }
  
  if (TIER_1_LEAGUES.has(leagueId)) return 1;
  if (TIER_2_LEAGUES.has(leagueId)) return 2;
  if (TIER_3_LEAGUES.has(leagueId)) return 3;
  if (TIER_4_LEAGUES.has(leagueId)) return 4;
  return 5;
}

function isExcludedLeague(leagueName: string): boolean {
  const nameLower = leagueName.toLowerCase();
  for (const pattern of EXCLUDED_LEAGUE_PATTERNS) {
    if (nameLower.includes(pattern)) return true;
  }
  return false;
}

// Also check team names for women's indicators (e.g., "Man City W", "Chelsea W")
function isExcludedTeam(teamName: string): boolean {
  if (!teamName) return false;
  const lower = teamName.toLowerCase();
  if (/\bw\b/i.test(teamName)) return true;
  return EXCLUDED_LEAGUE_PATTERNS.some(p => lower.includes(p));
}

// ============ POWER SCORE GATE ============
const POWER_SCORE_THRESHOLD_BB = 70;

interface PowerScoreEntry {
  fixture_id: string;
  over_25_goals_score: number;
  btts_score: number;
  over_95_corners_score: number;
  over_35_cards_score: number;
}

async function loadPowerScores(supabase: any, date: string): Promise<Map<string, PowerScoreEntry>> {
  const map = new Map<string, PowerScoreEntry>();
  try {
    const { data } = await supabase
      .from('match_power_scores')
      .select('fixture_id, over_25_goals_score, btts_score, over_95_corners_score, over_35_cards_score')
      .eq('computed_date', date);
    if (data) for (const row of data) map.set(String(row.fixture_id), row as PowerScoreEntry);
    console.log(`⚡ BB: Loaded ${map.size} power scores`);
  } catch (e) { console.warn('⚠️ Could not load power scores:', e); }
  return map;
}

function checkFixturePowerScore(scores: Map<string, PowerScoreEntry>, fixtureId: string): { pass: boolean; avgScore: number } {
  const entry = scores.get(fixtureId);
  if (!entry) return { pass: true, avgScore: 0 }; // Graceful degradation
  const goalsScore = Math.max(entry.over_25_goals_score, entry.btts_score);
  const cornersScore = entry.over_95_corners_score;
  const cardsScore = entry.over_35_cards_score;
  const avgScore = Math.round((goalsScore + cornersScore + cardsScore) / 3);
  return { pass: avgScore >= POWER_SCORE_THRESHOLD_BB, avgScore };
}

// ============ STAT GATE MINIMUMS (HARD RULES) ============
// These are non-negotiable minimums from real L10 team stats.
// If teams don't meet these, the market is REJECTED regardless of ML probability.
const STAT_GATES = {
  // Over 2.5 Goals: Both teams must average at least 1.2 goals scored each
  // AND combined avg total goals must be >= 2.6
  over_2_5_goals: {
    min_avg_goals_scored_each: 1.0,   // Each team must score 1.0+ on average
    min_combined_avg_total_goals: 2.6, // Combined match average must be 2.6+
    min_over_25_pct_each: 40,          // Each team must hit O2.5 in 40%+ of games
  },
  // BTTS: Both teams must score in 55%+ of their games AND average 1.0+ goals each
  btts: {
    min_btts_pct_each: 50,             // Each team's BTTS rate must be 50%+
    min_avg_goals_scored_each: 0.9,    // Each team must score 0.9+ on average
  },
  // Over 8.5 Corners: Combined avg total corners must be 9.0+
  over_8_5_corners: {
    min_combined_avg_total_corners: 9.0,
    min_over_85_pct_each: 35,          // Each team's O8.5 corners rate
  },
  // Over 2.5 Cards: Combined avg total cards must be 3.5+
  over_2_5_cards: {
    min_combined_avg_total_cards: 3.2,
    min_over_25_cards_pct_each: 40,
  },
};

interface TeamRollingStatsGate {
  avg_goals_scored: number;
  avg_total_goals: number;
  over_25_goals_pct: number;
  btts_pct: number;
  avg_total_corners: number;
  over_85_corners_pct: number;
  avg_total_cards: number;
  over_25_cards_pct: number;
  over_35_cards_pct: number;
  team_name: string;
}

// Cache for rolling stats (refreshed per invocation)
let rollingStatsCache: Map<string, TeamRollingStatsGate> | null = null;

async function loadRollingStatsCache(supabase: any): Promise<Map<string, TeamRollingStatsGate>> {
  if (rollingStatsCache) return rollingStatsCache;

  const { data, error } = await supabase
    .from('team_rolling_stats')
    .select('team_name, avg_goals_scored, avg_total_goals, over_25_goals_pct, btts_pct, avg_total_corners, over_85_corners_pct, avg_total_cards, over_25_cards_pct, over_35_cards_pct')
    .gte('matches_used', 5);

  const map = new Map<string, TeamRollingStatsGate>();
  if (error || !data) {
    console.error('⚠️ Failed to load rolling stats for stat gates:', error?.message);
    return map;
  }

  for (const row of data) {
    const key = (row.team_name || '').trim().toLowerCase();
    if (key) map.set(key, row as TeamRollingStatsGate);
  }

  rollingStatsCache = map;
  console.log(`📊 Loaded ${map.size} team rolling stats for stat gates`);
  return map;
}

function findTeamStats(statsMap: Map<string, TeamRollingStatsGate>, teamName: string): TeamRollingStatsGate | null {
  const key = teamName.trim().toLowerCase();
  if (statsMap.has(key)) return statsMap.get(key)!;
  // Fuzzy: try without FC/AFC/SC suffixes
  const stripped = key.replace(/\b(fc|afc|sc|cf|cd)\b/g, '').replace(/\s+/g, ' ').trim();
  for (const [k, v] of statsMap) {
    if (k.includes(stripped) || stripped.includes(k)) return v;
  }
  return null;
}

function checkStatGates(
  homeStats: TeamRollingStatsGate | null,
  awayStats: TeamRollingStatsGate | null,
  market: string,
  homeTeam: string,
  awayTeam: string
): { pass: boolean; reason?: string } {
  // If we don't have stats for either team, we CANNOT verify — fail safe
  if (!homeStats || !awayStats) {
    return { pass: false, reason: `Missing rolling stats for ${!homeStats ? homeTeam : awayTeam}` };
  }

  if (market === 'over_25_goals' || market === 'over_2_5_goals') {
    const gates = STAT_GATES.over_2_5_goals;
    const combinedAvg = (homeStats.avg_total_goals + awayStats.avg_total_goals) / 2;
    if (homeStats.avg_goals_scored < gates.min_avg_goals_scored_each) {
      return { pass: false, reason: `${homeTeam} avg goals scored ${homeStats.avg_goals_scored} < ${gates.min_avg_goals_scored_each}` };
    }
    if (awayStats.avg_goals_scored < gates.min_avg_goals_scored_each) {
      return { pass: false, reason: `${awayTeam} avg goals scored ${awayStats.avg_goals_scored} < ${gates.min_avg_goals_scored_each}` };
    }
    if (combinedAvg < gates.min_combined_avg_total_goals) {
      return { pass: false, reason: `Combined avg total goals ${combinedAvg.toFixed(1)} < ${gates.min_combined_avg_total_goals}` };
    }
    if (homeStats.over_25_goals_pct < gates.min_over_25_pct_each || awayStats.over_25_goals_pct < gates.min_over_25_pct_each) {
      return { pass: false, reason: `O2.5 hit rate too low (${homeTeam}: ${homeStats.over_25_goals_pct}%, ${awayTeam}: ${awayStats.over_25_goals_pct}%)` };
    }
    return { pass: true };
  }

  if (market === 'btts') {
    const gates = STAT_GATES.btts;
    if (homeStats.btts_pct < gates.min_btts_pct_each || awayStats.btts_pct < gates.min_btts_pct_each) {
      return { pass: false, reason: `BTTS rate too low (${homeTeam}: ${homeStats.btts_pct}%, ${awayTeam}: ${awayStats.btts_pct}%)` };
    }
    if (homeStats.avg_goals_scored < gates.min_avg_goals_scored_each || awayStats.avg_goals_scored < gates.min_avg_goals_scored_each) {
      return { pass: false, reason: `Goals scored avg too low for BTTS` };
    }
    return { pass: true };
  }

  if (market === 'over_85_corners' || market === 'over_8_5_corners') {
    const gates = STAT_GATES.over_8_5_corners;
    const combinedCorners = (homeStats.avg_total_corners + awayStats.avg_total_corners) / 2;
    if (combinedCorners < gates.min_combined_avg_total_corners) {
      return { pass: false, reason: `Combined avg corners ${combinedCorners.toFixed(1)} < ${gates.min_combined_avg_total_corners}` };
    }
    if (homeStats.over_85_corners_pct < gates.min_over_85_pct_each || awayStats.over_85_corners_pct < gates.min_over_85_pct_each) {
      return { pass: false, reason: `O8.5 corners hit rate too low` };
    }
    return { pass: true };
  }

  if (market === 'over_25_cards' || market === 'over_2_5_cards') {
    const gates = STAT_GATES.over_2_5_cards;
    const combinedCards = (homeStats.avg_total_cards + awayStats.avg_total_cards) / 2;
    if (combinedCards < gates.min_combined_avg_total_cards) {
      return { pass: false, reason: `Combined avg cards ${combinedCards.toFixed(1)} < ${gates.min_combined_avg_total_cards}` };
    }
    if (homeStats.over_25_cards_pct < gates.min_over_25_cards_pct_each || awayStats.over_25_cards_pct < gates.min_over_25_cards_pct_each) {
      return { pass: false, reason: `O2.5 cards hit rate too low` };
    }
    return { pass: true };
  }

  return { pass: true };
}

// ============ BET BUILDER SELECTION (3-LEG) WITH TIER PRIORITIZATION + STAT GATES + POWER SCORES ============
// Returns ALL qualifying candidates sorted by tier then confidence
async function selectAllBetBuilderCandidates(
  mlPredictions: Map<string, MLPrediction>,
  excludeFixtureIds: Set<string> = new Set(),
  thresholdRelax: number = 0,
  excludeTeamKeys: Set<string> = new Set(),
  supabase?: any,
  powerScoresMap?: Map<string, PowerScoreEntry>
): Promise<BetBuilderCandidate[]> {
  const candidates: BetBuilderCandidate[] = [];

  // Load rolling stats for stat gates
  const statsMap = supabase ? await loadRollingStatsCache(supabase) : new Map<string, TeamRollingStatsGate>();
  const hasStatGates = statsMap.size > 0;
  if (!hasStatGates) {
    console.warn('⚠️ No rolling stats available — stat gates DISABLED (degraded mode)');
  }

  const normTeamLocal = (t: string) => (t || '').trim().toLowerCase()
    .replace(/\bfc\b/g, '').replace(/\bafc\b/g, '').replace(/\bsc\b/g, '')
    .replace(/\s+/g, ' ').trim();

  const adjusted = {
    over_2_5_cards: Math.max(0.50, BB_THRESHOLDS.over_2_5_cards - thresholdRelax),
    over_8_5_corners: Math.max(0.50, BB_THRESHOLDS.over_8_5_corners - thresholdRelax),
    btts: Math.max(0.50, BB_THRESHOLDS.btts - thresholdRelax),
    over_2_5_goals: Math.max(0.50, BB_THRESHOLDS.over_2_5_goals - thresholdRelax),
  };

  for (const pred of mlPredictions.values()) {
    // 🚫 EXCLUDE FRIENDLIES
    if (isFriendlyMatch(pred.league)) {
      console.log(`🚫 Excluding friendly: ${pred.home_team} vs ${pred.away_team} (${pred.league})`);
      continue;
    }
    
    // 🚫 EXCLUDE LOW-TIER LEAGUES
    const tier = getLeagueTier(pred.league_id, pred.league);
    if (tier === 999) {
      console.log(`🚫 Excluding low-tier league: ${pred.home_team} vs ${pred.away_team} (${pred.league})`);
      continue;
    }
    
    // Only consider Tiers 1-4 (exclude Tier 5 unknown leagues)
    if (tier > 4) {
      console.log(`⚠️ Skipping unknown league (Tier ${tier}): ${pred.league}`);
      continue;
    }

    // 🃏 CARDS LEAGUE GATE: Cards leg ONLY for Tier 1-2 leagues
    // (bookmakers only reliably offer card markets for top leagues)
    const cardsAllowed = tier <= 2;
    
    // Skip fixtures already used by Golden Bets (by fixture_id)
    if (excludeFixtureIds.has(pred.fixture_id)) {
      console.log(`🚫 Skipping Golden Bet fixture (ID match): ${pred.home_team} vs ${pred.away_team}`);
      continue;
    }

    // Skip fixtures already used by Golden Bets (by team name match - bulletproof)
    const teamKey = `${normTeamLocal(pred.home_team)}|${normTeamLocal(pred.away_team)}`;
    if (excludeTeamKeys.has(teamKey)) {
      console.log(`🚫 Skipping Golden Bet fixture (team-name match): ${pred.home_team} vs ${pred.away_team}`);
      continue;
    }

    // ⚡ POWER SCORE GATE — reject fixtures with weak combined power score
    if (powerScoresMap && powerScoresMap.size > 0) {
      const ps = checkFixturePowerScore(powerScoresMap, pred.fixture_id);
      if (!ps.pass) {
        console.log(`⚡ POWER SCORE REJECT: ${pred.home_team} vs ${pred.away_team} — Avg ${ps.avgScore}/${POWER_SCORE_THRESHOLD_BB}`);
        continue;
      }
    }
    
    const m = pred.markets || {};
    
    // Get probabilities - prefer easier markets (8.5 corners, 2.5 cards)
    const goalsProb = m.over_2_5_goals?.probability || 0;
    const bttsProb = m.btts?.probability || 0;
    // Use 8.5 corners if available, fallback to 9.5
    const cornersProb = m.over_8_5_corners?.probability || m.over_9_5_corners?.probability || 0;
    // Use 2.5 cards if available, fallback to 3.5 — BUT only if cards allowed for this league
    const cardsProb = cardsAllowed ? (m.over_2_5_cards?.probability || m.over_3_5_cards?.probability || 0) : 0;

    // Bet Builder structure: Goals (O2.5 OR BTTS) + Corners (O8.5) + Cards (O2.5, top leagues only)
    // Pick the higher of goals/btts
     const goalsMarket = goalsProb >= bttsProb
       ? { key: 'over_25_goals', prob: goalsProb, threshold: adjusted.over_2_5_goals }
       : { key: 'btts', prob: bttsProb, threshold: adjusted.btts };

    // Check legs - cards only if allowed for this league tier
    const goalsPass = goalsMarket.prob >= goalsMarket.threshold;
     const cornersPass = cornersProb >= adjusted.over_8_5_corners;
     const cardsPass = cardsAllowed && cardsProb >= adjusted.over_2_5_cards;

    // Must have goals + corners at minimum; cards is a bonus for top leagues
    if (!goalsPass || !cornersPass) continue;
    // If cards not available (wrong league or below threshold), build a 2-leg builder
    const useCards = cardsPass;

    // ============ 🛡️ STAT GATE CHECK (HARD RULES) ============
    if (hasStatGates) {
      const homeStats = findTeamStats(statsMap, pred.home_team);
      const awayStats = findTeamStats(statsMap, pred.away_team);

      // Check EACH leg against real team stats
      const goalsGate = checkStatGates(homeStats, awayStats, goalsMarket.key, pred.home_team, pred.away_team);
      if (!goalsGate.pass) {
        console.log(`🛡️ STAT GATE REJECT [${goalsMarket.key}]: ${pred.home_team} vs ${pred.away_team} — ${goalsGate.reason}`);
        continue;
      }

      const cornersGate = checkStatGates(homeStats, awayStats, 'over_85_corners', pred.home_team, pred.away_team);
      if (!cornersGate.pass) {
        console.log(`🛡️ STAT GATE REJECT [corners]: ${pred.home_team} vs ${pred.away_team} — ${cornersGate.reason}`);
        continue;
      }

      // Only check cards stat gate if cards are being used
      if (useCards) {
        const cardsGate = checkStatGates(homeStats, awayStats, 'over_25_cards', pred.home_team, pred.away_team);
        if (!cardsGate.pass) {
          console.log(`🛡️ STAT GATE REJECT [cards]: ${pred.home_team} vs ${pred.away_team} — ${cardsGate.reason}`);
          continue;
        }
      }

      console.log(`✅ STAT GATES PASSED: ${pred.home_team} vs ${pred.away_team}${useCards ? ' (with cards)' : ' (no cards - Tier ' + tier + ')'}`);
    }

    // Build markets and confidences based on available legs
    const markets = [goalsMarket.key, 'over_85_corners'];
    const confidences = [goalsMarket.prob * 100, cornersProb * 100];
    const marketConf: Record<string, number> = {
      [goalsMarket.key]: Math.round(goalsMarket.prob * 100),
      over_85_corners: Math.round(cornersProb * 100),
    };
    if (useCards) {
      markets.push('over_25_cards');
      confidences.push(cardsProb * 100);
      marketConf.over_25_cards = Math.round(cardsProb * 100);
    }

    const combinedOdds = calculateCombinedOdds(confidences);
    const averageConfidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);

    // Correct ambiguous league names (e.g., "Serie A" → "Brazilian Serie A")
    const correctedLeague = getCorrectLeagueName(pred.league, pred.home_team, pred.away_team);
    
    candidates.push({
      fixtureId: pred.fixture_id,
      homeTeam: pred.home_team,
      awayTeam: pred.away_team,
      league: correctedLeague,
      leagueId: pred.league_id,
      kickoff: pred.kickoff,
      markets,
      marketConfidences: marketConf,
      combinedOdds,
      averageConfidence,
    });

     console.log(
       `✅ Bet Builder candidate (Tier ${tier}): ${pred.home_team} vs ${pred.away_team} - ${averageConfidence}% avg`
     );
  }

  if (candidates.length === 0) return [];

  // 🏆 SORT BY LEAGUE TIER FIRST, THEN BY CONFIDENCE
  candidates.sort((a, b) => {
    const tierA = getLeagueTier(a.leagueId, a.league);
    const tierB = getLeagueTier(b.leagueId, b.league);
    if (tierA !== tierB) return tierA - tierB; // Lower tier = better (Tier 1 first)
    return b.averageConfidence - a.averageConfidence;
  });
  
  console.log(`📊 Total candidates after tier + stat gate filtering: ${candidates.length}`);
  return candidates;
}

async function selectBetBuilderCandidatesWithRelaxation(
  mlPredictions: Map<string, MLPrediction>,
  excludeFixtureIds: Set<string>,
  excludeTeamKeys: Set<string> = new Set(),
  supabase?: any,
  powerScoresMap?: Map<string, PowerScoreEntry>
): Promise<BetBuilderCandidate[]> {
  const steps = [0, 0.03, 0.06, 0.09];
  for (const s of steps) {
    const candidates = await selectAllBetBuilderCandidates(mlPredictions, excludeFixtureIds, s, excludeTeamKeys, supabase, powerScoresMap);
    if (candidates.length > 0) return candidates;
  }
  return [];
}

function calculateCombinedOdds(confidences: number[]): number {
  const odds = confidences.map(conf => {
    const impliedOdds = 1 / (conf / 100);
    const margin = 1 + (0.08 + Math.random() * 0.07);
    return Math.max(1.25, Math.min(2.20, impliedOdds * margin));
  });
  
  const combined = odds.reduce((acc, odd) => acc * odd, 1);
  return Math.round(combined * 100) / 100;
}

// ============ API-FOOTBALL ODDS (UNIFIED) ============
const BET365_ID_BB = 6;
const BET365_NAME_BB = 'bet365';

/**
 * Determine the correct API-Football season year.
 * European leagues (Aug-May) use the year the season started.
 * E.g. in Feb 2026, the 2025/26 season → season=2025.
 * Southern hemisphere / calendar-year leagues (MLS, J-League, etc.) use currentYear.
 */
const CALENDAR_YEAR_LEAGUES = new Set([253, 262, 98, 292, 71, 72, 307]); // MLS, Liga MX, J1, K1, Brasileirão A/B, Saudi

function getApiFootballSeason(leagueId: number): number[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  if (CALENDAR_YEAR_LEAGUES.has(leagueId)) {
    // Calendar-year leagues: try current year, then previous
    return [year, year - 1];
  }
  // European / Aug-May leagues: if Jan-Jul, season started previous year
  if (month <= 7) {
    return [year - 1, year];
  }
  return [year, year - 1];
}

interface RealOddsBB {
  odds: number;
  bookmaker: string;
  market: string;
  allBookmakerOdds: number[];
}

function medianBB(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function parseBookmakerOddsBB(
  bk: any,
  oddsCollector: Map<string, { odds: number; bookmaker: string; isBet365: boolean }[]>
) {
  const bookmakerName = bk.name || 'Unknown';
  const isBet365 = bookmakerName.toLowerCase().includes(BET365_NAME_BB) || bk.id === BET365_ID_BB;

  for (const bet of (bk.bets || [])) {
    const betName = (bet.name || '').toLowerCase();
    for (const val of (bet.values || [])) {
      const label = String(val.value || '').toLowerCase();
      const odds = parseFloat(val.odd);
      if (!odds || odds <= 0) continue;

      let marketKey = '';
      if (label === 'over 2.5' && !betName.includes('corner') && !betName.includes('card')) marketKey = 'over_2_5_goals';
      else if (label === 'yes' && (betName.includes('both teams') || betName === 'btts')) marketKey = 'btts';
      else if ((label === 'over 9.5' || label === 'over 9' || label === 'over 10') && betName.includes('corner')) marketKey = 'over_9_5_corners';
      else if ((label === 'over 8.5' || label === 'over 8') && betName.includes('corner')) marketKey = 'over_8_5_corners';
      else if ((label === 'over 3.5' || label === 'over 4' || label === 'over 3') && (betName.includes('card') || betName.includes('booking'))) marketKey = 'over_3_5_cards';
      else if ((label === 'over 2.5') && (betName.includes('card') || betName.includes('booking'))) marketKey = 'over_2_5_cards';

      if (marketKey) {
        if (!oddsCollector.has(marketKey)) oddsCollector.set(marketKey, []);
        oddsCollector.get(marketKey)!.push({ odds, bookmaker: bookmakerName, isBet365 });
      }
    }
  }
}

function resolveOddsBB(
  oddsCollector: Map<string, { odds: number; bookmaker: string; isBet365: boolean }[]>
): Map<string, RealOddsBB> {
  const results = new Map<string, RealOddsBB>();
  for (const [marketKey, entries] of oddsCollector) {
    if (entries.length === 0) continue;
    const bet365Entry = entries.find(e => e.isBet365);
    const allOdds = entries.map(e => e.odds);
    if (bet365Entry) {
      results.set(marketKey, { odds: Math.round(bet365Entry.odds * 100) / 100, bookmaker: bet365Entry.bookmaker, market: marketKey, allBookmakerOdds: allOdds });
    } else {
      const med = medianBB(allOdds);
      const closest = entries.reduce((best, e) => Math.abs(e.odds - med) < Math.abs(best.odds - med) ? e : best);
      results.set(marketKey, { odds: Math.round(med * 100) / 100, bookmaker: closest.bookmaker, market: marketKey, allBookmakerOdds: allOdds });
    }
  }
  return results;
}

async function fetchOddsPaginatedBB(apiKey: string, baseUrl: string): Promise<any[]> {
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

async function fetchOddsForLeagueBB(apiKey: string, leagueId: number, season: number): Promise<Map<string, Map<string, RealOddsBB>>> {
  try {
    console.log(`📊 BB Bulk odds fetch: league=${leagueId} season=${season}`);
    const bet365Url = `${API_FOOTBALL_BASE}/odds?league=${leagueId}&season=${season}&bookmaker=${BET365_ID_BB}`;
    const bet365Data = await fetchOddsPaginatedBB(apiKey, bet365Url);
    if (bet365Data.length > 0) {
      console.log(`  🎯 Bet365 odds: ${bet365Data.length} entries for league ${leagueId}`);
      return parseLeagueOddsResponseBB(bet365Data);
    }
    console.log(`  ⚠️ No Bet365 for league ${leagueId} — fetching all bookmakers`);
    const allUrl = `${API_FOOTBALL_BASE}/odds?league=${leagueId}&season=${season}`;
    const allData = await fetchOddsPaginatedBB(apiKey, allUrl);
    return parseLeagueOddsResponseBB(allData);
  } catch (e) {
    console.error(`Error bulk fetching BB odds for league ${leagueId}:`, e);
    return new Map();
  }
}

function parseLeagueOddsResponseBB(oddsData: any[]): Map<string, Map<string, RealOddsBB>> {
  const result = new Map<string, Map<string, RealOddsBB>>();
  for (const entry of oddsData) {
    const fixtureId = String(entry.fixture?.id || '');
    if (!fixtureId) continue;
    const oddsCollector = new Map<string, { odds: number; bookmaker: string; isBet365: boolean }[]>();
    for (const bk of (entry.bookmakers || [])) {
      parseBookmakerOddsBB(bk, oddsCollector);
    }
    const resolved = resolveOddsBB(oddsCollector);
    if (resolved.size > 0) result.set(fixtureId, resolved);
  }
  return result;
}

// ============ GAFFER REASONING - SIMPLE & PUNCHY ============
async function getGafferBetBuilderReasoning(candidate: BetBuilderCandidate, apiKey: string, supabaseClient?: any): Promise<string> {
  const marketNames: Record<string, string> = {
    over_25_goals: 'Over 2.5 Goals',
    btts: 'Both Teams To Score',
    over_85_corners: 'Over 8.5 Corners',
    over_95_corners: 'Over 9.5 Corners',
    over_25_cards: 'Over 2.5 Cards',
  };

  const selectedMarkets = candidate.markets.map(m => marketNames[m] || m).join(' + ');

  // Fetch rolling stats + match intelligence for rich context
  let statsBlock = '';
  let intelBlock = '';
  
  if (supabaseClient) {
    try {
      const [{ data: homeRolling }, { data: awayRolling }] = await Promise.all([
        supabaseClient.from('team_rolling_stats')
          .select('team_name, avg_goals_scored, avg_goals_conceded, avg_total_goals, over_25_goals_pct, btts_pct, avg_corners_for, avg_corners_against, avg_total_corners, over_95_corners_pct, avg_cards_for, avg_cards_against, avg_total_cards, over_35_cards_pct, form_string')
          .ilike('team_name', `%${candidate.homeTeam}%`).limit(1).maybeSingle(),
        supabaseClient.from('team_rolling_stats')
          .select('team_name, avg_goals_scored, avg_goals_conceded, avg_total_goals, over_25_goals_pct, btts_pct, avg_corners_for, avg_corners_against, avg_total_corners, over_95_corners_pct, avg_cards_for, avg_cards_against, avg_total_cards, over_35_cards_pct, form_string')
          .ilike('team_name', `%${candidate.awayTeam}%`).limit(1).maybeSingle(),
      ]);

      if (homeRolling && awayRolling) {
        const h = homeRolling as any;
        const a = awayRolling as any;
        statsBlock = `
REAL L10 STATS:
- ${h.team_name}: ${h.avg_goals_scored} goals/game, ${h.avg_goals_conceded} conceded, O2.5 ${h.over_25_goals_pct}%, BTTS ${h.btts_pct}%, corners avg ${h.avg_total_corners}, cards avg ${h.avg_total_cards}. Form: ${h.form_string}
- ${a.team_name}: ${a.avg_goals_scored} goals/game, ${a.avg_goals_conceded} conceded, O2.5 ${a.over_25_goals_pct}%, BTTS ${a.btts_pct}%, corners avg ${a.avg_total_corners}, cards avg ${a.avg_total_cards}. Form: ${a.form_string}`;
      }

      const { data: intel } = await supabaseClient.from('match_intelligence')
        .select('*').eq('fixture_id', candidate.fixtureId).maybeSingle();
      if (intel) {
        const parts: string[] = [];
        if (intel.home_key_players_out?.length) parts.push(`${candidate.homeTeam} missing: ${intel.home_key_players_out.join(', ')}`);
        if (intel.away_key_players_out?.length) parts.push(`${candidate.awayTeam} missing: ${intel.away_key_players_out.join(', ')}`);
        if (intel.referee_name && intel.referee_avg_cards) parts.push(`Referee: ${intel.referee_name} (${intel.referee_avg_cards.toFixed(1)} cards/game)`);
        if (intel.weather_condition) parts.push(`Weather: ${intel.weather_condition}, ${intel.weather_temp_celsius || '?'}°C`);
        if (parts.length) intelBlock = `\nMATCH INTELLIGENCE:\n${parts.map((p: string) => `- ${p}`).join('\n')}`;
      }
    } catch (e) {
      console.warn('Failed to fetch context for Bet Builder reasoning:', e);
    }
  }

  const openers = [
    "This one's got my attention",
    "Now THIS is what I call value", 
    "The numbers don't lie here",
    "Been waiting for this fixture all week",
    "Here's a treble that screams value"
  ];
  const forcedOpener = openers[Math.floor(Math.random() * openers.length)];
  
  const prompt = `You produce TWO sections for a football Bet Builder analysis. Output them separated by exactly "---GAFFER---" on its own line.

SECTION 1 - STATS & FACTS (30-40 words MAX): Pure objective data supporting ALL 3 legs. Quote SPECIFIC L10 numbers for both teams across goals, corners, cards. Include combined averages. State any match intelligence plainly.

---GAFFER---

SECTION 2 - THE GAFFER'S VERDICT (30-40 words MAX): You are "The Gaffer" — sharp, cheeky British pundit. Connect the 3 legs. Reference at least one specific stat. Explain why this combination works. Unique confident closer.

CRITICAL RULES:
- STRICTLY 30-40 words per section. Count them.
- Section 1 = facts and numbers ONLY, zero personality
- Section 2 = personality, insight, wit — references the data but doesn't repeat it

LANGUAGE: You MUST write in British English. Use UK betting terminology: "selections", "legs", "bets", "picks", "punts". NEVER use the American term "lines" to refer to bets — that is US sportsbook language and we are a UK site.

ABSOLUTELY BANNED WORDS — NEVER USE THESE IN ANY CONTEXT:
- "line" or "lines" (NEVER say "clearing the line", "the Over line", "past the line" etc. — say "mark", "threshold", "target", or "hurdle" instead)
- "parlay" (say "accumulator" or "acca")
- "moneyline" (say "match result")
- "juice" (say "odds")
- "chalk" (say "favourite")

BANNED PHRASES: "get it in the bag", "nailed on", "banker", "proper value", "the numbers don't lie", "bang it on", "thank me later", "Listen up lads", "After 40 years", "leaky backline", "mark my words", "dead cert", "easy money", "fill your boots", "slam it on", "lump on", "pile in", "trust the process"

Match: ${candidate.homeTeam} vs ${candidate.awayTeam} (${candidate.league})
Bet Builder: ${selectedMarkets}
Combined Odds: ${candidate.combinedOdds}
Average Confidence: ${candidate.averageConfidence}%
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
        max_tokens: 220,
      }),
    });

    if (!response.ok) {
      return generateFallbackReasoning(candidate);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';
    return content.trim() ? ensureGafferFormat(content.trim()) : generateFallbackReasoning(candidate);
  } catch (error) {
    console.error('AI error:', error);
    return generateFallbackReasoning(candidate);
  }
}

function generateFallbackReasoning(candidate: BetBuilderCandidate): string {
  const marketDescriptions: Record<string, string> = {
    over_25_goals: 'goals flying in',
    btts: 'both nets bulging',
    over_85_corners: 'corners stacking up',
    over_95_corners: 'corners aplenty',
    over_25_cards: 'bookings flowing',
  };
  
  const markets = candidate.markets.map(m => marketDescriptions[m] || m).join(', ');
  
  return `Now THIS is what I call value. ${candidate.homeTeam} at home always brings the heat and ${candidate.awayTeam} won't sit back. Expect ${markets} at ${candidate.combinedOdds} odds. The stats back this up completely - bang it on and thank me later.`;
}

// ============ HEURISTIC FALLBACK (When ML unavailable) ============
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';

interface HeuristicFixture {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  league_id: number;
  kickoff: string;
}

async function fetchTodaysFixturesForBB(apiKey: string): Promise<HeuristicFixture[]> {
  const today = new Date().toISOString().split('T')[0];
  const fixtures: HeuristicFixture[] = [];
  
  // Use global date-based query to get ALL fixtures (not just UK/Germany)
  console.log(`📅 Fetching ALL fixtures for ${today} (heuristic mode)`);
  
  try {
    const url = `${API_FOOTBALL_BASE}/fixtures?date=${today}&timezone=UTC`;
    console.log(`📡 Querying global fixtures...`);
    
    const response = await fetch(url, {
      headers: { 'x-apisports-key': apiKey },
    });
    
    if (!response.ok) {
      console.log(`⚠️ Global fixtures query returned ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`📦 Found ${data.response?.length || 0} global fixtures`);
    
    for (const f of data.response || []) {
      const kickoff = f.fixture?.date;
      const leagueName = f.league?.name || 'Unknown';
      const leagueId = f.league?.id || 0;
      
      if (!kickoff) continue;
      
      // Skip matches that already started
      if (new Date(kickoff) < new Date()) continue;
      
      // 🚫 EXCLUDE FRIENDLIES
      if (isFriendlyMatch(leagueName)) {
        continue;
      }
      
      // 🚫 EXCLUDE LOW-TIER LEAGUES (Tier 5+)
      const tier = getLeagueTier(leagueId, leagueName);
      if (tier === 999 || tier > 4) {
        continue;
      }
      
      fixtures.push({
        fixture_id: String(f.fixture.id),
        home_team: f.teams?.home?.name || 'Unknown',
        away_team: f.teams?.away?.name || 'Unknown',
        league: leagueName,
        league_id: leagueId,
        kickoff,
      });
    }
  } catch (e) {
    console.error(`Error fetching global fixtures:`, e);
  }
  
  // 🏆 SORT BY TIER (prioritize premium competitions)
  fixtures.sort((a, b) => {
    const tierA = getLeagueTier(a.league_id, a.league);
    const tierB = getLeagueTier(b.league_id, b.league);
    return tierA - tierB;
  });
  
  console.log(`📅 Found ${fixtures.length} tier 1-4 fixtures for heuristic mode`);
  return fixtures;
}

async function fetchTeamFormForBB(supabase: any, teamName: string): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  
  try {
    const { data } = await supabase
      .from('regional_stats')
      .select('market, category, success_percent')
      .ilike('team_name', `%${teamName}%`)
      .limit(10);
    
    if (data) {
      for (const row of data) {
        const key = `${row.category}:${row.market}`;
        stats[key] = row.success_percent / 100;
      }
    }
  } catch (e) {
    console.error(`Error fetching stats for ${teamName}:`, e);
  }
  
  return stats;
}

// Returns ALL candidates sorted, not just the best one
function selectAllHeuristicBetBuilders(
  fixtures: HeuristicFixture[],
  homeStats: Map<string, Record<string, number>>,
  awayStats: Map<string, Record<string, number>>,
  excludeFixtureIds: Set<string> = new Set()
): BetBuilderCandidate | null {
  const candidates: BetBuilderCandidate[] = [];
  
  for (const fixture of fixtures) {
    // Skip fixtures already used by Golden Bets
    if (excludeFixtureIds.has(fixture.fixture_id)) {
      console.log(`🚫 Heuristic: Skipping Golden Bet fixture: ${fixture.home_team} vs ${fixture.away_team}`);
      continue;
    }
    
    const home = homeStats.get(fixture.home_team) || {};
    const away = awayStats.get(fixture.away_team) || {};
    
    // Use default probabilities if no stats found (0.60 baseline for heuristic)
    const defaultProb = 0.60;
    
    // 🃏 Cards only for major leagues (Tier 1-2)
    const majorLeagues = [39, 40, 41, 140, 78, 135, 61, 88, 2, 3, 79, 141, 136, 62, 94, 144, 179, 203];
    const isMajorLeague = majorLeagues.includes(fixture.league_id);
    const cardsAllowed = isMajorLeague;
    
    // Calculate probabilities for structure
    const goalsProb = ((home['goals:over_2_5'] || defaultProb) + (away['goals:over_2_5'] || defaultProb)) / 2;
    const bttsProb = ((home['btts:btts_yes'] || defaultProb) + (away['btts:btts_yes'] || defaultProb)) / 2;
    const cornersProb = ((home['corners:over_8_5'] || home['corners:over_9_5'] || defaultProb) + (away['corners:over_8_5'] || away['corners:over_9_5'] || defaultProb)) / 2;
    const cardsProb = cardsAllowed ? ((home['cards:over_2_5'] || defaultProb) + (away['cards:over_2_5'] || defaultProb)) / 2 : 0;
    
    // Pick best goals market
    const goalsMarket = goalsProb >= bttsProb
      ? { key: 'over_25_goals', prob: goalsProb }
      : { key: 'btts', prob: bttsProb };
    
    const boost = isMajorLeague ? 0.08 : 0;
    
    const finalGoalsProb = Math.min(0.85, goalsMarket.prob + boost);
    const finalCornersProb = Math.min(0.85, cornersProb + boost);
    const useCards = cardsAllowed && cardsProb >= 0.55;
    
    if (finalGoalsProb >= 0.55 && finalCornersProb >= 0.55) {
      const markets = [goalsMarket.key, 'over_85_corners'];
      const confidences = [finalGoalsProb * 100, finalCornersProb * 100];
      const marketConf: Record<string, number> = {
        [goalsMarket.key]: Math.round(finalGoalsProb * 100),
        over_85_corners: Math.round(finalCornersProb * 100),
      };
      if (useCards) {
        const finalCardsProb = Math.min(0.85, cardsProb + boost);
        markets.push('over_25_cards');
        confidences.push(finalCardsProb * 100);
        marketConf.over_25_cards = Math.round(finalCardsProb * 100);
      }
      const combinedOdds = calculateCombinedOdds(confidences);
      const averageConfidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
      
      candidates.push({
        fixtureId: fixture.fixture_id,
        homeTeam: fixture.home_team,
        awayTeam: fixture.away_team,
        league: fixture.league,
        leagueId: fixture.league_id,
        kickoff: fixture.kickoff,
        markets,
        marketConfidences: marketConf,
        combinedOdds,
        averageConfidence,
      });
      
      console.log(`✅ Candidate: ${fixture.home_team} vs ${fixture.away_team} (${fixture.league}) - ${averageConfidence}%${useCards ? ' +cards' : ''}`);
    }
  }
  
  if (candidates.length === 0) {
    console.log('⚠️ No candidates found with relaxed thresholds');
    return [];
  }
  
  // Prefer major leagues, then sort by confidence
  candidates.sort((a, b) => {
    const majorA = [39, 40, 140, 78, 135, 61, 88, 2, 3].includes(a.leagueId) ? 1 : 0;
    const majorB = [39, 40, 140, 78, 135, 61, 88, 2, 3].includes(b.leagueId) ? 1 : 0;
    if (majorA !== majorB) return majorB - majorA;
    return b.averageConfidence - a.averageConfidence;
  });
  
  return candidates;
}

// ============ MAIN HANDLER ============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // ODDS_API_KEY removed — using API-Football bulk odds
    const API_FOOTBALL_KEY = Deno.env.get('API_FOOTBALL_KEY');

    // Check for forceHeuristic or regenerate param + golden bet teams from frontend
    let forceHeuristic = false;
    let regenerate = false;
    let frontendGoldenTeams: Array<{ homeTeam: string; awayTeam: string; fixtureId?: string }> = [];
    try {
      const body = await req.json();
      forceHeuristic = body?.forceHeuristic === true;
      regenerate = body?.regenerate === true;
      if (Array.isArray(body?.goldenBetTeams)) {
        frontendGoldenTeams = body.goldenBetTeams;
      }
    } catch { /* GET request or no body */ }

    // Stash for later use in exclusion logic
    (req as any).__goldenBetTeams = frontendGoldenTeams;

    const today = new Date().toISOString().split('T')[0];
    console.log(`🏗️ Bet Builder: Fetching predictions for ${today}${forceHeuristic ? ' (FORCE HEURISTIC)' : ''}`);

    // Check for existing bet builder today (skip if regenerate)
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !regenerate) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: existing } = await supabase
        .from('bet_builder_history')
        .select('*')
        .eq('prediction_date', today)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log('Bet builder already exists for today');
        const cachedBetBuilder: any = existing[0];

        // 🚫 PERMANENTLY EXCLUDE FRIENDLY MATCHES (even if previously saved)
        if (isFriendlyMatch(String(cachedBetBuilder?.league ?? ''))) {
          console.log('🚫 Existing Bet Builder is a friendly. Deleting and regenerating.');
          await supabase
            .from('bet_builder_history')
            .delete()
            .eq('prediction_date', today)
            .eq('fixture_id', String(cachedBetBuilder?.fixture_id ?? ''));
        } else {
          // 🚫 CHECK: Does cached bet builder overlap with today's Golden Bets?
          const { data: todaysGoldenBets } = await supabase
            .from('golden_bet_history')
            .select('fixture_id, home_team, away_team')
            .eq('prediction_date', today);

          const normCached = (t: string) => (t || '').trim().toLowerCase()
            .replace(/\bfc\b/g, '').replace(/\bafc\b/g, '').replace(/\bsc\b/g, '')
            .replace(/\s+/g, ' ').trim();

          let overlaps = false;
          if (todaysGoldenBets && todaysGoldenBets.length > 0) {
            const cachedFixtureId = String(cachedBetBuilder.fixture_id ?? '');
            const cachedTeamKey = `${normCached(cachedBetBuilder.home_team)}|${normCached(cachedBetBuilder.away_team)}`;

            for (const gb of todaysGoldenBets as any[]) {
              if (cachedFixtureId && String(gb.fixture_id) === cachedFixtureId) {
                overlaps = true;
                break;
              }
              const gbTeamKey = `${normCached(gb.home_team)}|${normCached(gb.away_team)}`;
              if (gbTeamKey === cachedTeamKey) {
                overlaps = true;
                break;
              }
            }
          }

          if (overlaps) {
            console.log(`🚨 Existing Bet Builder "${cachedBetBuilder.home_team} vs ${cachedBetBuilder.away_team}" overlaps with a Golden Bet! Deleting and regenerating.`);
            await supabase
              .from('bet_builder_history')
              .delete()
              .eq('prediction_date', today)
              .eq('fixture_id', String(cachedBetBuilder.fixture_id ?? ''));
            // Fall through to regeneration below
          } else {
            // Refresh bookmaker info using API-Football bulk odds
            if (API_FOOTBALL_KEY) {
              const leagueId = cachedBetBuilder.league_id || 0;
              if (leagueId) {
                const seasons = getApiFootballSeason(leagueId);
                let leagueOdds = new Map<string, Map<string, RealOddsBB>>();
                for (const season of seasons) {
                  leagueOdds = await fetchOddsForLeagueBB(API_FOOTBALL_KEY, leagueId, season);
                  if (leagueOdds.size > 0) break;
                }
                const fixtureOdds = leagueOdds.get(String(cachedBetBuilder.fixture_id));
                if (fixtureOdds) {
                  const goalsOdds = fixtureOdds.get('over_2_5_goals');
                  if (goalsOdds) {
                    cachedBetBuilder.bookmaker = { key: 'bet365', title: goalsOdds.bookmaker };
                  }
                }
              }
            }

            return new Response(JSON.stringify({
              success: true,
              betBuilder: cachedBetBuilder,
              cached: true,
              timestamp: new Date().toISOString(),
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    }
    
    // If regenerate is requested, delete existing picks first
    if (regenerate && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      console.log('🔄 Regenerate requested - deleting existing Bet Builder');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from('bet_builder_history').delete().eq('prediction_date', today).eq('status', 'pending');
    }

    // Fetch today's Golden Bet fixtures (exclude from Bet Builder selection)
    // Uses BOTH fixture_id AND team-name matching for bulletproof exclusion
    const goldenBetFixtureIds = new Set<string>();
    const goldenBetTeamKeys = new Set<string>(); // normalised "home|away" keys

    const normTeam = (t: string) => (t || '').trim().toLowerCase()
      .replace(/\bfc\b/g, '').replace(/\bafc\b/g, '').replace(/\bsc\b/g, '')
      .replace(/\s+/g, ' ').trim();

    // Accept golden bet teams passed from the frontend (covers race-condition)
    if (Array.isArray((req as any).__goldenBetTeams)) {
      for (const g of (req as any).__goldenBetTeams) {
        if (g?.homeTeam && g?.awayTeam) {
          goldenBetTeamKeys.add(`${normTeam(g.homeTeam)}|${normTeam(g.awayTeam)}`);
        }
        if (g?.fixtureId) goldenBetFixtureIds.add(String(g.fixtureId));
      }
    }

    // Also parse from request body (the actual way it arrives)
    try {
      // Re-parse body for goldenBetTeams (body was already consumed above, so use saved ref)
    } catch { /* ignore */ }

    // Create supabase client early so stat gates can use it
    const supabase = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    if (supabase) {
      try {
        const { data: goldenBets } = await supabase
          .from('golden_bet_history')
          .select('fixture_id, home_team, away_team')
          .eq('prediction_date', today);

        if (goldenBets) {
          for (const gb of goldenBets as any[]) {
            goldenBetFixtureIds.add(String(gb.fixture_id));
            goldenBetTeamKeys.add(`${normTeam(gb.home_team)}|${normTeam(gb.away_team)}`);
          }
          console.log(`🚫 Excluding ${goldenBetFixtureIds.size} Golden Bet fixtures (${goldenBetTeamKeys.size} team keys) from Bet Builder selection`);
        }
      } catch (e) {
        console.error('Error fetching golden bet fixture IDs:', e);
      }
    }

    // ML path (preferred) - skip if forceHeuristic
    let ml: FetchMLResult = { predictions: null };
    let allCandidates: BetBuilderCandidate[] = [];
    let isHeuristicMode = forceHeuristic;

    if (!forceHeuristic) {
      ml = await fetchMLPredictions(today);
      const mlPredictions = ml.predictions;

      if (mlPredictions && mlPredictions.size > 0) {
        console.log(`📊 Loaded ${mlPredictions.size} ML predictions`);
        const powerScores = await loadPowerScores(supabase, today);
        allCandidates = await selectBetBuilderCandidatesWithRelaxation(mlPredictions, goldenBetFixtureIds, goldenBetTeamKeys, supabase ?? undefined, powerScores);
      }
    }

    // HEURISTIC FALLBACK: Use form data when ML unavailable OR forceHeuristic
    if ((allCandidates.length === 0 || forceHeuristic) && API_FOOTBALL_KEY && supabase) {
      console.log(`🔄 ${forceHeuristic ? 'FORCED' : 'ML unavailable,'} switching to HEURISTIC mode for Bet Builder`);
      isHeuristicMode = true;

      
      const fixtures = await fetchTodaysFixturesForBB(API_FOOTBALL_KEY);
      
      // Filter out fixtures already used by Golden Bets (by ID AND team name)
      const normTeamFilter = (t: string) => (t || '').trim().toLowerCase()
        .replace(/\bfc\b/g, '').replace(/\bafc\b/g, '').replace(/\bsc\b/g, '')
        .replace(/\s+/g, ' ').trim();
      const availableFixtures = fixtures.filter(f => {
        if (goldenBetFixtureIds.has(f.fixture_id)) return false;
        const key = `${normTeamFilter(f.home_team)}|${normTeamFilter(f.away_team)}`;
        if (goldenBetTeamKeys.has(key)) return false;
        return true;
      });
      console.log(`📅 ${fixtures.length} total fixtures, ${availableFixtures.length} available after excluding Golden Bets (by ID + team name)`);
      
      if (availableFixtures.length > 0) {
        const homeStats = new Map<string, Record<string, number>>();
        const awayStats = new Map<string, Record<string, number>>();
        
        for (const f of availableFixtures.slice(0, 15)) {
          if (!homeStats.has(f.home_team)) {
            homeStats.set(f.home_team, await fetchTeamFormForBB(supabase, f.home_team));
          }
          if (!awayStats.has(f.away_team)) {
            awayStats.set(f.away_team, await fetchTeamFormForBB(supabase, f.away_team));
          }
          await new Promise(r => setTimeout(r, 100));
        }
        
        allCandidates = selectAllHeuristicBetBuilders(availableFixtures.slice(0, 15), homeStats, awayStats, goldenBetFixtureIds);
        
        if (allCandidates.length > 0) {
          console.log(`🎲 ${allCandidates.length} Heuristic Bet Builder candidates found`);
        }
      }
    }

    if (allCandidates.length === 0) {
      const base = {
        success: false,
        noBetBuilder: true,
        timestamp: new Date().toISOString(),
        ml: {
          expectedDate: today,
          feedDate: ml?.feedDate,
          generatedAt: ml?.generatedAt,
          modelVersion: ml?.modelVersion,
          error: ml?.error,
        },
      };

      if (ml?.error === 'date_mismatch') {
        return new Response(
          JSON.stringify({
            ...base,
            message: `ML feed not updated for today yet (expected ${today}, current feed is ${ml.feedDate}). Run your training/upload, then refresh.`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          ...base,
          message: 'No fixtures meet the threshold requirements today',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== ITERATE CANDIDATES: Find first one with real odds =====
    const normFinal = (t: string) => (t || '').trim().toLowerCase()
      .replace(/\bfc\b/g, '').replace(/\bafc\b/g, '').replace(/\bsc\b/g, '')
      .replace(/\s+/g, ' ').trim();

    const MARKET_TO_ODDS_KEY: Record<string, string[]> = {
      'over_25_goals': ['over_2_5_goals'],
      'btts': ['btts'],
      'over_85_corners': ['over_8_5_corners', 'over_9_5_corners'],
      'over_25_cards': ['over_2_5_cards', 'over_3_5_cards'],
    };

    // Cache league odds to avoid re-fetching
    const leagueOddsCache = new Map<number, Map<string, Map<string, RealOddsBB>>>();

    let bestCandidate: BetBuilderCandidate | null = null;
    let bookmakerInfo: BookmakerInfo | undefined;
    let realCombinedOdds: number | null = null;

    // Try up to 10 candidates to find one with real odds
    for (const candidate of allCandidates.slice(0, 10)) {
      // Safety check: skip golden bet overlaps
      const candidateTeamKey = `${normFinal(candidate.homeTeam)}|${normFinal(candidate.awayTeam)}`;
      if (goldenBetFixtureIds.has(candidate.fixtureId) || goldenBetTeamKeys.has(candidateTeamKey)) {
        console.log(`🚫 Skipping candidate (golden bet overlap): ${candidate.homeTeam} vs ${candidate.awayTeam}`);
        continue;
      }

      if (!API_FOOTBALL_KEY) break;

      const leagueId = candidate.leagueId;
      if (!leagueId) continue;

      // Fetch odds for this league (cached)
      if (!leagueOddsCache.has(leagueId)) {
        const seasons = getApiFootballSeason(leagueId);
        let leagueOdds = new Map<string, Map<string, RealOddsBB>>();
        for (const season of seasons) {
          leagueOdds = await fetchOddsForLeagueBB(API_FOOTBALL_KEY, leagueId, season);
          if (leagueOdds.size > 0) break;
        }
        leagueOddsCache.set(leagueId, leagueOdds);
      }

      const leagueOdds = leagueOddsCache.get(leagueId)!;
      const fixtureOdds = leagueOdds.get(candidate.fixtureId);
      if (!fixtureOdds) {
        console.log(`⚠️ No odds data for ${candidate.homeTeam} vs ${candidate.awayTeam} — trying next candidate`);
        continue;
      }

      const legOdds: number[] = [];
      let allLegsHaveOdds = true;
      let firstBookmaker: BookmakerInfo | undefined;
      for (const market of candidate.markets) {
        const oddsKeys = MARKET_TO_ODDS_KEY[market] || [market];
        let found = false;
        for (const ok of oddsKeys) {
          const mo = fixtureOdds.get(ok);
          if (mo && mo.odds >= 1.10) {
            legOdds.push(mo.odds);
            if (!firstBookmaker) firstBookmaker = { key: 'bet365', title: mo.bookmaker };
            found = true;
            break;
          }
        }
        if (!found) {
          console.log(`⚠️ No odds for ${market} on ${candidate.homeTeam} vs ${candidate.awayTeam} — trying next candidate`);
          allLegsHaveOdds = false;
          break;
        }
      }

      if (allLegsHaveOdds && legOdds.length > 0) {
        bestCandidate = candidate;
        bookmakerInfo = firstBookmaker;
        realCombinedOdds = Math.round(legOdds.reduce((a, b) => a * b, 1) * 100) / 100;
        console.log(`✅ Real combined odds: ${realCombinedOdds} (${legOdds.join(' × ')}) for ${candidate.homeTeam} vs ${candidate.awayTeam}`);
        break; // Found one with odds!
      }
    }

    // No candidate had real odds
    if (!bestCandidate || !realCombinedOdds) {
      console.log(`🚫 NO REAL ODDS available for any of ${allCandidates.length} candidates — no bet builder today`);
      return new Response(JSON.stringify({
        success: false,
        noBetBuilder: true,
        message: 'No real bookmaker odds available for qualifying fixtures — no selection today',
        timestamp: new Date().toISOString(),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`🏆 Best bet builder: ${bestCandidate.homeTeam} vs ${bestCandidate.awayTeam} (verified: has odds + no Golden Bet overlap)`);

    // Get Gaffer reasoning
    let gafferReasoning = generateFallbackReasoning(bestCandidate);
    if (LOVABLE_API_KEY) {
      const supabaseForManager = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY 
        ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) 
        : undefined;
      gafferReasoning = await getGafferBetBuilderReasoning(bestCandidate, LOVABLE_API_KEY, supabaseForManager);
    }

    // Override with real odds
    bestCandidate.combinedOdds = realCombinedOdds;

    // Separate DB record from API response (bookmaker is NOT a DB column)
    const betBuilderDbRecord = {
      fixture_id: bestCandidate.fixtureId,
      home_team: bestCandidate.homeTeam,
      away_team: bestCandidate.awayTeam,
      league: bestCandidate.league,
      kickoff: bestCandidate.kickoff,
      markets: bestCandidate.markets,
      market_confidences: bestCandidate.marketConfidences,
      combined_odds: bestCandidate.combinedOdds,
      average_confidence: bestCandidate.averageConfidence,
      gaffer_reasoning: gafferReasoning,
      stake: 10,
      status: 'pending',
      prediction_date: today,
    };

    // Full response object (includes bookmaker for UI display)
    const betBuilder = {
      ...betBuilderDbRecord,
      bookmaker: bookmakerInfo,
    };

    // Save to database (without bookmaker field)
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: insertedBB, error } = await supabase
        .from('bet_builder_history')
        .upsert(betBuilderDbRecord, { onConflict: 'fixture_id,prediction_date' })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving bet builder:', error);
      } else {
        console.log('✅ Bet builder saved to database');

        // Capture proof screenshot
        if (insertedBB) {
          fetch(`${SUPABASE_URL}/functions/v1/capture-bet-proof`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              betType: 'bet_builder',
              betId: insertedBB.id,
              homeTeam: betBuilder.home_team,
              awayTeam: betBuilder.away_team,
              league: betBuilder.league,
              markets: betBuilder.markets,
              odds: betBuilder.combined_odds,
              confidence: betBuilder.average_confidence,
              gafferReasoning: betBuilder.gaffer_reasoning,
              kickoff: betBuilder.kickoff,
            }),
          }).catch(e => console.warn('Bet Builder proof capture failed:', e));
        }

        // Trigger new bets email with bet builder info
        try {
          console.log('📧 Triggering bet builder email...');
          await fetch(`${SUPABASE_URL}/functions/v1/send-bet-emails`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              type: 'new_bets',
              data: {
                betBuilder: {
                  homeTeam: betBuilder.home_team,
                  awayTeam: betBuilder.away_team,
                  markets: betBuilder.markets,
                  combinedOdds: betBuilder.combined_odds,
                },
              },
            }),
          });
        } catch (emailErr) {
          console.error('Failed to send bet builder email:', emailErr);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      betBuilder,
      heuristicMode: isHeuristicMode,
      fixturesAnalysed: 15,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bet Builder error:', error);
    return new Response(JSON.stringify({
      success: false,
      noBetBuilder: true,
      message: 'Unable to generate bet builder today',
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

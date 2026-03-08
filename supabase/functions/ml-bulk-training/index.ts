import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';

// All seasons from 2010 to 2025 (current)
const SEASONS = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

// 150+ Major leagues worldwide for comprehensive ML training
const TRAINING_LEAGUES = [
  // ========== UK & IRELAND (15 leagues) ==========
  { id: 39, name: 'Premier League', region: 'uk' },
  { id: 40, name: 'Championship', region: 'uk' },
  { id: 41, name: 'League One', region: 'uk' },
  { id: 42, name: 'League Two', region: 'uk' },
  { id: 43, name: 'National League', region: 'uk' },
  { id: 45, name: 'FA Cup', region: 'uk' },
  { id: 48, name: 'EFL Cup', region: 'uk' },
  { id: 179, name: 'Scottish Premiership', region: 'uk' },
  { id: 180, name: 'Scottish Championship', region: 'uk' },
  { id: 181, name: 'Scottish League One', region: 'uk' },
  { id: 182, name: 'Scottish League Two', region: 'uk' },
  { id: 183, name: 'Scottish Cup', region: 'uk' },
  { id: 196, name: 'League of Ireland', region: 'uk' },
  { id: 402, name: 'Welsh Premier', region: 'uk' },
  { id: 408, name: 'Northern Ireland', region: 'uk' },

  // ========== EUROPEAN TOP 5 LEAGUES (10 leagues) ==========
  { id: 140, name: 'La Liga', region: 'european' },
  { id: 141, name: 'La Liga 2', region: 'european' },
  { id: 78, name: 'Bundesliga', region: 'european' },
  { id: 79, name: '2. Bundesliga', region: 'european' },
  { id: 135, name: 'Serie A', region: 'european' },
  { id: 136, name: 'Serie B', region: 'european' },
  { id: 61, name: 'Ligue 1', region: 'european' },
  { id: 62, name: 'Ligue 2', region: 'european' },
  { id: 94, name: 'Primeira Liga', region: 'european' },
  { id: 95, name: 'Liga Portugal 2', region: 'european' },

  // ========== EUROPEAN OTHER MAJOR (35 leagues) ==========
  { id: 88, name: 'Eredivisie', region: 'european' },
  { id: 89, name: 'Eerste Divisie', region: 'european' },
  { id: 144, name: 'Belgian Pro League', region: 'european' },
  { id: 145, name: 'Belgian First Division B', region: 'european' },
  { id: 203, name: 'Super Lig', region: 'european' },
  { id: 204, name: 'TFF 1. Lig', region: 'european' },
  { id: 197, name: 'Super League Greece', region: 'european' },
  { id: 207, name: 'Swiss Super League', region: 'european' },
  { id: 208, name: 'Swiss Challenge League', region: 'european' },
  { id: 218, name: 'Austrian Bundesliga', region: 'european' },
  { id: 219, name: 'Austrian 2. Liga', region: 'european' },
  { id: 119, name: 'Danish Superliga', region: 'european' },
  { id: 120, name: 'Danish 1st Division', region: 'european' },
  { id: 113, name: 'Allsvenskan', region: 'european' },
  { id: 114, name: 'Superettan', region: 'european' },
  { id: 103, name: 'Eliteserien', region: 'european' },
  { id: 104, name: 'OBOS-ligaen', region: 'european' },
  { id: 106, name: 'Ekstraklasa', region: 'european' },
  { id: 107, name: 'I Liga', region: 'european' },
  { id: 345, name: 'Czech First League', region: 'european' },
  { id: 346, name: 'Czech FNL', region: 'european' },
  { id: 235, name: 'Russian Premier', region: 'european' },
  { id: 236, name: 'Russian FNL', region: 'european' },
  { id: 333, name: 'Ukrainian Premier', region: 'european' },
  { id: 210, name: 'Croatian HNL', region: 'european' },
  { id: 286, name: 'Serbian Super Liga', region: 'european' },
  { id: 283, name: 'Romanian Liga I', region: 'european' },
  { id: 284, name: 'Romanian Liga II', region: 'european' },
  { id: 172, name: 'Bulgarian First League', region: 'european' },
  { id: 271, name: 'Hungarian NB I', region: 'european' },
  { id: 318, name: 'Slovak Super Liga', region: 'european' },
  { id: 373, name: 'Slovenian PrvaLiga', region: 'european' },
  { id: 244, name: 'Veikkausliiga', region: 'european' },
  { id: 327, name: 'Cypriot First Division', region: 'european' },
  { id: 332, name: 'Israeli Premier', region: 'european' },

  // ========== UEFA COMPETITIONS (4 leagues) ==========
  { id: 2, name: 'Champions League', region: 'european' },
  { id: 3, name: 'Europa League', region: 'european' },
  { id: 848, name: 'Conference League', region: 'european' },
  { id: 531, name: 'UEFA Super Cup', region: 'european' },

  // ========== AMERICAS (30 leagues) ==========
  { id: 71, name: 'Serie A Brazil', region: 'americas' },
  { id: 72, name: 'Serie B Brazil', region: 'americas' },
  { id: 73, name: 'Copa do Brasil', region: 'americas' },
  { id: 128, name: 'Liga Argentina', region: 'americas' },
  { id: 129, name: 'Primera Nacional', region: 'americas' },
  { id: 130, name: 'Copa Argentina', region: 'americas' },
  { id: 262, name: 'Liga MX', region: 'americas' },
  { id: 263, name: 'Liga MX Expansion', region: 'americas' },
  { id: 253, name: 'MLS', region: 'americas' },
  { id: 254, name: 'USL Championship', region: 'americas' },
  { id: 255, name: 'US Open Cup', region: 'americas' },
  { id: 239, name: 'Colombian Primera A', region: 'americas' },
  { id: 240, name: 'Colombian Primera B', region: 'americas' },
  { id: 265, name: 'Chilean Primera', region: 'americas' },
  { id: 266, name: 'Chilean Primera B', region: 'americas' },
  { id: 268, name: 'Uruguayan Primera', region: 'americas' },
  { id: 395, name: 'Paraguayan Primera', region: 'americas' },
  { id: 281, name: 'Peruvian Primera', region: 'americas' },
  { id: 242, name: 'Ecuadorian Serie A', region: 'americas' },
  { id: 278, name: 'Venezuelan Primera', region: 'americas' },
  { id: 260, name: 'Costa Rican Primera', region: 'americas' },
  { id: 336, name: 'Guatemalan Liga', region: 'americas' },
  { id: 350, name: 'Honduran Liga', region: 'americas' },
  { id: 17, name: 'Copa Libertadores', region: 'americas' },
  { id: 11, name: 'Copa Sudamericana', region: 'americas' },
  { id: 13, name: 'CONCACAF Champions', region: 'americas' },
  { id: 259, name: 'Canadian Premier', region: 'americas' },
  { id: 296, name: 'Bolivian Primera', region: 'americas' },

  // ========== ASIA (30 leagues) ==========
  { id: 98, name: 'J1 League', region: 'asia' },
  { id: 99, name: 'J2 League', region: 'asia' },
  { id: 100, name: 'J3 League', region: 'asia' },
  { id: 101, name: 'J.League Cup', region: 'asia' },
  { id: 292, name: 'K League 1', region: 'asia' },
  { id: 293, name: 'K League 2', region: 'asia' },
  { id: 169, name: 'Chinese Super League', region: 'asia' },
  { id: 170, name: 'China League One', region: 'asia' },
  { id: 307, name: 'Saudi Pro League', region: 'asia' },
  { id: 308, name: 'Saudi First Division', region: 'asia' },
  { id: 302, name: 'UAE Pro League', region: 'asia' },
  { id: 305, name: 'Qatar Stars League', region: 'asia' },
  { id: 290, name: 'Persian Gulf Pro', region: 'asia' },
  { id: 323, name: 'Indian Super League', region: 'asia' },
  { id: 324, name: 'I-League', region: 'asia' },
  { id: 374, name: 'Thai League 1', region: 'asia' },
  { id: 375, name: 'Thai League 2', region: 'asia' },
  { id: 340, name: 'V.League 1', region: 'asia' },
  { id: 188, name: 'Malaysian Super', region: 'asia' },
  { id: 382, name: 'Singapore Premier', region: 'asia' },
  { id: 274, name: 'Indonesian Liga 1', region: 'asia' },
  { id: 275, name: 'Indonesian Liga 2', region: 'asia' },
  { id: 399, name: 'Philippines PFL', region: 'asia' },
  { id: 475, name: 'Uzbek Super League', region: 'asia' },
  { id: 15, name: 'AFC Champions League', region: 'asia' },
  { id: 18, name: 'AFC Cup', region: 'asia' },
  { id: 190, name: 'A-League', region: 'asia' },

  // ========== AFRICA (20 leagues) ==========
  { id: 233, name: 'Egyptian Premier', region: 'africa' },
  { id: 234, name: 'Egyptian Second', region: 'africa' },
  { id: 200, name: 'South African PSL', region: 'africa' },
  { id: 201, name: 'South African NFD', region: 'africa' },
  { id: 183, name: 'Moroccan Botola Pro', region: 'africa' },
  { id: 184, name: 'Moroccan Botola 2', region: 'africa' },
  { id: 202, name: 'Tunisian Ligue 1', region: 'africa' },
  { id: 387, name: 'Algerian Ligue 1', region: 'africa' },
  { id: 388, name: 'Algerian Ligue 2', region: 'africa' },
  { id: 356, name: 'Nigerian NPFL', region: 'africa' },
  { id: 357, name: 'Ghanaian Premier', region: 'africa' },
  { id: 358, name: 'Kenyan Premier', region: 'africa' },
  { id: 360, name: 'Tanzanian Premier', region: 'africa' },
  { id: 20, name: 'CAF Champions League', region: 'africa' },
  { id: 21, name: 'CAF Confederation Cup', region: 'africa' },
  { id: 6, name: 'AFCON', region: 'africa' },
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const BATCH_SIZE_DEFAULT = 10; // Process 10 league-seasons per call (was 3)
const API_DELAY_MS = 150; // Faster API calls (was 300ms)

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

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

function getTeamStats(fixtures: any[], teamId: number) {
  const teamGames = fixtures.filter(f => 
    f.teams.home.id === teamId || f.teams.away.id === teamId
  ).slice(0, 20);

  if (teamGames.length < 5) return null;

  let over25 = 0, btts = 0, over95corners = 0, over35cards = 0;
  let totalGoals = 0, totalCorners = 0, totalCards = 0;
  let cornersCount = 0, cardsCount = 0;
  const formResults: string[] = [];

  teamGames.forEach((game, idx) => {
    const isHome = game.teams.home.id === teamId;
    const homeGoals = game.goals.home || 0;
    const awayGoals = game.goals.away || 0;
    const total = homeGoals + awayGoals;
    
    totalGoals += total;
    if (total > 2.5) over25++;
    if (homeGoals > 0 && awayGoals > 0) btts++;

    if (idx < 5) {
      const teamGoals = isHome ? homeGoals : awayGoals;
      const oppGoals = isHome ? awayGoals : homeGoals;
      if (teamGoals > oppGoals) formResults.push('W');
      else if (teamGoals < oppGoals) formResults.push('L');
      else formResults.push('D');
    }

    if (game.statistics) {
      const homeStats = game.statistics.find((s: any) => s.team.id === game.teams.home.id);
      const awayStats = game.statistics.find((s: any) => s.team.id === game.teams.away.id);
      
      if (homeStats && awayStats) {
        const corners = (homeStats.statistics?.find((s: any) => s.type === 'Corner Kicks')?.value || 0) +
                       (awayStats.statistics?.find((s: any) => s.type === 'Corner Kicks')?.value || 0);
        if (corners > 0) {
          totalCorners += corners;
          cornersCount++;
          if (corners > 9.5) over95corners++;
        }

        const cards = (homeStats.statistics?.find((s: any) => s.type === 'Yellow Cards')?.value || 0) +
                     (awayStats.statistics?.find((s: any) => s.type === 'Yellow Cards')?.value || 0) +
                     (homeStats.statistics?.find((s: any) => s.type === 'Red Cards')?.value || 0) +
                     (awayStats.statistics?.find((s: any) => s.type === 'Red Cards')?.value || 0);
        if (cards > 0) {
          totalCards += cards;
          cardsCount++;
          if (cards > 3.5) over35cards++;
        }
      }
    }
  });

  const gamesPlayed = teamGames.length;
  return {
    over25Pct: Math.round((over25 / gamesPlayed) * 100),
    bttsPct: Math.round((btts / gamesPlayed) * 100),
    over95CornersPct: cornersCount > 0 ? Math.round((over95corners / cornersCount) * 100) : null,
    over35CardsPct: cardsCount > 0 ? Math.round((over35cards / cardsCount) * 100) : null,
    avgGoals: parseFloat((totalGoals / gamesPlayed).toFixed(2)),
    avgCorners: cornersCount > 0 ? parseFloat((totalCorners / cornersCount).toFixed(2)) : null,
    avgCards: cardsCount > 0 ? parseFloat((totalCards / cardsCount).toFixed(2)) : null,
    form: formResults.join('')
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    if (!API_KEY) {
      throw new Error('API_FOOTBALL_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get resume point from query params
    const url = new URL(req.url);
    const startLeagueIdx = parseInt(url.searchParams.get('leagueIdx') || '0');
    const startSeasonIdx = parseInt(url.searchParams.get('seasonIdx') || '0');
    const batchSize = parseInt(url.searchParams.get('batch') || String(BATCH_SIZE_DEFAULT));

    let processed = 0;
    let fixturesIngested = 0;
    let currentLeagueIdx = startLeagueIdx;
    let currentSeasonIdx = startSeasonIdx;
    
    // Track backtest accuracy during training
    const backtestStats = {
      over25: { correct: 0, total: 0 },
      btts: { correct: 0, total: 0 },
      corners: { correct: 0, total: 0 },
      cards: { correct: 0, total: 0 },
    };

    console.log(`🚀 FAST MODE: Starting bulk training from league ${currentLeagueIdx}/${TRAINING_LEAGUES.length}, season ${currentSeasonIdx}/${SEASONS.length}`);
    console.log(`📊 Processing ${batchSize} league-seasons per batch with ${API_DELAY_MS}ms delay`);

    // Process batch
    while (processed < batchSize && currentLeagueIdx < TRAINING_LEAGUES.length) {
      const league = TRAINING_LEAGUES[currentLeagueIdx];
      const season = SEASONS[currentSeasonIdx];

      console.log(`⚽ [${processed + 1}/${batchSize}] ${league.name} ${season}...`);

      try {
        // Fetch all finished fixtures for this league-season
        // Note: The /fixtures endpoint doesn't include statistics by default
        // We'll need to fetch them separately for a sample or use fixture/statistics endpoint
        const fixturesData = await fetchFromApi(API_KEY, '/fixtures', {
          league: league.id,
          season: season,
          status: 'FT'
        });

        await delay(API_DELAY_MS);
        
        if (fixturesData.response && fixturesData.response.length > 0) {
          const fixtures = fixturesData.response;
          console.log(`✅ Found ${fixtures.length} fixtures for ${league.name} ${season}`);
          
          let fixturesWithStats: any[] = [];
          
          // Fetch stats for ALL fixtures from 2010+ (corners, cards available historically)
          if (fixtures.length > 0) {
            // Fetch stats for all fixtures with batching to manage API rate limits
            for (let i = 0; i < fixtures.length; i += 10) {
              const batch = fixtures.slice(i, i + 10);
              const statsPromises = batch.map(async (f: any) => {
                try {
                  const statsData = await fetchFromApi(API_KEY, '/fixtures/statistics', {
                    fixture: f.fixture.id
                  });
                  await delay(API_DELAY_MS);
                  return { ...f, statistics: statsData.response };
                } catch {
                  return f;
                }
              });
              const batchResults = await Promise.all(statsPromises);
              fixturesWithStats.push(...batchResults);
            }
            console.log(`📊 Fetched detailed stats for ${fixturesWithStats.filter(f => f.statistics?.length > 0).length}/${fixtures.length} fixtures`);
          } else {
            // Fallback if no fixtures
            fixturesWithStats = fixtures;
          }

          // Process each fixture
          for (const fixture of fixturesWithStats) {
            const homeTeamId = fixture.teams.home.id;
            const awayTeamId = fixture.teams.away.id;
            const fixtureDate = fixture.fixture.date.split('T')[0];

            // Get pre-match historical fixtures for each team (games BEFORE this fixture)
            const fixtureTimestamp = new Date(fixture.fixture.date).getTime();
            const priorFixtures = fixturesWithStats.filter((f: any) => 
              new Date(f.fixture.date).getTime() < fixtureTimestamp
            );

            const homeStats = getTeamStats(priorFixtures, homeTeamId);
            const awayStats = getTeamStats(priorFixtures, awayTeamId);

            // Calculate actual outcomes
            const homeGoals = fixture.goals.home || 0;
            const awayGoals = fixture.goals.away || 0;
            const totalGoals = homeGoals + awayGoals;

            // Helper to extract stat value
            const getStat = (stats: any[], type: string): any => {
              const stat = stats?.find((s: any) => s.type === type);
              return stat?.value ?? null;
            };

            // Extract ALL comprehensive stats from fixture.statistics
            let fullStats: any = {
              totalCorners: null,
              totalCards: null,
              // Per-team detailed stats
              home: {} as any,
              away: {} as any,
            };

            if (fixture.statistics && Array.isArray(fixture.statistics)) {
              const homeStatistics = fixture.statistics.find((s: any) => s.team?.id === homeTeamId);
              const awayStatistics = fixture.statistics.find((s: any) => s.team?.id === awayTeamId);

              if (homeStatistics?.statistics && awayStatistics?.statistics) {
                const hStats = homeStatistics.statistics;
                const aStats = awayStatistics.statistics;

                // Corners & Cards totals
                const homeCorners = getStat(hStats, 'Corner Kicks') || 0;
                const awayCorners = getStat(aStats, 'Corner Kicks') || 0;
                fullStats.totalCorners = (typeof homeCorners === 'number' ? homeCorners : 0) + 
                                          (typeof awayCorners === 'number' ? awayCorners : 0);

                const homeYellow = getStat(hStats, 'Yellow Cards') || 0;
                const awayYellow = getStat(aStats, 'Yellow Cards') || 0;
                const homeRed = getStat(hStats, 'Red Cards') || 0;
                const awayRed = getStat(aStats, 'Red Cards') || 0;
                fullStats.totalCards = (homeYellow || 0) + (awayYellow || 0) + (homeRed || 0) + (awayRed || 0);

                // ALL per-team stats (17 metrics each)
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
              }
            }

            const trainingRow = {
              fixture_id: String(fixture.fixture.id),
              fixture_date: fixtureDate,
              home_team: fixture.teams.home.name,
              away_team: fixture.teams.away.name,
              league: league.name,
              region: league.region,
              // Pre-match stats (what ML sees before game)
              home_over25_pct: homeStats?.over25Pct || 0,
              away_over25_pct: awayStats?.over25Pct || 0,
              home_btts_pct: homeStats?.bttsPct || 0,
              away_btts_pct: awayStats?.bttsPct || 0,
              home_over95_corners_pct: homeStats?.over95CornersPct || 0,
              away_over95_corners_pct: awayStats?.over95CornersPct || 0,
              home_over35_cards_pct: homeStats?.over35CardsPct || 0,
              away_over35_cards_pct: awayStats?.over35CardsPct || 0,
              home_avg_goals: homeStats?.avgGoals || 0,
              away_avg_goals: awayStats?.avgGoals || 0,
              home_avg_corners: homeStats?.avgCorners || 0,
              away_avg_corners: awayStats?.avgCorners || 0,
              home_avg_cards: homeStats?.avgCards || 0,
              away_avg_cards: awayStats?.avgCards || 0,
              home_form: homeStats?.form || null,
              away_form: awayStats?.form || null,
              // Actual outcomes (for training)
              home_goals: homeGoals,
              away_goals: awayGoals,
              total_goals: totalGoals,
              over_25_hit: totalGoals > 2.5,
              btts_hit: homeGoals > 0 && awayGoals > 0,
              // Corners and cards totals
              total_corners: fullStats.totalCorners,
              total_cards: fullStats.totalCards,
              over_95_corners_hit: fullStats.totalCorners !== null ? fullStats.totalCorners > 9.5 : null,
              over_35_cards_hit: fullStats.totalCards !== null ? fullStats.totalCards > 3.5 : null,
              // ALL 34 comprehensive per-team stats
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

            // Upsert to avoid duplicates
            await supabase
              .from('ml_training_data')
              .upsert(trainingRow, { onConflict: 'fixture_id' });

            fixturesIngested++;
            
            // Track backtest accuracy - would ML have predicted this correctly?
            if (homeStats && awayStats) {
              const combinedOver25Pct = (homeStats.over25Pct + awayStats.over25Pct) / 2;
              const combinedBttsPct = (homeStats.bttsPct + awayStats.bttsPct) / 2;
              const combinedCornersPct = ((homeStats.over95CornersPct || 0) + (awayStats.over95CornersPct || 0)) / 2;
              const combinedCardsPct = ((homeStats.over35CardsPct || 0) + (awayStats.over35CardsPct || 0)) / 2;
              
              // Check if ML would have predicted correctly (threshold: 60%+)
              if (combinedOver25Pct >= 60) {
                backtestStats.over25.total++;
                if (totalGoals > 2.5) backtestStats.over25.correct++;
              }
              if (combinedBttsPct >= 60) {
                backtestStats.btts.total++;
                if (homeGoals > 0 && awayGoals > 0) backtestStats.btts.correct++;
              }
              if (combinedCornersPct >= 60 && fullStats.totalCorners !== null) {
                backtestStats.corners.total++;
                if (fullStats.totalCorners > 9.5) backtestStats.corners.correct++;
              }
              if (combinedCardsPct >= 60 && fullStats.totalCards !== null) {
                backtestStats.cards.total++;
                if (fullStats.totalCards > 3.5) backtestStats.cards.correct++;
              }
            }
          }
        }

        processed++;
      } catch (leagueError) {
        console.error(`Error processing ${league.name} ${season}:`, leagueError);
      }

      // Move to next season/league
      currentSeasonIdx++;
      if (currentSeasonIdx >= SEASONS.length) {
        currentSeasonIdx = 0;
        currentLeagueIdx++;
      }
    }

    // Log backtest accuracy for this batch
    const logAccuracy = (name: string, stats: { correct: number; total: number }) => {
      if (stats.total > 0) {
        const pct = ((stats.correct / stats.total) * 100).toFixed(1);
        console.log(`🎯 ${name}: ${pct}% accuracy (${stats.correct}/${stats.total})`);
      }
    };
    logAccuracy('Over 2.5', backtestStats.over25);
    logAccuracy('BTTS', backtestStats.btts);
    logAccuracy('Corners 9.5+', backtestStats.corners);
    logAccuracy('Cards 3.5+', backtestStats.cards);

    // Update cumulative accuracy in ml_model_accuracy table
    const today = new Date().toISOString().split('T')[0];
    const accuracyUpdates = [
      { market: 'over_2.5_goals', stats: backtestStats.over25 },
      { market: 'btts', stats: backtestStats.btts },
      { market: 'over_9.5_corners', stats: backtestStats.corners },
      { market: 'over_3.5_cards', stats: backtestStats.cards },
    ];

    for (const { market, stats } of accuracyUpdates) {
      if (stats.total > 0) {
        // Get existing accuracy record
        const { data: existing } = await supabase
          .from('ml_model_accuracy')
          .select('*')
          .eq('date', today)
          .eq('market', market)
          .single();

        const newTotal = (existing?.total_predictions || 0) + stats.total;
        const newCorrect = (existing?.correct_predictions || 0) + stats.correct;
        const winRate = (newCorrect / newTotal) * 100;

        await supabase
          .from('ml_model_accuracy')
          .upsert({
            date: today,
            market,
            total_predictions: newTotal,
            correct_predictions: newCorrect,
            win_rate: parseFloat(winRate.toFixed(2)),
            avg_confidence: 65, // Training uses 60%+ threshold
            updated_at: new Date().toISOString(),
          }, { onConflict: 'date,market' });
      }
    }

    // Check if there's more to process
    const hasMore = currentLeagueIdx < TRAINING_LEAGUES.length;
    const progress = {
      currentLeague: currentLeagueIdx < TRAINING_LEAGUES.length ? TRAINING_LEAGUES[currentLeagueIdx]?.name : 'Complete',
      currentSeason: SEASONS[currentSeasonIdx] || 'N/A',
      leaguesProcessed: currentLeagueIdx,
      totalLeagues: TRAINING_LEAGUES.length,
      seasonsPerLeague: SEASONS.length,
      fixturesIngested,
      percentComplete: Math.round((currentLeagueIdx / TRAINING_LEAGUES.length) * 100),
      backtestAccuracy: {
        over25: backtestStats.over25.total > 0 ? `${((backtestStats.over25.correct / backtestStats.over25.total) * 100).toFixed(1)}%` : 'N/A',
        btts: backtestStats.btts.total > 0 ? `${((backtestStats.btts.correct / backtestStats.btts.total) * 100).toFixed(1)}%` : 'N/A',
        corners: backtestStats.corners.total > 0 ? `${((backtestStats.corners.correct / backtestStats.corners.total) * 100).toFixed(1)}%` : 'N/A',
        cards: backtestStats.cards.total > 0 ? `${((backtestStats.cards.correct / backtestStats.cards.total) * 100).toFixed(1)}%` : 'N/A',
      }
    };

    // If there's more, trigger next batch via background task
    if (hasMore) {
      const nextUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ml-bulk-training?leagueIdx=${currentLeagueIdx}&seasonIdx=${currentSeasonIdx}&batch=${batchSize}`;
      
      // Use EdgeRuntime.waitUntil for reliable background processing
      const triggerNext = async () => {
        await delay(1000); // Small delay before next batch
        try {
          await fetch(nextUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`✅ Triggered next batch: league ${currentLeagueIdx}, season ${currentSeasonIdx}`);
        } catch (err) {
          console.error('❌ Failed to trigger next batch:', err);
        }
      };
      
      // @ts-ignore - EdgeRuntime is available in Supabase
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(triggerNext());
      } else {
        // Fallback for environments without EdgeRuntime
        triggerNext();
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: hasMore ? 'Batch complete, processing continues in background' : 'All historical data ingested!',
      progress
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bulk training error:', error);
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
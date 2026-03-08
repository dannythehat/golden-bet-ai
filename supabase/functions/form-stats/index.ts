import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';

// Leagues by region
const LEAGUES_BY_REGION: Record<string, number[]> = {
  uk: [39, 40, 41, 42, 179],
  european: [140, 78, 135, 61, 94, 88, 203, 144],
  asia: [98, 271, 307, 292],
  americas: [71, 128, 262, 253],
};

const LEAGUE_NAMES: Record<number, string> = {
  39: 'Premier League', 40: 'Championship', 41: 'League One', 42: 'League Two', 179: 'Scottish Premiership',
  140: 'La Liga', 78: 'Bundesliga', 135: 'Serie A', 61: 'Ligue 1', 94: 'Primeira Liga', 88: 'Eredivisie', 203: 'Süper Lig', 144: 'Jupiler Pro League',
  98: 'J1 League', 271: 'K League 1', 307: 'Saudi Pro League', 292: 'A-League',
  71: 'Série A', 128: 'Primera División', 262: 'Liga MX', 253: 'MLS',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getCurrentSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month < 7 ? year - 1 : year;
}

interface TeamStat {
  id: string;
  team: string;
  league: string;
  region: string;
  played: number;
  over_1_5: number;
  over_2_5: number;
  over_3_5: number;
  under_1_5: number;
  under_2_5: number;
  under_3_5: number;
  btts_yes: number;
  btts_no: number;
  avg_goals: number;
  avg_scored: number;
  avg_conceded: number;
}

async function fetchFromApi(apiKey: string, endpoint: string, params: Record<string, string | number> = {}): Promise<any> {
  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || [];
}

function calculateDetailedStats(fixtures: any[], teamId: number): Partial<TeamStat> | null {
  const validFixtures = fixtures.filter(f => 
    f.fixture?.status?.short === 'FT' && 
    f.goals?.home !== null && 
    f.goals?.away !== null
  ).slice(0, 15);

  if (validFixtures.length < 5) return null;

  let over15 = 0, over25 = 0, over35 = 0;
  let bttsYes = 0;
  let totalGoals = 0, scored = 0, conceded = 0;

  for (const fixture of validFixtures) {
    const homeGoals = fixture.goals.home;
    const awayGoals = fixture.goals.away;
    const total = homeGoals + awayGoals;
    const isHome = fixture.teams?.home?.id === teamId;

    totalGoals += total;
    if (total > 1.5) over15++;
    if (total > 2.5) over25++;
    if (total > 3.5) over35++;
    if (homeGoals > 0 && awayGoals > 0) bttsYes++;

    if (isHome) {
      scored += homeGoals;
      conceded += awayGoals;
    } else {
      scored += awayGoals;
      conceded += homeGoals;
    }
  }

  const count = validFixtures.length;
  
  return {
    played: count,
    over_1_5: Math.round((over15 / count) * 100),
    over_2_5: Math.round((over25 / count) * 100),
    over_3_5: Math.round((over35 / count) * 100),
    under_1_5: Math.round(((count - over15) / count) * 100),
    under_2_5: Math.round(((count - over25) / count) * 100),
    under_3_5: Math.round(((count - over35) / count) * 100),
    btts_yes: Math.round((bttsYes / count) * 100),
    btts_no: Math.round(((count - bttsYes) / count) * 100),
    avg_goals: Math.round((totalGoals / count) * 10) / 10,
    avg_scored: Math.round((scored / count) * 10) / 10,
    avg_conceded: Math.round((conceded / count) * 10) / 10,
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

    const url = new URL(req.url);
    const region = url.searchParams.get('region') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    console.log(`Fetching form stats for region: ${region}`);

    const season = getCurrentSeason();
    const allStats: TeamStat[] = [];

    // Get leagues for the region
    let leagueIds: number[] = [];
    if (region === 'all') {
      leagueIds = Object.values(LEAGUES_BY_REGION).flat().slice(0, 8);
    } else {
      leagueIds = LEAGUES_BY_REGION[region] || [];
    }

    // Process leagues
    for (const leagueId of leagueIds.slice(0, 4)) { // Limit for speed
      try {
        await delay(600);
        
        const standings = await fetchFromApi(API_KEY, '/standings', {
          league: leagueId,
          season,
        });

        if (!standings || standings.length === 0) continue;

        const leagueStandings = standings[0]?.league?.standings?.[0] || [];
        const teams = leagueStandings.slice(0, 8); // Top 8 teams per league

        for (const standing of teams) {
          const teamId = standing.team?.id;
          const teamName = standing.team?.name;
          if (!teamId || !teamName) continue;

          try {
            await delay(600);
            
            const fixtures = await fetchFromApi(API_KEY, '/fixtures', {
              team: teamId,
              season,
              last: 15,
            });

            if (!fixtures || fixtures.length === 0) continue;

            const stats = calculateDetailedStats(fixtures, teamId);
            if (!stats) continue;

            const leagueRegion = Object.entries(LEAGUES_BY_REGION).find(([_, ids]) => 
              ids.includes(leagueId)
            )?.[0] || 'european';

            allStats.push({
              id: `${teamId}-${leagueId}`,
              team: teamName,
              league: LEAGUE_NAMES[leagueId] || 'Unknown League',
              region: leagueRegion,
              ...stats as Omit<TeamStat, 'id' | 'team' | 'league' | 'region'>,
            });

            console.log(`Processed: ${teamName}`);
          } catch (err) {
            console.error(`Error for team ${teamName}:`, err);
          }
        }
      } catch (err) {
        console.error(`Error for league ${leagueId}:`, err);
      }
    }

    // Sort by over_2_5 and limit results
    const sortedStats = allStats
      .sort((a, b) => b.over_2_5 - a.over_2_5)
      .slice(0, limit);

    return new Response(JSON.stringify({
      success: true,
      stats: sortedStats,
      count: sortedStats.length,
      region,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Form stats error:', errorMessage);
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      stats: [],
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

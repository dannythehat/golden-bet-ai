import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';

interface LiveFixture {
  fixture_id: number;
  home_team: string;
  away_team: string;
  league: string;
  status: string;
  elapsed: number | null;
  score_home: number;
  score_away: number;
  corners_home: number;
  corners_away: number;
  corners_total: number;
  cards_home: number;
  cards_away: number;
  cards_total: number;
  yellow_cards_home: number;
  yellow_cards_away: number;
  red_cards_home: number;
  red_cards_away: number;
}

// Helper to delay between API calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch a fixture by ID (works for live + finished)
async function fetchFixtureById(fixtureId: number, apiKey: string): Promise<any | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/fixtures?id=${fixtureId}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch fixture ${fixtureId}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const fixtures = data.response || [];
    return fixtures[0] || null;
  } catch (error) {
    console.warn(`Error fetching fixture ${fixtureId}:`, error);
    return null;
  }
}

// Fetch statistics for a single fixture
async function fetchFixtureStats(fixtureId: number, apiKey: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/fixtures/statistics?fixture=${fixtureId}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch stats for fixture ${fixtureId}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    return data.response || [];
  } catch (error) {
    console.warn(`Error fetching stats for fixture ${fixtureId}:`, error);
    return null;
  }
}

// Extract stat value from team statistics
function getStatValue(teamStats: any[], statType: string): number {
  if (!teamStats) return 0;
  const stat = teamStats.find((s: any) => s.type === statType);
  if (!stat) return 0;
  const value = stat.value;
  if (value === null || value === undefined) return 0;
  return parseInt(String(value)) || 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    
    if (!API_KEY) {
      console.error('API_FOOTBALL_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API key not configured',
          fixtures: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for optional filters
    let fixtureIds: number[] = [];
    let priorityTeams: string[] = [];
    try {
      const body = await req.json();
      fixtureIds = (body.fixtureIds || [])
        .map((v: unknown) => Number(v))
        .filter((n: number) => Number.isFinite(n));
      priorityTeams = (body.priorityTeams || []).map((t: string) => 
        t.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
    } catch {
      // No body or invalid JSON, fetch all live fixtures
    }

    console.log(`🔴 Fetching live fixtures${fixtureIds.length ? ` for IDs: ${fixtureIds.join(',')}` : ''}${priorityTeams.length ? ` with priority teams: ${priorityTeams.slice(0, 5).join(',')}...` : ''}`);

    // Fetch live fixtures from API-Football
    const liveUrl = `${API_BASE_URL}/fixtures?live=all`;
    const response = await fetch(liveUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const fixtures = data.response || [];

    console.log(`📊 Found ${fixtures.length} live fixtures`);

    // If we have explicit fixtureIds, we ALSO fetch those fixtures by ID
    // so finished matches continue to return their final score/stats right after FT.
    const byId = new Map<number, any>();
    fixtures.forEach((f: any) => {
      const id = f?.fixture?.id;
      if (typeof id === 'number') byId.set(id, f);
    });

    if (fixtureIds.length > 0) {
      // Only fetch IDs not already present in live feed, and limit to avoid rate limits.
      const missing = fixtureIds.filter((id) => !byId.has(id)).slice(0, 12);
      for (let i = 0; i < missing.length; i++) {
        const id = missing[i];
        const fetched = await fetchFixtureById(id, API_KEY);
        if (fetched) {
          byId.set(id, fetched);
        }
        if (i < missing.length - 1) await delay(150);
      }
    }

    const allFixtures = Array.from(byId.values());

    // Statuses that indicate the match is in-play or finished (should be tracked)
    const TRACKABLE_STATUSES = new Set([
      '1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE', // In-play
      'FT', 'AET', 'PEN', // Finished
    ]);

    // Filter fixtures: only include in-play or finished matches, not upcoming ones
    let relevantFixtures = allFixtures.filter((f: any) => {
      const status = f?.fixture?.status?.short;
      const matchesId = fixtureIds.length === 0 || fixtureIds.includes(f.fixture.id);
      const isTrackable = TRACKABLE_STATUSES.has(status);
      return matchesId && isTrackable;
    });

    // Sort to prioritize matches with our priority teams
    if (priorityTeams.length > 0) {
      relevantFixtures.sort((a: any, b: any) => {
        const aHome = a.teams.home.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const aAway = a.teams.away.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const bHome = b.teams.home.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const bAway = b.teams.away.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const aMatch = priorityTeams.some((t: string) => aHome.includes(t) || aAway.includes(t) || t.includes(aHome) || t.includes(aAway));
        const bMatch = priorityTeams.some((t: string) => bHome.includes(t) || bAway.includes(t) || t.includes(bHome) || t.includes(bAway));
        
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
      });
    }

    // Limit to first 25 fixtures to avoid rate limits (increased from 20)
    relevantFixtures = relevantFixtures.slice(0, 25);

    // Fetch detailed statistics for each fixture (with rate limiting)
    const liveFixtures: LiveFixture[] = [];
    
    for (let i = 0; i < relevantFixtures.length; i++) {
      const f = relevantFixtures[i];
      
      // Fetch statistics for this fixture
      const stats = await fetchFixtureStats(f.fixture.id, API_KEY);
      
       // Add small delay between requests to respect rate limits
       if (i < relevantFixtures.length - 1) {
         await delay(150);
       }
      
      // Parse statistics
      let cornersHome = 0, cornersAway = 0;
      let yellowHome = 0, yellowAway = 0;
      let redHome = 0, redAway = 0;
      
      if (stats && stats.length >= 2) {
        // Home team stats (index 0)
        const homeStats = stats[0]?.statistics || [];
        cornersHome = getStatValue(homeStats, 'Corner Kicks');
        yellowHome = getStatValue(homeStats, 'Yellow Cards');
        redHome = getStatValue(homeStats, 'Red Cards');
        
        // Away team stats (index 1)
        const awayStats = stats[1]?.statistics || [];
        cornersAway = getStatValue(awayStats, 'Corner Kicks');
        yellowAway = getStatValue(awayStats, 'Yellow Cards');
        redAway = getStatValue(awayStats, 'Red Cards');
      }

      liveFixtures.push({
        fixture_id: f.fixture.id,
        home_team: f.teams.home.name,
        away_team: f.teams.away.name,
        league: f.league.name,
        status: f.fixture.status.short,
        elapsed: f.fixture.status.elapsed,
        score_home: f.goals.home || 0,
        score_away: f.goals.away || 0,
        corners_home: cornersHome,
        corners_away: cornersAway,
        corners_total: cornersHome + cornersAway,
        yellow_cards_home: yellowHome,
        yellow_cards_away: yellowAway,
        red_cards_home: redHome,
        red_cards_away: redAway,
        cards_home: yellowHome + redHome,
        cards_away: yellowAway + redAway,
        cards_total: yellowHome + yellowAway + redHome + redAway,
      });
      
      console.log(`📈 ${f.teams.home.name} vs ${f.teams.away.name}: Corners ${cornersHome}-${cornersAway}, Cards ${yellowHome + redHome}-${yellowAway + redAway}`);
    }

    console.log(`✅ Returning ${liveFixtures.length} live fixtures with stats`);

    return new Response(
      JSON.stringify({
        success: true,
        fixtures: liveFixtures,
        total: liveFixtures.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching live stats:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        fixtures: [] 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

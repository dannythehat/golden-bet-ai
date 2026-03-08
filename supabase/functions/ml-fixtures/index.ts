import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';

function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type FixturesResponse = {
  success: true;
  date: string;
  fixture_count: number;
  fixtures: Array<{
    fixture_id: string;
    league_id: number;
    league: string;
    home_team: string;
    away_team: string;
    kickoff: string; // UTC ISO string
  }>;
  source: 'api-football';
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    if (!API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'API_FOOTBALL_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const date = url.searchParams.get('date') ?? getTodayISO();

    if (!isISODate(date)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid date format. Expected YYYY-MM-DD' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiUrl = `${API_BASE_URL}/fixtures?date=${encodeURIComponent(date)}`;
    console.log(`📡 ml-fixtures: Fetching ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`❌ API-Football error: ${response.status} ${response.statusText} | ${body}`);
      return new Response(JSON.stringify({ success: false, error: `API request failed: ${response.statusText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const rawFixtures = Array.isArray(data?.response) ? data.response : [];

    const fixtures = rawFixtures
      .map((r: any) => {
        const fixtureId = r?.fixture?.id;
        const leagueId = r?.league?.id;
        const leagueName = r?.league?.name ?? '';
        const homeTeam = r?.teams?.home?.name;
        const awayTeam = r?.teams?.away?.name;
        const kickoff = r?.fixture?.date; // already UTC ISO

        if (
          (typeof fixtureId !== 'number' && typeof fixtureId !== 'string') ||
          typeof leagueId !== 'number' ||
          typeof homeTeam !== 'string' ||
          typeof awayTeam !== 'string' ||
          typeof kickoff !== 'string'
        ) {
          return null;
        }

        return {
          fixture_id: String(fixtureId),
          league_id: leagueId,
          league: leagueName,
          home_team: homeTeam,
          away_team: awayTeam,
          kickoff,
        };
      })
      .filter(Boolean) as FixturesResponse['fixtures'];

    const payload: FixturesResponse = {
      success: true,
      date,
      fixture_count: fixtures.length,
      fixtures,
      source: 'api-football',
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ ml-fixtures error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';

// Map of league IDs we care about → region
const LEAGUE_REGION_MAP: Record<number, string> = {
  // UK & Ireland
  39: 'uk', 40: 'uk', 41: 'uk', 42: 'uk', 43: 'uk', 45: 'uk', 48: 'uk',
  179: 'uk', 180: 'uk', 181: 'uk', 182: 'uk', 183: 'uk', 196: 'uk', 402: 'uk', 408: 'uk',
  // European Top 5
  140: 'european', 141: 'european', 78: 'european', 79: 'european', 135: 'european',
  136: 'european', 61: 'european', 62: 'european', 94: 'european', 95: 'european',
  // European Other
  88: 'european', 89: 'european', 144: 'european', 145: 'european', 203: 'european',
  204: 'european', 197: 'european', 207: 'european', 208: 'european', 218: 'european',
  219: 'european', 119: 'european', 120: 'european', 113: 'european', 114: 'european',
  103: 'european', 104: 'european', 106: 'european', 107: 'european', 345: 'european',
  346: 'european', 235: 'european', 236: 'european', 333: 'european', 210: 'european',
  286: 'european', 283: 'european', 284: 'european', 172: 'european', 271: 'european',
  318: 'european', 373: 'european', 244: 'european', 327: 'european', 332: 'european',
  // UEFA
  2: 'european', 3: 'european', 848: 'european',
  // Americas
  71: 'americas', 72: 'americas', 73: 'americas', 128: 'americas', 129: 'americas',
  130: 'americas', 262: 'americas', 263: 'americas', 253: 'americas', 254: 'americas',
  239: 'americas', 240: 'americas', 265: 'americas', 266: 'americas', 268: 'americas',
  395: 'americas', 281: 'americas', 242: 'americas', 278: 'americas', 260: 'americas',
  336: 'americas', 350: 'americas', 17: 'americas', 11: 'americas', 13: 'americas',
  259: 'americas', 296: 'americas',
  // Asia & Oceania
  98: 'asia', 99: 'asia', 100: 'asia', 292: 'asia', 293: 'asia', 169: 'asia',
  170: 'asia', 307: 'asia', 308: 'asia', 302: 'asia', 305: 'asia', 290: 'asia',
  323: 'asia', 324: 'asia', 374: 'asia', 375: 'asia', 340: 'asia', 188: 'asia',
  382: 'asia', 274: 'asia', 475: 'asia', 15: 'asia', 190: 'asia',
  // Africa
  233: 'africa', 200: 'africa', 201: 'africa', 202: 'africa', 387: 'africa',
  356: 'africa', 357: 'africa', 358: 'africa', 20: 'africa', 21: 'africa',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getStat(teamStats: any, type: string): number | null {
  if (!teamStats?.statistics) return null;
  const stat = teamStats.statistics.find((x: any) => x.type === type);
  if (!stat || stat.value === null || stat.value === undefined) return null;
  const val = typeof stat.value === 'string' ? parseFloat(stat.value.replace('%', '')) : stat.value;
  return isNaN(val) ? null : val;
}

async function fetchFromApi(apiKey: string, endpoint: string, params: Record<string, string | number> = {}): Promise<any> {
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
  if (!response.ok) throw new Error(`API error ${response.status}: ${response.statusText}`);
  const data = await response.json();
  
  // Log remaining API calls
  const remaining = response.headers.get('x-ratelimit-requests-remaining');
  if (remaining) console.log(`  📡 API calls remaining: ${remaining}`);
  
  return data.response || [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!API_KEY) throw new Error('API_FOOTBALL_KEY not configured');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const daysBack = body.daysBack || 2;
    const specificDate = body.date || null;
    const statsMode = body.statsMode !== false; // default true: fetch per-fixture stats

    const datesToFetch: string[] = [];
    if (specificDate) {
      datesToFetch.push(specificDate);
    } else {
      for (let i = 1; i <= daysBack; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        datesToFetch.push(d.toISOString().split('T')[0]);
      }
    }

    // Determine current season
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentSeason = currentMonth >= 6 ? currentYear : currentYear - 1;

    console.log(`🧠 ML Ingest: dates=${datesToFetch.join(',')} season=${currentSeason} statsMode=${statsMode}`);

    let totalInserted = 0;
    let totalProcessed = 0;
    let totalStatsEnriched = 0;
    let apiCalls = 0;

    for (const dateStr of datesToFetch) {
      console.log(`\n📅 === Processing ${dateStr} ===`);

      // STEP 1: Fetch ALL finished fixtures for this date (1 API call!)
      // Fetch ALL finished fixtures globally for this date
      // Don't filter by season - leagues have different season calendars
      apiCalls++;
      const allFixtures = await fetchFromApi(API_KEY, '/fixtures', {
        date: dateStr,
        status: 'FT',
      });
      console.log(`  📊 Total FT fixtures globally: ${allFixtures.length}`);

      // Filter to our tracked leagues
      const relevantFixtures = allFixtures.filter((f: any) => {
        const leagueId = f.league?.id;
        return leagueId && LEAGUE_REGION_MAP[leagueId];
      });
      console.log(`  ✅ In our tracked leagues: ${relevantFixtures.length}`);

      // STEP 2: Insert basic data for all relevant fixtures
      const basicBatch: any[] = [];
      const fixtureIdsForStats: { id: string; apiId: number }[] = [];

      for (const f of relevantFixtures) {
        if (f.goals?.home === null || f.goals?.away === null) continue;

        const fixtureId = String(f.fixture.id);
        const leagueId = f.league.id;
        const region = LEAGUE_REGION_MAP[leagueId] || 'european';
        const homeGoals = f.goals.home;
        const awayGoals = f.goals.away;
        const totalGoals = homeGoals + awayGoals;

        basicBatch.push({
          fixture_id: fixtureId,
          fixture_date: dateStr,
          home_team: f.teams.home.name,
          away_team: f.teams.away.name,
          league: f.league.name,
          region,
          total_goals: totalGoals,
          home_goals: homeGoals,
          away_goals: awayGoals,
          btts_hit: homeGoals > 0 && awayGoals > 0,
          over_25_hit: totalGoals > 2.5,
        });

        fixtureIdsForStats.push({ id: fixtureId, apiId: f.fixture.id });
        totalProcessed++;
      }

      // Upsert basic data in batches of 50
      for (let i = 0; i < basicBatch.length; i += 50) {
        const chunk = basicBatch.slice(i, i + 50);
        const { error } = await supabase.from('ml_training_data').upsert(chunk, { onConflict: 'fixture_id' });
        if (error) {
          console.error(`  ❌ Basic upsert error:`, error.message);
        } else {
          totalInserted += chunk.length;
        }
      }

      console.log(`  💾 Inserted ${totalInserted} basic records`);

      // STEP 3: Fetch detailed statistics per fixture (corners, cards, shots, etc.)
      if (statsMode && fixtureIdsForStats.length > 0) {
        console.log(`  🔬 Fetching stats for ${fixtureIdsForStats.length} fixtures...`);
        
        for (const fix of fixtureIdsForStats) {
          try {
            await delay(500); // Respect rate limits
            apiCalls++;

            const statsResponse = await fetchFromApi(API_KEY, '/fixtures/statistics', {
              fixture: fix.apiId,
            });

            if (!statsResponse || statsResponse.length < 2) continue;

            const h = statsResponse[0];
            const a = statsResponse[1];
            
            const homeCorners = getStat(h, 'Corner Kicks');
            const awayCorners = getStat(a, 'Corner Kicks');
            const homeYC = getStat(h, 'Yellow Cards');
            const awayYC = getStat(a, 'Yellow Cards');
            const homeRC = getStat(h, 'Red Cards');
            const awayRC = getStat(a, 'Red Cards');
            const totalCorners = (homeCorners != null && awayCorners != null) ? homeCorners + awayCorners : null;
            const totalCards = ((homeYC ?? 0) + (awayYC ?? 0) + (homeRC ?? 0) + (awayRC ?? 0)) || null;

            const hPoss = h?.statistics?.find((x: any) => x.type === 'Ball Possession');
            const aPoss = a?.statistics?.find((x: any) => x.type === 'Ball Possession');
            const hPassPct = h?.statistics?.find((x: any) => x.type === 'Passes %');
            const aPassPct = a?.statistics?.find((x: any) => x.type === 'Passes %');

            const statsUpdate: any = {
              fixture_id: fix.id,
              home_corners: homeCorners,
              away_corners: awayCorners,
              total_corners: totalCorners,
              home_yellow_cards: homeYC,
              away_yellow_cards: awayYC,
              home_red_cards: homeRC,
              away_red_cards: awayRC,
              total_cards: totalCards,
              home_fouls: getStat(h, 'Fouls'),
              away_fouls: getStat(a, 'Fouls'),
              home_total_shots: getStat(h, 'Total Shots'),
              away_total_shots: getStat(a, 'Total Shots'),
              home_shots_on_goal: getStat(h, 'Shots on Goal'),
              away_shots_on_goal: getStat(a, 'Shots on Goal'),
              home_shots_off_goal: getStat(h, 'Shots off Goal'),
              away_shots_off_goal: getStat(a, 'Shots off Goal'),
              home_blocked_shots: getStat(h, 'Blocked Shots'),
              away_blocked_shots: getStat(a, 'Blocked Shots'),
              home_shots_insidebox: getStat(h, 'Shots insidebox'),
              away_shots_insidebox: getStat(a, 'Shots insidebox'),
              home_shots_outsidebox: getStat(h, 'Shots outsidebox'),
              away_shots_outsidebox: getStat(a, 'Shots outsidebox'),
              home_offsides: getStat(h, 'Offsides'),
              away_offsides: getStat(a, 'Offsides'),
              home_goalkeeper_saves: getStat(h, 'Goalkeeper Saves'),
              away_goalkeeper_saves: getStat(a, 'Goalkeeper Saves'),
              home_total_passes: getStat(h, 'Total passes'),
              away_total_passes: getStat(a, 'Total passes'),
              home_passes_accurate: getStat(h, 'Passes accurate'),
              away_passes_accurate: getStat(a, 'Passes accurate'),
              home_possession: hPoss?.value || null,
              away_possession: aPoss?.value || null,
              home_passes_pct: hPassPct?.value || null,
              away_passes_pct: aPassPct?.value || null,
              over_95_corners_hit: totalCorners !== null ? totalCorners > 9.5 : null,
              over_35_cards_hit: totalCards !== null ? totalCards > 3.5 : null,
            };

            const { error } = await supabase
              .from('ml_training_data')
              .update(statsUpdate)
              .eq('fixture_id', fix.id);

            if (!error) totalStatsEnriched++;
          } catch (e: any) {
            // Non-critical: stats enrichment failure
          }
        }
        console.log(`  📈 Stats enriched: ${totalStatsEnriched}/${fixtureIdsForStats.length}`);
      }
    }

    // STEP 4: Trigger rolling stats recompute
    console.log(`\n🔄 Triggering rolling stats recompute...`);
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/compute-rolling-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ source: 'both' }),
      });
      console.log(`  ✅ Rolling stats recompute triggered`);
    } catch (e) {
      console.error(`  ⚠️ Rolling stats trigger failed:`, e);
    }

    const summary = {
      success: true,
      dates: datesToFetch,
      fixtures_processed: totalProcessed,
      fixtures_inserted: totalInserted,
      stats_enriched: totalStatsEnriched,
      api_calls: apiCalls,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ ML Ingest Complete:', JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ ML Ingest Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

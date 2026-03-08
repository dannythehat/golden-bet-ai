import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';

/**
 * COMPREHENSIVE LEAGUE LIST - ALL MAJOR LEAGUES WORLDWIDE
 * UK teams are in 'uk' region but frontend should show them in 'All Regions' too
 */
const LEAGUES_BY_REGION: Record<string, { id: number; name: string }[]> = {
  uk: [
    // ENGLAND
    { id: 39, name: 'Premier League' },
    { id: 40, name: 'Championship' },
    { id: 41, name: 'League One' },
    { id: 42, name: 'League Two' },
    { id: 43, name: 'National League' },
    // SCOTLAND
    { id: 179, name: 'Scottish Premiership' },
    { id: 180, name: 'Scottish Championship' },
    { id: 181, name: 'Scottish League One' },
    // WALES
    { id: 110, name: 'Welsh Premier League' },
    // NORTHERN IRELAND
    { id: 408, name: 'NIFL Premiership' },
    // IRELAND (Republic)
    { id: 357, name: 'League of Ireland Premier' },
  ],
  // Split European into sub-batches to fit within edge function timeouts
  european_1: [
    // SPAIN
    { id: 140, name: 'La Liga' },
    { id: 141, name: 'La Liga 2' },
    // GERMANY
    { id: 78, name: 'Bundesliga' },
    { id: 79, name: '2. Bundesliga' },
    { id: 80, name: '3. Liga' },
    // ITALY
    { id: 135, name: 'Serie A' },
    { id: 136, name: 'Serie B' },
    // FRANCE
    { id: 61, name: 'Ligue 1' },
    { id: 62, name: 'Ligue 2' },
  ],
  european_2: [
    // PORTUGAL
    { id: 94, name: 'Primeira Liga' },
    { id: 95, name: 'Liga Portugal 2' },
    // NETHERLANDS
    { id: 88, name: 'Eredivisie' },
    { id: 89, name: 'Eerste Divisie' },
    // BELGIUM
    { id: 144, name: 'Jupiler Pro League' },
    { id: 145, name: 'Challenger Pro League' },
    // TURKEY
    { id: 203, name: 'Süper Lig' },
    { id: 204, name: '1. Lig' },
    // GREECE
    { id: 197, name: 'Super League Greece' },
    // SWITZERLAND
    { id: 207, name: 'Super League Switzerland' },
    { id: 208, name: 'Challenge League' },
    // AUSTRIA
    { id: 218, name: 'Austrian Bundesliga' },
    { id: 219, name: '2. Liga Austria' },
  ],
  european_3: [
    // DENMARK
    { id: 119, name: 'Superliga Denmark' },
    { id: 120, name: '1st Division Denmark' },
    // SWEDEN
    { id: 113, name: 'Allsvenskan' },
    { id: 114, name: 'Superettan' },
    // NORWAY
    { id: 103, name: 'Eliteserien' },
    { id: 104, name: 'OBOS-ligaen' },
    // POLAND
    { id: 106, name: 'Ekstraklasa' },
    { id: 107, name: 'I Liga Poland' },
    // CZECH REPUBLIC
    { id: 345, name: 'Czech Liga' },
    { id: 346, name: 'FNL' },
    // RUSSIA
    { id: 235, name: 'Premier League Russia' },
    { id: 236, name: 'FNL Russia' },
    // UKRAINE
    { id: 333, name: 'Premier League Ukraine' },
    // CROATIA
    { id: 210, name: 'HNL' },
    // SERBIA
    { id: 286, name: 'Super Liga Serbia' },
    // ROMANIA
    { id: 283, name: 'Liga I' },
    // HUNGARY
    { id: 271, name: 'NB I' },
    // SLOVAKIA
    { id: 332, name: 'Super Liga Slovakia' },
    // SLOVENIA
    { id: 373, name: 'Prva Liga' },
    // BULGARIA
    { id: 172, name: 'First League Bulgaria' },
    // FINLAND
    { id: 244, name: 'Veikkausliiga' },
    // ICELAND
    { id: 354, name: 'Úrvalsdeild' },
    // CYPRUS
    { id: 318, name: 'First Division Cyprus' },
  ],
  // Keep 'european' as alias that combines all 3 for backwards compatibility
  european: [
    // SPAIN
    { id: 140, name: 'La Liga' },
    { id: 141, name: 'La Liga 2' },
    // GERMANY
    { id: 78, name: 'Bundesliga' },
    { id: 79, name: '2. Bundesliga' },
    { id: 80, name: '3. Liga' },
    // ITALY
    { id: 135, name: 'Serie A' },
    { id: 136, name: 'Serie B' },
    // FRANCE
    { id: 61, name: 'Ligue 1' },
    { id: 62, name: 'Ligue 2' },
    // PORTUGAL
    { id: 94, name: 'Primeira Liga' },
    { id: 95, name: 'Liga Portugal 2' },
    // NETHERLANDS
    { id: 88, name: 'Eredivisie' },
    { id: 89, name: 'Eerste Divisie' },
    // BELGIUM
    { id: 144, name: 'Jupiler Pro League' },
    { id: 145, name: 'Challenger Pro League' },
    // TURKEY
    { id: 203, name: 'Süper Lig' },
    { id: 204, name: '1. Lig' },
    // GREECE
    { id: 197, name: 'Super League Greece' },
    // SWITZERLAND
    { id: 207, name: 'Super League Switzerland' },
    { id: 208, name: 'Challenge League' },
    // AUSTRIA
    { id: 218, name: 'Austrian Bundesliga' },
    { id: 219, name: '2. Liga Austria' },
    // DENMARK
    { id: 119, name: 'Superliga Denmark' },
    { id: 120, name: '1st Division Denmark' },
    // SWEDEN
    { id: 113, name: 'Allsvenskan' },
    { id: 114, name: 'Superettan' },
    // NORWAY
    { id: 103, name: 'Eliteserien' },
    { id: 104, name: 'OBOS-ligaen' },
    // POLAND
    { id: 106, name: 'Ekstraklasa' },
    { id: 107, name: 'I Liga Poland' },
    // CZECH REPUBLIC
    { id: 345, name: 'Czech Liga' },
    { id: 346, name: 'FNL' },
    // RUSSIA
    { id: 235, name: 'Premier League Russia' },
    { id: 236, name: 'FNL Russia' },
    // UKRAINE
    { id: 333, name: 'Premier League Ukraine' },
    // CROATIA
    { id: 210, name: 'HNL' },
    // SERBIA
    { id: 286, name: 'Super Liga Serbia' },
    // ROMANIA
    { id: 283, name: 'Liga I' },
    // HUNGARY
    { id: 271, name: 'NB I' },
    // SLOVAKIA
    { id: 332, name: 'Super Liga Slovakia' },
    // SLOVENIA
    { id: 373, name: 'Prva Liga' },
    // BULGARIA
    { id: 172, name: 'First League Bulgaria' },
    // FINLAND
    { id: 244, name: 'Veikkausliiga' },
    // ICELAND
    { id: 354, name: 'Úrvalsdeild' },
    // CYPRUS
    { id: 318, name: 'First Division Cyprus' },
  ],
  asia: [
    // JAPAN
    { id: 98, name: 'J1 League' },
    { id: 99, name: 'J2 League' },
    { id: 100, name: 'J3 League' },
    // SOUTH KOREA
    { id: 292, name: 'K League 1' },
    { id: 293, name: 'K League 2' },
    // SAUDI ARABIA
    { id: 307, name: 'Saudi Pro League' },
    { id: 308, name: 'First Division Saudi' },
    // UAE
    { id: 169, name: 'UAE Pro League' },
    // QATAR
    { id: 302, name: 'Qatar Stars League' },
    // CHINA
    { id: 169, name: 'Chinese Super League' },
    // AUSTRALIA
    { id: 188, name: 'A-League' },
    // INDIA
    { id: 323, name: 'Indian Super League' },
    { id: 324, name: 'I-League' },
    // THAILAND
    { id: 296, name: 'Thai League 1' },
    // MALAYSIA
    { id: 299, name: 'Super Liga Malaysia' },
    // INDONESIA
    { id: 274, name: 'Liga 1 Indonesia' },
    // VIETNAM
    { id: 340, name: 'V.League 1' },
    // IRAN
    { id: 290, name: 'Persian Gulf Pro League' },
    // UZBEKISTAN
    { id: 367, name: 'Super League Uzbekistan' },
  ],
  americas: [
    // BRAZIL
    { id: 71, name: 'Série A Brazil' },
    { id: 72, name: 'Série B Brazil' },
    { id: 73, name: 'Série C Brazil' },
    // ARGENTINA
    { id: 128, name: 'Primera División Argentina' },
    { id: 129, name: 'Primera Nacional' },
    // MEXICO
    { id: 262, name: 'Liga MX' },
    { id: 263, name: 'Liga Expansión MX' },
    // USA
    { id: 253, name: 'MLS' },
    { id: 254, name: 'USL Championship' },
    // COLOMBIA
    { id: 239, name: 'Primera A Colombia' },
    { id: 240, name: 'Primera B Colombia' },
    // CHILE
    { id: 265, name: 'Primera División Chile' },
    // URUGUAY
    { id: 268, name: 'Primera División Uruguay' },
    // PARAGUAY
    { id: 242, name: 'Primera División Paraguay' },
    // PERU
    { id: 281, name: 'Liga 1 Peru' },
    // ECUADOR
    { id: 240, name: 'LigaPro Ecuador' },
    // VENEZUELA
    { id: 299, name: 'Primera División Venezuela' },
    // BOLIVIA
    { id: 157, name: 'División Profesional Bolivia' },
    // COSTA RICA
    { id: 162, name: 'Primera División Costa Rica' },
    // HONDURAS
    { id: 196, name: 'Liga Nacional Honduras' },
    // GUATEMALA
    { id: 191, name: 'Liga Nacional Guatemala' },
    // CANADA
    { id: 259, name: 'Canadian Premier League' },
  ],
  africa: [
    // SOUTH AFRICA
    { id: 288, name: 'Premier League South Africa' },
    { id: 289, name: 'First Division South Africa' },
    // EGYPT
    { id: 233, name: 'Egyptian Premier League' },
    // MOROCCO
    { id: 200, name: 'Botola Pro' },
    // TUNISIA
    { id: 202, name: 'Ligue 1 Tunisia' },
    // ALGERIA
    { id: 187, name: 'Ligue 1 Algeria' },
    // NIGERIA
    { id: 277, name: 'NPFL' },
    // GHANA
    { id: 184, name: 'Ghana Premier League' },
    // KENYA
    { id: 276, name: 'Kenyan Premier League' },
    // SENEGAL
    { id: 304, name: 'Ligue 1 Senegal' },
    // IVORY COAST
    { id: 227, name: 'Ligue 1 Ivory Coast' },
    // CAMEROON
    { id: 186, name: 'Elite One' },
    // DR CONGO
    { id: 229, name: 'Super Ligue' },
    // ZAMBIA
    { id: 370, name: 'Super League Zambia' },
    // TANZANIA
    { id: 361, name: 'NBC Premier League' },
    // UGANDA
    { id: 365, name: 'Uganda Premier League' },
  ],
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getCurrentSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Most leagues: Aug-May = season starts in previous year
  // Southern hemisphere: Feb-Nov = current year
  return month < 7 ? year - 1 : year;
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

interface TeamStatsRow {
  team_id: number;
  team_name: string;
  league_name: string;
  region: string;
  category: string;
  market: string;
  success_percent: number;
  success_count: number;
  matches_sampled: number;
  avg_per_game: number;
}

/**
 * Calculate stats from EXACTLY 20 finished fixtures
 * All markets (goals, btts, corners, cards) use the same 20-game sample
 */
function calculateAllStats(fixtures: any[], teamId: number): TeamStatsRow[] | null {
  // Get exactly 20 finished matches
  const validFixtures = fixtures.filter(f => 
    f.fixture?.status?.short === 'FT' && 
    f.goals?.home !== null && 
    f.goals?.away !== null
  ).slice(0, 20);

  // Require minimum 10 games for meaningful stats
  if (validFixtures.length < 10) return null;

  const count = validFixtures.length;
  
  // Goals counters
  let over15 = 0, over25 = 0, over35 = 0, over45 = 0;
  let totalGoals = 0;
  
  // BTTS counter
  let bttsYes = 0;
  let teamScored = 0, teamConceded = 0;
  
  // Corners & Cards
  let totalCorners = 0;
  let over85Corners = 0, over95Corners = 0, over105Corners = 0;
  
  let totalCards = 0;
  let over25Cards = 0, over35Cards = 0, over45Cards = 0;
  
  let gamesWithCornerData = 0;
  let gamesWithCardData = 0;

  for (const fixture of validFixtures) {
    const homeGoals = fixture.goals.home ?? 0;
    const awayGoals = fixture.goals.away ?? 0;
    const total = homeGoals + awayGoals;
    const isHome = fixture.teams?.home?.id === teamId;

    // Goals stats - always calculated
    totalGoals += total;
    if (total > 1.5) over15++;
    if (total > 2.5) over25++;
    if (total > 3.5) over35++;
    if (total > 4.5) over45++;

    // BTTS stats - always calculated
    if (homeGoals > 0 && awayGoals > 0) bttsYes++;
    
    if (isHome) {
      teamScored += homeGoals;
      teamConceded += awayGoals;
    } else {
      teamScored += awayGoals;
      teamConceded += homeGoals;
    }

    // Corners and Cards from fixture statistics
    const stats = fixture.statistics || [];
    if (stats.length >= 2) {
      const homeStats = stats.find((s: any) => s.team?.id === fixture.teams?.home?.id);
      const awayStats = stats.find((s: any) => s.team?.id === fixture.teams?.away?.id);
      
      const getStatValue = (teamStats: any, type: string): number | null => {
        if (!teamStats?.statistics) return null;
        const stat = teamStats.statistics.find((s: any) => s.type === type);
        if (!stat || stat.value === null) return null;
        return parseInt(stat.value) || 0;
      };
      
      // Corners
      const homeCorners = getStatValue(homeStats, 'Corner Kicks');
      const awayCorners = getStatValue(awayStats, 'Corner Kicks');
      if (homeCorners !== null && awayCorners !== null) {
        const corners = homeCorners + awayCorners;
        totalCorners += corners;
        gamesWithCornerData++;
        if (corners > 8.5) over85Corners++;
        if (corners > 9.5) over95Corners++;
        if (corners > 10.5) over105Corners++;
      }
      
      // Cards
      const homeYellow = getStatValue(homeStats, 'Yellow Cards');
      const awayYellow = getStatValue(awayStats, 'Yellow Cards');
      const homeRed = getStatValue(homeStats, 'Red Cards');
      const awayRed = getStatValue(awayStats, 'Red Cards');
      if (homeYellow !== null && awayYellow !== null) {
        const cards = (homeYellow || 0) + (awayYellow || 0) + (homeRed || 0) + (awayRed || 0);
        totalCards += cards;
        gamesWithCardData++;
        if (cards > 2.5) over25Cards++;
        if (cards > 3.5) over35Cards++;
        if (cards > 4.5) over45Cards++;
      }
    }
  }

  const results: TeamStatsRow[] = [];
  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0;
  const avgGoals = Math.round((totalGoals / count) * 10) / 10;

  // GOALS markets
  results.push(
    { team_id: teamId, team_name: '', league_name: '', region: '', category: 'goals', market: 'over_1_5', success_percent: pct(over15, count), success_count: over15, matches_sampled: count, avg_per_game: avgGoals },
    { team_id: teamId, team_name: '', league_name: '', region: '', category: 'goals', market: 'over_2_5', success_percent: pct(over25, count), success_count: over25, matches_sampled: count, avg_per_game: avgGoals },
    { team_id: teamId, team_name: '', league_name: '', region: '', category: 'goals', market: 'over_3_5', success_percent: pct(over35, count), success_count: over35, matches_sampled: count, avg_per_game: avgGoals },
    { team_id: teamId, team_name: '', league_name: '', region: '', category: 'goals', market: 'over_4_5', success_percent: pct(over45, count), success_count: over45, matches_sampled: count, avg_per_game: avgGoals },
  );

  // BTTS markets
  results.push(
    { team_id: teamId, team_name: '', league_name: '', region: '', category: 'btts', market: 'btts_yes', success_percent: pct(bttsYes, count), success_count: bttsYes, matches_sampled: count, avg_per_game: Math.round((teamScored / count) * 10) / 10 },
    { team_id: teamId, team_name: '', league_name: '', region: '', category: 'btts', market: 'btts_no', success_percent: pct(count - bttsYes, count), success_count: count - bttsYes, matches_sampled: count, avg_per_game: Math.round((teamConceded / count) * 10) / 10 },
  );

  // CORNERS markets - only if we have corner data for at least 10 games
  if (gamesWithCornerData >= 10) {
    const avgCorners = Math.round((totalCorners / gamesWithCornerData) * 10) / 10;
    results.push(
      { team_id: teamId, team_name: '', league_name: '', region: '', category: 'corners', market: 'over_8_5', success_percent: pct(over85Corners, gamesWithCornerData), success_count: over85Corners, matches_sampled: gamesWithCornerData, avg_per_game: avgCorners },
      { team_id: teamId, team_name: '', league_name: '', region: '', category: 'corners', market: 'over_9_5', success_percent: pct(over95Corners, gamesWithCornerData), success_count: over95Corners, matches_sampled: gamesWithCornerData, avg_per_game: avgCorners },
      { team_id: teamId, team_name: '', league_name: '', region: '', category: 'corners', market: 'over_10_5', success_percent: pct(over105Corners, gamesWithCornerData), success_count: over105Corners, matches_sampled: gamesWithCornerData, avg_per_game: avgCorners },
    );
  }

  // CARDS markets - only if we have card data for at least 10 games
  if (gamesWithCardData >= 10) {
    const avgCards = Math.round((totalCards / gamesWithCardData) * 10) / 10;
    results.push(
      { team_id: teamId, team_name: '', league_name: '', region: '', category: 'cards', market: 'over_2_5', success_percent: pct(over25Cards, gamesWithCardData), success_count: over25Cards, matches_sampled: gamesWithCardData, avg_per_game: avgCards },
      { team_id: teamId, team_name: '', league_name: '', region: '', category: 'cards', market: 'over_3_5', success_percent: pct(over35Cards, gamesWithCardData), success_count: over35Cards, matches_sampled: gamesWithCardData, avg_per_game: avgCards },
      { team_id: teamId, team_name: '', league_name: '', region: '', category: 'cards', market: 'over_4_5', success_percent: pct(over45Cards, gamesWithCardData), success_count: over45Cards, matches_sampled: gamesWithCardData, avg_per_game: avgCards },
    );
  }

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!API_KEY) throw new Error('API_FOOTBALL_KEY not configured');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase credentials not configured');

    const url = new URL(req.url);
    const targetRegion = url.searchParams.get('region') || 'uk';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const season = getCurrentSeason();

    const leagues = LEAGUES_BY_REGION[targetRegion];
    if (!leagues) {
      return new Response(JSON.stringify({ error: `Unknown region: ${targetRegion}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🚀 Processing ${targetRegion.toUpperCase()} region (${leagues.length} leagues) for season ${season}`);
    console.log(`📊 Fetching LAST 20 GAMES for all stats (goals, btts, corners, cards)`);
    
    let totalTeams = 0;
    let insertedCount = 0;

    for (const league of leagues) {
      try {
        console.log(`\n📊 Processing: ${league.name}`);
        await delay(500);
        
        const standings = await fetchFromApi(API_KEY, '/standings', { league: league.id, season });
        if (!standings?.[0]?.league?.standings?.[0]) {
          console.log(`  ⚠️ No standings for ${league.name}`);
          continue;
        }

        const leagueStandings = standings[0].league.standings[0];
        console.log(`  Found ${leagueStandings.length} teams`);

        // Limit to top teams per league to stay within timeout
        // For sub-batches, process all teams; timeout will naturally cap it
        const maxTeamsPerLeague = 20;
        const teamsToProcess = leagueStandings.slice(0, maxTeamsPerLeague);
        console.log(`  Processing ${teamsToProcess.length} of ${leagueStandings.length} teams`);

        for (const standing of teamsToProcess) {
          const teamId = standing.team?.id;
          const teamName = standing.team?.name;
          if (!teamId || !teamName) continue;

          try {
            // Skip if recently updated (within 3 days)
            const { data: existing } = await supabase
              .from('regional_stats')
              .select('last_updated')
              .eq('team_id', teamId)
              .limit(1)
              .maybeSingle();
            
            if (existing?.last_updated) {
              const lastUpdate = new Date(existing.last_updated);
              const daysSince = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
              if (daysSince < 3) {
                console.log(`    ⏭️ Skipping ${teamName} (updated ${daysSince.toFixed(1)}d ago)`);
                continue;
              }
            }

            // Fetch last 20 fixtures WITH statistics in a single call
            await delay(500);
            let fixtures: any[];
            try {
              // Use league + season + team with statistics to get everything in fewer calls
              const fixtureRes = await fetchFromApi(API_KEY, '/fixtures', { team: teamId, season, last: 20 });
              fixtures = fixtureRes || [];
            } catch {
              console.log(`    ⚠️ No fixtures for ${teamName}`);
              continue;
            }
            if (!fixtures.length) {
              console.log(`    ⚠️ No fixtures for ${teamName}`);
              continue;
            }

            // Batch fetch stats for all fixtures at once using fixture IDs
            const fixturesWithStats = [...fixtures];
            const fixturesMissingStats = fixtures
              .map((f: any, i: number) => ({ id: f?.fixture?.id, index: i }))
              .filter((f: any) => f.id && !fixtures[f.index].statistics)
              .slice(0, 10); // Limit to 10 stats fetches per team to stay within timeout
            
            for (const { id, index } of fixturesMissingStats) {
              try {
                await delay(200);
                const stats = await fetchFromApi(API_KEY, '/fixtures/statistics', { fixture: id });
                if (stats?.length) fixturesWithStats[index].statistics = stats;
              } catch {
                // Skip individual stat fetch errors
              }
            }

            const stats = calculateAllStats(fixturesWithStats, teamId);
            if (!stats) {
              console.log(`    ⚠️ Not enough data for ${teamName}`);
              continue;
            }

            // Fill team info
            for (const stat of stats) {
              stat.team_name = teamName;
              stat.league_name = league.name;
              stat.region = targetRegion;
            }

            // Delete old stats for this team and insert new
            await supabase
              .from('regional_stats')
              .delete()
              .eq('team_id', teamId);
            
            const { error: insertError } = await supabase
              .from('regional_stats')
              .insert(stats);

            if (!insertError) {
              insertedCount += stats.length;
              totalTeams++;
              console.log(`    ✓ ${teamName}: ${stats.length} stats (${stats[0]?.matches_sampled || 20} games)`);
            } else {
              console.error(`    ❌ DB error for ${teamName}:`, insertError.message);
            }
          } catch (teamError) {
            console.error(`    ❌ Error: ${teamName}`, teamError);
          }
        }
      } catch (leagueError) {
        console.error(`❌ League error: ${league.name}`, leagueError);
      }
    }

    const summary = {
      success: true,
      region: targetRegion,
      leagues_processed: leagues.length,
      teams_processed: totalTeams,
      stats_created: insertedCount,
      sample_size: '20 games per team',
      timestamp: new Date().toISOString(),
    };

    console.log('\n✅ Complete:', summary);
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

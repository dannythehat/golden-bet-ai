/**
 * REAL Stats Fetcher - Fetch ACTUAL data from API-Football
 * Fetches ALL major leagues worldwide (80+ leagues)
 * Calculates real statistics from last 20 games per team
 * 
 * Run this to populate cache with REAL data:
 * node scripts/fetch-real-stats.js
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.VITE_API_FOOTBALL_KEY || '***REMOVED***';
const API_BASE = 'https://v3.football.api-sports.io';

// ALL MAJOR LEAGUES WORLDWIDE (80+ leagues)
const LEAGUES = [
  // UK (5 leagues)
  { id: 39, name: 'Premier League', region: 'uk', season: 2024 },
  { id: 40, name: 'Championship', region: 'uk', season: 2024 },
  { id: 41, name: 'League One', region: 'uk', season: 2024 },
  { id: 42, name: 'League Two', region: 'uk', season: 2024 },
  { id: 179, name: 'Scottish Premiership', region: 'uk', season: 2024 },
  
  // Europe - Top 5 Leagues
  { id: 140, name: 'La Liga', region: 'european', season: 2024 },
  { id: 78, name: 'Bundesliga', region: 'european', season: 2024 },
  { id: 135, name: 'Serie A', region: 'european', season: 2024 },
  { id: 61, name: 'Ligue 1', region: 'european', season: 2024 },
  { id: 94, name: 'Primeira Liga', region: 'european', season: 2024 },
  
  // Europe - Other Major
  { id: 88, name: 'Eredivisie', region: 'european', season: 2024 },
  { id: 144, name: 'Belgian Pro League', region: 'european', season: 2024 },
  { id: 203, name: 'Süper Lig', region: 'european', season: 2024 },
  { id: 235, name: 'Russian Premier League', region: 'european', season: 2024 },
  { id: 119, name: 'Danish Superliga', region: 'european', season: 2024 },
  { id: 113, name: 'Allsvenskan', region: 'european', season: 2024 },
  { id: 103, name: 'Eliteserien', region: 'european', season: 2024 },
  { id: 218, name: 'Austrian Bundesliga', region: 'european', season: 2024 },
  { id: 197, name: 'Greek Super League', region: 'european', season: 2024 },
  { id: 283, name: 'Ukrainian Premier League', region: 'european', season: 2024 },
  
  // Asia (15 leagues)
  { id: 98, name: 'J1 League', region: 'asia', season: 2024 },
  { id: 307, name: 'Saudi Pro League', region: 'asia', season: 2024 },
  { id: 17, name: 'Chinese Super League', region: 'asia', season: 2024 },
  { id: 292, name: 'K League 1', region: 'asia', season: 2024 },
  { id: 323, name: 'Indian Super League', region: 'asia', season: 2024 },
  { id: 188, name: 'UAE Pro League', region: 'asia', season: 2024 },
  { id: 271, name: 'Qatar Stars League', region: 'asia', season: 2024 },
  { id: 202, name: 'Iraqi Premier League', region: 'asia', season: 2024 },
  { id: 266, name: 'Thai League 1', region: 'asia', season: 2024 },
  { id: 169, name: 'Indonesian Liga 1', region: 'asia', season: 2024 },
  { id: 289, name: 'Malaysian Super League', region: 'asia', season: 2024 },
  { id: 274, name: 'Singapore Premier League', region: 'asia', season: 2024 },
  { id: 281, name: 'Uzbekistan Super League', region: 'asia', season: 2024 },
  { id: 333, name: 'Australian A-League', region: 'asia', season: 2024 },
  { id: 244, name: 'Iranian Pro League', region: 'asia', season: 2024 },
  
  // Americas (15 leagues)
  { id: 71, name: 'Brasileirão', region: 'americas', season: 2024 },
  { id: 262, name: 'Liga MX', region: 'americas', season: 2024 },
  { id: 128, name: 'Argentine Primera', region: 'americas', season: 2024 },
  { id: 253, name: 'MLS', region: 'americas', season: 2024 },
  { id: 239, name: 'Colombian Primera A', region: 'americas', season: 2024 },
  { id: 242, name: 'Chilean Primera', region: 'americas', season: 2024 },
  { id: 250, name: 'Ecuadorian Serie A', region: 'americas', season: 2024 },
  { id: 268, name: 'Peruvian Primera', region: 'americas', season: 2024 },
  { id: 265, name: 'Uruguayan Primera', region: 'americas', season: 2024 },
  { id: 274, name: 'Paraguayan Primera', region: 'americas', season: 2024 },
  { id: 261, name: 'Venezuelan Primera', region: 'americas', season: 2024 },
  { id: 257, name: 'Bolivian Primera', region: 'americas', season: 2024 },
  { id: 252, name: 'Costa Rican Primera', region: 'americas', season: 2024 },
  { id: 263, name: 'Guatemalan Liga Nacional', region: 'americas', season: 2024 },
  { id: 267, name: 'Honduran Liga Nacional', region: 'americas', season: 2024 },
  
  // Africa (10 leagues)
  { id: 233, name: 'Egyptian Premier League', region: 'africa', season: 2024 },
  { id: 288, name: 'South African Premier', region: 'africa', season: 2024 },
  { id: 200, name: 'Moroccan Botola Pro', region: 'africa', season: 2024 },
  { id: 244, name: 'Tunisian Ligue 1', region: 'africa', season: 2024 },
  { id: 301, name: 'Algerian Ligue 1', region: 'africa', season: 2024 },
  { id: 286, name: 'Nigerian NPFL', region: 'africa', season: 2024 },
  { id: 285, name: 'Kenyan Premier League', region: 'africa', season: 2024 },
  { id: 287, name: 'Ghanaian Premier League', region: 'africa', season: 2024 },
  { id: 290, name: 'Tanzanian Premier League', region: 'africa', season: 2024 },
  { id: 291, name: 'Ugandan Premier League', region: 'africa', season: 2024 },
];

async function apiRequest(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE}${endpoint}?${queryString}`;
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.response || [];
}

async function getLeagueTeams(leagueId, season) {
  return await apiRequest('/teams', { league: leagueId, season });
}

async function getTeamFixtures(teamId, season, last = 20) {
  return await apiRequest('/fixtures', {
    team: teamId,
    season,
    last,
    status: 'FT',
  });
}

async function getFixtureStatistics(fixtureId) {
  return await apiRequest('/fixtures/statistics', { fixture: fixtureId });
}

function calculateGoalStats(fixtures) {
  const played = fixtures.length;
  if (played === 0) return null;
  
  let over_2_5 = 0;
  
  fixtures.forEach(fixture => {
    const homeGoals = fixture.goals?.home || 0;
    const awayGoals = fixture.goals?.away || 0;
    const totalGoals = homeGoals + awayGoals;
    
    if (totalGoals > 2.5) over_2_5++;
  });
  
  return {
    played,
    over_2_5_pct: Math.round((over_2_5 / played) * 100),
    over_2_5_count: over_2_5,
  };
}

async function calculateCornerStats(fixtures) {
  let totalCorners = 0;
  let gamesWithData = 0;
  let over_9_5 = 0;
  
  // Limit to 10 fixtures to avoid rate limits
  for (const fixture of fixtures.slice(0, 10)) {
    try {
      const stats = await getFixtureStatistics(fixture.fixture.id);
      if (stats && stats.length >= 2) {
        const homeCorners = parseInt(stats[0].statistics.find(s => s.type === 'Corner Kicks')?.value || 0);
        const awayCorners = parseInt(stats[1].statistics.find(s => s.type === 'Corner Kicks')?.value || 0);
        const corners = homeCorners + awayCorners;
        
        totalCorners += corners;
        gamesWithData++;
        if (corners > 9.5) over_9_5++;
      }
    } catch (error) {
      console.error(`Error fetching fixture stats: ${error.message}`);
    }
  }
  
  return {
    over_9_5_pct: gamesWithData > 0 ? Math.round((over_9_5 / gamesWithData) * 100) : 0,
    avg_corners: gamesWithData > 0 ? (totalCorners / gamesWithData).toFixed(1) : '0.0',
  };
}

async function calculateCardStats(fixtures) {
  let totalCards = 0;
  let gamesWithData = 0;
  let over_3_5 = 0;
  
  for (const fixture of fixtures.slice(0, 10)) {
    try {
      const stats = await getFixtureStatistics(fixture.fixture.id);
      if (stats && stats.length >= 2) {
        const homeYellow = parseInt(stats[0].statistics.find(s => s.type === 'Yellow Cards')?.value || 0);
        const awayYellow = parseInt(stats[1].statistics.find(s => s.type === 'Yellow Cards')?.value || 0);
        const homeRed = parseInt(stats[0].statistics.find(s => s.type === 'Red Cards')?.value || 0);
        const awayRed = parseInt(stats[1].statistics.find(s => s.type === 'Red Cards')?.value || 0);
        
        const cards = homeYellow + awayYellow + homeRed + awayRed;
        totalCards += cards;
        gamesWithData++;
        if (cards > 3.5) over_3_5++;
      }
    } catch (error) {
      console.error(`Error fetching fixture stats: ${error.message}`);
    }
  }
  
  return {
    over_3_5_pct: gamesWithData > 0 ? Math.round((over_3_5 / gamesWithData) * 100) : 0,
    avg_cards: gamesWithData > 0 ? (totalCards / gamesWithData).toFixed(1) : '0.0',
  };
}

function calculateBTTSStats(fixtures, teamId) {
  const played = fixtures.length;
  if (played === 0) return null;
  
  let btts_yes = 0;
  let totalScored = 0;
  let totalConceded = 0;
  
  fixtures.forEach(fixture => {
    const isHome = fixture.teams.home.id === teamId;
    const homeGoals = fixture.goals?.home || 0;
    const awayGoals = fixture.goals?.away || 0;
    
    if (homeGoals > 0 && awayGoals > 0) btts_yes++;
    
    if (isHome) {
      totalScored += homeGoals;
      totalConceded += awayGoals;
    } else {
      totalScored += awayGoals;
      totalConceded += homeGoals;
    }
  });
  
  return {
    btts_pct: Math.round((btts_yes / played) * 100),
    avg_gs: (totalScored / played).toFixed(1),
    avg_gc: (totalConceded / played).toFixed(1),
  };
}

async function fetchAllStats() {
  console.log('🚀 Starting REAL stats fetch from API-Football...');
  console.log(`📊 Fetching ${LEAGUES.length} leagues worldwide`);
  
  const allTeamsData = [];
  let totalTeams = 0;
  let apiCalls = 0;
  
  for (const league of LEAGUES) {
    console.log(`\n📋 Processing: ${league.name} (${league.region})`);
    
    try {
      // Fetch teams in league
      const teams = await getLeagueTeams(league.id, league.season);
      apiCalls++;
      console.log(`  ✓ Found ${teams.length} teams`);
      
      // Process each team
      for (const teamData of teams.slice(0, 20)) { // Limit to top 20 teams per league
        try {
          const team = teamData.team;
          console.log(`    Processing: ${team.name}...`);
          
          // Fetch last 20 fixtures
          const fixtures = await getTeamFixtures(team.id, league.season, 20);
          apiCalls++;
          
          if (fixtures.length < 5) {
            console.log(`      ⚠️ Only ${fixtures.length} games, skipping`);
            continue;
          }
          
          // Calculate all stats
          const goalStats = calculateGoalStats(fixtures);
          const cornerStats = await calculateCornerStats(fixtures);
          const cardStats = await calculateCardStats(fixtures);
          const bttsStats = calculateBTTSStats(fixtures, team.id);
          
          apiCalls += 20; // Approximate for fixture stats
          
          if (goalStats && bttsStats) {
            allTeamsData.push({
              id: team.id,
              team: team.name,
              league: league.name,
              region: league.region,
              ...goalStats,
              ...cornerStats,
              ...cardStats,
              ...bttsStats,
            });
            
            totalTeams++;
            console.log(`      ✓ Stats calculated (${totalTeams} teams total)`);
          }
          
          // Rate limiting - wait 100ms between teams
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`      ✗ Error processing ${teamData.team.name}: ${error.message}`);
        }
      }
      
      // Rate limiting - wait 1 second between leagues
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  ✗ Error processing league ${league.name}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ Fetch complete!`);
  console.log(`📊 Total teams processed: ${totalTeams}`);
  console.log(`📞 Total API calls: ~${apiCalls}`);
  
  // Sort by percentages
  const goalsSorted = [...allTeamsData].sort((a, b) => b.over_2_5_pct - a.over_2_5_pct);
  const cornersSorted = [...allTeamsData].sort((a, b) => b.over_9_5_pct - a.over_9_5_pct);
  const cardsSorted = [...allTeamsData].sort((a, b) => b.over_3_5_pct - a.over_3_5_pct);
  const bttsSorted = [...allTeamsData].sort((a, b) => b.btts_pct - a.btts_pct);
  
  return {
    goals: goalsSorted,
    corners: cornersSorted,
    cards: cardsSorted,
    btts: bttsSorted,
    timestamp: Date.now(),
    nextRefresh: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    meta: {
      totalTeams,
      totalLeagues: LEAGUES.length,
      apiCalls,
      regions: {
        uk: allTeamsData.filter(t => t.region === 'uk').length,
        european: allTeamsData.filter(t => t.region === 'european').length,
        asia: allTeamsData.filter(t => t.region === 'asia').length,
        americas: allTeamsData.filter(t => t.region === 'americas').length,
        africa: allTeamsData.filter(t => t.region === 'africa').length,
      },
    },
  };
}

async function main() {
  try {
    const stats = await fetchAllStats();
    
    // Save to cache file
    const cachePath = path.join(__dirname, '../cache/stats-cache.json');
    fs.writeFileSync(cachePath, JSON.stringify(stats, null, 2));
    
    console.log(`\n💾 Cache saved to: ${cachePath}`);
    console.log(`📊 Stats by region:`);
    console.log(`   UK: ${stats.meta.regions.uk} teams`);
    console.log(`   Europe: ${stats.meta.regions.european} teams`);
    console.log(`   Asia: ${stats.meta.regions.asia} teams`);
    console.log(`   Americas: ${stats.meta.regions.americas} teams`);
    console.log(`   Africa: ${stats.meta.regions.africa} teams`);
    console.log(`\n✅ Done! Cache is now populated with REAL data.`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

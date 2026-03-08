/**
 * Backend service to fetch and store team statistics in Supabase
 * Run this periodically (daily) to update the database
 */

const API_BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = process.env.VITE_API_FOOTBALL_KEY;

// Major leagues to analyze
const LEAGUES = [
  { id: 39, name: 'Premier League', region: 'uk' },
  { id: 140, name: 'La Liga', region: 'european' },
  { id: 78, name: 'Bundesliga', region: 'european' },
  { id: 135, name: 'Serie A', region: 'european' },
  { id: 61, name: 'Ligue 1', region: 'european' },
  { id: 94, name: 'Primeira Liga', region: 'european' },
  { id: 88, name: 'Eredivisie', region: 'european' },
  { id: 179, name: 'Scottish Premiership', region: 'uk' },
  { id: 98, name: 'J1 League', region: 'asia' },
  { id: 307, name: 'Saudi Pro League', region: 'asia' },
  { id: 271, name: 'K League 1', region: 'asia' },
  { id: 71, name: 'Brasileirão', region: 'americas' },
  { id: 262, name: 'Liga MX', region: 'americas' },
  { id: 128, name: 'Argentine Primera', region: 'americas' },
];

async function apiRequest(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}${endpoint}?${queryString}`;

  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  return await response.json();
}

function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month < 7 ? year - 1 : year;
}

/**
 * Calculate statistics for a single team
 */
async function calculateTeamStats(teamId, teamName, leagueName, region, season) {
  console.log(`Processing ${teamName}...`);

  // Get last 20 finished matches
  const fixturesData = await apiRequest('/fixtures', {
    team: teamId,
    season: season,
    last: 20,
    status: 'FT',
  });

  const fixtures = fixturesData.response || [];
  if (fixtures.length < 10) {
    console.log(`Skipping ${teamName} - not enough matches`);
    return null;
  }

  // Calculate goal stats
  let over_2_5_goals = 0;
  let btts_yes = 0;
  let totalGoalsScored = 0;
  let totalGoalsConceded = 0;

  fixtures.forEach(fixture => {
    const isHome = fixture.teams.home.id === teamId;
    const homeGoals = fixture.goals.home || 0;
    const awayGoals = fixture.goals.away || 0;
    const totalGoals = homeGoals + awayGoals;

    if (totalGoals > 2.5) over_2_5_goals++;
    if (homeGoals > 0 && awayGoals > 0) btts_yes++;

    if (isHome) {
      totalGoalsScored += homeGoals;
      totalGoalsConceded += awayGoals;
    } else {
      totalGoalsScored += awayGoals;
      totalGoalsConceded += homeGoals;
    }
  });

  // Get corner and card stats from last 10 matches
  let over_9_5_corners = 0;
  let over_3_5_cards = 0;
  let totalCorners = 0;
  let totalCards = 0;
  let statsCount = 0;

  for (const fixture of fixtures.slice(0, 10)) {
    try {
      const statsData = await apiRequest('/fixtures/statistics', {
        fixture: fixture.fixture.id,
      });

      const homeStats = statsData.response.find(s => s.team.id === fixture.teams.home.id);
      const awayStats = statsData.response.find(s => s.team.id === fixture.teams.away.id);

      // Corners
      const homeCorners = Number(homeStats?.statistics.find(s => s.type === 'Corner Kicks')?.value || 0);
      const awayCorners = Number(awayStats?.statistics.find(s => s.type === 'Corner Kicks')?.value || 0);
      const corners = homeCorners + awayCorners;
      totalCorners += corners;
      if (corners > 9.5) over_9_5_corners++;

      // Cards
      const homeYellow = Number(homeStats?.statistics.find(s => s.type === 'Yellow Cards')?.value || 0);
      const awayYellow = Number(awayStats?.statistics.find(s => s.type === 'Yellow Cards')?.value || 0);
      const homeRed = Number(homeStats?.statistics.find(s => s.type === 'Red Cards')?.value || 0);
      const awayRed = Number(awayStats?.statistics.find(s => s.type === 'Red Cards')?.value || 0);
      const cards = homeYellow + awayYellow + homeRed + awayRed;
      totalCards += cards;
      if (cards > 3.5) over_3_5_cards++;

      statsCount++;
    } catch (error) {
      console.error(`Error fetching fixture stats: ${error.message}`);
    }
  }

  const played = fixtures.length;
  const avgCorners = statsCount > 0 ? (totalCorners / statsCount).toFixed(1) : '0.0';
  const avgCards = statsCount > 0 ? (totalCards / statsCount).toFixed(1) : '0.0';

  return {
    team_id: teamId,
    team_name: teamName,
    league: leagueName,
    region: region,
    played: played,
    
    // Goals
    over_2_5_goals_pct: Math.round((over_2_5_goals / played) * 100),
    over_2_5_goals_count: over_2_5_goals,
    
    // Corners
    over_9_5_corners_pct: statsCount > 0 ? Math.round((over_9_5_corners / statsCount) * 100) : 0,
    over_9_5_corners_count: over_9_5_corners,
    avg_corners: avgCorners,
    
    // Cards
    over_3_5_cards_pct: statsCount > 0 ? Math.round((over_3_5_cards / statsCount) * 100) : 0,
    over_3_5_cards_count: over_3_5_cards,
    avg_cards: avgCards,
    
    // BTTS
    btts_yes_pct: Math.round((btts_yes / played) * 100),
    btts_yes_count: btts_yes,
    avg_goals_scored: (totalGoalsScored / played).toFixed(1),
    avg_goals_conceded: (totalGoalsConceded / played).toFixed(1),
    
    last_updated: new Date().toISOString(),
  };
}

/**
 * Main function to fetch all stats and store in database
 */
export async function fetchAndStoreStats() {
  const season = getCurrentSeason();
  const allStats = [];

  console.log('🔄 Starting statistics collection...');

  for (const league of LEAGUES) {
    try {
      console.log(`\n📊 Processing ${league.name}...`);

      // Get teams in the league
      const teamsData = await apiRequest('/teams', {
        league: league.id,
        season: season,
      });

      const teams = teamsData.response || [];

      // Process each team
      for (const teamData of teams) {
        try {
          const stats = await calculateTeamStats(
            teamData.team.id,
            teamData.team.name,
            league.name,
            league.region,
            season
          );

          if (stats) {
            allStats.push(stats);
          }

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing ${teamData.team.name}: ${error.message}`);
        }
      }

      console.log(`✅ ${league.name} complete`);
    } catch (error) {
      console.error(`Error processing league ${league.name}: ${error.message}`);
    }
  }

  console.log(`\n✅ Collection complete! Total teams: ${allStats.length}`);

  return allStats;
}

/**
 * Get top 20 teams by specific stat
 */
export function getTop20(allStats, statKey) {
  return [...allStats]
    .sort((a, b) => b[statKey] - a[statKey])
    .slice(0, 20);
}

/**
 * Example usage:
 * 
 * const allStats = await fetchAndStoreStats();
 * 
 * const top20Goals = getTop20(allStats, 'over_2_5_goals_pct');
 * const top20Corners = getTop20(allStats, 'over_9_5_corners_pct');
 * const top20Cards = getTop20(allStats, 'over_3_5_cards_pct');
 * const top20BTTS = getTop20(allStats, 'btts_yes_pct');
 */

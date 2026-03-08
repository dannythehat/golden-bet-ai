/**
 * Stats Calculator Service
 * Calculates betting statistics from fixture data
 * 
 * Calculates:
 * - Goals: O/U 0.5, 1.5, 2.5, 3.5
 * - Corners: O/U 7.5, 8.5, 9.5, 10.5
 * - Cards: O/U 2.5, 3.5, 4.5, 5.5
 * - BTTS: Yes/No percentage
 */

interface FixtureStats {
  goals: number;
  corners: number;
  cards: number;
  teamScored: boolean;
  opponentScored: boolean;
}

export interface CalculatedStats {
  games_analyzed: number;
  goals: {
    over_0_5: number;
    over_1_5: number;
    over_2_5: number;
    over_3_5: number;
    under_0_5: number;
    under_1_5: number;
    under_2_5: number;
    under_3_5: number;
    avg_goals: number;
  };
  corners: {
    over_7_5: number;
    over_8_5: number;
    over_9_5: number;
    over_10_5: number;
    under_7_5: number;
    under_8_5: number;
    under_9_5: number;
    under_10_5: number;
    avg_corners: number;
  };
  cards: {
    over_2_5: number;
    over_3_5: number;
    over_4_5: number;
    over_5_5: number;
    under_2_5: number;
    under_3_5: number;
    under_4_5: number;
    under_5_5: number;
    avg_cards: number;
  };
  btts: {
    yes: number;
    no: number;
    avg_goals_scored: number;
    avg_goals_conceded: number;
  };
}

/**
 * Calculate percentage
 */
function calculatePercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

/**
 * Calculate average
 */
function calculateAverage(total: number, count: number): number {
  if (count === 0) return 0;
  return Math.round((total / count) * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate all stats from fixture data
 */
export function calculateTeamStats(fixtures: FixtureStats[]): CalculatedStats {
  const totalGames = fixtures.length;
  
  if (totalGames === 0) {
    return getEmptyStats();
  }
  
  // Goals calculations
  let totalGoals = 0;
  let over_0_5 = 0, over_1_5 = 0, over_2_5 = 0, over_3_5 = 0;
  
  // Corners calculations
  let totalCorners = 0;
  let over_7_5_corners = 0, over_8_5_corners = 0, over_9_5_corners = 0, over_10_5_corners = 0;
  
  // Cards calculations
  let totalCards = 0;
  let over_2_5_cards = 0, over_3_5_cards = 0, over_4_5_cards = 0, over_5_5_cards = 0;
  
  // BTTS calculations
  let bttsYes = 0;
  let totalGoalsScored = 0;
  let totalGoalsConceded = 0;
  
  // Process each fixture
  fixtures.forEach(fixture => {
    // Goals
    totalGoals += fixture.goals;
    if (fixture.goals > 0.5) over_0_5++;
    if (fixture.goals > 1.5) over_1_5++;
    if (fixture.goals > 2.5) over_2_5++;
    if (fixture.goals > 3.5) over_3_5++;
    
    // Corners
    totalCorners += fixture.corners;
    if (fixture.corners > 7.5) over_7_5_corners++;
    if (fixture.corners > 8.5) over_8_5_corners++;
    if (fixture.corners > 9.5) over_9_5_corners++;
    if (fixture.corners > 10.5) over_10_5_corners++;
    
    // Cards
    totalCards += fixture.cards;
    if (fixture.cards > 2.5) over_2_5_cards++;
    if (fixture.cards > 3.5) over_3_5_cards++;
    if (fixture.cards > 4.5) over_4_5_cards++;
    if (fixture.cards > 5.5) over_5_5_cards++;
    
    // BTTS
    if (fixture.teamScored && fixture.opponentScored) {
      bttsYes++;
    }
    totalGoalsScored += fixture.teamScored ? 1 : 0;
    totalGoalsConceded += fixture.opponentScored ? 1 : 0;
  });
  
  return {
    games_analyzed: totalGames,
    goals: {
      over_0_5: calculatePercentage(over_0_5, totalGames),
      over_1_5: calculatePercentage(over_1_5, totalGames),
      over_2_5: calculatePercentage(over_2_5, totalGames),
      over_3_5: calculatePercentage(over_3_5, totalGames),
      under_0_5: calculatePercentage(totalGames - over_0_5, totalGames),
      under_1_5: calculatePercentage(totalGames - over_1_5, totalGames),
      under_2_5: calculatePercentage(totalGames - over_2_5, totalGames),
      under_3_5: calculatePercentage(totalGames - over_3_5, totalGames),
      avg_goals: calculateAverage(totalGoals, totalGames),
    },
    corners: {
      over_7_5: calculatePercentage(over_7_5_corners, totalGames),
      over_8_5: calculatePercentage(over_8_5_corners, totalGames),
      over_9_5: calculatePercentage(over_9_5_corners, totalGames),
      over_10_5: calculatePercentage(over_10_5_corners, totalGames),
      under_7_5: calculatePercentage(totalGames - over_7_5_corners, totalGames),
      under_8_5: calculatePercentage(totalGames - over_8_5_corners, totalGames),
      under_9_5: calculatePercentage(totalGames - over_9_5_corners, totalGames),
      under_10_5: calculatePercentage(totalGames - over_10_5_corners, totalGames),
      avg_corners: calculateAverage(totalCorners, totalGames),
    },
    cards: {
      over_2_5: calculatePercentage(over_2_5_cards, totalGames),
      over_3_5: calculatePercentage(over_3_5_cards, totalGames),
      over_4_5: calculatePercentage(over_4_5_cards, totalGames),
      over_5_5: calculatePercentage(over_5_5_cards, totalGames),
      under_2_5: calculatePercentage(totalGames - over_2_5_cards, totalGames),
      under_3_5: calculatePercentage(totalGames - over_3_5_cards, totalGames),
      under_4_5: calculatePercentage(totalGames - over_4_5_cards, totalGames),
      under_5_5: calculatePercentage(totalGames - over_5_5_cards, totalGames),
      avg_cards: calculateAverage(totalCards, totalGames),
    },
    btts: {
      yes: calculatePercentage(bttsYes, totalGames),
      no: calculatePercentage(totalGames - bttsYes, totalGames),
      avg_goals_scored: calculateAverage(totalGoalsScored, totalGames),
      avg_goals_conceded: calculateAverage(totalGoalsConceded, totalGames),
    },
  };
}

/**
 * Get empty stats structure
 */
function getEmptyStats(): CalculatedStats {
  return {
    games_analyzed: 0,
    goals: {
      over_0_5: 0,
      over_1_5: 0,
      over_2_5: 0,
      over_3_5: 0,
      under_0_5: 0,
      under_1_5: 0,
      under_2_5: 0,
      under_3_5: 0,
      avg_goals: 0,
    },
    corners: {
      over_7_5: 0,
      over_8_5: 0,
      over_9_5: 0,
      over_10_5: 0,
      under_7_5: 0,
      under_8_5: 0,
      under_9_5: 0,
      under_10_5: 0,
      avg_corners: 0,
    },
    cards: {
      over_2_5: 0,
      over_3_5: 0,
      over_4_5: 0,
      over_5_5: 0,
      under_2_5: 0,
      under_3_5: 0,
      under_4_5: 0,
      under_5_5: 0,
      avg_cards: 0,
    },
    btts: {
      yes: 0,
      no: 0,
      avg_goals_scored: 0,
      avg_goals_conceded: 0,
    },
  };
}

/**
 * Parse fixture statistics from API response
 */
export function parseFixtureStats(fixtureData: any, teamId: number): FixtureStats {
  const homeTeam = fixtureData.teams.home.id === teamId;
  const awayTeam = fixtureData.teams.away.id === teamId;
  
  const homeGoals = fixtureData.goals.home || 0;
  const awayGoals = fixtureData.goals.away || 0;
  const totalGoals = homeGoals + awayGoals;
  
  // Get statistics from fixture statistics endpoint
  const stats = fixtureData.statistics || [];
  const homeStats = stats.find((s: any) => s.team.id === fixtureData.teams.home.id);
  const awayStats = stats.find((s: any) => s.team.id === fixtureData.teams.away.id);
  
  // Extract corners
  const homeCorners = homeStats?.statistics.find((s: any) => s.type === 'Corner Kicks')?.value || 0;
  const awayCorners = awayStats?.statistics.find((s: any) => s.type === 'Corner Kicks')?.value || 0;
  const totalCorners = homeCorners + awayCorners;
  
  // Extract cards
  const homeYellow = homeStats?.statistics.find((s: any) => s.type === 'Yellow Cards')?.value || 0;
  const awayYellow = awayStats?.statistics.find((s: any) => s.type === 'Yellow Cards')?.value || 0;
  const homeRed = homeStats?.statistics.find((s: any) => s.type === 'Red Cards')?.value || 0;
  const awayRed = awayStats?.statistics.find((s: any) => s.type === 'Red Cards')?.value || 0;
  const totalCards = homeYellow + awayYellow + homeRed + awayRed;
  
  return {
    goals: totalGoals,
    corners: totalCorners,
    cards: totalCards,
    teamScored: homeTeam ? homeGoals > 0 : awayGoals > 0,
    opponentScored: homeTeam ? awayGoals > 0 : homeGoals > 0,
  };
}

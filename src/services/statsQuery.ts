/**
 * Stats Query Service
 * Query team stats from MongoDB by bet type and region
 */

import { getDatabase, COLLECTIONS } from './database';

export type BetType = 
  | 'over_0_5_goals' | 'over_1_5_goals' | 'over_2_5_goals' | 'over_3_5_goals'
  | 'under_0_5_goals' | 'under_1_5_goals' | 'under_2_5_goals' | 'under_3_5_goals'
  | 'over_7_5_corners' | 'over_8_5_corners' | 'over_9_5_corners' | 'over_10_5_corners'
  | 'under_7_5_corners' | 'under_8_5_corners' | 'under_9_5_corners' | 'under_10_5_corners'
  | 'over_2_5_cards' | 'over_3_5_cards' | 'over_4_5_cards' | 'over_5_5_cards'
  | 'under_2_5_cards' | 'under_3_5_cards' | 'under_4_5_cards' | 'under_5_5_cards'
  | 'btts_yes' | 'btts_no';

export type Region = 'all' | 'uk' | 'european' | 'asia' | 'americas' | 'other';

/**
 * Get top teams for a specific bet type and region
 */
export async function getTopTeamsByBetType(
  betType: BetType,
  region: Region = 'all',
  limit: number = 20
): Promise<any[]> {
  const db = await getDatabase();
  const statsCollection = db.collection(COLLECTIONS.TEAM_STATS);
  
  // Build query
  const query: any = {};
  if (region !== 'all') {
    query.region = region;
  }
  
  // Map bet type to MongoDB field
  const sortField = mapBetTypeToField(betType);
  
  // Query and sort
  const teams = await statsCollection
    .find(query)
    .sort({ [sortField]: -1 })
    .limit(limit)
    .toArray();
  
  return teams.map(team => ({
    team_id: team.team_id,
    team_name: team.team_name,
    league_name: team.league_name,
    region: team.region,
    games_analyzed: team.games_analyzed,
    stat_value: getStatValue(team, betType),
    avg_value: getAvgValue(team, betType),
    last_updated: team.last_updated,
  }));
}

/**
 * Get stats for a specific team
 */
export async function getTeamStats(teamId: number): Promise<any> {
  const db = await getDatabase();
  const statsCollection = db.collection(COLLECTIONS.TEAM_STATS);
  
  const team = await statsCollection.findOne({ team_id: teamId });
  
  if (!team) {
    throw new Error(`Team ${teamId} not found`);
  }
  
  return team;
}

/**
 * Get today's fixtures with team stats
 */
export async function getTodaysFixturesWithStats(): Promise<any[]> {
  const db = await getDatabase();
  const fixturesCollection = db.collection(COLLECTIONS.FIXTURES);
  const statsCollection = db.collection(COLLECTIONS.TEAM_STATS);
  
  const today = new Date().toISOString().split('T')[0];
  const fixtures = await fixturesCollection.find({ date: today }).toArray();
  
  // Enrich with team stats
  const enrichedFixtures = await Promise.all(
    fixtures.map(async (fixture) => {
      const homeStats = await statsCollection.findOne({ team_id: fixture.home_team_id });
      const awayStats = await statsCollection.findOne({ team_id: fixture.away_team_id });
      
      return {
        ...fixture,
        home_stats: homeStats || null,
        away_stats: awayStats || null,
      };
    })
  );
  
  return enrichedFixtures;
}

/**
 * Get fixtures filtered by bet type
 */
export async function getTodaysFixturesByBetType(
  betType: BetType,
  minPercentage: number = 60
): Promise<any[]> {
  const fixtures = await getTodaysFixturesWithStats();
  
  // Filter fixtures where both teams meet the criteria
  return fixtures.filter(fixture => {
    if (!fixture.home_stats || !fixture.away_stats) return false;
    
    const homeValue = getStatValue(fixture.home_stats, betType);
    const awayValue = getStatValue(fixture.away_stats, betType);
    
    return homeValue >= minPercentage && awayValue >= minPercentage;
  }).map(fixture => ({
    fixture_id: fixture.fixture_id,
    date: fixture.date,
    time: fixture.time,
    home_team: fixture.home_team_name,
    away_team: fixture.away_team_name,
    league: fixture.league_name,
    region: fixture.region,
    home_stat: getStatValue(fixture.home_stats, betType),
    away_stat: getStatValue(fixture.away_stats, betType),
    combined_probability: calculateCombinedProbability(
      getStatValue(fixture.home_stats, betType),
      getStatValue(fixture.away_stats, betType)
    ),
  }));
}

/**
 * Search teams by name
 */
export async function searchTeams(query: string, limit: number = 10): Promise<any[]> {
  const db = await getDatabase();
  const teamsCollection = db.collection(COLLECTIONS.TEAMS);
  
  const teams = await teamsCollection
    .find({
      name: { $regex: query, $options: 'i' }
    })
    .limit(limit)
    .toArray();
  
  return teams;
}

/**
 * Get stats summary
 */
export async function getStatsSummary(): Promise<any> {
  const db = await getDatabase();
  
  const totalTeams = await db.collection(COLLECTIONS.TEAMS).countDocuments();
  const totalStats = await db.collection(COLLECTIONS.TEAM_STATS).countDocuments();
  const totalFixtures = await db.collection(COLLECTIONS.FIXTURES).countDocuments();
  
  const lastUpdate = await db.collection(COLLECTIONS.LAST_UPDATE).findOne({ collection_name: 'all' });
  
  // Count by region
  const byRegion = await db.collection(COLLECTIONS.TEAM_STATS).aggregate([
    {
      $group: {
        _id: '$region',
        count: { $sum: 1 }
      }
    }
  ]).toArray();
  
  return {
    total_teams: totalTeams,
    total_stats: totalStats,
    todays_fixtures: totalFixtures,
    last_update: lastUpdate?.last_update || null,
    status: lastUpdate?.status || 'never_run',
    by_region: byRegion.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
  };
}

/**
 * Helper: Map bet type to MongoDB field path
 */
function mapBetTypeToField(betType: BetType): string {
  const mapping: Record<BetType, string> = {
    // Goals
    'over_0_5_goals': 'goals.over_0_5',
    'over_1_5_goals': 'goals.over_1_5',
    'over_2_5_goals': 'goals.over_2_5',
    'over_3_5_goals': 'goals.over_3_5',
    'under_0_5_goals': 'goals.under_0_5',
    'under_1_5_goals': 'goals.under_1_5',
    'under_2_5_goals': 'goals.under_2_5',
    'under_3_5_goals': 'goals.under_3_5',
    
    // Corners
    'over_7_5_corners': 'corners.over_7_5',
    'over_8_5_corners': 'corners.over_8_5',
    'over_9_5_corners': 'corners.over_9_5',
    'over_10_5_corners': 'corners.over_10_5',
    'under_7_5_corners': 'corners.under_7_5',
    'under_8_5_corners': 'corners.under_8_5',
    'under_9_5_corners': 'corners.under_9_5',
    'under_10_5_corners': 'corners.under_10_5',
    
    // Cards
    'over_2_5_cards': 'cards.over_2_5',
    'over_3_5_cards': 'cards.over_3_5',
    'over_4_5_cards': 'cards.over_4_5',
    'over_5_5_cards': 'cards.over_5_5',
    'under_2_5_cards': 'cards.under_2_5',
    'under_3_5_cards': 'cards.under_3_5',
    'under_4_5_cards': 'cards.under_4_5',
    'under_5_5_cards': 'cards.under_5_5',
    
    // BTTS
    'btts_yes': 'btts.yes',
    'btts_no': 'btts.no',
  };
  
  return mapping[betType];
}

/**
 * Helper: Get stat value from team object
 */
function getStatValue(team: any, betType: BetType): number {
  const field = mapBetTypeToField(betType);
  const parts = field.split('.');
  
  let value = team;
  for (const part of parts) {
    value = value?.[part];
  }
  
  return value || 0;
}

/**
 * Helper: Get average value for bet type
 */
function getAvgValue(team: any, betType: BetType): number | null {
  if (betType.includes('goals')) return team.goals?.avg_goals || null;
  if (betType.includes('corners')) return team.corners?.avg_corners || null;
  if (betType.includes('cards')) return team.cards?.avg_cards || null;
  if (betType.includes('btts')) return team.btts?.avg_goals_scored || null;
  return null;
}

/**
 * Helper: Calculate combined probability
 */
function calculateCombinedProbability(homePercent: number, awayPercent: number): number {
  // Simple average for now - can be made more sophisticated
  return Math.round((homePercent + awayPercent) / 2);
}

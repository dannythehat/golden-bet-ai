/**
 * Data Aggregator Service
 * Fetches data from API-Football, calculates stats, stores in MongoDB
 * 
 * This is the MAIN service that populates the database
 * Run this daily at 4:00 AM UTC
 */

import { getDatabase, COLLECTIONS } from './database';
import { 
  getAllLeagues, 
  getLeagueTeams, 
  getTeamFixtures, 
  getFixtureStatistics,
  getTodaysFixtures 
} from './footballApi';
import { calculateTeamStats, parseFixtureStats } from './statsCalculator';
import { MAJOR_LEAGUES } from '../config/leagues';

const CURRENT_SEASON = new Date().getFullYear();
const GAMES_TO_ANALYZE = 20; // Last 20 games per team

/**
 * Main aggregation function - Run this daily
 */
export async function aggregateAllData(): Promise<void> {
  console.log('🚀 Starting data aggregation...');
  const startTime = Date.now();
  
  try {
    const db = await getDatabase();
    
    // Step 1: Update leagues
    console.log('📋 Step 1: Updating leagues...');
    await updateLeagues(db);
    
    // Step 2: Update teams for each league
    console.log('👥 Step 2: Updating teams...');
    await updateTeams(db);
    
    // Step 3: Calculate stats for each team
    console.log('📊 Step 3: Calculating team stats...');
    await updateTeamStats(db);
    
    // Step 4: Fetch today's fixtures
    console.log('⚽ Step 4: Fetching today\'s fixtures...');
    await updateTodaysFixtures(db);
    
    // Step 5: Update last_update tracking
    await updateLastUpdateTracking(db, 'success');
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`✅ Data aggregation completed in ${duration} minutes`);
    
  } catch (error) {
    console.error('❌ Data aggregation failed:', error);
    const db = await getDatabase();
    await updateLastUpdateTracking(db, 'failed', error.message);
    throw error;
  }
}

/**
 * Step 1: Update leagues collection
 */
async function updateLeagues(db: any): Promise<void> {
  const leaguesCollection = db.collection(COLLECTIONS.LEAGUES);
  let updated = 0;
  
  for (const league of MAJOR_LEAGUES) {
    try {
      await leaguesCollection.updateOne(
        { league_id: league.id },
        {
          $set: {
            league_id: league.id,
            name: league.name,
            country: league.country,
            region: league.region,
            season: CURRENT_SEASON,
            is_active: true,
            updated_at: new Date(),
          },
          $setOnInsert: {
            created_at: new Date(),
          },
        },
        { upsert: true }
      );
      updated++;
      
      if (updated % 10 === 0) {
        console.log(`  ✓ Updated ${updated}/${MAJOR_LEAGUES.length} leagues`);
      }
    } catch (error) {
      console.error(`  ✗ Error updating league ${league.name}:`, error.message);
    }
  }
  
  console.log(`✅ Updated ${updated} leagues`);
}

/**
 * Step 2: Update teams for each league
 */
async function updateTeams(db: any): Promise<void> {
  const teamsCollection = db.collection(COLLECTIONS.TEAMS);
  let totalTeams = 0;
  
  for (const league of MAJOR_LEAGUES) {
    try {
      console.log(`  Fetching teams for ${league.name}...`);
      const teams = await getLeagueTeams(league.id, CURRENT_SEASON);
      
      for (const teamData of teams) {
        try {
          await teamsCollection.updateOne(
            { team_id: teamData.team.id },
            {
              $set: {
                team_id: teamData.team.id,
                name: teamData.team.name,
                league_id: league.id,
                league_name: league.name,
                country: league.country,
                region: league.region,
                logo: teamData.team.logo,
                updated_at: new Date(),
              },
              $setOnInsert: {
                created_at: new Date(),
              },
            },
            { upsert: true }
          );
          totalTeams++;
        } catch (error) {
          console.error(`    ✗ Error updating team ${teamData.team.name}:`, error.message);
        }
      }
      
      console.log(`  ✓ ${league.name}: ${teams.length} teams`);
      
      // Rate limiting - wait 1 second between leagues
      await sleep(1000);
      
    } catch (error) {
      console.error(`  ✗ Error fetching teams for ${league.name}:`, error.message);
    }
  }
  
  console.log(`✅ Updated ${totalTeams} teams`);
}

/**
 * Step 3: Calculate and store stats for each team
 */
async function updateTeamStats(db: any): Promise<void> {
  const teamsCollection = db.collection(COLLECTIONS.TEAMS);
  const statsCollection = db.collection(COLLECTIONS.TEAM_STATS);
  
  const teams = await teamsCollection.find({}).toArray();
  let processed = 0;
  let errors = 0;
  
  console.log(`  Processing ${teams.length} teams...`);
  
  for (const team of teams) {
    try {
      // Fetch last 20 fixtures for this team
      const fixtures = await getTeamFixtures(team.team_id, CURRENT_SEASON, GAMES_TO_ANALYZE);
      
      if (fixtures.length < 5) {
        console.log(`  ⚠️ ${team.name}: Only ${fixtures.length} games (skipping)`);
        continue;
      }
      
      // Fetch statistics for each fixture
      const fixtureStats = [];
      for (const fixture of fixtures) {
        try {
          const stats = await getFixtureStatistics(fixture.fixture.id);
          const parsedStats = parseFixtureStats({ ...fixture, statistics: stats }, team.team_id);
          fixtureStats.push(parsedStats);
        } catch (error) {
          console.error(`    ✗ Error fetching stats for fixture ${fixture.fixture.id}`);
        }
      }
      
      // Calculate all stats
      const calculatedStats = calculateTeamStats(fixtureStats);
      
      // Store in database
      await statsCollection.updateOne(
        { team_id: team.team_id, season: CURRENT_SEASON },
        {
          $set: {
            team_id: team.team_id,
            team_name: team.name,
            league_id: team.league_id,
            league_name: team.league_name,
            region: team.region,
            season: CURRENT_SEASON,
            ...calculatedStats,
            last_updated: new Date(),
          },
          $setOnInsert: {
            created_at: new Date(),
          },
        },
        { upsert: true }
      );
      
      processed++;
      
      if (processed % 50 === 0) {
        console.log(`  ✓ Processed ${processed}/${teams.length} teams`);
      }
      
      // Rate limiting - wait 500ms between teams
      await sleep(500);
      
    } catch (error) {
      errors++;
      console.error(`  ✗ Error processing ${team.name}:`, error.message);
    }
  }
  
  console.log(`✅ Processed ${processed} teams (${errors} errors)`);
}

/**
 * Step 4: Fetch and store today's fixtures
 */
async function updateTodaysFixtures(db: any): Promise<void> {
  const fixturesCollection = db.collection(COLLECTIONS.FIXTURES);
  const teamsCollection = db.collection(COLLECTIONS.TEAMS);
  
  try {
    const todaysFixtures = await getTodaysFixtures();
    
    // Clear old fixtures
    const today = new Date().toISOString().split('T')[0];
    await fixturesCollection.deleteMany({ date: { $ne: today } });
    
    let stored = 0;
    
    for (const fixture of todaysFixtures) {
      try {
        // Get team info to determine region
        const homeTeam = await teamsCollection.findOne({ team_id: fixture.teams.home.id });
        const awayTeam = await teamsCollection.findOne({ team_id: fixture.teams.away.id });
        
        if (!homeTeam || !awayTeam) {
          continue; // Skip if teams not in our database
        }
        
        await fixturesCollection.updateOne(
          { fixture_id: fixture.fixture.id },
          {
            $set: {
              fixture_id: fixture.fixture.id,
              date: fixture.fixture.date.split('T')[0],
              time: fixture.fixture.date.split('T')[1].substring(0, 5),
              home_team_id: fixture.teams.home.id,
              home_team_name: fixture.teams.home.name,
              away_team_id: fixture.teams.away.id,
              away_team_name: fixture.teams.away.name,
              league_id: fixture.league.id,
              league_name: fixture.league.name,
              region: homeTeam.region,
              status: fixture.fixture.status.short,
              updated_at: new Date(),
            },
            $setOnInsert: {
              created_at: new Date(),
            },
          },
          { upsert: true }
        );
        stored++;
      } catch (error) {
        console.error(`  ✗ Error storing fixture:`, error.message);
      }
    }
    
    console.log(`✅ Stored ${stored} today's fixtures`);
    
  } catch (error) {
    console.error('❌ Error fetching today\'s fixtures:', error);
  }
}

/**
 * Update last_update tracking
 */
async function updateLastUpdateTracking(db: any, status: 'success' | 'failed', errorMessage?: string): Promise<void> {
  const lastUpdateCollection = db.collection(COLLECTIONS.LAST_UPDATE);
  
  const teamsCount = await db.collection(COLLECTIONS.TEAMS).countDocuments();
  const statsCount = await db.collection(COLLECTIONS.TEAM_STATS).countDocuments();
  
  await lastUpdateCollection.updateOne(
    { collection_name: 'all' },
    {
      $set: {
        collection_name: 'all',
        last_update: new Date(),
        status,
        records_updated: statsCount,
        total_teams: teamsCount,
        error_message: errorMessage || null,
      },
    },
    { upsert: true }
  );
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get aggregation status
 */
export async function getAggregationStatus(): Promise<any> {
  const db = await getDatabase();
  const lastUpdate = await db.collection(COLLECTIONS.LAST_UPDATE).findOne({ collection_name: 'all' });
  
  const teamsCount = await db.collection(COLLECTIONS.TEAMS).countDocuments();
  const statsCount = await db.collection(COLLECTIONS.TEAM_STATS).countDocuments();
  const fixturesCount = await db.collection(COLLECTIONS.FIXTURES).countDocuments();
  
  return {
    last_update: lastUpdate?.last_update || null,
    status: lastUpdate?.status || 'never_run',
    total_teams: teamsCount,
    total_stats: statsCount,
    todays_fixtures: fixturesCount,
    error_message: lastUpdate?.error_message || null,
  };
}

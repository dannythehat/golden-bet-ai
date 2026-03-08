/**
 * Fetch All Teams Stats - Initial Full Load
 * 
 * This script:
 * 1. Fetches ~200 main professional leagues (excludes women's/youth)
 * 2. Maps each league to a region (UK/European/Asia/Americas)
 * 3. Fetches all teams from each league
 * 4. Calculates ALL threshold statistics for each team
 * 5. Stores in MongoDB for instant access
 * 
 * Run with: node scripts/fetch-all-teams-stats.js
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || '***REMOVED***';
const DB_NAME = 'footy-oracle';
const COLLECTION_NAME = 'team_stats';

// API-Football Configuration
const API_KEY = process.env.VITE_API_FOOTBALL_KEY || '***REMOVED***';
const API_BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

// League Filtering Keywords (EXCLUDE these)
const EXCLUDE_KEYWORDS = [
  'women', 'feminine', 'femenina', 'femminile', 'frauen',
  'u21', 'u19', 'u18', 'u17', 'under 21', 'under 19', 'under 18',
  'youth', 'junior', 'reserve', 'b team', 'amateur', 'u20'
];

// Region Mapping by Country
const REGION_MAP = {
  // UK
  'england': 'uk',
  'scotland': 'uk',
  'wales': 'uk',
  'northern-ireland': 'uk',
  
  // European
  'spain': 'european',
  'germany': 'european',
  'italy': 'european',
  'france': 'european',
  'netherlands': 'european',
  'portugal': 'european',
  'belgium': 'european',
  'turkey': 'european',
  'russia': 'european',
  'ukraine': 'european',
  'greece': 'european',
  'austria': 'european',
  'switzerland': 'european',
  'denmark': 'european',
  'sweden': 'european',
  'norway': 'european',
  'poland': 'european',
  'czech-republic': 'european',
  'croatia': 'european',
  'serbia': 'european',
  'romania': 'european',
  'bulgaria': 'european',
  'hungary': 'european',
  'finland': 'european',
  
  // Asia
  'japan': 'asia',
  'south-korea': 'asia',
  'china': 'asia',
  'india': 'asia',
  'saudi-arabia': 'asia',
  'uae': 'asia',
  'qatar': 'asia',
  'iran': 'asia',
  'iraq': 'asia',
  'thailand': 'asia',
  'vietnam': 'asia',
  'malaysia': 'asia',
  'singapore': 'asia',
  'indonesia': 'asia',
  'australia': 'asia',
  
  // Americas
  'usa': 'americas',
  'mexico': 'americas',
  'brazil': 'americas',
  'argentina': 'americas',
  'colombia': 'americas',
  'chile': 'americas',
  'uruguay': 'americas',
  'paraguay': 'americas',
  'peru': 'americas',
  'ecuador': 'americas',
  'bolivia': 'americas',
  'venezuela': 'americas',
  'canada': 'americas',
  'costa-rica': 'americas',
};

// Statistics Tracker
const stats = {
  apiCalls: 0,
  leaguesFetched: 0,
  leaguesFiltered: 0,
  leaguesProcessed: 0,
  teamsProcessed: 0,
  teamsStored: 0,
  errors: [],
  startTime: Date.now()
};

/**
 * Make API call with rate limiting and error handling
 */
async function apiCall(endpoint, params = {}) {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  
  try {
    stats.apiCalls++;
    const response = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Rate limiting: 10 requests per second
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return data;
  } catch (error) {
    stats.errors.push({ endpoint, error: error.message });
    console.error(`❌ API call failed: ${endpoint}`, error.message);
    return null;
  }
}

/**
 * Check if league should be excluded (women's, youth, etc.)
 */
function shouldExcludeLeague(leagueName, leagueType) {
  const searchText = `${leagueName} ${leagueType}`.toLowerCase();
  return EXCLUDE_KEYWORDS.some(keyword => searchText.includes(keyword));
}

/**
 * Get region for a country
 */
function getRegion(country) {
  const countryKey = country.toLowerCase().replace(/\s+/g, '-');
  return REGION_MAP[countryKey] || 'other';
}

/**
 * Calculate statistics for a team from their recent games
 */
function calculateTeamStats(games) {
  if (!games || games.length === 0) {
    return null;
  }
  
  const stats = {
    goals: { over_1_5_count: 0, over_2_5_count: 0, over_3_5_count: 0, over_4_5_count: 0, total: 0 },
    corners: { over_8_5_count: 0, over_9_5_count: 0, over_10_5_count: 0, over_11_5_count: 0, over_12_5_count: 0, total: 0 },
    cards: { over_2_5_count: 0, over_3_5_count: 0, over_4_5_count: 0, over_5_5_count: 0, total: 0 },
    btts: { count: 0, scored: 0, conceded: 0 }
  };
  
  games.forEach(game => {
    // Goals
    const totalGoals = (game.goals?.home || 0) + (game.goals?.away || 0);
    stats.goals.total += totalGoals;
    if (totalGoals > 1.5) stats.goals.over_1_5_count++;
    if (totalGoals > 2.5) stats.goals.over_2_5_count++;
    if (totalGoals > 3.5) stats.goals.over_3_5_count++;
    if (totalGoals > 4.5) stats.goals.over_4_5_count++;
    
    // Corners (if available)
    const totalCorners = (game.corners?.home || 0) + (game.corners?.away || 0);
    if (totalCorners > 0) {
      stats.corners.total += totalCorners;
      if (totalCorners > 8.5) stats.corners.over_8_5_count++;
      if (totalCorners > 9.5) stats.corners.over_9_5_count++;
      if (totalCorners > 10.5) stats.corners.over_10_5_count++;
      if (totalCorners > 11.5) stats.corners.over_11_5_count++;
      if (totalCorners > 12.5) stats.corners.over_12_5_count++;
    }
    
    // Cards (if available)
    const totalCards = (game.cards?.yellow?.home || 0) + (game.cards?.yellow?.away || 0) + 
                       (game.cards?.red?.home || 0) + (game.cards?.red?.away || 0);
    if (totalCards > 0) {
      stats.cards.total += totalCards;
      if (totalCards > 2.5) stats.cards.over_2_5_count++;
      if (totalCards > 3.5) stats.cards.over_3_5_count++;
      if (totalCards > 4.5) stats.cards.over_4_5_count++;
      if (totalCards > 5.5) stats.cards.over_5_5_count++;
    }
    
    // BTTS
    const homeGoals = game.goals?.home || 0;
    const awayGoals = game.goals?.away || 0;
    stats.btts.scored += homeGoals;
    stats.btts.conceded += awayGoals;
    if (homeGoals > 0 && awayGoals > 0) {
      stats.btts.count++;
    }
  });
  
  const gamesPlayed = games.length;
  
  return {
    goals: {
      over_1_5_count: stats.goals.over_1_5_count,
      over_1_5_pct: Math.round((stats.goals.over_1_5_count / gamesPlayed) * 100),
      over_2_5_count: stats.goals.over_2_5_count,
      over_2_5_pct: Math.round((stats.goals.over_2_5_count / gamesPlayed) * 100),
      over_3_5_count: stats.goals.over_3_5_count,
      over_3_5_pct: Math.round((stats.goals.over_3_5_count / gamesPlayed) * 100),
      over_4_5_count: stats.goals.over_4_5_count,
      over_4_5_pct: Math.round((stats.goals.over_4_5_count / gamesPlayed) * 100),
      avg_total: parseFloat((stats.goals.total / gamesPlayed).toFixed(2))
    },
    corners: {
      over_8_5_count: stats.corners.over_8_5_count,
      over_8_5_pct: Math.round((stats.corners.over_8_5_count / gamesPlayed) * 100),
      over_9_5_count: stats.corners.over_9_5_count,
      over_9_5_pct: Math.round((stats.corners.over_9_5_count / gamesPlayed) * 100),
      over_10_5_count: stats.corners.over_10_5_count,
      over_10_5_pct: Math.round((stats.corners.over_10_5_count / gamesPlayed) * 100),
      over_11_5_count: stats.corners.over_11_5_count,
      over_11_5_pct: Math.round((stats.corners.over_11_5_count / gamesPlayed) * 100),
      over_12_5_count: stats.corners.over_12_5_count,
      over_12_5_pct: Math.round((stats.corners.over_12_5_count / gamesPlayed) * 100),
      avg_total: parseFloat((stats.corners.total / gamesPlayed).toFixed(2))
    },
    cards: {
      over_2_5_count: stats.cards.over_2_5_count,
      over_2_5_pct: Math.round((stats.cards.over_2_5_count / gamesPlayed) * 100),
      over_3_5_count: stats.cards.over_3_5_count,
      over_3_5_pct: Math.round((stats.cards.over_3_5_count / gamesPlayed) * 100),
      over_4_5_count: stats.cards.over_4_5_count,
      over_4_5_pct: Math.round((stats.cards.over_4_5_count / gamesPlayed) * 100),
      over_5_5_count: stats.cards.over_5_5_count,
      over_5_5_pct: Math.round((stats.cards.over_5_5_count / gamesPlayed) * 100),
      avg_total: parseFloat((stats.cards.total / gamesPlayed).toFixed(2))
    },
    btts: {
      count: stats.btts.count,
      pct: Math.round((stats.btts.count / gamesPlayed) * 100),
      avg_scored: parseFloat((stats.btts.scored / gamesPlayed).toFixed(2)),
      avg_conceded: parseFloat((stats.btts.conceded / gamesPlayed).toFixed(2))
    }
  };
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Form Tables Data Collection\\n');
  console.log('📋 Configuration:');
  console.log(`   API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`   MongoDB: ${MONGODB_URI.includes('cluster0') ? 'cluster0.7mczlce.mongodb.net' : 'localhost'}`);
  console.log(`   Database: ${DB_NAME}`);
  console.log(`   Collection: ${COLLECTION_NAME}\\n`);
  
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ MongoDB connected\\n');
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Create indexes
    console.log('📊 Creating indexes...');
    await collection.createIndex({ team_id: 1 }, { unique: true });
    await collection.createIndex({ region: 1, 'stats.goals.over_2_5_pct': -1 });
    await collection.createIndex({ region: 1, 'stats.corners.over_9_5_pct': -1 });
    await collection.createIndex({ region: 1, 'stats.cards.over_3_5_pct': -1 });
    await collection.createIndex({ region: 1, 'stats.btts.pct': -1 });
    await collection.createIndex({ name: 'text' });
    console.log('✅ Indexes created\\n');
    
    // Step 1: Fetch all leagues
    console.log('🌍 Step 1: Fetching all leagues...');
    const leaguesData = await apiCall('/leagues', { season: 2024 });
    
    if (!leaguesData || !leaguesData.response) {
      throw new Error('Failed to fetch leagues');
    }
    
    stats.leaguesFetched = leaguesData.response.length;
    console.log(`✅ Fetched ${stats.leaguesFetched} leagues\\n`);
    
    // Step 2: Filter to main professional leagues
    console.log('🔍 Step 2: Filtering to main professional leagues...');
    const mainLeagues = leaguesData.response.filter(item => {
      const league = item.league;
      const country = item.country;
      
      // Exclude based on keywords
      if (shouldExcludeLeague(league.name, league.type || '')) {
        return false;
      }
      
      // Only include leagues with known regions
      const region = getRegion(country.name);
      if (region === 'other') {
        return false;
      }
      
      return true;
    });
    
    stats.leaguesFiltered = mainLeagues.length;
    console.log(`✅ Filtered to ${stats.leaguesFiltered} main professional leagues\\n`);
    
    // Log sample of filtered leagues
    console.log('📋 Sample of filtered leagues:');
    mainLeagues.slice(0, 10).forEach(item => {
      const region = getRegion(item.country.name);
      console.log(`   - ${item.league.name} (${item.country.name}) [${region}]`);
    });
    console.log('\\n');
    
    // Step 3: Process each league (limit to 5 for testing)
    console.log('⚙️  Step 3: Processing leagues (TEST MODE: 5 leagues)...\\n');
    const testLeagues = mainLeagues.slice(0, 5);
    
    for (const leagueItem of testLeagues) {
      const league = leagueItem.league;
      const country = leagueItem.country;
      const region = getRegion(country.name);
      
      console.log(`\\n📍 Processing: ${league.name} (${country.name}) [${region}]`);
      stats.leaguesProcessed++;
      
      // Fetch teams in this league
      const teamsData = await apiCall('/teams', { league: league.id, season: 2024 });
      
      if (!teamsData || !teamsData.response) {
        console.log(`   ⚠️  No teams data available`);
        continue;
      }
      
      console.log(`   Found ${teamsData.response.length} teams`);
      
      // Process each team (limit to 3 per league for testing)
      const testTeams = teamsData.response.slice(0, 3);
      
      for (const teamItem of testTeams) {
        const team = teamItem.team;
        console.log(`   ⚽ Processing team: ${team.name}...`);
        
        // Fetch last 20 games for this team
        const fixturesData = await apiCall('/fixtures', { 
          team: team.id, 
          last: 20,
          season: 2024
        });
        
        if (!fixturesData || !fixturesData.response || fixturesData.response.length === 0) {
          console.log(`      ⚠️  No fixtures data available`);
          continue;
        }
        
        const games = fixturesData.response.map(fixture => ({
          fixture_id: fixture.fixture.id,
          date: fixture.fixture.date,
          goals: {
            home: fixture.goals.home,
            away: fixture.goals.away
          },
          corners: {
            home: fixture.statistics?.[0]?.statistics?.find(s => s.type === 'Corner Kicks')?.value || 0,
            away: fixture.statistics?.[1]?.statistics?.find(s => s.type === 'Corner Kicks')?.value || 0
          },
          cards: {
            yellow: {
              home: fixture.statistics?.[0]?.statistics?.find(s => s.type === 'Yellow Cards')?.value || 0,
              away: fixture.statistics?.[1]?.statistics?.find(s => s.type === 'Yellow Cards')?.value || 0
            },
            red: {
              home: fixture.statistics?.[0]?.statistics?.find(s => s.type === 'Red Cards')?.value || 0,
              away: fixture.statistics?.[1]?.statistics?.find(s => s.type === 'Red Cards')?.value || 0
            }
          }
        }));
        
        // Calculate statistics
        const calculatedStats = calculateTeamStats(games);
        
        if (!calculatedStats) {
          console.log(`      ⚠️  Could not calculate stats`);
          continue;
        }
        
        // Prepare document for MongoDB
        const teamDoc = {
          team_id: team.id,
          name: team.name,
          league_id: league.id,
          league: league.name,
          country: country.name,
          region: region,
          played: games.length,
          last_updated: new Date(),
          stats: calculatedStats,
          recent_games: games
        };
        
        // Store in MongoDB (upsert)
        await collection.updateOne(
          { team_id: team.id },
          { $set: teamDoc },
          { upsert: true }
        );
        
        stats.teamsProcessed++;
        stats.teamsStored++;
        
        console.log(`      ✅ Stored (${games.length} games, O2.5: ${calculatedStats.goals.over_2_5_pct}%)`);
      }
    }
    
    // Final summary
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
    
    console.log('\\n\\n' + '='.repeat(60));
    console.log('📊 EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`🌍 Leagues Fetched: ${stats.leaguesFetched}`);
    console.log(`🔍 Leagues Filtered: ${stats.leaguesFiltered} main professional leagues`);
    console.log(`⚙️  Leagues Processed: ${stats.leaguesProcessed} (TEST MODE)`);
    console.log(`⚽ Teams Processed: ${stats.teamsProcessed}`);
    console.log(`💾 Teams Stored: ${stats.teamsStored}`);
    console.log(`📡 API Calls Made: ${stats.apiCalls}`);
    console.log(`❌ Errors: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\\n⚠️  Errors encountered:');
      stats.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.endpoint}: ${err.error}`);
      });
    }
    
    // Show sample data from MongoDB
    console.log('\\n📋 Sample data from MongoDB:');
    const sampleTeams = await collection.find({}).limit(3).toArray();
    sampleTeams.forEach(team => {
      console.log(`\\n   ${team.name} (${team.league}, ${team.country})`);
      console.log(`   Region: ${team.region}`);
      console.log(`   Games: ${team.played}`);
      console.log(`   Over 2.5 Goals: ${team.stats.goals.over_2_5_pct}%`);
      console.log(`   Over 9.5 Corners: ${team.stats.corners.over_9_5_pct}%`);
      console.log(`   BTTS: ${team.stats.btts.pct}%`);
    });
    
    console.log('\\n' + '='.repeat(60));
    console.log('✅ TEST RUN COMPLETE');
    console.log('='.repeat(60));
    console.log('\\n⚠️  NOTE: This was a TEST run (5 leagues, 3 teams each)');
    console.log('📝 To run full collection, remove the .slice() limits in the code');
    console.log('\\n');
    
  } catch (error) {
    console.error('\\n❌ FATAL ERROR:', error);
    stats.errors.push({ endpoint: 'main', error: error.message });
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run the script
main();

/**
 * MongoDB Connection Service
 * Connects to MongoDB and provides database access
 * 
 * Database: betting-stats (separate from existing footy-oracle data)
 */

import { MongoClient, Db } from 'mongodb';

declare const process: { env: Record<string, string | undefined> };
const MONGODB_URI = process.env.MONGODB_URI || '***REMOVED***';

// Use separate database name to keep data isolated
const DB_NAME = 'betting-stats';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB
 */
export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    
    console.log(`✅ Connected to MongoDB database: ${DB_NAME}`);
    
    // Create indexes on first connection
    await createIndexes(db);
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get database instance
 */
export async function getDatabase(): Promise<Db> {
  if (!db) {
    return await connectToDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('✅ MongoDB connection closed');
  }
}

/**
 * Create indexes for performance
 */
async function createIndexes(database: Db): Promise<void> {
  try {
    // Leagues indexes
    await database.collection('leagues').createIndex({ league_id: 1 }, { unique: true });
    await database.collection('leagues').createIndex({ region: 1, is_active: 1 });
    
    // Teams indexes
    await database.collection('teams').createIndex({ team_id: 1 }, { unique: true });
    await database.collection('teams').createIndex({ league_id: 1 });
    await database.collection('teams').createIndex({ region: 1 });
    
    // Team stats indexes (most important for queries)
    await database.collection('team_stats').createIndex({ team_id: 1, season: 1 }, { unique: true });
    await database.collection('team_stats').createIndex({ league_id: 1 });
    await database.collection('team_stats').createIndex({ region: 1 });
    
    // Compound indexes for bet type filtering
    await database.collection('team_stats').createIndex({ region: 1, 'goals.over_2_5': -1 });
    await database.collection('team_stats').createIndex({ region: 1, 'corners.over_9_5': -1 });
    await database.collection('team_stats').createIndex({ region: 1, 'cards.over_3_5': -1 });
    await database.collection('team_stats').createIndex({ region: 1, 'btts.yes': -1 });
    
    // Fixtures indexes
    await database.collection('fixtures').createIndex({ fixture_id: 1 }, { unique: true });
    await database.collection('fixtures').createIndex({ date: 1 });
    await database.collection('fixtures').createIndex({ home_team_id: 1 });
    await database.collection('fixtures').createIndex({ away_team_id: 1 });
    await database.collection('fixtures').createIndex({ region: 1 });
    
    // Last update indexes
    await database.collection('last_update').createIndex({ collection_name: 1 }, { unique: true });
    
    console.log('✅ MongoDB indexes created');
  } catch (error) {
    console.error('⚠️ Error creating indexes:', error);
    // Don't throw - indexes might already exist
  }
}

/**
 * Collection names
 */
export const COLLECTIONS = {
  LEAGUES: 'leagues',
  TEAMS: 'teams',
  TEAM_STATS: 'team_stats',
  FIXTURES: 'fixtures',
  LAST_UPDATE: 'last_update',
} as const;

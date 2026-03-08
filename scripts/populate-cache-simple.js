/**
 * SIMPLE DATA COLLECTION - Populates cache with REAL data
 * Run this locally: node scripts/populate-cache-simple.js
 */

const fs = require('fs');
const path = require('path');

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || '***REMOVED***';

async function populateCache() {
  console.log('🚀 Starting cache population...\n');
  
  const { MongoClient } = require('mongodb');
  
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ MongoDB connected\n');
    
    const db = client.db('footy-oracle');
    const collection = db.collection('team_stats');
    
    // Check if we have data
    const count = await collection.countDocuments();
    console.log(`📊 Found ${count} teams in database\n`);
    
    if (count === 0) {
      console.log('❌ No data in MongoDB yet!');
      console.log('📝 You need to run the data collection script first:');
      console.log('   node scripts/fetch-all-teams-stats.js\n');
      return;
    }
    
    // Fetch top 20 teams for each category
    console.log('📥 Fetching top teams...\n');
    
    const goals = await collection
      .find({})
      .sort({ 'stats.goals.over_2_5_pct': -1 })
      .limit(20)
      .toArray();
    
    const corners = await collection
      .find({})
      .sort({ 'stats.corners.over_9_5_pct': -1 })
      .limit(20)
      .toArray();
    
    const cards = await collection
      .find({})
      .sort({ 'stats.cards.over_3_5_pct': -1 })
      .limit(20)
      .toArray();
    
    const btts = await collection
      .find({})
      .sort({ 'stats.btts.pct': -1 })
      .limit(20)
      .toArray();
    
    console.log(`✅ Goals: ${goals.length} teams`);
    console.log(`✅ Corners: ${corners.length} teams`);
    console.log(`✅ Cards: ${cards.length} teams`);
    console.log(`✅ BTTS: ${btts.length} teams\n`);
    
    // Transform to cache format
    const cacheData = {
      goals: goals.map(t => ({
        id: t.team_id,
        team: t.name,
        league: t.league,
        region: t.region,
        played: t.played,
        over_2_5_pct: t.stats.goals.over_2_5_pct,
        over_2_5_count: t.stats.goals.over_2_5_count,
        over_9_5_pct: t.stats.corners.over_9_5_pct,
        avg_corners: t.stats.corners.avg_total.toFixed(1),
        over_3_5_pct: t.stats.cards.over_3_5_pct,
        avg_cards: t.stats.cards.avg_total.toFixed(1),
        btts_pct: t.stats.btts.pct,
        avg_gs: t.stats.btts.avg_scored.toFixed(1),
        avg_gc: t.stats.btts.avg_conceded.toFixed(1)
      })),
      corners: corners.map(t => ({
        id: t.team_id,
        team: t.name,
        league: t.league,
        region: t.region,
        played: t.played,
        over_2_5_pct: t.stats.goals.over_2_5_pct,
        over_2_5_count: t.stats.goals.over_2_5_count,
        over_9_5_pct: t.stats.corners.over_9_5_pct,
        avg_corners: t.stats.corners.avg_total.toFixed(1),
        over_3_5_pct: t.stats.cards.over_3_5_pct,
        avg_cards: t.stats.cards.avg_total.toFixed(1),
        btts_pct: t.stats.btts.pct,
        avg_gs: t.stats.btts.avg_scored.toFixed(1),
        avg_gc: t.stats.btts.avg_conceded.toFixed(1)
      })),
      cards: cards.map(t => ({
        id: t.team_id,
        team: t.name,
        league: t.league,
        region: t.region,
        played: t.played,
        over_2_5_pct: t.stats.goals.over_2_5_pct,
        over_2_5_count: t.stats.goals.over_2_5_count,
        over_9_5_pct: t.stats.corners.over_9_5_pct,
        avg_corners: t.stats.corners.avg_total.toFixed(1),
        over_3_5_pct: t.stats.cards.over_3_5_pct,
        avg_cards: t.stats.cards.avg_total.toFixed(1),
        btts_pct: t.stats.btts.pct,
        avg_gs: t.stats.btts.avg_scored.toFixed(1),
        avg_gc: t.stats.btts.avg_conceded.toFixed(1)
      })),
      btts: btts.map(t => ({
        id: t.team_id,
        team: t.name,
        league: t.league,
        region: t.region,
        played: t.played,
        over_2_5_pct: t.stats.goals.over_2_5_pct,
        over_2_5_count: t.stats.goals.over_2_5_count,
        over_9_5_pct: t.stats.corners.over_9_5_pct,
        avg_corners: t.stats.corners.avg_total.toFixed(1),
        over_3_5_pct: t.stats.cards.over_3_5_pct,
        avg_cards: t.stats.cards.avg_total.toFixed(1),
        btts_pct: t.stats.btts.pct,
        avg_gs: t.stats.btts.avg_scored.toFixed(1),
        avg_gc: t.stats.btts.avg_conceded.toFixed(1)
      })),
      timestamp: Date.now(),
      nextRefresh: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    // Write to cache file
    const cachePath = path.join(__dirname, '..', 'cache', 'stats-cache.json');
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
    
    console.log('💾 Cache file updated!\n');
    console.log(`📁 Location: ${cachePath}\n`);
    
    // Show sample
    console.log('📋 Sample data (Top 3 Goals):');
    cacheData.goals.slice(0, 3).forEach((team, i) => {
      console.log(`   ${i + 1}. ${team.team} (${team.league}) - ${team.over_2_5_pct}%`);
    });
    
    console.log('\n✅ DONE! Your frontend will now show REAL data!\n');
    console.log('🔄 Commit and push the updated cache file to GitHub');
    console.log('   git add cache/stats-cache.json');
    console.log('   git commit -m "Update cache with real data"');
    console.log('   git push\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run it
populateCache().catch(console.error);

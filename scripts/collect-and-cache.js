/**
 * ALL-IN-ONE: Collect data from API-Football AND update cache
 * This is the ONLY script you need to run
 * 
 * Run: node scripts/collect-and-cache.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || '***REMOVED***';
const API_KEY = process.env.VITE_API_FOOTBALL_KEY || '***REMOVED***';
const API_BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

// FULL MODE: Process ALL leagues and teams
const TEST_MODE = false;

// League filtering
const EXCLUDE_KEYWORDS = [
  'women', 'feminine', 'femenina', 'femminile', 'frauen',
  'u21', 'u19', 'u18', 'u17', 'under 21', 'under 19', 'under 18',
  'youth', 'junior', 'reserve', 'b team', 'amateur', 'u20'
];

const stats = {
  apiCalls: 0,
  leaguesProcessed: 0,
  teamsProcessed: 0,
  teamsStored: 0,
  errors: []
};

// API call helper
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
    
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    
    const data = await response.json();
    await new Promise(resolve => setTimeout(resolve, 100)); // Rate limit
    return data;
  } catch (error) {
    stats.errors.push({ endpoint, error: error.message });
    return null;
  }
}

// Region mapping
const REGION_MAP = {
  'england': 'uk', 'scotland': 'uk', 'wales': 'uk',
  'spain': 'european', 'germany': 'european', 'italy': 'european', 'france': 'european',
  'netherlands': 'european', 'portugal': 'european', 'belgium': 'european',
  'japan': 'asia', 'south-korea': 'asia', 'china': 'asia',
  'usa': 'americas', 'mexico': 'americas', 'brazil': 'americas', 'argentina': 'americas'
};

function getRegion(country) {
  const key = country.toLowerCase().replace(/\s+/g, '-');
  return REGION_MAP[key] || 'other';
}

function shouldExcludeLeague(leagueName, leagueType) {
  const searchText = `${leagueName} ${leagueType}`.toLowerCase();
  return EXCLUDE_KEYWORDS.some(keyword => searchText.includes(keyword));
}

// Calculate stats with ALL thresholds
function calculateStats(games) {
  if (!games || games.length === 0) return null;
  
  const stats = {
    goals: { over_1_5: 0, over_2_5: 0, over_3_5: 0, over_4_5: 0, total: 0 },
    corners: { over_8_5: 0, over_9_5: 0, over_10_5: 0, over_11_5: 0, over_12_5: 0, total: 0 },
    cards: { over_2_5: 0, over_3_5: 0, over_4_5: 0, over_5_5: 0, total: 0 },
    btts: { count: 0, scored: 0, conceded: 0 }
  };
  
  games.forEach(game => {
    const totalGoals = (game.goals?.home || 0) + (game.goals?.away || 0);
    stats.goals.total += totalGoals;
    if (totalGoals > 1.5) stats.goals.over_1_5++;
    if (totalGoals > 2.5) stats.goals.over_2_5++;
    if (totalGoals > 3.5) stats.goals.over_3_5++;
    if (totalGoals > 4.5) stats.goals.over_4_5++;
    
    const totalCorners = (game.corners?.home || 0) + (game.corners?.away || 0);
    if (totalCorners > 0) {
      stats.corners.total += totalCorners;
      if (totalCorners > 8.5) stats.corners.over_8_5++;
      if (totalCorners > 9.5) stats.corners.over_9_5++;
      if (totalCorners > 10.5) stats.corners.over_10_5++;
      if (totalCorners > 11.5) stats.corners.over_11_5++;
      if (totalCorners > 12.5) stats.corners.over_12_5++;
    }
    
    const totalCards = (game.cards?.yellow?.home || 0) + (game.cards?.yellow?.away || 0);
    if (totalCards > 0) {
      stats.cards.total += totalCards;
      if (totalCards > 2.5) stats.cards.over_2_5++;
      if (totalCards > 3.5) stats.cards.over_3_5++;
      if (totalCards > 4.5) stats.cards.over_4_5++;
      if (totalCards > 5.5) stats.cards.over_5_5++;
    }
    
    const homeGoals = game.goals?.home || 0;
    const awayGoals = game.goals?.away || 0;
    stats.btts.scored += homeGoals;
    stats.btts.conceded += awayGoals;
    if (homeGoals > 0 && awayGoals > 0) stats.btts.count++;
  });
  
  const played = games.length;
  
  return {
    goals: {
      over_1_5_pct: Math.round((stats.goals.over_1_5 / played) * 100),
      over_1_5_count: stats.goals.over_1_5,
      over_2_5_pct: Math.round((stats.goals.over_2_5 / played) * 100),
      over_2_5_count: stats.goals.over_2_5,
      over_3_5_pct: Math.round((stats.goals.over_3_5 / played) * 100),
      over_3_5_count: stats.goals.over_3_5,
      over_4_5_pct: Math.round((stats.goals.over_4_5 / played) * 100),
      over_4_5_count: stats.goals.over_4_5,
      avg_total: parseFloat((stats.goals.total / played).toFixed(2))
    },
    corners: {
      over_8_5_pct: Math.round((stats.corners.over_8_5 / played) * 100),
      over_9_5_pct: Math.round((stats.corners.over_9_5 / played) * 100),
      over_10_5_pct: Math.round((stats.corners.over_10_5 / played) * 100),
      over_11_5_pct: Math.round((stats.corners.over_11_5 / played) * 100),
      over_12_5_pct: Math.round((stats.corners.over_12_5 / played) * 100),
      avg_total: parseFloat((stats.corners.total / played).toFixed(2))
    },
    cards: {
      over_2_5_pct: Math.round((stats.cards.over_2_5 / played) * 100),
      over_3_5_pct: Math.round((stats.cards.over_3_5 / played) * 100),
      over_4_5_pct: Math.round((stats.cards.over_4_5 / played) * 100),
      over_5_5_pct: Math.round((stats.cards.over_5_5 / played) * 100),
      avg_total: parseFloat((stats.cards.total / played).toFixed(2))
    },
    btts: {
      pct: Math.round((stats.btts.count / played) * 100),
      avg_scored: parseFloat((stats.btts.scored / played).toFixed(2)),
      avg_conceded: parseFloat((stats.btts.conceded / played).toFixed(2))
    }
  };
}

async function main() {
  console.log('🚀 FULL DATA COLLECTION: ALL ~200 Leagues\n');
  
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ MongoDB connected\n');
    
    const db = client.db('footy-oracle');
    const collection = db.collection('team_stats');
    
    // Fetch leagues
    console.log('🌍 Fetching leagues for 2024 season...');
    const leaguesData = await apiCall('/leagues', { season: 2024 });
    if (!leaguesData) throw new Error('Failed to fetch leagues');
    
    // Filter leagues
    const mainLeagues = leaguesData.response.filter(item => {
      const region = getRegion(item.country.name);
      if (region === 'other') return false;
      if (shouldExcludeLeague(item.league.name, item.league.type)) return false;
      return true;
    });
    
    console.log(`✅ Found ${mainLeagues.length} main professional leagues\n`);
    console.log(`⚙️ Processing ALL leagues and teams...\n`);
    
    // Process leagues
    for (const leagueItem of mainLeagues) {
      const league = leagueItem.league;
      const country = leagueItem.country;
      const region = getRegion(country.name);
      
      console.log(`📍 ${league.name} (${country.name})`);
      
      const teamsData = await apiCall('/teams', { league: league.id, season: 2024 });
      if (!teamsData) continue;
      
      stats.leaguesProcessed++;
      
      for (const teamItem of teamsData.response) {
        const team = teamItem.team;
        
        const fixturesData = await apiCall('/fixtures', { team: team.id, last: 20, season: 2024 });
        if (!fixturesData || !fixturesData.response.length) continue;
        
        const games = fixturesData.response.map(f => ({
          fixture_id: f.fixture.id,
          date: f.fixture.date,
          goals: { home: f.goals.home, away: f.goals.away },
          corners: { home: 0, away: 0 },
          cards: { yellow: { home: 0, away: 0 } }
        }));
        
        const calculatedStats = calculateStats(games);
        if (!calculatedStats) continue;
        
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
        
        await collection.updateOne(
          { team_id: team.id },
          { $set: teamDoc },
          { upsert: true }
        );
        
        stats.teamsProcessed++;
        stats.teamsStored++;
        
        console.log(`   ✅ ${team.name} (O2.5: ${calculatedStats.goals.over_2_5_pct}%)`);
      }
    }
    
    console.log(`\n✅ Data collection complete!\n`);
    console.log(`📊 Summary:`);
    console.log(`   Leagues: ${stats.leaguesProcessed}`);
    console.log(`   Teams: ${stats.teamsStored}`);
    console.log(`   API Calls: ${stats.apiCalls}`);
    console.log(`   Errors: ${stats.errors.length}\n`);
    
    // Update cache with top 20 for each category
    console.log('💾 Updating cache file...\n');
    
    const goals = await collection.find({}).sort({ 'stats.goals.over_2_5_pct': -1 }).limit(20).toArray();
    const corners = await collection.find({}).sort({ 'stats.corners.over_9_5_pct': -1 }).limit(20).toArray();
    const cards = await collection.find({}).sort({ 'stats.cards.over_3_5_pct': -1 }).limit(20).toArray();
    const btts = await collection.find({}).sort({ 'stats.btts.pct': -1 }).limit(20).toArray();
    
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
    
    const cachePath = path.join(__dirname, '..', 'cache', 'stats-cache.json');
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
    
    console.log('✅ Cache file updated!\n');
    console.log('📋 Top 3 teams (Goals):');
    cacheData.goals.slice(0, 3).forEach((team, i) => {
      console.log(`   ${i + 1}. ${team.team} (${team.league}) - ${team.over_2_5_pct}%`);
    });
    
    console.log('\n🎉 ALL DONE!\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

main().catch(console.error);

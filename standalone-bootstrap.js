#!/usr/bin/env node

/**
 * STANDALONE BOOTSTRAP - Run Anywhere
 * No build tools, no TypeScript, just Node.js
 * 
 * Usage:
 * 1. Set environment variables:
 *    export MONGODB_URI="***REMOVED***"
 *    export VITE_API_FOOTBALL_KEY="your_key"
 * 
 * 2. Run:
 *    node standalone-bootstrap.js
 * 
 * 3. Monitor:
 *    tail -f bootstrap.log
 */

import mongoose from 'mongoose';
import fetch from 'node-fetch';
import fs from 'fs';

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const API_KEY = process.env.VITE_API_FOOTBALL_KEY;
const RATE_LIMIT_DELAY = 6000; // 6 seconds = 10 calls/min
const LOG_FILE = 'bootstrap.log';

// Leagues by region
const REGION_LEAGUES = {
  EUROPE: [39, 40, 41, 42, 179, 180, 357, 140, 141, 78, 79, 135, 136, 61, 62, 94, 88, 144, 203, 235, 113, 119, 103, 197, 218, 169, 333, 345, 318, 327],
  ASIA: [98, 99, 307, 17, 292, 323, 188, 271, 274, 301, 289, 290, 293, 294, 295],
  AMERICAS: [71, 72, 128, 239, 281, 242, 243, 250, 251, 252, 262, 253, 339],
  AFRICA: [20, 21, 22, 23, 24, 25, 26, 27],
};

// Markets
const MARKETS = {
  GOALS: [
    { name: 'OVER_1_5', threshold: 1.5, type: 'over' },
    { name: 'OVER_2_5', threshold: 2.5, type: 'over' },
    { name: 'OVER_3_5', threshold: 3.5, type: 'over' },
    { name: 'OVER_4_5', threshold: 4.5, type: 'over' },
    { name: 'UNDER_1_5', threshold: 1.5, type: 'under' },
    { name: 'UNDER_2_5', threshold: 2.5, type: 'under' },
    { name: 'UNDER_3_5', threshold: 3.5, type: 'under' },
    { name: 'UNDER_4_5', threshold: 4.5, type: 'under' },
  ],
  CORNERS: [
    { name: 'OVER_8_5', threshold: 8.5, type: 'over' },
    { name: 'OVER_9_5', threshold: 9.5, type: 'over' },
    { name: 'OVER_10_5', threshold: 10.5, type: 'over' },
    { name: 'OVER_11_5', threshold: 11.5, type: 'over' },
  ],
  CARDS: [
    { name: 'OVER_2_5', threshold: 2.5, type: 'over' },
    { name: 'OVER_3_5', threshold: 3.5, type: 'over' },
    { name: 'OVER_4_5', threshold: 4.5, type: 'over' },
    { name: 'OVER_5_5', threshold: 5.5, type: 'over' },
    { name: 'UNDER_2_5', threshold: 2.5, type: 'under' },
    { name: 'UNDER_3_5', threshold: 3.5, type: 'under' },
    { name: 'UNDER_4_5', threshold: 4.5, type: 'under' },
    { name: 'UNDER_5_5', threshold: 5.5, type: 'under' },
  ],
};

// Stats
let totalTeamsProcessed = 0;
let totalApiCalls = 0;
let startTime = Date.now();
let lastHourlyLog = Date.now();

// MongoDB Schema
const regionalStatsSchema = new mongoose.Schema({
  region: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  market: { type: String, required: true, index: true },
  teamId: { type: Number, required: true, index: true },
  teamName: { type: String, required: true },
  matchesSampled: { type: Number, required: true, default: 20 },
  successCount: { type: Number, required: true, default: 0 },
  successPercent: { type: Number, required: true, default: 0 },
  avgPerGame: { type: Number, required: true, default: 0 },
  lastUpdated: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

regionalStatsSchema.index({ region: 1, category: 1, market: 1, successPercent: -1 });
const RegionalStats = mongoose.model('RegionalStats', regionalStatsSchema);

// Logging
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      totalApiCalls++;
      
      if (response.status === 429) {
        log(`⚠️  Rate limit hit, waiting 60s...`);
        await sleep(60000);
        continue;
      }
      
      const data = await response.json();
      return data.response || [];
    } catch (error) {
      log(`❌ Fetch error (attempt ${i + 1}/${retries}): ${error.message}`);
      if (i === retries - 1) throw error;
      await sleep(5000);
    }
  }
}

async function fetchFixtureStatistics(fixtureId) {
  const url = `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`;
  return await fetchWithRetry(url, { headers: { 'x-apisports-key': API_KEY } });
}

async function fetchTeamFixtures(teamId, season = 2024) {
  const url = `https://v3.football.api-sports.io/fixtures?team=${teamId}&season=${season}&last=20`;
  return await fetchWithRetry(url, { headers: { 'x-apisports-key': API_KEY } });
}

async function calculateAllStats(fixtures, teamId) {
  const stats = { GOALS: {}, CORNERS: {}, CARDS: {} };
  const fixtureStats = new Map();
  
  for (const fixture of fixtures) {
    const stats = await fetchFixtureStatistics(fixture.fixture.id);
    fixtureStats.set(fixture.fixture.id, stats);
    await sleep(RATE_LIMIT_DELAY);
  }
  
  // GOALS
  for (const market of MARKETS.GOALS) {
    let successCount = 0, totalGoals = 0;
    fixtures.forEach(fixture => {
      const total = (fixture.goals?.home || 0) + (fixture.goals?.away || 0);
      totalGoals += total;
      if ((market.type === 'over' && total > market.threshold) || 
          (market.type === 'under' && total < market.threshold)) successCount++;
    });
    stats.GOALS[market.name] = {
      matchesSampled: fixtures.length,
      successCount,
      successPercent: Math.round((successCount / fixtures.length) * 100),
      avgPerGame: parseFloat((totalGoals / fixtures.length).toFixed(1)),
    };
  }
  
  // CORNERS
  for (const market of MARKETS.CORNERS) {
    let successCount = 0, totalCorners = 0;
    fixtures.forEach(fixture => {
      const fStats = fixtureStats.get(fixture.fixture.id);
      if (!fStats || fStats.length < 2) return;
      const homeCorners = fStats[0]?.statistics?.find(s => s.type === 'Corner Kicks')?.value || 0;
      const awayCorners = fStats[1]?.statistics?.find(s => s.type === 'Corner Kicks')?.value || 0;
      const total = homeCorners + awayCorners;
      totalCorners += total;
      if (total > market.threshold) successCount++;
    });
    stats.CORNERS[market.name] = {
      matchesSampled: fixtures.length,
      successCount,
      successPercent: Math.round((successCount / fixtures.length) * 100),
      avgPerGame: parseFloat((totalCorners / fixtures.length).toFixed(1)),
    };
  }
  
  // CARDS
  for (const market of MARKETS.CARDS) {
    let successCount = 0, totalCards = 0;
    fixtures.forEach(fixture => {
      const fStats = fixtureStats.get(fixture.fixture.id);
      if (!fStats || fStats.length < 2) return;
      const homeYellow = fStats[0]?.statistics?.find(s => s.type === 'Yellow Cards')?.value || 0;
      const awayYellow = fStats[1]?.statistics?.find(s => s.type === 'Yellow Cards')?.value || 0;
      const homeRed = fStats[0]?.statistics?.find(s => s.type === 'Red Cards')?.value || 0;
      const awayRed = fStats[1]?.statistics?.find(s => s.type === 'Red Cards')?.value || 0;
      const total = homeYellow + awayYellow + (homeRed * 2) + (awayRed * 2);
      totalCards += total;
      if ((market.type === 'over' && total > market.threshold) || 
          (market.type === 'under' && total < market.threshold)) successCount++;
    });
    stats.CARDS[market.name] = {
      matchesSampled: fixtures.length,
      successCount,
      successPercent: Math.round((successCount / fixtures.length) * 100),
      avgPerGame: parseFloat((totalCards / fixtures.length).toFixed(1)),
    };
  }
  
  return stats;
}

function logProgress(region, leagueId, teamName) {
  const elapsed = Date.now() - startTime;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  
  // Hourly summary
  if (Date.now() - lastHourlyLog >= 3600000) {
    log(`\n📊 HOURLY SUMMARY`);
    log(`   Time: ${hours}h ${minutes}m`);
    log(`   Teams: ${totalTeamsProcessed}`);
    log(`   API Calls: ${totalApiCalls}`);
    log(`   Rate: ${(totalTeamsProcessed / (elapsed / 3600000)).toFixed(1)} teams/hour\n`);
    lastHourlyLog = Date.now();
  }
  
  log(`[${hours}h ${minutes}m] ${region} | League ${leagueId} | ${teamName} | Teams: ${totalTeamsProcessed} | API: ${totalApiCalls}`);
}

async function bootstrap() {
  log('🚀 BOOTSTRAP STARTING');
  log(`📊 Target: 70+ leagues × ~150 teams × 20 markets = ~220k documents`);
  log(`⏱️  Estimated: 36-48 hours\n`);
  
  for (const region of Object.keys(REGION_LEAGUES)) {
    log(`\n📍 REGION: ${region}`);
    
    for (const leagueId of REGION_LEAGUES[region]) {
      try {
        const teams = await fetchWithRetry(
          `https://v3.football.api-sports.io/teams?league=${leagueId}&season=2024`,
          { headers: { 'x-apisports-key': API_KEY } }
        );
        await sleep(RATE_LIMIT_DELAY);
        
        log(`  🏆 League ${leagueId}: ${teams.length} teams`);
        
        for (const teamData of teams) {
          const teamId = teamData.team.id;
          const teamName = teamData.team.name;
          
          try {
            const fixtures = await fetchTeamFixtures(teamId);
            await sleep(RATE_LIMIT_DELAY);
            
            if (fixtures.length < 5) {
              log(`    ⏭️  Skip ${teamName} (${fixtures.length} matches)`);
              continue;
            }
            
            const stats = await calculateAllStats(fixtures, teamId);
            
            for (const category of ['GOALS', 'CORNERS', 'CARDS']) {
              for (const market of MARKETS[category]) {
                const marketStats = stats[category][market.name];
                await RegionalStats.findOneAndUpdate(
                  { region, category, market: market.name, teamId },
                  {
                    region, category, market: market.name, teamId, teamName,
                    matchesSampled: marketStats.matchesSampled,
                    successCount: marketStats.successCount,
                    successPercent: marketStats.successPercent,
                    avgPerGame: marketStats.avgPerGame,
                    lastUpdated: new Date(),
                  },
                  { upsert: true, new: true }
                );
              }
            }
            
            totalTeamsProcessed++;
            logProgress(region, leagueId, teamName);
            
          } catch (error) {
            log(`    ❌ Error: ${teamName}: ${error.message}`);
          }
        }
      } catch (error) {
        log(`  ❌ League ${leagueId} error: ${error.message}`);
      }
    }
  }
  
  const totalTime = Date.now() - startTime;
  const hours = Math.floor(totalTime / 3600000);
  const minutes = Math.floor((totalTime % 3600000) / 60000);
  
  log(`\n✅ BOOTSTRAP COMPLETE!`);
  log(`⏱️  Total time: ${hours}h ${minutes}m`);
  log(`📊 Teams: ${totalTeamsProcessed}`);
  log(`🔌 API calls: ${totalApiCalls}`);
}

async function main() {
  if (!MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI not set');
    process.exit(1);
  }
  if (!API_KEY) {
    console.error('❌ ERROR: VITE_API_FOOTBALL_KEY not set');
    process.exit(1);
  }
  
  try {
    log('📦 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    log('✅ MongoDB connected\n');
    
    await bootstrap();
    
  } catch (error) {
    log(`❌ FATAL ERROR: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('📦 MongoDB disconnected');
  }
}

main();

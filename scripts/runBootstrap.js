#!/usr/bin/env node

/**
 * BOOTSTRAP EXECUTOR
 * Run this script to start the complete backfill process
 * 
 * Usage: node scripts/runBootstrap.js
 */

import mongoose from 'mongoose';
import fetch from 'node-fetch';

// Inline the bootstrap logic since we can't import TS files directly
const REGION_LEAGUES = {
  EUROPE: [
    39, 40, 41, 42, 179, 180, 357, 140, 141, 78, 79, 135, 136, 61, 62,
    94, 88, 144, 203, 235, 113, 119, 103, 197, 218, 169, 333, 345, 318, 327,
  ],
  ASIA: [
    98, 99, 307, 17, 292, 323, 188, 271, 274, 301, 289, 290, 293, 294, 295,
  ],
  AMERICAS: [
    71, 72, 128, 239, 281, 242, 243, 250, 251, 252, 262, 253, 339,
  ],
  AFRICA: [
    20, 21, 22, 23, 24, 25, 26, 27,
  ],
};

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

const API_KEY = process.env.VITE_API_FOOTBALL_KEY;
const RATE_LIMIT_DELAY = 6000;

let totalTeamsProcessed = 0;
let totalApiCalls = 0;
let startTime = Date.now();

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFixtureStatistics(fixtureId) {
  const url = `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`;
  const response = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY },
  });
  totalApiCalls++;
  const data = await response.json();
  return data.response || [];
}

async function fetchTeamFixtures(teamId, season = 2024) {
  const url = `https://v3.football.api-sports.io/fixtures?team=${teamId}&season=${season}&last=20`;
  const response = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY },
  });
  totalApiCalls++;
  const data = await response.json();
  return data.response || [];
}

async function calculateAllStats(fixtures, teamId) {
  const stats = { GOALS: {}, CORNERS: {}, CARDS: {} };
  
  const fixtureStats = new Map();
  for (const fixture of fixtures) {
    const stats = await fetchFixtureStatistics(fixture.fixture.id);
    fixtureStats.set(fixture.fixture.id, stats);
    await sleep(RATE_LIMIT_DELAY);
  }
  
  // Calculate GOALS
  for (const market of MARKETS.GOALS) {
    let successCount = 0;
    let totalGoals = 0;
    
    fixtures.forEach(fixture => {
      const homeGoals = fixture.goals?.home || 0;
      const awayGoals = fixture.goals?.away || 0;
      const total = homeGoals + awayGoals;
      totalGoals += total;
      
      if (market.type === 'over' && total > market.threshold) {
        successCount++;
      } else if (market.type === 'under' && total < market.threshold) {
        successCount++;
      }
    });
    
    const matchesSampled = fixtures.length;
    stats.GOALS[market.name] = {
      matchesSampled,
      successCount,
      successPercent: Math.round((successCount / matchesSampled) * 100),
      avgPerGame: parseFloat((totalGoals / matchesSampled).toFixed(1)),
    };
  }
  
  // Calculate CORNERS
  for (const market of MARKETS.CORNERS) {
    let successCount = 0;
    let totalCorners = 0;
    
    fixtures.forEach(fixture => {
      const stats = fixtureStats.get(fixture.fixture.id);
      if (!stats || stats.length < 2) return;
      
      const homeStats = stats[0]?.statistics || [];
      const awayStats = stats[1]?.statistics || [];
      
      const homeCorners = homeStats.find(s => s.type === 'Corner Kicks')?.value || 0;
      const awayCorners = awayStats.find(s => s.type === 'Corner Kicks')?.value || 0;
      const total = homeCorners + awayCorners;
      totalCorners += total;
      
      if (total > market.threshold) {
        successCount++;
      }
    });
    
    const matchesSampled = fixtures.length;
    stats.CORNERS[market.name] = {
      matchesSampled,
      successCount,
      successPercent: Math.round((successCount / matchesSampled) * 100),
      avgPerGame: parseFloat((totalCorners / matchesSampled).toFixed(1)),
    };
  }
  
  // Calculate CARDS
  for (const market of MARKETS.CARDS) {
    let successCount = 0;
    let totalCards = 0;
    
    fixtures.forEach(fixture => {
      const stats = fixtureStats.get(fixture.fixture.id);
      if (!stats || stats.length < 2) return;
      
      const homeStats = stats[0]?.statistics || [];
      const awayStats = stats[1]?.statistics || [];
      
      const homeYellow = homeStats.find(s => s.type === 'Yellow Cards')?.value || 0;
      const awayYellow = awayStats.find(s => s.type === 'Yellow Cards')?.value || 0;
      const homeRed = homeStats.find(s => s.type === 'Red Cards')?.value || 0;
      const awayRed = awayStats.find(s => s.type === 'Red Cards')?.value || 0;
      
      const total = homeYellow + awayYellow + (homeRed * 2) + (awayRed * 2);
      totalCards += total;
      
      if (market.type === 'over' && total > market.threshold) {
        successCount++;
      } else if (market.type === 'under' && total < market.threshold) {
        successCount++;
      }
    });
    
    const matchesSampled = fixtures.length;
    stats.CARDS[market.name] = {
      matchesSampled,
      successCount,
      successPercent: Math.round((successCount / matchesSampled) * 100),
      avgPerGame: parseFloat((totalCards / matchesSampled).toFixed(1)),
    };
  }
  
  return stats;
}

function logProgress(region, leagueId, teamName) {
  const elapsed = Date.now() - startTime;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  
  console.log(`[${hours}h ${minutes}m] ${region} | League ${leagueId} | ${teamName}`);
  console.log(`  Teams: ${totalTeamsProcessed} | API Calls: ${totalApiCalls}`);
}

async function bootstrapAllStats() {
  console.log('🚀 STARTING COMPLETE BOOTSTRAP: Goals + Corners + Cards');
  console.log('📊 70+ leagues × ~150 teams × 20 markets = ~220k documents');
  console.log('⏱️  Estimated time: 36 hours (10 calls/min rate limit)');
  console.log('');
  
  const regions = Object.keys(REGION_LEAGUES);
  
  for (const region of regions) {
    console.log(`\n📍 REGION: ${region}`);
    const leagueIds = REGION_LEAGUES[region];
    
    for (const leagueId of leagueIds) {
      try {
        console.log(`\n  🏆 League ${leagueId}`);
        
        const teamsResponse = await fetch(
          `https://v3.football.api-sports.io/teams?league=${leagueId}&season=2024`,
          { headers: { 'x-apisports-key': API_KEY } }
        );
        
        totalApiCalls++;
        await sleep(RATE_LIMIT_DELAY);
        
        const teamsData = await teamsResponse.json();
        const teams = teamsData.response || [];
        
        console.log(`    Teams: ${teams.length}`);
        
        for (const teamData of teams) {
          const teamId = teamData.team.id;
          const teamName = teamData.team.name;
          
          try {
            const fixtures = await fetchTeamFixtures(teamId);
            await sleep(RATE_LIMIT_DELAY);
            
            if (fixtures.length < 5) {
              console.log(`    ⏭️  Skip ${teamName} (${fixtures.length} matches)`);
              continue;
            }
            
            const stats = await calculateAllStats(fixtures, teamId);
            
            for (const category of ['GOALS', 'CORNERS', 'CARDS']) {
              const categoryMarkets = MARKETS[category];
              
              for (const market of categoryMarkets) {
                const marketStats = stats[category][market.name];
                
                await RegionalStats.findOneAndUpdate(
                  { region, category, market: market.name, teamId },
                  {
                    region,
                    category,
                    market: market.name,
                    teamId,
                    teamName,
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
            console.error(`    ❌ Error processing ${teamName}:`, error);
          }
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing league ${leagueId}:`, error);
      }
    }
  }
  
  const totalTime = Date.now() - startTime;
  const hours = Math.floor(totalTime / 3600000);
  const minutes = Math.floor((totalTime % 3600000) / 60000);
  
  console.log('\n✅ BOOTSTRAP COMPLETE!');
  console.log(`⏱️  Total time: ${hours}h ${minutes}m`);
  console.log(`📊 Teams processed: ${totalTeamsProcessed}`);
  console.log(`🔌 API calls made: ${totalApiCalls}`);
}

async function main() {
  console.log('🚀 BOOTSTRAP EXECUTOR STARTING...\n');
  
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  
  if (!mongoUri) {
    console.error('❌ ERROR: MONGODB_URI environment variable not set');
    process.exit(1);
  }
  
  if (!API_KEY) {
    console.error('❌ ERROR: VITE_API_FOOTBALL_KEY environment variable not set');
    process.exit(1);
  }
  
  try {
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected\n');
    
    await bootstrapAllStats();
    
    console.log('\n✅ BOOTSTRAP COMPLETE!');
    
  } catch (error) {
    console.error('❌ BOOTSTRAP FAILED:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📦 MongoDB disconnected');
  }
}

main();

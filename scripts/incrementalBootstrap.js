/**
 * INCREMENTAL BOOTSTRAP - Processes 50 teams per run
 * Run this via Vercel Cron or manually
 * Completes full bootstrap in ~220 runs
 * 
 * Strategy: Process teams that haven't been updated yet
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const API_KEY = process.env.VITE_API_FOOTBALL_KEY;
const RATE_LIMIT_DELAY = 6000;
const TEAMS_PER_RUN = 50;

const REGION_LEAGUES = {
  EUROPE: [39, 40, 41, 42, 179, 180, 357, 140, 141, 78, 79, 135, 136, 61, 62, 94, 88, 144, 203, 235, 113, 119, 103, 197, 218, 169, 333, 345, 318, 327],
  ASIA: [98, 99, 307, 17, 292, 323, 188, 271, 274, 301, 289, 290, 293, 294, 295],
  AMERICAS: [71, 72, 128, 239, 281, 242, 243, 250, 251, 252, 262, 253, 339],
  AFRICA: [20, 21, 22, 23, 24, 25, 26, 27],
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
const RegionalStats = mongoose.models.RegionalStats || mongoose.model('RegionalStats', regionalStatsSchema);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFixtureStatistics(fixtureId) {
  const url = `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`;
  const response = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  const data = await response.json();
  return data.response || [];
}

async function fetchTeamFixtures(teamId, season = 2024) {
  const url = `https://v3.football.api-sports.io/fixtures?team=${teamId}&season=${season}&last=20`;
  const response = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  const data = await response.json();
  return data.response || [];
}

async function calculateAllStats(fixtures) {
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

async function getUnprocessedTeams(limit) {
  const allTeams = [];
  
  for (const region of Object.keys(REGION_LEAGUES)) {
    for (const leagueId of REGION_LEAGUES[region]) {
      try {
        const url = `https://v3.football.api-sports.io/teams?league=${leagueId}&season=2024`;
        const response = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
        const data = await response.json();
        const teams = data.response || [];
        
        for (const teamData of teams) {
          allTeams.push({
            teamId: teamData.team.id,
            teamName: teamData.team.name,
            region,
            leagueId,
          });
        }
        
        await sleep(RATE_LIMIT_DELAY);
      } catch (error) {
        console.error(`Error fetching league ${leagueId}:`, error.message);
      }
    }
  }
  
  const unprocessed = [];
  for (const team of allTeams) {
    const exists = await RegionalStats.findOne({ 
      teamId: team.teamId,
      region: team.region,
      category: 'GOALS',
      market: 'OVER_2_5'
    });
    
    if (!exists) {
      unprocessed.push(team);
      if (unprocessed.length >= limit) break;
    }
  }
  
  return unprocessed;
}

export async function incrementalBootstrap() {
  console.log('🔄 INCREMENTAL BOOTSTRAP STARTING');
  console.log(`📊 Processing ${TEAMS_PER_RUN} teams this run\n`);
  
  const startTime = Date.now();
  
  // Connect to MongoDB if not connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }
  
  const teams = await getUnprocessedTeams(TEAMS_PER_RUN);
  
  console.log(`✅ Found ${teams.length} unprocessed teams`);
  
  if (teams.length === 0) {
    console.log('🎉 ALL TEAMS PROCESSED! Bootstrap complete.');
    return {
      complete: true,
      processed: 0,
      totalInDb: await RegionalStats.countDocuments(),
      progress: 100
    };
  }
  
  let processed = 0;
  
  for (const team of teams) {
    try {
      console.log(`Processing ${team.teamName} (${team.region})...`);
      
      const fixtures = await fetchTeamFixtures(team.teamId);
      await sleep(RATE_LIMIT_DELAY);
      
      if (fixtures.length < 5) {
        console.log(`  ⏭️  Skip (only ${fixtures.length} matches)`);
        continue;
      }
      
      const stats = await calculateAllStats(fixtures);
      
      for (const category of ['GOALS', 'CORNERS', 'CARDS']) {
        for (const market of MARKETS[category]) {
          const marketStats = stats[category][market.name];
          await RegionalStats.findOneAndUpdate(
            { region: team.region, category, market: market.name, teamId: team.teamId },
            {
              region: team.region,
              category,
              market: market.name,
              teamId: team.teamId,
              teamName: team.teamName,
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
      
      processed++;
      console.log(`  ✅ Saved (${processed}/${teams.length})`);
      
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }
  
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const totalInDb = await RegionalStats.countDocuments();
  const estimatedTotal = 11000 * 20;
  const progress = Math.round((totalInDb / estimatedTotal) * 100);
  
  console.log(`\n✅ RUN COMPLETE`);
  console.log(`⏱️  Time: ${elapsed}s`);
  console.log(`📊 Processed: ${processed} teams`);
  console.log(`💾 Total docs in DB: ${totalInDb.toLocaleString()}`);
  console.log(`📈 Progress: ${progress}% complete`);
  
  return {
    complete: false,
    processed,
    totalInDb,
    progress,
    elapsed
  };
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    if (!MONGODB_URI || !API_KEY) {
      console.error('❌ Missing environment variables');
      process.exit(1);
    }
    
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('✅ MongoDB connected\n');
      
      await incrementalBootstrap();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
    }
  })();
}

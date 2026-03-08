/**
 * Vercel API Endpoint: Trigger Data Collection
 * 
 * Visit this URL to run the data collection script:
 * https://your-app.vercel.app/api/admin/collect-data?secret=YOUR_SECRET
 * 
 * This endpoint runs the data collection script and returns progress updates.
 */

import { MongoClient } from 'mongodb';

// MongoDB Configuration
const MONGODB_URI = process.env.MONGODB_URI || '***REMOVED***';
const DB_NAME = 'footy-oracle';
const COLLECTION_NAME = 'team_stats';

// API-Football Configuration
const API_KEY = process.env.VITE_API_FOOTBALL_KEY || '***REMOVED***';
const API_BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

// Security: Simple secret to prevent unauthorized access
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'golden-bet-2026';

// League Filtering Keywords (EXCLUDE these)
const EXCLUDE_KEYWORDS = [
  'women', 'feminine', 'femenina', 'femminile', 'frauen',
  'u21', 'u19', 'u18', 'u17', 'under 21', 'under 19', 'under 18',
  'youth', 'junior', 'reserve', 'b team', 'amateur', 'u20'
];

// Region Mapping by Country
const REGION_MAP = {
  'england': 'uk', 'scotland': 'uk', 'wales': 'uk', 'northern-ireland': 'uk',
  'spain': 'european', 'germany': 'european', 'italy': 'european', 'france': 'european',
  'netherlands': 'european', 'portugal': 'european', 'belgium': 'european', 'turkey': 'european',
  'russia': 'european', 'ukraine': 'european', 'greece': 'european', 'austria': 'european',
  'switzerland': 'european', 'denmark': 'european', 'sweden': 'european', 'norway': 'european',
  'poland': 'european', 'czech-republic': 'european', 'croatia': 'european', 'serbia': 'european',
  'romania': 'european', 'bulgaria': 'european', 'hungary': 'european', 'finland': 'european',
  'japan': 'asia', 'south-korea': 'asia', 'china': 'asia', 'india': 'asia',
  'saudi-arabia': 'asia', 'uae': 'asia', 'qatar': 'asia', 'iran': 'asia',
  'iraq': 'asia', 'thailand': 'asia', 'vietnam': 'asia', 'malaysia': 'asia',
  'singapore': 'asia', 'indonesia': 'asia', 'australia': 'asia',
  'usa': 'americas', 'mexico': 'americas', 'brazil': 'americas', 'argentina': 'americas',
  'colombia': 'americas', 'chile': 'americas', 'uruguay': 'americas', 'paraguay': 'americas',
  'peru': 'americas', 'ecuador': 'americas', 'bolivia': 'americas', 'venezuela': 'americas',
  'canada': 'americas', 'costa-rica': 'americas',
};

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
    await new Promise(resolve => setTimeout(resolve, 100));
    return data;
  } catch (error) {
    stats.errors.push({ endpoint, error: error.message });
    return null;
  }
}

function shouldExcludeLeague(leagueName, leagueType) {
  const searchText = `${leagueName} ${leagueType}`.toLowerCase();
  return EXCLUDE_KEYWORDS.some(keyword => searchText.includes(keyword));
}

function getRegion(country) {
  const countryKey = country.toLowerCase().replace(/\s+/g, '-');
  return REGION_MAP[countryKey] || 'other';
}

function calculateTeamStats(games) {
  if (!games || games.length === 0) return null;
  
  const stats = {
    goals: { over_1_5_count: 0, over_2_5_count: 0, over_3_5_count: 0, over_4_5_count: 0, total: 0 },
    corners: { over_8_5_count: 0, over_9_5_count: 0, over_10_5_count: 0, over_11_5_count: 0, over_12_5_count: 0, total: 0 },
    cards: { over_2_5_count: 0, over_3_5_count: 0, over_4_5_count: 0, over_5_5_count: 0, total: 0 },
    btts: { count: 0, scored: 0, conceded: 0 }
  };
  
  games.forEach(game => {
    const totalGoals = (game.goals?.home || 0) + (game.goals?.away || 0);
    stats.goals.total += totalGoals;
    if (totalGoals > 1.5) stats.goals.over_1_5_count++;
    if (totalGoals > 2.5) stats.goals.over_2_5_count++;
    if (totalGoals > 3.5) stats.goals.over_3_5_count++;
    if (totalGoals > 4.5) stats.goals.over_4_5_count++;
    
    const totalCorners = (game.corners?.home || 0) + (game.corners?.away || 0);
    if (totalCorners > 0) {
      stats.corners.total += totalCorners;
      if (totalCorners > 8.5) stats.corners.over_8_5_count++;
      if (totalCorners > 9.5) stats.corners.over_9_5_count++;
      if (totalCorners > 10.5) stats.corners.over_10_5_count++;
      if (totalCorners > 11.5) stats.corners.over_11_5_count++;
      if (totalCorners > 12.5) stats.corners.over_12_5_count++;
    }
    
    const totalCards = (game.cards?.yellow?.home || 0) + (game.cards?.yellow?.away || 0) + 
                       (game.cards?.red?.home || 0) + (game.cards?.red?.away || 0);
    if (totalCards > 0) {
      stats.cards.total += totalCards;
      if (totalCards > 2.5) stats.cards.over_2_5_count++;
      if (totalCards > 3.5) stats.cards.over_3_5_count++;
      if (totalCards > 4.5) stats.cards.over_4_5_count++;
      if (totalCards > 5.5) stats.cards.over_5_5_count++;
    }
    
    const homeGoals = game.goals?.home || 0;
    const awayGoals = game.goals?.away || 0;
    stats.btts.scored += homeGoals;
    stats.btts.conceded += awayGoals;
    if (homeGoals > 0 && awayGoals > 0) stats.btts.count++;
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

export default async function handler(req, res) {
  // Security check
  const { secret } = req.query;
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid secret. Add ?secret=YOUR_SECRET to the URL' 
    });
  }

  // Set headers for streaming response
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  
  const log = (message) => {
    res.write(`<div style="font-family: monospace; padding: 5px;">${message}</div>`);
  };

  // Start HTML
  res.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Data Collection Progress</title>
      <style>
        body { 
          background: #1a1a1a; 
          color: #00ff00; 
          font-family: 'Courier New', monospace; 
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .success { color: #00ff00; }
        .error { color: #ff0000; }
        .info { color: #00aaff; }
        .warning { color: #ffaa00; }
        h1 { color: #00ff00; border-bottom: 2px solid #00ff00; padding-bottom: 10px; }
        .summary { 
          background: #2a2a2a; 
          padding: 15px; 
          margin: 20px 0; 
          border-left: 4px solid #00ff00;
        }
      </style>
    </head>
    <body>
      <h1>🚀 Form Tables Data Collection</h1>
  `);

  let client;
  
  try {
    log('<div class="info">🔌 Connecting to MongoDB...</div>');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    log('<div class="success">✅ MongoDB connected</div>');
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    log('<div class="info">📊 Creating indexes...</div>');
    await collection.createIndex({ team_id: 1 }, { unique: true });
    await collection.createIndex({ region: 1, 'stats.goals.over_2_5_pct': -1 });
    await collection.createIndex({ region: 1, 'stats.corners.over_9_5_pct': -1 });
    await collection.createIndex({ region: 1, 'stats.cards.over_3_5_pct': -1 });
    await collection.createIndex({ region: 1, 'stats.btts.pct': -1 });
    await collection.createIndex({ name: 'text' });
    log('<div class="success">✅ Indexes created</div><br>');
    
    log('<div class="info">🌍 Step 1: Fetching all leagues...</div>');
    const leaguesData = await apiCall('/leagues', { season: 2024 });
    
    if (!leaguesData || !leaguesData.response) {
      throw new Error('Failed to fetch leagues');
    }
    
    stats.leaguesFetched = leaguesData.response.length;
    log(`<div class="success">✅ Fetched ${stats.leaguesFetched} leagues</div><br>`);
    
    log('<div class="info">🔍 Step 2: Filtering to main professional leagues...</div>');
    const mainLeagues = leaguesData.response.filter(item => {
      const league = item.league;
      const country = item.country;
      
      if (shouldExcludeLeague(league.name, league.type || '')) return false;
      
      const region = getRegion(country.name);
      if (region === 'other') return false;
      
      return true;
    });
    
    stats.leaguesFiltered = mainLeagues.length;
    log(`<div class="success">✅ Filtered to ${stats.leaguesFiltered} main professional leagues</div><br>`);
    
    log('<div class="warning">⚙️ Step 3: Processing leagues (TEST MODE: 5 leagues, 3 teams each)...</div><br>');
    const testLeagues = mainLeagues.slice(0, 5);
    
    for (const leagueItem of testLeagues) {
      const league = leagueItem.league;
      const country = leagueItem.country;
      const region = getRegion(country.name);
      
      log(`<div class="info">📍 Processing: ${league.name} (${country.name}) [${region}]</div>`);
      stats.leaguesProcessed++;
      
      const teamsData = await apiCall('/teams', { league: league.id, season: 2024 });
      
      if (!teamsData || !teamsData.response) {
        log(`<div class="warning">   ⚠️ No teams data available</div>`);
        continue;
      }
      
      log(`<div class="info">   Found ${teamsData.response.length} teams</div>`);
      
      const testTeams = teamsData.response.slice(0, 3);
      
      for (const teamItem of testTeams) {
        const team = teamItem.team;
        log(`<div class="info">   ⚽ Processing team: ${team.name}...</div>`);
        
        const fixturesData = await apiCall('/fixtures', { 
          team: team.id, 
          last: 20,
          season: 2024
        });
        
        if (!fixturesData || !fixturesData.response || fixturesData.response.length === 0) {
          log(`<div class="warning">      ⚠️ No fixtures data available</div>`);
          continue;
        }
        
        const games = fixturesData.response.map(fixture => ({
          fixture_id: fixture.fixture.id,
          date: fixture.fixture.date,
          goals: { home: fixture.goals.home, away: fixture.goals.away },
          corners: { home: 0, away: 0 },
          cards: { yellow: { home: 0, away: 0 }, red: { home: 0, away: 0 } }
        }));
        
        const calculatedStats = calculateTeamStats(games);
        
        if (!calculatedStats) {
          log(`<div class="warning">      ⚠️ Could not calculate stats</div>`);
          continue;
        }
        
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
        
        log(`<div class="success">      ✅ Stored (${games.length} games, O2.5: ${calculatedStats.goals.over_2_5_pct}%)</div>`);
      }
    }
    
    const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
    
    log(`
      <div class="summary">
        <h2>📊 EXECUTION SUMMARY</h2>
        <div>⏱️ Duration: ${duration}s</div>
        <div>🌍 Leagues Fetched: ${stats.leaguesFetched}</div>
        <div>🔍 Leagues Filtered: ${stats.leaguesFiltered} main professional leagues</div>
        <div>⚙️ Leagues Processed: ${stats.leaguesProcessed} (TEST MODE)</div>
        <div>⚽ Teams Processed: ${stats.teamsProcessed}</div>
        <div>💾 Teams Stored: ${stats.teamsStored}</div>
        <div>📡 API Calls Made: ${stats.apiCalls}</div>
        <div>❌ Errors: ${stats.errors.length}</div>
      </div>
    `);
    
    const sampleTeams = await collection.find({}).limit(3).toArray();
    log('<div class="info"><h3>📋 Sample data from MongoDB:</h3></div>');
    sampleTeams.forEach(team => {
      log(`
        <div style="margin-left: 20px; background: #2a2a2a; padding: 10px; margin-bottom: 10px;">
          <div><strong>${team.name}</strong> (${team.league}, ${team.country})</div>
          <div>Region: ${team.region}</div>
          <div>Games: ${team.played}</div>
          <div>Over 2.5 Goals: ${team.stats.goals.over_2_5_pct}%</div>
          <div>Over 9.5 Corners: ${team.stats.corners.over_9_5_pct}%</div>
          <div>BTTS: ${team.stats.btts.pct}%</div>
        </div>
      `);
    });
    
    log(`
      <div class="summary success">
        <h2>✅ TEST RUN COMPLETE</h2>
        <div>⚠️ NOTE: This was a TEST run (5 leagues, 3 teams each)</div>
        <div>📝 To run full collection, update the code to remove .slice() limits</div>
      </div>
    `);
    
  } catch (error) {
    log(`<div class="error">❌ FATAL ERROR: ${error.message}</div>`);
    log(`<div class="error">${error.stack}</div>`);
  } finally {
    if (client) {
      await client.close();
      log('<div class="info">🔌 MongoDB connection closed</div>');
    }
  }

  res.write('</body></html>');
  res.end();
}

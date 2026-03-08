/**
 * Manual Cache Population Script
 * Run this locally to populate the cache immediately
 */

const GITHUB_TOKEN = '***REMOVED***';
const API_KEY = '***REMOVED***';
const API_BASE_URL = 'https://v3.football.api-sports.io';
const REPO_OWNER = 'dannythehat';
const REPO_NAME = 'golden-bet-ai';
const CACHE_FILE_PATH = 'cache/stats-cache.json';

const LEAGUES = [
  { id: 39, name: 'Premier League', region: 'uk' },
  { id: 40, name: 'Championship', region: 'uk' },
  { id: 140, name: 'La Liga', region: 'european' },
  { id: 141, name: 'Segunda División', region: 'european' },
  { id: 78, name: 'Bundesliga', region: 'european' },
  { id: 79, name: '2. Bundesliga', region: 'european' },
  { id: 135, name: 'Serie A', region: 'european' },
  { id: 136, name: 'Serie B', region: 'european' },
  { id: 61, name: 'Ligue 1', region: 'european' },
  { id: 62, name: 'Ligue 2', region: 'european' },
];

async function apiRequest(endpoint, params = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {})
  ).toString();

  const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

function getCurrentSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month < 7 ? year - 1 : year;
}

async function saveCacheToGitHub(data) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CACHE_FILE_PATH}`;
  
  // Get current file SHA
  let sha;
  try {
    const getResponse = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    if (getResponse.ok) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
    }
  } catch (e) {
    console.log('File does not exist yet, will create new');
  }

  // Create or update file
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Update stats cache - ${new Date().toISOString()}`,
      content,
      sha,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.statusText} - ${error}`);
  }

  return await response.json();
}

async function main() {
  console.log('🔄 Starting cache population...');
  const startTime = Date.now();
  
  const season = getCurrentSeason();
  const allTeams = [];
  let totalTeamsProcessed = 0;

  for (const league of LEAGUES) {
    try {
      console.log(`📊 Processing ${league.name}...`);

      const teams = await apiRequest('/teams', {
        league: league.id,
        season: season,
      });

      for (const teamData of teams.slice(0, 10)) { // Top 10 teams per league
        try {
          const teamId = teamData.team.id;
          const teamName = teamData.team.name;

          const fixtures = await apiRequest('/fixtures', {
            team: teamId,
            season: season,
            last: 20,
            status: 'FT',
          });

          if (fixtures.length < 10) continue;

          let over_2_5 = 0, btts = 0, totalGS = 0, totalGC = 0;

          fixtures.forEach((f) => {
            const isHome = f.teams.home.id === teamId;
            const hg = f.goals.home || 0;
            const ag = f.goals.away || 0;

            if (hg + ag > 2.5) over_2_5++;
            if (hg > 0 && ag > 0) btts++;

            if (isHome) {
              totalGS += hg;
              totalGC += ag;
            } else {
              totalGS += ag;
              totalGC += hg;
            }
          });

          let corners = 0, cards = 0, over_9_5 = 0, over_3_5 = 0, statsCount = 0;

          for (const fixture of fixtures.slice(0, 5)) {
            try {
              const stats = await apiRequest('/fixtures/statistics', {
                fixture: fixture.fixture.id,
              });

              const home = stats.find((s) => s.team.id === fixture.teams.home.id);
              const away = stats.find((s) => s.team.id === fixture.teams.away.id);

              const hc = Number(home?.statistics.find((s) => s.type === 'Corner Kicks')?.value || 0);
              const ac = Number(away?.statistics.find((s) => s.type === 'Corner Kicks')?.value || 0);
              const c = hc + ac;
              corners += c;
              if (c > 9.5) over_9_5++;

              const hy = Number(home?.statistics.find((s) => s.type === 'Yellow Cards')?.value || 0);
              const ay = Number(away?.statistics.find((s) => s.type === 'Yellow Cards')?.value || 0);
              const hr = Number(home?.statistics.find((s) => s.type === 'Red Cards')?.value || 0);
              const ar = Number(away?.statistics.find((s) => s.type === 'Red Cards')?.value || 0);
              const cd = hy + ay + hr + ar;
              cards += cd;
              if (cd > 3.5) over_3_5++;

              statsCount++;
            } catch (e) {
              // Skip
            }
          }

          const played = fixtures.length;

          allTeams.push({
            id: teamId,
            team: teamName,
            league: league.name,
            region: league.region,
            played,
            over_2_5_pct: Math.round((over_2_5 / played) * 100),
            over_2_5_count: over_2_5,
            over_9_5_pct: statsCount > 0 ? Math.round((over_9_5 / statsCount) * 100) : 0,
            avg_corners: statsCount > 0 ? (corners / statsCount).toFixed(1) : '0.0',
            over_3_5_pct: statsCount > 0 ? Math.round((over_3_5 / statsCount) * 100) : 0,
            avg_cards: statsCount > 0 ? (cards / statsCount).toFixed(1) : '0.0',
            btts_pct: Math.round((btts / played) * 100),
            avg_gs: (totalGS / played).toFixed(1),
            avg_gc: (totalGC / played).toFixed(1),
          });

          totalTeamsProcessed++;
          console.log(`  ✓ ${teamName}`);
        } catch (e) {
          console.error(`  ✗ Team error: ${e.message}`);
        }
      }

      console.log(`✅ ${league.name} complete`);
    } catch (e) {
      console.error(`❌ League error: ${e.message}`);
    }
  }

  const cachedData = {
    goals: [...allTeams].sort((a, b) => b.over_2_5_pct - a.over_2_5_pct).slice(0, 20),
    corners: [...allTeams].sort((a, b) => b.over_9_5_pct - a.over_9_5_pct).slice(0, 20),
    cards: [...allTeams].sort((a, b) => b.over_3_5_pct - a.over_3_5_pct).slice(0, 20),
    btts: [...allTeams].sort((a, b) => b.btts_pct - a.btts_pct).slice(0, 20),
    timestamp: Date.now(),
    nextRefresh: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  console.log('\n💾 Saving cache to GitHub...');
  await saveCacheToGitHub(cachedData);
  
  const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  
  console.log('\n✅ Cache population complete!');
  console.log(`📊 Processed ${totalTeamsProcessed} teams from ${LEAGUES.length} leagues`);
  console.log(`⏱️  Duration: ${duration} minutes`);
  console.log(`\n🔗 View cache: https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/main/${CACHE_FILE_PATH}`);
}

main().catch(console.error);

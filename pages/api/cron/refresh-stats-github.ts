/**
 * Vercel Cron Job - Daily Stats Refresh at 4 AM UTC
 * Stores cache in GitHub repository (no Vercel KV needed!)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = process.env.VITE_API_FOOTBALL_KEY || '***REMOVED***';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'dannythehat';
const REPO_NAME = 'golden-bet-ai';
const CACHE_FILE_PATH = 'cache/stats-cache.json';

// Top 20 leagues for fast processing
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
  { id: 94, name: 'Primeira Liga', region: 'european' },
  { id: 88, name: 'Eredivisie', region: 'european' },
  { id: 144, name: 'Pro League', region: 'european' },
  { id: 179, name: 'Premiership', region: 'uk' },
  { id: 71, name: 'Série A', region: 'americas' },
  { id: 128, name: 'Liga Profesional', region: 'americas' },
  { id: 262, name: 'Liga MX', region: 'americas' },
  { id: 253, name: 'MLS', region: 'americas' },
  { id: 98, name: 'J1 League', region: 'asia' },
  { id: 307, name: 'Pro League', region: 'asia' },
];

async function apiRequest(endpoint: string, params: Record<string, any> = {}) {
  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
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

async function saveCacheToGitHub(data: any) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${CACHE_FILE_PATH}`;
  
  // Get current file SHA if it exists
  let sha: string | undefined;
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
    // File doesn't exist yet, that's fine
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
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  return await response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Starting stats refresh...');
    const startTime = Date.now();
    
    const season = getCurrentSeason();
    const allTeams: any[] = [];
    let totalTeamsProcessed = 0;
    let totalLeaguesProcessed = 0;

    for (const league of LEAGUES) {
      try {
        console.log(`📊 Processing ${league.name}...`);

        const teams = await apiRequest('/teams', {
          league: league.id,
          season: season,
        });

        for (const teamData of teams.slice(0, 20)) {
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

            fixtures.forEach((f: any) => {
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

                const home = stats.find((s: any) => s.team.id === fixture.teams.home.id);
                const away = stats.find((s: any) => s.team.id === fixture.teams.away.id);

                const hc = Number(home?.statistics.find((s: any) => s.type === 'Corner Kicks')?.value || 0);
                const ac = Number(away?.statistics.find((s: any) => s.type === 'Corner Kicks')?.value || 0);
                const c = hc + ac;
                corners += c;
                if (c > 9.5) over_9_5++;

                const hy = Number(home?.statistics.find((s: any) => s.type === 'Yellow Cards')?.value || 0);
                const ay = Number(away?.statistics.find((s: any) => s.type === 'Yellow Cards')?.value || 0);
                const hr = Number(home?.statistics.find((s: any) => s.type === 'Red Cards')?.value || 0);
                const ar = Number(away?.statistics.find((s: any) => s.type === 'Red Cards')?.value || 0);
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
          } catch (e) {
            console.error(`Team error: ${e instanceof Error ? e.message : 'Unknown'}`);
          }
        }

        totalLeaguesProcessed++;
        console.log(`✅ ${league.name} complete`);
      } catch (e) {
        console.error(`League error: ${e instanceof Error ? e.message : 'Unknown'}`);
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

    await saveCacheToGitHub(cachedData);
    console.log('💾 Cache saved to GitHub');

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    return res.status(200).json({
      success: true,
      message: 'Stats refreshed successfully',
      stats: {
        teamsProcessed: totalTeamsProcessed,
        leaguesProcessed: totalLeaguesProcessed,
        duration: `${duration} minutes`,
        nextRefresh: cachedData.nextRefresh,
      },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      error: 'Failed to refresh stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

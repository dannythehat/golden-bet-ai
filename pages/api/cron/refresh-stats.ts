/**
 * Vercel Cron Job - Daily Stats Refresh at 4 AM UTC
 * Fetches and caches stats from 250+ leagues using Vercel KV
 * 
 * Configure in vercel.json:
 * "crons": [{ "path": "/api/cron/refresh-stats", "schedule": "0 4 * * *" }]
 * 
 * Requires Vercel KV: https://vercel.com/docs/storage/vercel-kv
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kv } from '@vercel/kv';

const API_BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = process.env.VITE_API_FOOTBALL_KEY || '***REMOVED***';
const CACHE_KEY = 'football-stats-cache';

// Simplified league list for faster processing (top leagues only)
// Full 250+ league list can be added once storage is confirmed working
const LEAGUES = [
  // ENGLAND
  { id: 39, name: 'Premier League', region: 'uk' },
  { id: 40, name: 'Championship', region: 'uk' },
  
  // SPAIN
  { id: 140, name: 'La Liga', region: 'european' },
  { id: 141, name: 'Segunda División', region: 'european' },
  
  // GERMANY
  { id: 78, name: 'Bundesliga', region: 'european' },
  { id: 79, name: '2. Bundesliga', region: 'european' },
  
  // ITALY
  { id: 135, name: 'Serie A', region: 'european' },
  { id: 136, name: 'Serie B', region: 'european' },
  
  // FRANCE
  { id: 61, name: 'Ligue 1', region: 'european' },
  { id: 62, name: 'Ligue 2', region: 'european' },
  
  // PORTUGAL
  { id: 94, name: 'Primeira Liga', region: 'european' },
  
  // NETHERLANDS
  { id: 88, name: 'Eredivisie', region: 'european' },
  
  // BELGIUM
  { id: 144, name: 'Pro League', region: 'european' },
  
  // SCOTLAND
  { id: 179, name: 'Premiership', region: 'uk' },
  
  // BRAZIL
  { id: 71, name: 'Série A', region: 'americas' },
  
  // ARGENTINA
  { id: 128, name: 'Liga Profesional', region: 'americas' },
  
  // MEXICO
  { id: 262, name: 'Liga MX', region: 'americas' },
  
  // USA
  { id: 253, name: 'MLS', region: 'americas' },
  
  // JAPAN
  { id: 98, name: 'J1 League', region: 'asia' },
  
  // SOUTH KOREA
  { id: 292, name: 'K League 1', region: 'asia' },
  
  // SAUDI ARABIA
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized access
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

        // Get teams
        const teams = await apiRequest('/teams', {
          league: league.id,
          season: season,
        });

        for (const teamData of teams.slice(0, 20)) { // Limit to top 20 teams per league for now
          try {
            const teamId = teamData.team.id;
            const teamName = teamData.team.name;

            // Get last 20 fixtures
            const fixtures = await apiRequest('/fixtures', {
              team: teamId,
              season: season,
              last: 20,
              status: 'FT',
            });

            if (fixtures.length < 10) continue;

            // Calculate stats
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

            // Get corners/cards from last 5 matches
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
                // Skip fixture stats errors
              }
            }

            const played = fixtures.length;

            allTeams.push({
              id: teamId,
              team: teamName,
              league: league.name,
              region: league.region,
              played,
              
              // Goals
              over_2_5_pct: Math.round((over_2_5 / played) * 100),
              over_2_5_count: over_2_5,
              
              // Corners
              over_9_5_pct: statsCount > 0 ? Math.round((over_9_5 / statsCount) * 100) : 0,
              avg_corners: statsCount > 0 ? (corners / statsCount).toFixed(1) : '0.0',
              
              // Cards
              over_3_5_pct: statsCount > 0 ? Math.round((over_3_5 / statsCount) * 100) : 0,
              avg_cards: statsCount > 0 ? (cards / statsCount).toFixed(1) : '0.0',
              
              // BTTS
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

    // Sort and prepare cached data
    const cachedData = {
      goals: [...allTeams].sort((a, b) => b.over_2_5_pct - a.over_2_5_pct).slice(0, 20),
      corners: [...allTeams].sort((a, b) => b.over_9_5_pct - a.over_9_5_pct).slice(0, 20),
      cards: [...allTeams].sort((a, b) => b.over_3_5_pct - a.over_3_5_pct).slice(0, 20),
      btts: [...allTeams].sort((a, b) => b.btts_pct - a.btts_pct).slice(0, 20),
      timestamp: Date.now(),
      nextRefresh: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    // Store in Vercel KV
    await kv.set(CACHE_KEY, cachedData);
    console.log('💾 Cached data stored in Vercel KV');

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    console.log(`✅ Refresh complete!`);
    console.log(`📊 Processed ${totalTeamsProcessed} teams from ${totalLeaguesProcessed} leagues`);
    console.log(`⏱️  Duration: ${duration} minutes`);

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
    console.error('❌ Cron job error:', error);
    return res.status(500).json({
      error: 'Failed to refresh stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

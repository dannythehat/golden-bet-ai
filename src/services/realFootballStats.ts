/**
 * Real Football Statistics Service
 * Fetches ACTUAL team statistics from API-Football for multiple leagues
 */

import { TeamFormStats, TeamCornerStats, TeamCardStats, TeamBTTSStats, Region } from '@/types/betting';
import { getLeagueStandings, getTeamFixtures, getFixtureStatistics, getCurrentSeason } from './footballApi';
import { MAJOR_LEAGUES } from '@/config/majorLeagues';

interface FormStatsData {
  goals: TeamFormStats[];
  corners: TeamCornerStats[];
  cards: TeamCardStats[];
  btts: TeamBTTSStats[];
}

/**
 * Fetch real statistics for all top leagues
 */
export async function fetchRealFormStats(): Promise<FormStatsData> {
  const season = getCurrentSeason();
  const allGoalStats: TeamFormStats[] = [];
  const allCornerStats: TeamCornerStats[] = [];
  const allCardStats: TeamCardStats[] = [];
  const allBttsStats: TeamBTTSStats[] = [];

  // Fetch data from priority 1 leagues
  const priorityLeagues = MAJOR_LEAGUES.filter(l => l.priority === 1).slice(0, 5);

  for (const league of priorityLeagues) {
    try {
      console.log(`Fetching data for ${league.name}...`);
      
      const standingsData = await getLeagueStandings(league.id, season);
      const standings = standingsData[0]?.league?.standings?.[0] || [];
      
      // Get top 10 teams from each league
      for (const standing of standings.slice(0, 10)) {
        try {
          const fixtures = await getTeamFixtures(standing.team.id, season, 20);
          
          if (fixtures.length > 0) {
            // Calculate goal stats
            let over_0_5 = 0, over_1_5 = 0, over_2_5 = 0, over_3_5 = 0;
            let btts_yes = 0;
            let totalScored = 0, totalConceded = 0;

            fixtures.forEach(fixture => {
              const isHome = fixture.teams.home.id === standing.team.id;
              const homeGoals = fixture.goals.home || 0;
              const awayGoals = fixture.goals.away || 0;
              const totalGoals = homeGoals + awayGoals;

              if (totalGoals > 0.5) over_0_5++;
              if (totalGoals > 1.5) over_1_5++;
              if (totalGoals > 2.5) over_2_5++;
              if (totalGoals > 3.5) over_3_5++;

              if (homeGoals > 0 && awayGoals > 0) btts_yes++;

              if (isHome) {
                totalScored += homeGoals;
                totalConceded += awayGoals;
              } else {
                totalScored += awayGoals;
                totalConceded += homeGoals;
              }
            });

            const played = fixtures.length;

            allGoalStats.push({
              id: String(standing.team.id),
              team: standing.team.name,
              league: league.name,
              region: league.region,
              played,
              over_0_5: Math.round((over_0_5 / played) * 100),
              over_1_5: Math.round((over_1_5 / played) * 100),
              over_2_5: Math.round((over_2_5 / played) * 100),
              over_3_5: Math.round((over_3_5 / played) * 100),
              under_0_5: Math.round(((played - over_0_5) / played) * 100),
              under_1_5: Math.round(((played - over_1_5) / played) * 100),
              under_2_5: Math.round(((played - over_2_5) / played) * 100),
              under_3_5: Math.round(((played - over_3_5) / played) * 100),
            });

            allBttsStats.push({
              id: String(standing.team.id),
              team: standing.team.name,
              league: league.name,
              region: league.region,
              played,
              btts_yes: Math.round((btts_yes / played) * 100),
              btts_no: Math.round(((played - btts_yes) / played) * 100),
              avgGoalsScored: Number((totalScored / played).toFixed(1)),
              avgGoalsConceded: Number((totalConceded / played).toFixed(1)),
            });
          }
        } catch (error) {
          console.error(`Error processing team ${standing.team.name}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error fetching league ${league.name}:`, error);
    }
  }

  // Sort by best percentages
  allGoalStats.sort((a, b) => b.over_2_5 - a.over_2_5);
  allBttsStats.sort((a, b) => b.btts_yes - a.btts_yes);

  return {
    goals: allGoalStats,
    corners: allCornerStats,
    cards: allCardStats,
    btts: allBttsStats,
  };
}

/**
 * Cache the fetched data in localStorage
 */
export function cacheFormStats(data: FormStatsData) {
  localStorage.setItem('formStatsCache', JSON.stringify({
    data,
    timestamp: Date.now(),
  }));
}

/**
 * Get cached data if it's less than 30 minutes old
 */
export function getCachedFormStats(): FormStatsData | null {
  const cached = localStorage.getItem('formStatsCache');
  if (!cached) return null;

  const { data, timestamp } = JSON.parse(cached);
  const age = Date.now() - timestamp;
  const maxAge = 30 * 60 * 1000; // 30 minutes

  if (age < maxAge) {
    return data;
  }

  return null;
}

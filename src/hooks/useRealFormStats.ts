/**
 * React Query hook for fetching REAL football statistics
 * Uses edge function to securely call API-Football
 */

import { useQuery } from '@tanstack/react-query';
import { TeamFormStats, TeamCornerStats, TeamCardStats, TeamBTTSStats, Region } from '@/types/betting';
import { MAJOR_LEAGUES, LeagueConfig } from '@/config/majorLeagues';
import { getLeagueStandings, getTeamFixtures, getFixtureStatistics, getCurrentSeason } from '@/services/footballApi';

interface FormStatsData {
  goals: TeamFormStats[];
  corners: TeamCornerStats[];
  cards: TeamCardStats[];
  btts: TeamBTTSStats[];
}

/**
 * Fetch all real statistics from API-Football
 */
async function fetchAllRealStats(): Promise<FormStatsData> {
  const season = getCurrentSeason();
  const allStats: FormStatsData = {
    goals: [],
    corners: [],
    cards: [],
    btts: [],
  };

  console.log('🔄 Fetching real statistics from API-Football...');

  // Fetch from priority 1 leagues first
  const priorityLeagues = MAJOR_LEAGUES.filter(l => l.priority === 1).slice(0, 8);

  for (const league of priorityLeagues) {
    try {
      console.log(`📊 Fetching ${league.name} (${league.country})...`);
      
      const standingsData = await getLeagueStandings(league.id, season);
      const standings = standingsData[0]?.league?.standings?.[0] || [];

      // Process each team in the standings (top 20)
      for (const standing of standings.slice(0, 20)) {
        const teamId = standing.team.id;
        const teamName = standing.team.name;
        const played = standing.all.played;

        try {
          // Fetch last 20 fixtures for detailed stats
          const fixtures = await getTeamFixtures(teamId, season, 20);

          if (fixtures.length === 0) continue;

          // Calculate goal statistics
          let over_0_5 = 0, over_1_5 = 0, over_2_5 = 0, over_3_5 = 0;
          let btts_yes = 0;
          let totalGoalsScored = 0, totalGoalsConceded = 0;

          fixtures.forEach(fixture => {
            const isHome = fixture.teams.home.id === teamId;
            const homeGoals = fixture.goals.home || 0;
            const awayGoals = fixture.goals.away || 0;
            const totalGoals = homeGoals + awayGoals;

            if (totalGoals > 0.5) over_0_5++;
            if (totalGoals > 1.5) over_1_5++;
            if (totalGoals > 2.5) over_2_5++;
            if (totalGoals > 3.5) over_3_5++;

            if (homeGoals > 0 && awayGoals > 0) btts_yes++;

            if (isHome) {
              totalGoalsScored += homeGoals;
              totalGoalsConceded += awayGoals;
            } else {
              totalGoalsScored += awayGoals;
              totalGoalsConceded += homeGoals;
            }
          });

          const fixtureCount = fixtures.length;

          // Add goal stats
          allStats.goals.push({
            id: String(teamId),
            team: teamName,
            league: league.name,
            region: league.region,
            played: fixtureCount,
            over_0_5: Math.round((over_0_5 / fixtureCount) * 100),
            over_1_5: Math.round((over_1_5 / fixtureCount) * 100),
            over_2_5: Math.round((over_2_5 / fixtureCount) * 100),
            over_3_5: Math.round((over_3_5 / fixtureCount) * 100),
            under_0_5: Math.round(((fixtureCount - over_0_5) / fixtureCount) * 100),
            under_1_5: Math.round(((fixtureCount - over_1_5) / fixtureCount) * 100),
            under_2_5: Math.round(((fixtureCount - over_2_5) / fixtureCount) * 100),
            under_3_5: Math.round(((fixtureCount - over_3_5) / fixtureCount) * 100),
          });

          // Add BTTS stats
          allStats.btts.push({
            id: String(teamId),
            team: teamName,
            league: league.name,
            region: league.region,
            played: fixtureCount,
            btts_yes: Math.round((btts_yes / fixtureCount) * 100),
            btts_no: Math.round(((fixtureCount - btts_yes) / fixtureCount) * 100),
            avgGoalsScored: Number((totalGoalsScored / fixtureCount).toFixed(1)),
            avgGoalsConceded: Number((totalGoalsConceded / fixtureCount).toFixed(1)),
          });

          // Fetch corner and card stats from fixture statistics (sample 5 recent matches)
          let totalCorners = 0, totalCards = 0;
          let over_9_5_corners = 0, over_3_5_cards = 0;
          let statsCount = 0;

          for (const fixture of fixtures.slice(0, 5)) {
            try {
              const statsData = await getFixtureStatistics(fixture.fixture.id);

              const homeStats = statsData.find(s => s.team.id === fixture.teams.home.id);
              const awayStats = statsData.find(s => s.team.id === fixture.teams.away.id);

              // Corners
              const homeCorners = Number(homeStats?.statistics.find(s => s.type === 'Corner Kicks')?.value || 0);
              const awayCorners = Number(awayStats?.statistics.find(s => s.type === 'Corner Kicks')?.value || 0);
              const corners = homeCorners + awayCorners;
              totalCorners += corners;
              if (corners > 9.5) over_9_5_corners++;

              // Cards
              const homeYellow = Number(homeStats?.statistics.find(s => s.type === 'Yellow Cards')?.value || 0);
              const awayYellow = Number(awayStats?.statistics.find(s => s.type === 'Yellow Cards')?.value || 0);
              const homeRed = Number(homeStats?.statistics.find(s => s.type === 'Red Cards')?.value || 0);
              const awayRed = Number(awayStats?.statistics.find(s => s.type === 'Red Cards')?.value || 0);
              const cards = homeYellow + awayYellow + homeRed + awayRed;
              totalCards += cards;
              if (cards > 3.5) over_3_5_cards++;

              statsCount++;
            } catch (error) {
              console.error(`Error fetching fixture stats for ${fixture.fixture.id}:`, error);
            }
          }

          if (statsCount > 0) {
            const avgCorners = Number((totalCorners / statsCount).toFixed(1));
            const avgCards = Number((totalCards / statsCount).toFixed(1));

            // Add corner stats
            allStats.corners.push({
              id: String(teamId),
              team: teamName,
              league: league.name,
              region: league.region,
              played: statsCount,
              over_7_5: Math.round((over_9_5_corners / statsCount) * 100),
              over_8_5: Math.round((over_9_5_corners / statsCount) * 100),
              over_9_5: Math.round((over_9_5_corners / statsCount) * 100),
              over_10_5: Math.round((over_9_5_corners / statsCount) * 80),
              under_7_5: Math.round(((statsCount - over_9_5_corners) / statsCount) * 100),
              under_8_5: Math.round(((statsCount - over_9_5_corners) / statsCount) * 100),
              under_9_5: Math.round(((statsCount - over_9_5_corners) / statsCount) * 100),
              under_10_5: Math.round(((statsCount - over_9_5_corners) / statsCount) * 120),
              avgCorners,
            });

            // Add card stats
            allStats.cards.push({
              id: String(teamId),
              team: teamName,
              league: league.name,
              region: league.region,
              played: statsCount,
              over_2_5: Math.round((over_3_5_cards / statsCount) * 100),
              over_3_5: Math.round((over_3_5_cards / statsCount) * 100),
              over_4_5: Math.round((over_3_5_cards / statsCount) * 80),
              over_5_5: Math.round((over_3_5_cards / statsCount) * 60),
              under_2_5: Math.round(((statsCount - over_3_5_cards) / statsCount) * 100),
              under_3_5: Math.round(((statsCount - over_3_5_cards) / statsCount) * 100),
              under_4_5: Math.round(((statsCount - over_3_5_cards) / statsCount) * 120),
              under_5_5: Math.round(((statsCount - over_3_5_cards) / statsCount) * 140),
              avgCards,
            });
          }
        } catch (error) {
          console.error(`Error processing team ${teamName}:`, error);
        }
      }

      console.log(`✅ ${league.name} complete`);
    } catch (error) {
      console.error(`❌ Error fetching ${league.name}:`, error);
    }
  }

  console.log('✅ All statistics fetched!');
  console.log(`📊 Total teams: ${allStats.goals.length}`);

  return allStats;
}

/**
 * React Query hook to fetch and cache real statistics
 */
export function useRealFormStats() {
  return useQuery<FormStatsData, Error>({
    queryKey: ['real-form-stats'],
    queryFn: fetchAllRealStats,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

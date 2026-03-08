/**
 * React Query hooks for Football API data fetching
 */

import { useQuery } from '@tanstack/react-query';
import {
  getAllLeagues,
  getLeagueTeams,
  getTeamFixtures,
  getFixtureStatistics,
  getCurrentSeason,
} from '@/services/footballApi';
import type { League, Team, Fixture, FixtureStatistics } from '@/types/footballApi';
import type {
  TeamFormStats,
  TeamCornerStats,
  TeamCardStats,
  TeamBTTSStats,
  Region,
} from '@/types/betting';
import { getRegionFromCountry } from '@/lib/apiTransformers';

/**
 * Hook to fetch all available leagues
 */
export function useLeagues(season?: number) {
  return useQuery<League[], Error>({
    queryKey: ['leagues', season || getCurrentSeason()],
    queryFn: () => getAllLeagues(season || getCurrentSeason()),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Hook to fetch teams by league
 */
export function useTeamsByLeague(leagueId: number, season?: number) {
  return useQuery<Team[], Error>({
    queryKey: ['teams', leagueId, season || getCurrentSeason()],
    queryFn: () => getLeagueTeams(leagueId, season || getCurrentSeason()),
    enabled: !!leagueId,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Hook to fetch and transform goal form stats for a league
 */
export function useGoalFormStats(leagueId: number, season?: number) {
  const currentSeason = season || getCurrentSeason();

  return useQuery<TeamFormStats[], Error>({
    queryKey: ['goal-form-stats', leagueId, currentSeason],
    queryFn: async () => {
      const teams = await getLeagueTeams(leagueId, currentSeason);
      const results: TeamFormStats[] = [];

      for (const teamData of teams.slice(0, 20)) {
        try {
          const fixtures = await getTeamFixtures(teamData.team.id, currentSeason, 20);
          
          if (fixtures.length === 0) continue;

          let over_0_5 = 0, over_1_5 = 0, over_2_5 = 0, over_3_5 = 0;

          fixtures.forEach(fixture => {
            const homeGoals = fixture.goals.home || 0;
            const awayGoals = fixture.goals.away || 0;
            const totalGoals = homeGoals + awayGoals;

            if (totalGoals > 0.5) over_0_5++;
            if (totalGoals > 1.5) over_1_5++;
            if (totalGoals > 2.5) over_2_5++;
            if (totalGoals > 3.5) over_3_5++;
          });

          const played = fixtures.length;
          const region = getRegionFromCountry(teamData.team.country);

          results.push({
            id: String(teamData.team.id),
            team: teamData.team.name,
            league: fixtures[0]?.league?.name || 'Unknown',
            region,
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
        } catch (error) {
          console.error(`Error fetching stats for ${teamData.team.name}:`, error);
        }
      }

      return results.sort((a, b) => b.over_2_5 - a.over_2_5);
    },
    enabled: !!leagueId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch and transform corner stats for a league
 */
export function useCornerStats(leagueId: number, season?: number) {
  const currentSeason = season || getCurrentSeason();

  return useQuery<TeamCornerStats[], Error>({
    queryKey: ['corner-stats', leagueId, currentSeason],
    queryFn: async () => {
      const teams = await getLeagueTeams(leagueId, currentSeason);
      const results: TeamCornerStats[] = [];

      for (const teamData of teams.slice(0, 20)) {
        try {
          const fixtures = await getTeamFixtures(teamData.team.id, currentSeason, 10);
          
          if (fixtures.length === 0) continue;

          let totalCorners = 0;
          let over_7_5 = 0, over_8_5 = 0, over_9_5 = 0, over_10_5 = 0;

          for (const fixture of fixtures.slice(0, 5)) {
            try {
              const stats = await getFixtureStatistics(fixture.fixture.id);
              const homeStats = stats.find(s => s.team.id === fixture.teams.home.id);
              const awayStats = stats.find(s => s.team.id === fixture.teams.away.id);

              const homeCorners = Number(homeStats?.statistics.find(s => s.type === 'Corner Kicks')?.value || 0);
              const awayCorners = Number(awayStats?.statistics.find(s => s.type === 'Corner Kicks')?.value || 0);
              const corners = homeCorners + awayCorners;

              totalCorners += corners;
              if (corners > 7.5) over_7_5++;
              if (corners > 8.5) over_8_5++;
              if (corners > 9.5) over_9_5++;
              if (corners > 10.5) over_10_5++;
            } catch (error) {
              console.error(`Error fetching fixture stats:`, error);
            }
          }

          const played = Math.min(fixtures.length, 5);
          const region = getRegionFromCountry(teamData.team.country);

          results.push({
            id: String(teamData.team.id),
            team: teamData.team.name,
            league: fixtures[0]?.league?.name || 'Unknown',
            region,
            played,
            over_7_5: Math.round((over_7_5 / played) * 100),
            over_8_5: Math.round((over_8_5 / played) * 100),
            over_9_5: Math.round((over_9_5 / played) * 100),
            over_10_5: Math.round((over_10_5 / played) * 100),
            under_7_5: Math.round(((played - over_7_5) / played) * 100),
            under_8_5: Math.round(((played - over_8_5) / played) * 100),
            under_9_5: Math.round(((played - over_9_5) / played) * 100),
            under_10_5: Math.round(((played - over_10_5) / played) * 100),
            avgCorners: Number((totalCorners / played).toFixed(1)),
          });
        } catch (error) {
          console.error(`Error fetching corner stats for ${teamData.team.name}:`, error);
        }
      }

      return results.sort((a, b) => b.over_9_5 - a.over_9_5);
    },
    enabled: !!leagueId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch and transform card stats for a league
 */
export function useCardStats(leagueId: number, season?: number) {
  const currentSeason = season || getCurrentSeason();

  return useQuery<TeamCardStats[], Error>({
    queryKey: ['card-stats', leagueId, currentSeason],
    queryFn: async () => {
      const teams = await getLeagueTeams(leagueId, currentSeason);
      const results: TeamCardStats[] = [];

      for (const teamData of teams.slice(0, 20)) {
        try {
          const fixtures = await getTeamFixtures(teamData.team.id, currentSeason, 10);
          
          if (fixtures.length === 0) continue;

          let totalCards = 0;
          let over_2_5 = 0, over_3_5 = 0, over_4_5 = 0, over_5_5 = 0;

          for (const fixture of fixtures.slice(0, 5)) {
            try {
              const stats = await getFixtureStatistics(fixture.fixture.id);
              const homeStats = stats.find(s => s.team.id === fixture.teams.home.id);
              const awayStats = stats.find(s => s.team.id === fixture.teams.away.id);

              const homeYellow = Number(homeStats?.statistics.find(s => s.type === 'Yellow Cards')?.value || 0);
              const awayYellow = Number(awayStats?.statistics.find(s => s.type === 'Yellow Cards')?.value || 0);
              const homeRed = Number(homeStats?.statistics.find(s => s.type === 'Red Cards')?.value || 0);
              const awayRed = Number(awayStats?.statistics.find(s => s.type === 'Red Cards')?.value || 0);
              const cards = homeYellow + awayYellow + homeRed + awayRed;

              totalCards += cards;
              if (cards > 2.5) over_2_5++;
              if (cards > 3.5) over_3_5++;
              if (cards > 4.5) over_4_5++;
              if (cards > 5.5) over_5_5++;
            } catch (error) {
              console.error(`Error fetching fixture stats:`, error);
            }
          }

          const played = Math.min(fixtures.length, 5);
          const region = getRegionFromCountry(teamData.team.country);

          results.push({
            id: String(teamData.team.id),
            team: teamData.team.name,
            league: fixtures[0]?.league?.name || 'Unknown',
            region,
            played,
            over_2_5: Math.round((over_2_5 / played) * 100),
            over_3_5: Math.round((over_3_5 / played) * 100),
            over_4_5: Math.round((over_4_5 / played) * 100),
            over_5_5: Math.round((over_5_5 / played) * 100),
            under_2_5: Math.round(((played - over_2_5) / played) * 100),
            under_3_5: Math.round(((played - over_3_5) / played) * 100),
            under_4_5: Math.round(((played - over_4_5) / played) * 100),
            under_5_5: Math.round(((played - over_5_5) / played) * 100),
            avgCards: Number((totalCards / played).toFixed(1)),
          });
        } catch (error) {
          console.error(`Error fetching card stats for ${teamData.team.name}:`, error);
        }
      }

      return results.sort((a, b) => b.over_3_5 - a.over_3_5);
    },
    enabled: !!leagueId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to fetch and transform BTTS stats for a league
 */
export function useBTTSStats(leagueId: number, season?: number) {
  const currentSeason = season || getCurrentSeason();

  return useQuery<TeamBTTSStats[], Error>({
    queryKey: ['btts-stats', leagueId, currentSeason],
    queryFn: async () => {
      const teams = await getLeagueTeams(leagueId, currentSeason);
      const results: TeamBTTSStats[] = [];

      for (const teamData of teams.slice(0, 20)) {
        try {
          const fixtures = await getTeamFixtures(teamData.team.id, currentSeason, 20);
          
          if (fixtures.length === 0) continue;

          let btts_yes = 0;
          let totalScored = 0, totalConceded = 0;

          fixtures.forEach(fixture => {
            const isHome = fixture.teams.home.id === teamData.team.id;
            const homeGoals = fixture.goals.home || 0;
            const awayGoals = fixture.goals.away || 0;

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
          const region = getRegionFromCountry(teamData.team.country);

          results.push({
            id: String(teamData.team.id),
            team: teamData.team.name,
            league: fixtures[0]?.league?.name || 'Unknown',
            region,
            played,
            btts_yes: Math.round((btts_yes / played) * 100),
            btts_no: Math.round(((played - btts_yes) / played) * 100),
            avgGoalsScored: Number((totalScored / played).toFixed(1)),
            avgGoalsConceded: Number((totalConceded / played).toFixed(1)),
          });
        } catch (error) {
          console.error(`Error fetching BTTS stats for ${teamData.team.name}:`, error);
        }
      }

      return results.sort((a, b) => b.btts_yes - a.btts_yes);
    },
    enabled: !!leagueId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

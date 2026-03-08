/**
 * Football API Service
 * Handles all API calls to API-Football via edge function
 */

import type { League, Team, Fixture, FixtureStatistics, Standing } from "@/types/footballApi";

// Use edge function for API calls
async function makeApiRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
  const queryParams = new URLSearchParams({
    endpoint,
    ...Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>),
  });

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ffonednbxcfhzxardvry';
  const url = `https://${projectId}.supabase.co/functions/v1/football-api?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }

  const responseData = await response.json();
  
  if (responseData.errors && Object.keys(responseData.errors).length > 0) {
    throw new Error(`API error: ${JSON.stringify(responseData.errors)}`);
  }

  return responseData.response as T;
}

/**
 * Get current season year
 */
export function getCurrentSeason(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  // Most leagues start in August, so if before August use previous year
  return month < 7 ? year - 1 : year;
}

/**
 * Get all available leagues for current season
 */
export async function getAllLeagues(season?: number): Promise<League[]> {
  return makeApiRequest<League[]>('/leagues', { season: season || getCurrentSeason() });
}

/**
 * Get teams from a specific league
 */
export async function getLeagueTeams(leagueId: number, season?: number): Promise<Team[]> {
  return makeApiRequest<Team[]>('/teams', { 
    league: leagueId, 
    season: season || getCurrentSeason() 
  });
}

/**
 * Get recent fixtures for a team
 */
export async function getTeamFixtures(teamId: number, season?: number, last: number = 20): Promise<Fixture[]> {
  return makeApiRequest<Fixture[]>('/fixtures', { 
    team: teamId, 
    season: season || getCurrentSeason(), 
    last,
    status: 'FT' // Only finished matches
  });
}

/**
 * Get statistics for a specific fixture
 */
export async function getFixtureStatistics(fixtureId: number): Promise<FixtureStatistics[]> {
  return makeApiRequest<FixtureStatistics[]>('/fixtures/statistics', { fixture: fixtureId });
}

/**
 * Get league standings
 */
export async function getLeagueStandings(leagueId: number, season?: number): Promise<any[]> {
  return makeApiRequest<any[]>('/standings', { 
    league: leagueId, 
    season: season || getCurrentSeason() 
  });
}

/**
 * Get today's fixtures
 */
export async function getTodaysFixtures(): Promise<Fixture[]> {
  const today = new Date().toISOString().split('T')[0];
  return makeApiRequest<Fixture[]>('/fixtures', { date: today });
}

// Re-export types for backwards compatibility
export type { League, Team, Fixture, FixtureStatistics, Standing };

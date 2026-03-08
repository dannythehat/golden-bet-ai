import { useQuery } from '@tanstack/react-query';
import { Region, TeamFormStats, TeamBTTSStats } from '@/types/betting';
import { goalFormStats as fallbackGoals, bttsFormStats as fallbackBtts } from '@/data/formTablesData';

interface APITeamStat {
  id: string;
  team: string;
  league: string;
  region: string;
  played: number;
  over_1_5: number;
  over_2_5: number;
  over_3_5: number;
  under_1_5: number;
  under_2_5: number;
  under_3_5: number;
  btts_yes: number;
  btts_no: number;
  avg_goals: number;
  avg_scored: number;
  avg_conceded: number;
}

interface FormStatsResponse {
  success: boolean;
  stats: APITeamStat[];
  count: number;
  region: string;
  timestamp: string;
}

function mapApiRegion(region: string): Region {
  const regionMap: Record<string, Region> = {
    uk: 'uk',
    european: 'european',
    asia: 'asia',
    americas: 'americas',
  };
  return regionMap[region] || 'all';
}

async function fetchFormStats(region: Region): Promise<{
  goalStats: TeamFormStats[];
  bttsStats: TeamBTTSStats[];
  isFromAPI: boolean;
}> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'ffonednbxcfhzxardvry';
  const apiRegion = region === 'all' ? 'all' : region;
  const url = `https://${projectId}.supabase.co/functions/v1/form-stats?region=${apiRegion}&limit=30`;
  
  console.log('Fetching form stats from:', url);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Form stats API error:', response.status);
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: FormStatsResponse = await response.json();
    
    if (!data.success || !data.stats || data.stats.length === 0) {
      console.log('No form stats returned, using fallback');
      return transformFallback(region);
    }
    
    // Transform API response to our format
    const goalStats: TeamFormStats[] = data.stats.map(stat => ({
      id: stat.id,
      team: stat.team,
      league: stat.league,
      region: mapApiRegion(stat.region),
      played: stat.played,
      over_0_5: 100, // Assume 100% for O0.5
      over_1_5: stat.over_1_5,
      over_2_5: stat.over_2_5,
      over_3_5: stat.over_3_5,
      under_0_5: 0,
      under_1_5: stat.under_1_5,
      under_2_5: stat.under_2_5,
      under_3_5: stat.under_3_5,
    }));
    
    const bttsStats: TeamBTTSStats[] = data.stats.map(stat => ({
      id: stat.id,
      team: stat.team,
      league: stat.league,
      region: mapApiRegion(stat.region),
      played: stat.played,
      btts_yes: stat.btts_yes,
      btts_no: stat.btts_no,
      avgGoalsScored: stat.avg_scored,
      avgGoalsConceded: stat.avg_conceded,
    }));
    
    return { goalStats, bttsStats, isFromAPI: true };
  } catch (error) {
    console.error('Error fetching form stats:', error);
    return transformFallback(region);
  }
}

function transformFallback(region: Region): {
  goalStats: TeamFormStats[];
  bttsStats: TeamBTTSStats[];
  isFromAPI: boolean;
} {
  const filterByRegion = <T extends { region: Region }>(data: T[]): T[] => {
    if (region === 'all') return data;
    return data.filter(item => item.region === region);
  };
  
  return {
    goalStats: filterByRegion(fallbackGoals),
    bttsStats: filterByRegion(fallbackBtts),
    isFromAPI: false,
  };
}

export function useLiveFormStats(region: Region = 'all') {
  const query = useQuery({
    queryKey: ['live-form-stats', region],
    queryFn: () => fetchFormStats(region),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const fallback = transformFallback(region);
  
  return {
    goalStats: query.data?.goalStats || fallback.goalStats,
    bttsStats: query.data?.bttsStats || fallback.bttsStats,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFromAPI: query.data?.isFromAPI || false,
  };
}

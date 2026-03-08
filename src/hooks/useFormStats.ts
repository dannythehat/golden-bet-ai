/**
 * Hook for fetching region-based form stats
 * Uses Supabase when available, falls back to local data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Region } from '@/types/betting';
import { 
  goalFormStats as fallbackGoals, 
  cornerFormStats as fallbackCorners, 
  cardFormStats as fallbackCards, 
  bttsFormStats as fallbackBtts 
} from '@/data/formTablesData';

interface TeamGoalStats {
  id: string;
  team: string;
  league: string;
  region: Region;
  played: number;
  over_1_5: number;
  over_2_5: number;
  over_3_5: number;
  under_1_5: number;
  under_2_5: number;
  under_3_5: number;
}

interface TeamCornerStats {
  id: string;
  team: string;
  league: string;
  region: Region;
  played: number;
  avgCorners: number;
  over_8_5: number;
  over_9_5: number;
  over_10_5: number;
  under_8_5: number;
  under_9_5: number;
  under_10_5: number;
}

interface TeamCardStats {
  id: string;
  team: string;
  league: string;
  region: Region;
  played: number;
  avgCards: number;
  over_2_5: number;
  over_3_5: number;
  over_4_5: number;
  under_2_5: number;
  under_3_5: number;
  under_4_5: number;
}

interface TeamBTTSStats {
  id: string;
  team: string;
  league: string;
  region: Region;
  played: number;
  btts_yes: number;
  btts_no: number;
}

// Map frontend region to database region format
function mapRegion(region: Region): string | null {
  const mapping: Record<Region, string | null> = {
    'uk': 'EUROPE', // UK is part of Europe in the database
    'european': 'EUROPE',
    'asia': 'ASIA',
    'americas': 'AMERICAS',
    'all': null, // null means fetch all
  };
  return mapping[region];
}

// Filter fallback data by region
function filterByRegion<T extends { region: Region }>(data: T[], region: Region): T[] {
  if (region === 'all') return data;
  if (region === 'uk') {
    return data.filter(item => item.region === 'uk');
  }
  if (region === 'european') {
    return data.filter(item => item.region === 'european' || item.region === 'uk');
  }
  return data.filter(item => item.region === region);
}

// Transform fallback goals to expected format
function transformFallbackGoals(data: typeof fallbackGoals, region: Region): TeamGoalStats[] {
  return filterByRegion(data, region).map(team => ({
    id: team.id,
    team: team.team,
    league: team.league,
    region: team.region,
    played: team.played,
    over_1_5: team.over_1_5,
    over_2_5: team.over_2_5,
    over_3_5: team.over_3_5,
    under_1_5: team.under_1_5,
    under_2_5: team.under_2_5,
    under_3_5: team.under_3_5,
  }));
}

// Transform fallback corners to expected format
function transformFallbackCorners(data: typeof fallbackCorners, region: Region): TeamCornerStats[] {
  return filterByRegion(data, region).map(team => ({
    id: team.id,
    team: team.team,
    league: team.league,
    region: team.region,
    played: team.played,
    avgCorners: team.avgCorners,
    over_8_5: team.over_8_5,
    over_9_5: team.over_9_5,
    over_10_5: team.over_10_5,
    under_8_5: team.under_8_5,
    under_9_5: team.under_9_5,
    under_10_5: team.under_10_5,
  }));
}

// Transform fallback cards to expected format  
function transformFallbackCards(data: typeof fallbackCards, region: Region): TeamCardStats[] {
  return filterByRegion(data, region).map(team => ({
    id: team.id,
    team: team.team,
    league: team.league,
    region: team.region,
    played: team.played,
    avgCards: team.avgCards,
    over_2_5: team.over_2_5,
    over_3_5: team.over_3_5,
    over_4_5: team.over_4_5,
    under_2_5: team.under_2_5,
    under_3_5: team.under_3_5,
    under_4_5: team.under_4_5,
  }));
}

// Transform fallback BTTS to expected format
function transformFallbackBTTS(data: typeof fallbackBtts, region: Region): TeamBTTSStats[] {
  return filterByRegion(data, region).map(team => ({
    id: team.id,
    team: team.team,
    league: team.league,
    region: team.region,
    played: team.played,
    btts_yes: team.btts_yes,
    btts_no: team.btts_no,
  }));
}

async function fetchFormStats(region: Region) {
  const dbRegion = mapRegion(region);
  
  try {
    // Try to fetch goals stats from Supabase (with timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    let goalsQuery = supabase
      .from('regional_stats')
      .select('*')
      .eq('category', 'GOALS')
      .eq('market', 'OVER_2_5')
      .order('success_percent', { ascending: false })
      .limit(30);
    
    if (dbRegion) {
      goalsQuery = goalsQuery.eq('region', dbRegion);
    }
    
    const { data: goalsData, error: goalsError } = await goalsQuery;
    clearTimeout(timeoutId);
    
    // If Supabase fails or returns no data, use fallback
    if (goalsError || !goalsData || goalsData.length === 0) {
      console.log('Using fallback data - Supabase unavailable or empty');
      return {
        goalStats: transformFallbackGoals(fallbackGoals, region),
        cornerStats: transformFallbackCorners(fallbackCorners, region),
        cardStats: transformFallbackCards(fallbackCards, region),
        bttsStats: transformFallbackBTTS(fallbackBtts, region),
        isFromCache: true,
      };
    }
    
    // Transform Supabase data to expected format
    const goalStats: TeamGoalStats[] = goalsData.map((row) => ({
      id: row.id,
      team: row.team_name,
      league: row.league_name || 'Unknown League',
      region: region === 'all' ? 'european' : region,
      played: row.matches_sampled,
      over_1_5: Math.min(100, row.success_percent + 15),
      over_2_5: row.success_percent,
      over_3_5: Math.max(0, row.success_percent - 15),
      under_1_5: 100 - Math.min(100, row.success_percent + 15),
      under_2_5: 100 - row.success_percent,
      under_3_5: 100 - Math.max(0, row.success_percent - 15),
    }));

    // Fetch corners stats
    let cornersQuery = supabase
      .from('regional_stats')
      .select('*')
      .eq('category', 'CORNERS')
      .eq('market', 'OVER_9_5')
      .order('success_percent', { ascending: false })
      .limit(30);
    
    if (dbRegion) {
      cornersQuery = cornersQuery.eq('region', dbRegion);
    }
    
    const { data: cornersData } = await cornersQuery;
    
    const cornerStats: TeamCornerStats[] = (cornersData || []).length > 0
      ? cornersData!.map((row) => ({
          id: row.id,
          team: row.team_name,
          league: row.league_name || 'Unknown League',
          region: region === 'all' ? 'european' : region,
          played: row.matches_sampled,
          avgCorners: Number(row.avg_per_game) || 0,
          over_8_5: Math.min(100, row.success_percent + 10),
          over_9_5: row.success_percent,
          over_10_5: Math.max(0, row.success_percent - 10),
          under_8_5: 100 - Math.min(100, row.success_percent + 10),
          under_9_5: 100 - row.success_percent,
          under_10_5: 100 - Math.max(0, row.success_percent - 10),
        }))
      : transformFallbackCorners(fallbackCorners, region);

    // Fetch cards stats
    let cardsQuery = supabase
      .from('regional_stats')
      .select('*')
      .eq('category', 'CARDS')
      .eq('market', 'OVER_3_5')
      .order('success_percent', { ascending: false })
      .limit(30);
    
    if (dbRegion) {
      cardsQuery = cardsQuery.eq('region', dbRegion);
    }
    
    const { data: cardsData } = await cardsQuery;
    
    const cardStats: TeamCardStats[] = (cardsData || []).length > 0
      ? cardsData!.map((row) => ({
          id: row.id,
          team: row.team_name,
          league: row.league_name || 'Unknown League',
          region: region === 'all' ? 'european' : region,
          played: row.matches_sampled,
          avgCards: Number(row.avg_per_game) || 0,
          over_2_5: Math.min(100, row.success_percent + 10),
          over_3_5: row.success_percent,
          over_4_5: Math.max(0, row.success_percent - 10),
          under_2_5: 100 - Math.min(100, row.success_percent + 10),
          under_3_5: 100 - row.success_percent,
          under_4_5: 100 - Math.max(0, row.success_percent - 10),
        }))
      : transformFallbackCards(fallbackCards, region);

    // Fetch BTTS stats
    let bttsQuery = supabase
      .from('regional_stats')
      .select('*')
      .eq('category', 'BTTS')
      .order('success_percent', { ascending: false })
      .limit(30);
    
    if (dbRegion) {
      bttsQuery = bttsQuery.eq('region', dbRegion);
    }
    
    const { data: bttsData } = await bttsQuery;
    
    const bttsStats: TeamBTTSStats[] = (bttsData || []).length > 0
      ? bttsData!.map((row) => ({
          id: row.id,
          team: row.team_name,
          league: row.league_name || 'Unknown League',
          region: region === 'all' ? 'european' : region,
          played: row.matches_sampled,
          btts_yes: row.success_percent,
          btts_no: 100 - row.success_percent,
        }))
      : transformFallbackBTTS(fallbackBtts, region);

    return { goalStats, cornerStats, cardStats, bttsStats, isFromCache: false };
  } catch (error) {
    console.warn('Supabase fetch failed, using fallback data:', error);
    return {
      goalStats: transformFallbackGoals(fallbackGoals, region),
      cornerStats: transformFallbackCorners(fallbackCorners, region),
      cardStats: transformFallbackCards(fallbackCards, region),
      bttsStats: transformFallbackBTTS(fallbackBtts, region),
      isFromCache: true,
    };
  }
}

export function useFormStats(region: Region) {
  const query = useQuery({
    queryKey: ['formStats', region],
    queryFn: () => fetchFormStats(region),
    staleTime: 1000 * 60 * 60, // 1 hour cache
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
    retry: 1, // Only retry once on failure
    retryDelay: 1000,
  });

  return {
    goalStats: query.data?.goalStats || transformFallbackGoals(fallbackGoals, region),
    cornerStats: query.data?.cornerStats || transformFallbackCorners(fallbackCorners, region),
    cardStats: query.data?.cardStats || transformFallbackCards(fallbackCards, region),
    bttsStats: query.data?.bttsStats || transformFallbackBTTS(fallbackBtts, region),
    isLoading: query.isLoading,
    isError: query.isError,
    isFromCache: query.data?.isFromCache ?? true,
    refetch: query.refetch,
  };
}

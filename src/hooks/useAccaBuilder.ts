/**
 * Hook for ACCA of the Day feature
 * Fetches daily accumulator from form table teams
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getEffectiveBetDate, isBeforeRefresh } from '@/lib/betDate';

export interface AccaSelection {
  teamName: string;
  league: string;
  market: string;
  marketLabel: string;
  successPercent: number;
  opposition: string;
  oppositionStats: number | null;
  kickoff: string;
  isHome: boolean;
  gafferComment?: string;
}

export interface AccaResult {
  teamName: string;
  opposition?: string;
  league?: string;
  market: string;
  marketLabel?: string;
  isHome?: boolean;
  hit: boolean;
  score?: string;
  fixtureId?: string;
}

export interface DailyAcca {
  id: string;
  prediction_date: string;
  selections: AccaSelection[];
  combined_odds: number;
  average_confidence: number;
  selection_count: number;
  gaffer_reasoning: string;
  stake: number;
  status: 'pending' | 'won' | 'lost';
  results: AccaResult[] | null;
  legs_won: number | null;
  legs_lost: number | null;
  profit_loss: number | null;
  created_at: string;
  settled_at: string | null;
}

export interface AccaStats {
  totalAccas: number;
  wins: number;
  losses: number;
  winRate: number;
  totalStaked: number;
  totalReturns: number;
  netProfit: number;
  roi: number;
}

async function fetchTodaysAcca(): Promise<{ acca: DailyAcca | null; noAcca: boolean; message?: string; candidates?: AccaSelection[]; showingYesterday?: boolean }> {
  const today = getEffectiveBetDate();
  const showingYesterday = isBeforeRefresh();
  
  // First check if we have an ACCA in the database
  const { data: existingAcca, error } = await supabase
    .from('acca_history')
    .select('*')
    .eq('prediction_date', today)
    .single();

  if (existingAcca && !error) {
    return { 
      acca: {
        ...existingAcca,
        selections: existingAcca.selections as unknown as AccaSelection[],
        results: existingAcca.results as unknown as AccaResult[] | null,
        status: existingAcca.status as 'pending' | 'won' | 'lost',
      }, 
      noAcca: false 
    };
  }

  // Before 6 AM: don't invoke edge function, just return DB data (or empty)
  if (showingYesterday) {
    return { acca: null, noAcca: true, message: "Today's ACCA will be ready at 6 AM UTC.", showingYesterday: true };
  }

  // If no ACCA exists, try to generate one
  try {
    const response = await supabase.functions.invoke('acca-builder', {
      method: 'POST',
    });

    if (response.error) {
      console.error('ACCA builder error:', response.error);
      return { acca: null, noAcca: true, message: 'Unable to generate ACCA at this time.' };
    }

    const data = response.data;
    
    if (data.noAcca) {
      return { 
        acca: null, 
        noAcca: true, 
        message: data.message,
        candidates: data.candidates,
      };
    }

    if (data.acca) {
      return { 
        acca: {
          ...data.acca,
          selections: data.acca.selections as unknown as AccaSelection[],
          results: data.acca.results as unknown as AccaResult[] | null,
          status: data.acca.status as 'pending' | 'won' | 'lost',
        }, 
        noAcca: false 
      };
    }

    return { acca: null, noAcca: true, message: 'No ACCA available today.' };
  } catch (err) {
    console.error('Error invoking acca-builder:', err);
    return { acca: null, noAcca: true, message: 'Unable to generate ACCA at this time.' };
  }
}

async function fetchAccaHistory(): Promise<DailyAcca[]> {
  const { data, error } = await supabase
    .from('acca_history')
    .select('*')
    .in('status', ['won', 'lost'])
    .not('profit_loss', 'is', null)
    .order('settled_at', { ascending: false });

  if (error) {
    console.error('Error fetching ACCA history:', error);
    return [];
  }

  return (data || []).map(acca => ({
    ...acca,
    selections: acca.selections as unknown as AccaSelection[],
    results: acca.results as unknown as AccaResult[] | null,
    status: acca.status as 'pending' | 'won' | 'lost',
  }));
}

function calculateAccaStats(accas: DailyAcca[]): AccaStats {
  if (accas.length === 0) {
    return {
      totalAccas: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalStaked: 0,
      totalReturns: 0,
      netProfit: 0,
      roi: 0,
    };
  }

  const wins = accas.filter(a => a.status === 'won').length;
  const losses = accas.filter(a => a.status === 'lost').length;
  const totalStaked = accas.reduce((sum, a) => sum + (a.stake || 10), 0);
  const netProfit = accas.reduce((sum, a) => sum + (a.profit_loss || 0), 0);
  const totalReturns = totalStaked + netProfit;

  return {
    totalAccas: accas.length,
    wins,
    losses,
    winRate: accas.length > 0 ? Math.round((wins / accas.length) * 100) : 0,
    totalStaked,
    totalReturns,
    netProfit,
    roi: totalStaked > 0 ? Math.round((netProfit / totalStaked) * 100) : 0,
  };
}

export function useAccaBuilder() {
  const effectiveDate = getEffectiveBetDate();

  const todaysAccaQuery = useQuery({
    queryKey: ['todays-acca', effectiveDate],
    queryFn: fetchTodaysAcca,
    staleTime: 1000 * 60 * 5, // 5 min — refresh periodically for settlement updates
    gcTime: 1000 * 60 * 60, // Keep cached for 1 hour
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const accaHistoryQuery = useQuery({
    queryKey: ['acca-history'],
    queryFn: fetchAccaHistory,
    staleTime: 1000 * 60 * 60, // 1 hour for history
  });

  const stats = calculateAccaStats(accaHistoryQuery.data || []);

  return {
    todaysAcca: todaysAccaQuery.data?.acca || null,
    noAcca: todaysAccaQuery.data?.noAcca || false,
    noAccaMessage: todaysAccaQuery.data?.message,
    partialCandidates: todaysAccaQuery.data?.candidates,
    accaHistory: accaHistoryQuery.data || [],
    stats,
    isLoading: todaysAccaQuery.isLoading,
    isError: todaysAccaQuery.isError,
    refetch: todaysAccaQuery.refetch,
  };
}

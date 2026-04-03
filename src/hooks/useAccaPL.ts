import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { SINGLE_BET_STAKE, calculateFixedStakeProfit } from '@/lib/plModel';

export interface AccaSettled {
  id: string;
  prediction_date: string;
  selections: Json;
  combined_odds: number;
  selection_count: number;
  stake: number;
  status: string;
  profit_loss: number;
  legs_won: number | null;
  legs_lost: number | null;
  settled_at: string | null;
  gaffer_reasoning: string;
  proof_screenshot_url?: string | null;
}

export interface AccaPLStats {
  totalBets: number;
  wins: number;
  losses: number;
  totalStaked: number;
  netProfit: number;
  roi: number;
}

function calcStats(bets: AccaSettled[]): AccaPLStats {
  const resolved = bets.filter((bet) => bet.status === 'won' || bet.status === 'lost');
  const wins = resolved.filter((bet) => bet.status === 'won').length;
  const losses = resolved.filter((bet) => bet.status === 'lost').length;
  const totalStaked = resolved.length * SINGLE_BET_STAKE;
  const netProfit = resolved.reduce((sum, bet) => sum + (bet.profit_loss || 0), 0);

  return {
    totalBets: wins + losses,
    wins,
    losses,
    totalStaked,
    netProfit,
    roi: totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0,
  };
}

async function fetchAccaPL() {
  const { data, error } = await supabase
    .from('acca_history')
    .select('*')
    .in('status', ['won', 'lost'])
    .order('settled_at', { ascending: false });

  if (error) throw error;
  const bets = ((data || []) as AccaSettled[]).map((bet) => {
    const combinedOdds = Number(bet.combined_odds ?? 1);

    return {
      ...bet,
      combined_odds: combinedOdds,
      stake: SINGLE_BET_STAKE,
      profit_loss: calculateFixedStakeProfit(bet.status, combinedOdds, SINGLE_BET_STAKE),
    };
  });

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const startOfWeek = new Date(now);
  const dow = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (dow === 0 ? 6 : dow - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const since = (d: Date) => bets.filter(b => new Date(b.prediction_date + 'T00:00:00') >= d);

  return {
    bets,
    stats: {
      yesterday: calcStats(bets.filter(b => b.prediction_date === yesterdayStr)),
      weekly: calcStats(since(startOfWeek)),
      monthly: calcStats(since(startOfMonth)),
      yearly: calcStats(since(startOfYear)),
      allTime: calcStats(bets),
    },
  };
}

export function useAccaPL() {
  const query = useQuery({
    queryKey: ['pl-acca'],
    queryFn: fetchAccaPL,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const empty: AccaPLStats = { totalBets: 0, wins: 0, losses: 0, totalStaked: 0, netProfit: 0, roi: 0 };

  return {
    bets: query.data?.bets || [],
    stats: query.data?.stats || { weekly: empty, monthly: empty, yearly: empty, allTime: empty },
    isLoading: query.isLoading,
  };
}

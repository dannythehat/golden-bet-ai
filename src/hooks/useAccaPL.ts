import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

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
  const wins = bets.filter(b => b.status === 'won').length;
  const losses = bets.filter(b => b.status === 'lost').length;
  const totalStaked = bets.reduce((sum, b) => sum + (b.stake || 10), 0);
  const netProfit = bets.reduce((sum, b) => sum + (b.profit_loss || 0), 0);
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
  const bets = (data || []) as AccaSettled[];

  const now = new Date();
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

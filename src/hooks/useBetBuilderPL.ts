import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BetBuilderSettled {
  id: string;
  fixture_id: string;
  prediction_date: string;
  home_team: string;
  away_team: string;
  league: string;
  markets: string[];
  average_confidence: number;
  combined_odds: number;
  gaffer_reasoning: string;
  stake: number;
  status: string;
  result: string | null;
  actual_goals_home: number | null;
  actual_goals_away: number | null;
  actual_corners: number | null;
  actual_cards: number | null;
  profit_loss: number;
  kickoff: string;
  settled_at: string;
  proof_screenshot_url?: string | null;
  proof_captured_at?: string | null;
}

export interface BetBuilderPLStats {
  totalBets: number;
  wins: number;
  losses: number;
  totalStaked: number;
  netProfit: number;
  roi: number;
}

function calcStats(bets: BetBuilderSettled[]): BetBuilderPLStats {
  const wins = bets.filter(b => b.status === 'won').length;
  const losses = bets.filter(b => b.status === 'lost').length;
  const totalStaked = bets.reduce((sum, b) => sum + (b.stake || 10), 0);
  const netProfit = bets.reduce((sum, b) => {
    if (b.status === 'won') return sum + ((b.stake || 10) * b.combined_odds - (b.stake || 10));
    if (b.status === 'lost') return sum - (b.stake || 10);
    return sum;
  }, 0);
  return {
    totalBets: wins + losses,
    wins,
    losses,
    totalStaked,
    netProfit,
    roi: totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0,
  };
}

async function fetchBetBuilderPL() {
  const { data, error } = await supabase
    .from('bet_builder_history')
    .select('*')
    .in('status', ['won', 'lost'])
    .not('result', 'is', null)
    .order('settled_at', { ascending: false });

  if (error) throw error;
  const bets = (data || []) as BetBuilderSettled[];

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

export function useBetBuilderPL() {
  const query = useQuery({
    queryKey: ['pl-bet-builder'],
    queryFn: fetchBetBuilderPL,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const empty: BetBuilderPLStats = { totalBets: 0, wins: 0, losses: 0, totalStaked: 0, netProfit: 0, roi: 0 };

  return {
    bets: query.data?.bets || [],
    stats: query.data?.stats || { weekly: empty, monthly: empty, yearly: empty, allTime: empty },
    isLoading: query.isLoading,
  };
}

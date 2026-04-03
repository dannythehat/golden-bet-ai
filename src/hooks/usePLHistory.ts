import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calcComboPL, marketCategory } from '@/lib/plModel';

export type SettlementStatus = 'won' | 'lost' | 'void';

export interface SettledBet {
  id: string;
  fixture_id: string;
  prediction_date: string;
  home_team: string;
  away_team: string;
  league: string;
  market: string;
  ml_confidence: number;
  value_edge: number;
  gaffer_reasoning: string;
  bookmaker_odds: number;
  stake: number;
  status: SettlementStatus;
  result: string;
  actual_goals_home: number;
  actual_goals_away: number;
  profit_loss: number;
  kickoff: string;
  settled_at: string;
  proof_screenshot_url?: string | null;
  proof_captured_at?: string | null;
}

export interface PLStats {
  totalBets: number;
  wins: number;
  losses: number;
  voids: number;
  winRate: number;
  totalStaked: number;
  totalReturns: number;
  netProfit: number;
  roi: number;
}

export interface DailyGroup {
  date: string;
  bets: SettledBet[];
  wins: number;
  losses: number;
  voids: number;
  totalStaked: number;
  netProfit: number;
}

export interface MarketPLStats {
  goals: PLStats;
  corners: PLStats;
  cards: PLStats;
}

/**
 * Calculate combo P&L for a set of bets, grouped by date AND market category.
 * This correctly produces 3 doubles + 1 treble per market per day.
 */
function calcMarketComboPL(bets: SettledBet[]): PLStats {
  // Group by date + market category
  const groups = new Map<string, SettledBet[]>();
  for (const bet of bets) {
    const cat = marketCategory(bet.market);
    if (!cat) continue;
    const key = `${bet.prediction_date}|${cat}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(bet);
  }

  let totalWins = 0, totalLosses = 0, totalVoids = 0, totalStaked = 0, netProfit = 0;
  for (const [, picks] of groups) {
    const day = calcComboPL(picks);
    totalWins += day.wins;
    totalLosses += day.losses;
    totalVoids += day.voids;
    totalStaked += day.totalStaked;
    netProfit += day.netProfit;
  }

  const resolved = totalWins + totalLosses;
  return {
    totalBets: resolved,
    wins: totalWins,
    losses: totalLosses,
    voids: totalVoids,
    winRate: resolved > 0 ? (totalWins / resolved) * 100 : 0,
    totalStaked,
    totalReturns: totalStaked + netProfit,
    netProfit,
    roi: totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0,
  };
}

/** Calculate combo P&L for a single market category */
function calcSingleMarketComboPL(bets: SettledBet[], cat: 'goals' | 'corners' | 'cards'): PLStats {
  const filtered = bets.filter(b => marketCategory(b.market) === cat);
  // Group by date
  const groups = new Map<string, SettledBet[]>();
  for (const bet of filtered) {
    if (!groups.has(bet.prediction_date)) groups.set(bet.prediction_date, []);
    groups.get(bet.prediction_date)!.push(bet);
  }

  let totalWins = 0, totalLosses = 0, totalVoids = 0, totalStaked = 0, netProfit = 0;
  for (const [, picks] of groups) {
    const day = calcComboPL(picks);
    totalWins += day.wins;
    totalLosses += day.losses;
    totalVoids += day.voids;
    totalStaked += day.totalStaked;
    netProfit += day.netProfit;
  }

  const resolved = totalWins + totalLosses;
  return {
    totalBets: resolved,
    wins: totalWins,
    losses: totalLosses,
    voids: totalVoids,
    winRate: resolved > 0 ? (totalWins / resolved) * 100 : 0,
    totalStaked,
    totalReturns: totalStaked + netProfit,
    netProfit,
    roi: totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0,
  };
}

async function fetchPLHistory() {
  const { data, error } = await supabase
    .from('golden_bet_history')
    .select('*')
    .in('status', ['won', 'lost', 'void'])
    .not('result', 'is', null)
    .order('settled_at', { ascending: false });

  if (error) throw error;
  const settledBets = ((data || []) as SettledBet[]).map((bet) => ({
    ...bet,
    bookmaker_odds: Number(bet.bookmaker_odds ?? 1),
    stake: Number(bet.stake ?? 0),
    profit_loss: Number(bet.profit_loss ?? 0),
  }));

  // Group by date for display
  const dateMap = new Map<string, SettledBet[]>();
  for (const bet of settledBets) {
    if (!dateMap.has(bet.prediction_date)) dateMap.set(bet.prediction_date, []);
    dateMap.get(bet.prediction_date)!.push(bet);
  }

  const byDate: DailyGroup[] = Array.from(dateMap.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([date, bets]) => {
      // Calculate per-market combo P&L for this day
      const dayStats = calcMarketComboPL(bets);
      return {
        date,
        bets,
        wins: dayStats.wins,
        losses: dayStats.losses,
        voids: dayStats.voids,
        totalStaked: dayStats.totalStaked,
        netProfit: dayStats.netProfit,
      };
    });

  // Period boundaries
  const now = new Date();
  const startOfWeek = new Date(now);
  const dow = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (dow === 0 ? 6 : dow - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const filterByDate = (since: Date) =>
    settledBets.filter(b => new Date(b.prediction_date + 'T00:00:00') >= since);

  const calcMarketBreakdown = (bets: SettledBet[]): MarketPLStats => ({
    goals: calcSingleMarketComboPL(bets, 'goals'),
    corners: calcSingleMarketComboPL(bets, 'corners'),
    cards: calcSingleMarketComboPL(bets, 'cards'),
  });

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayBets = settledBets.filter(b => b.prediction_date === yesterdayStr);
  const yesterdayPL = calcMarketComboPL(yesterdayBets);

  // Last month
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const lastMonthBets = settledBets.filter(b => {
    const d = new Date(b.prediction_date + 'T00:00:00');
    return d >= lastMonthStart && d <= lastMonthEnd;
  });
  const lastMonthPL = calcMarketComboPL(lastMonthBets);

  return {
    settledBets,
    byDate,
    stats: {
      weekly: calcMarketComboPL(filterByDate(startOfWeek)),
      monthly: calcMarketComboPL(filterByDate(startOfMonth)),
      yearly: calcMarketComboPL(filterByDate(startOfYear)),
      allTime: calcMarketComboPL(settledBets),
    },
    marketStats: {
      yesterday: calcMarketBreakdown(yesterdayBets),
      weekly: calcMarketBreakdown(filterByDate(startOfWeek)),
      monthly: calcMarketBreakdown(filterByDate(startOfMonth)),
      yearly: calcMarketBreakdown(filterByDate(startOfYear)),
      allTime: calcMarketBreakdown(settledBets),
    },
    yesterdayStats: {
      date: yesterdayStr,
      ...yesterdayPL,
      marketBreakdown: calcMarketBreakdown(yesterdayBets),
    },
    lastMonthStats: {
      monthName: lastMonthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      totalProfit: lastMonthPL.netProfit,
      totalBets: lastMonthPL.totalBets,
      wins: lastMonthPL.wins,
      losses: lastMonthPL.losses,
      roi: lastMonthPL.roi,
      totalStaked: lastMonthPL.totalStaked,
    },
  };
}

export function usePLHistory() {
  const query = useQuery({
    queryKey: ['pl-history-golden'],
    queryFn: fetchPLHistory,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 1000 * 60 * 5,
  });

  const emptyStats: PLStats = {
    totalBets: 0, wins: 0, losses: 0, winRate: 0, voids: 0,
    totalStaked: 0, totalReturns: 0, netProfit: 0, roi: 0,
  };
  const emptyMarketStats: MarketPLStats = { goals: emptyStats, corners: emptyStats, cards: emptyStats };

  return {
    settledBets: query.data?.settledBets || [],
    byDate: query.data?.byDate || [],
    stats: query.data?.stats || { weekly: emptyStats, monthly: emptyStats, yearly: emptyStats, allTime: emptyStats },
    marketStats: query.data?.marketStats || { yesterday: emptyMarketStats, weekly: emptyMarketStats, monthly: emptyMarketStats, yearly: emptyMarketStats, allTime: emptyMarketStats },
    yesterdayStats: query.data?.yesterdayStats || { date: '', totalBets: 0, wins: 0, losses: 0, voids: 0, winRate: 0, totalStaked: 0, totalReturns: 0, netProfit: 0, roi: 0, marketBreakdown: emptyMarketStats },
    lastMonthStats: query.data?.lastMonthStats || { monthName: '', totalProfit: 0, totalBets: 0, wins: 0, losses: 0, roi: 0, totalStaked: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export { marketCategory, calcComboPL } from '@/lib/plModel';

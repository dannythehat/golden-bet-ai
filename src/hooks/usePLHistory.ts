import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

/** Map any raw market key to one of: goals, corners, cards */
function marketCategory(raw: string): 'goals' | 'corners' | 'cards' | null {
  const m = raw.toLowerCase().replace(/[.\s]/g, '_');
  if (m.includes('goal') || m === 'btts') return 'goals';
  if (m.includes('corner')) return 'corners';
  if (m.includes('card')) return 'cards';
  return null;
}

const STAKE = 2;

/**
 * Calculate P&L for a set of 3 picks played as 3 doubles + 1 treble at £2 each.
 * If fewer than 3 picks, falls back gracefully.
 */
function calcComboPL(picks: SettledBet[]): { wins: number; losses: number; voids: number; totalStaked: number; netProfit: number } {
  const valid = picks.slice(0, 3);
  if (valid.length === 0) return { wins: 0, losses: 0, voids: 0, totalStaked: 0, netProfit: 0 };

  // Build all combo legs: doubles + treble
  const combos: SettledBet[][] = [];
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      combos.push([valid[i], valid[j]]);
    }
  }
  if (valid.length >= 3) {
    combos.push(valid.slice(0, 3));
  }

  let wins = 0, losses = 0, totalStaked = 0, netProfit = 0;
  for (const legs of combos) {
    const nonVoid = legs.filter(b => b.status !== 'void');
    totalStaked += STAKE;
    if (nonVoid.length === 0) {
      // all void — stake returned
    } else if (nonVoid.every(b => b.status === 'won')) {
      const combinedOdds = nonVoid.reduce((acc, b) => acc * b.bookmaker_odds, 1);
      wins++;
      netProfit += (STAKE * combinedOdds) - STAKE;
    } else {
      losses++;
      netProfit -= STAKE;
    }
  }

  const voids = valid.filter(b => b.status === 'void').length;
  return { wins, losses, voids, totalStaked, netProfit };
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
  const settledBets = (data || []) as SettledBet[];

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
      weekly: calcMarketBreakdown(filterByDate(startOfWeek)),
      monthly: calcMarketBreakdown(filterByDate(startOfMonth)),
      yearly: calcMarketBreakdown(filterByDate(startOfYear)),
      allTime: calcMarketBreakdown(settledBets),
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
    marketStats: query.data?.marketStats || { weekly: emptyMarketStats, monthly: emptyMarketStats, yearly: emptyMarketStats, allTime: emptyMarketStats },
    lastMonthStats: query.data?.lastMonthStats || { monthName: '', totalProfit: 0, totalBets: 0, wins: 0, losses: 0, roi: 0, totalStaked: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

// Re-export for use in PLSection combo display
export { marketCategory, calcComboPL };

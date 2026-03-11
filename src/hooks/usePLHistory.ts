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

export interface LastMonthStats {
  monthName: string;
  totalProfit: number;
  totalBets: number;
  wins: number;
  losses: number;
  roi: number;
  totalStaked: number;
}

/**
 * P&L for a single day's 3 Golden Bets, played as:
 *  - 3 doubles (Corners+Goals, Corners+Cards, Goals+Cards) — £10 each
 *  - 1 treble (all three) — £10
 * Total daily stake: £40
 */
function calcDoublesAndTreblePL(bets: SettledBet[]): {
  wins: number; losses: number; voids: number; totalStaked: number; netProfit: number;
} {
  const stake = 2;

  // We always expect exactly 3 bets (Corners / Goals / Cards).
  // Order in DB: highest ml_confidence first (or insertion order from ML pipeline).
  const picks = bets.slice(0, 3);
  const voidCount = bets.filter(b => b.status === 'void').length;

  if (picks.length < 2) {
    // Fallback: just single P&L
    const wins = picks.filter(b => b.status === 'won').length;
    const losses = picks.filter(b => b.status === 'lost').length;
    const totalStaked = picks.filter(b => b.status !== 'void').length * stake;
    const netProfit = picks.reduce((sum, b) =>
      sum + (b.status === 'won' ? (stake * b.bookmaker_odds) - stake : b.status === 'lost' ? -stake : 0), 0);
    return { wins, losses, voids: voidCount, totalStaked, netProfit };
  }

  // Build doubles + treble combos
  const combos: SettledBet[][] = [];

  for (let i = 0; i < picks.length; i++) {
    for (let j = i + 1; j < picks.length; j++) {
      combos.push([picks[i], picks[j]]);
    }
  }
  if (picks.length >= 3) {
    combos.push(picks.slice(0, 3));
  }

  let wins = 0, losses = 0, totalStaked = 0, netProfit = 0;

  for (const legs of combos) {
    const nonVoid = legs.filter(b => b.status !== 'void');
    totalStaked += stake;

    if (nonVoid.length === 0) {
      // All void — stake returned
      netProfit += 0;
    } else if (nonVoid.every(b => b.status === 'won')) {
      const combinedOdds = nonVoid.reduce((acc, b) => acc * b.bookmaker_odds, 1);
      wins++;
      netProfit += (stake * combinedOdds) - stake;
    } else {
      losses++;
      netProfit -= stake;
    }
  }

  return { wins, losses, voids: voidCount, totalStaked, netProfit };
}

function calcGoldenStats(bets: SettledBet[]): PLStats {
  // Group by date + market so each market's 3 picks get their own doubles+treble calc
  const groupKey = (b: SettledBet) => `${b.prediction_date}|${b.market}`;
  const groupMap = new Map<string, SettledBet[]>();
  for (const bet of bets) {
    const key = groupKey(bet);
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(bet);
  }

  let totalWins = 0, totalLosses = 0, totalVoids = 0, totalStaked = 0, netProfit = 0;

  for (const [, marketDayBets] of groupMap) {
    const day = calcDoublesAndTreblePL(marketDayBets);
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
/**
 * Flat-stake P&L: each bet is a £10 single. Used for per-market breakdown.
 */
function calcFlatStakePL(bets: SettledBet[]): PLStats {
  const stake = 10;
  let wins = 0, losses = 0, voids = 0, totalStaked = 0, netProfit = 0;

  for (const bet of bets) {
    if (bet.status === 'void') {
      voids++;
      continue;
    }
    totalStaked += stake;
    if (bet.status === 'won') {
      wins++;
      netProfit += (stake * bet.bookmaker_odds) - stake;
    } else {
      losses++;
      netProfit -= stake;
    }
  }

  const resolved = wins + losses;
  return {
    totalBets: resolved,
    wins,
    losses,
    voids,
    winRate: resolved > 0 ? (wins / resolved) * 100 : 0,
    totalStaked,
    totalReturns: totalStaked + netProfit,
    netProfit,
    roi: totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0,
  };
}

/** Filter bets by market category */
function filterByMarket(bets: SettledBet[], marketKey: string): SettledBet[] {
  return bets.filter(b => {
    const m = b.market.toLowerCase().replace(/[.\s]/g, '_');
    return m.includes(marketKey);
  });
}

export interface MarketPLStats {
  goals: PLStats;
  corners: PLStats;
  cards: PLStats;
}

async function fetchPLHistory(): Promise<{
  settledBets: SettledBet[];
  byDate: DailyGroup[];
  stats: Record<'weekly' | 'monthly' | 'yearly' | 'allTime', PLStats>;
  marketStats: Record<'weekly' | 'monthly' | 'yearly' | 'allTime', MarketPLStats>;
  lastMonthStats: LastMonthStats;
}> {
  const { data: goldenBetsData, error: goldenError } = await supabase
    .from('golden_bet_history')
    .select('*')
    .in('status', ['won', 'lost', 'void'])
    .not('result', 'is', null)
    .order('settled_at', { ascending: false });

  if (goldenError) {
    console.error('Error fetching P&L history:', goldenError);
    throw goldenError;
  }

  const settledBets = (goldenBetsData || []) as SettledBet[];

  // Group by date for display, but calc P&L per date+market
  const dateMap = new Map<string, SettledBet[]>();
  for (const bet of settledBets) {
    const date = bet.prediction_date;
    if (!dateMap.has(date)) dateMap.set(date, []);
    dateMap.get(date)!.push(bet);
  }

  const byDate: DailyGroup[] = Array.from(dateMap.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([date, bets]) => {
      // Doubles + treble P&L per day (grouped by market)
      const dayPL = calcGoldenStats(bets);
      return {
        date,
        bets,
        wins: dayPL.wins,
        losses: dayPL.losses,
        voids: dayPL.voids,
        totalStaked: dayPL.totalStaked,
        netProfit: dayPL.netProfit,
      };
    });

  // Period boundaries
  const now = new Date();

  const startOfWeek = new Date(now);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  startOfYear.setHours(0, 0, 0, 0);

  const filterByDate = (since: Date) =>
    settledBets.filter(b => new Date(b.prediction_date + 'T00:00:00') >= since);

  const calcMarketStats = (bets: SettledBet[]): MarketPLStats => ({
    goals: calcGoldenStats(filterByMarket(bets, 'goal')),
    corners: calcGoldenStats(filterByMarket(bets, 'corner')),
    cards: calcGoldenStats(filterByMarket(bets, 'card')),
  });

  // Last month stats
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  lastMonthStart.setHours(0, 0, 0, 0);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  lastMonthEnd.setHours(23, 59, 59, 999);

  const lastMonthBets = settledBets.filter(b => {
    const d = new Date(b.prediction_date + 'T00:00:00');
    return d >= lastMonthStart && d <= lastMonthEnd;
  });

  const lastMonthBetsStats = calcGoldenStats(lastMonthBets);

  const lastMonthStats: LastMonthStats = {
    monthName: lastMonthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    totalProfit: lastMonthBetsStats.netProfit,
    totalBets: lastMonthBetsStats.totalBets,
    wins: lastMonthBetsStats.wins,
    losses: lastMonthBetsStats.losses,
    roi: lastMonthBetsStats.roi,
    totalStaked: lastMonthBetsStats.totalStaked,
  };

  return {
    settledBets,
    byDate,
    stats: {
      weekly: calcGoldenStats(filterByDate(startOfWeek)),
      monthly: calcGoldenStats(filterByDate(startOfMonth)),
      yearly: calcGoldenStats(filterByDate(startOfYear)),
      allTime: calcGoldenStats(settledBets),
    },
    marketStats: {
      weekly: calcMarketStats(filterByDate(startOfWeek)),
      monthly: calcMarketStats(filterByDate(startOfMonth)),
      yearly: calcMarketStats(filterByDate(startOfYear)),
      allTime: calcMarketStats(settledBets),
    },
    lastMonthStats,
  };
}

export function usePLHistory() {
  const query = useQuery({
    queryKey: ['pl-history-golden'],
    queryFn: fetchPLHistory,
    staleTime: 1000 * 60 * 5, // 5 min — reduce DB pressure
    gcTime: 1000 * 60 * 30,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 1000 * 60 * 5, // 5 min
  });

  const emptyStats: PLStats = {
    totalBets: 0, wins: 0, losses: 0, winRate: 0,
    voids: 0,
    totalStaked: 0, totalReturns: 0, netProfit: 0, roi: 0,
  };

  const emptyMarketStats: MarketPLStats = {
    goals: emptyStats,
    corners: emptyStats,
    cards: emptyStats,
  };

  return {
    settledBets: query.data?.settledBets || [],
    byDate: query.data?.byDate || [],
    stats: query.data?.stats || {
      weekly: emptyStats,
      monthly: emptyStats,
      yearly: emptyStats,
      allTime: emptyStats,
    },
    marketStats: query.data?.marketStats || {
      weekly: emptyMarketStats,
      monthly: emptyMarketStats,
      yearly: emptyMarketStats,
      allTime: emptyMarketStats,
    },
    lastMonthStats: query.data?.lastMonthStats || {
      monthName: '',
      totalProfit: 0,
      totalBets: 0,
      wins: 0,
      losses: 0,
      roi: 0,
      totalStaked: 0,
    },
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

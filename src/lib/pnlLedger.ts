import ledgerRaw from '@/data/pnlLedger.json';

// ── The settled-bet ledger — the single source of truth for the P&L ──────────
export type LedgerLeg = {
  home: string; away: string; region?: string; league?: string;
  selection: string; odds: number; ft?: string; result: 'won' | 'lost' | string;
};
export type LedgerBet = {
  date: string; kind: string; stake: number; combinedOdds: number;
  status: 'won' | 'lost' | string; returns: number; profit: number; legs: LedgerLeg[];
  verdict?: string; // the Gaffer's stored word on that day (frozen at settle time)
};

/** Group settled bets by date, newest day first. */
export function groupByDate(bets: LedgerBet[]): { date: string; bets: LedgerBet[] }[] {
  const map = new Map<string, LedgerBet[]>();
  for (const b of bets) (map.get(b.date) ?? map.set(b.date, []).get(b.date)!).push(b);
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({ date, bets: list }));
}

/** Settled bets, newest first. */
export function getLedgerBets(): LedgerBet[] {
  const bets = ((ledgerRaw as { bets?: LedgerBet[] }).bets ?? []).filter(
    (b) => b.status === 'won' || b.status === 'lost',
  );
  return [...bets].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export type Range = 'week' | 'month' | 'year' | 'all';

/** Filter bets to a rolling time window ending now. */
export function filterByRange(bets: LedgerBet[], range: Range, nowMs: number): LedgerBet[] {
  if (range === 'all') return bets;
  const now = new Date(nowMs);
  const start = new Date(now);
  if (range === 'week') start.setDate(now.getDate() - 7);
  else if (range === 'month') start.setMonth(now.getMonth() - 1);
  else start.setFullYear(now.getFullYear() - 1);
  const startMs = start.getTime();
  return bets.filter((b) => new Date(b.date + 'T12:00:00').getTime() >= startMs);
}

export type Summary = {
  profit: number; roi: number; wins: number; losses: number;
  strikeRate: number; staked: number; returned: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function summarize(bets: LedgerBet[]): Summary {
  let staked = 0, profit = 0, wins = 0, losses = 0;
  for (const b of bets) {
    staked += b.stake; profit += b.profit;
    if (b.status === 'won') wins += 1; else if (b.status === 'lost') losses += 1;
  }
  const games = wins + losses;
  return {
    profit: r2(profit),
    roi: staked > 0 ? r2((profit / staked) * 100) : 0,
    wins, losses,
    strikeRate: games ? Math.round((wins / games) * 100) : 0,
    staked: r2(staked), returned: r2(staked + profit),
  };
}

/** Latest settled date as an ISO string, for "last updated". */
export function latestSettledISO(bets: LedgerBet[]): string | null {
  let latest = 0;
  for (const b of bets) {
    const t = new Date(b.date + 'T12:00:00').getTime();
    if (Number.isFinite(t) && t > latest) latest = t;
  }
  return latest > 0 ? new Date(latest).toISOString() : null;
}

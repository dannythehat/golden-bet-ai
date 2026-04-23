export type PLMarketCategory = 'goals' | 'corners' | 'cards';
export type PLSettlementStatus = 'won' | 'lost' | 'void';

export const COMBO_BET_STAKE = 2.5;
export const COMBO_BETS_PER_MARKET = 4;
export const MARKET_DAILY_STAKE = COMBO_BET_STAKE * COMBO_BETS_PER_MARKET;
export const SINGLE_BET_STAKE = 10;

export function normaliseMarket(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[.\s-]+/g, '_')
    .replace(/__+/g, '_');
}

export function marketCategory(raw: string): PLMarketCategory | null {
  const market = normaliseMarket(raw);

  if (market.includes('goal')) return 'goals';
  if (market.includes('corner')) return 'corners';
  if (market.includes('card')) return 'cards';

  return null;
}

export function buildComboLegs<T>(picks: T[]): T[][] {
  const valid = picks.slice(0, 3);
  const combos: T[][] = [];

  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      combos.push([valid[i], valid[j]]);
    }
  }

  if (valid.length >= 3) {
    combos.push(valid.slice(0, 3));
  }

  return combos;
}

export function settleComboLegs<T extends { status: PLSettlementStatus; bookmaker_odds: number | null | undefined }>(
  legs: T[],
  stake = COMBO_BET_STAKE,
) {
  const nonVoid = legs.filter((leg) => leg.status !== 'void');

  if (nonVoid.length === 0) {
    return { outcome: 'void' as const, combinedOdds: 1, profit: 0 };
  }

  if (nonVoid.some((leg) => leg.status === 'lost')) {
    const combinedOdds = nonVoid.reduce((acc, leg) => acc * Number(leg.bookmaker_odds ?? 1), 1);
    return { outcome: 'lost' as const, combinedOdds, profit: -stake };
  }

  const combinedOdds = nonVoid.reduce((acc, leg) => acc * Number(leg.bookmaker_odds ?? 1), 1);
  return {
    outcome: 'won' as const,
    combinedOdds,
    profit: (stake * combinedOdds) - stake,
  };
}

export function calcComboPL<T extends { status: PLSettlementStatus; bookmaker_odds: number | null | undefined }>(
  picks: T[],
  stake = COMBO_BET_STAKE,
) {
  const valid = picks.slice(0, 3);
  const combos = buildComboLegs(valid);

  if (valid.length === 0 || combos.length === 0) {
    return { wins: 0, losses: 0, voids: 0, totalStaked: 0, netProfit: 0 };
  }

  let wins = 0;
  let losses = 0;
  let totalStaked = 0;
  let netProfit = 0;

  for (const combo of combos) {
    const result = settleComboLegs(combo, stake);
    totalStaked += stake;

    if (result.outcome === 'won') wins += 1;
    if (result.outcome === 'lost') losses += 1;

    netProfit += result.profit;
  }

  const voids = valid.filter((pick) => pick.status === 'void').length;

  return { wins, losses, voids, totalStaked, netProfit };
}

export function calculateFixedStakeProfit(
  status: string,
  odds: number | null | undefined,
  stake = SINGLE_BET_STAKE,
) {
  if (status === 'won') {
    return (stake * Number(odds ?? 1)) - stake;
  }

  if (status === 'lost') {
    return -stake;
  }

  return 0;
}
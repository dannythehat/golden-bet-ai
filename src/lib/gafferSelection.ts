/**
 * The Gaffer's daily selection — derived from the form-table signals.
 *
 * The ENGINE picks the value (objective). The Gaffer Engine owns the WORDING:
 * `placeholderReason` carries his real voice (gafferReason) — a fresh, anti-repeat
 * read assembled from the phrase banks, never a fixed sentence. Staking model:
 * £10 per bet; if two picks qualify they combine into a £10 DOUBLE, else a £10 SINGLE.
 */
import raw from '@/data/formTablesData.json';
import type { FormFixtureRow, FormValueCell } from '@/types/footy';
import { gafferReason } from '@/lib/gafferVoice';

const DATA = raw as unknown as { fixtures: FormFixtureRow[] };
export const STAKE = 10;

export interface Leg {
  fixtureId: string;
  home: { name: string; short: string; logo: string | null };
  away: { name: string; short: string; logo: string | null };
  region: string; league: string; time: string;
  market: 'Goals' | 'Corners' | 'BTTS';
  selection: string;      // 'Over 9.5 Corners'
  odds: number;
  prob: number;           // form %
  edge: number;
  flag: 'strong' | 'value';
  placeholderReason: string;
}

export type DailyBet =
  | { type: 'double'; legs: [Leg, Leg]; combinedOdds: number; stake: number; returns: number }
  | { type: 'single'; legs: [Leg]; combinedOdds: number; stake: number; returns: number }
  | { type: 'none'; legs: [] };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** All qualifying value picks across markets, best edge first. */
export function getGafferPicks(): Leg[] {
  const legs: Leg[] = [];
  const add = (f: FormFixtureRow, market: Leg['market'], selection: string, cell: FormValueCell | null) => {
    if (!cell?.flag || !cell.odds) return;
    const base = {
      fixtureId: f.id, home: f.home, away: f.away, region: f.region, league: f.league, time: f.time,
      market, selection, odds: cell.odds, prob: cell.prob, edge: cell.edge, flag: cell.flag,
    };
    legs.push({
      ...base,
      placeholderReason: gafferReason(
        {
          team: base.home.name, opp: base.away.name, market: base.market,
          selection: base.selection, odds: base.odds, pct: base.prob,
          edge: base.edge, tier: base.flag,
        },
        base.fixtureId,
      ),
    });
  };
  for (const f of DATA.fixtures) {
    add(f, 'Corners', 'Over 9.5 Corners', f.value.corners['9.5']);
    add(f, 'Goals', 'Over 2.5 Goals', f.value.goals['2.5']);
    add(f, 'BTTS', 'BTTS – Yes', f.value.btts);
  }
  // one leg per fixture (best), then best edges overall
  const bestPerFixture = new Map<string, Leg>();
  for (const l of legs.sort((a, b) => b.edge - a.edge)) {
    if (!bestPerFixture.has(l.fixtureId)) bestPerFixture.set(l.fixtureId, l);
  }
  return [...bestPerFixture.values()].sort((a, b) => b.edge - a.edge);
}

/** The day's bet: £10 double if 2 qualify, else £10 single, else none. */
export function getDailyBet(picks: Leg[] = getGafferPicks()): DailyBet {
  if (picks.length >= 2) {
    const legs: [Leg, Leg] = [picks[0], picks[1]];
    const combinedOdds = round2(legs[0].odds * legs[1].odds);
    return { type: 'double', legs, combinedOdds, stake: STAKE, returns: round2(STAKE * combinedOdds) };
  }
  if (picks.length === 1) {
    const combinedOdds = round2(picks[0].odds);
    return { type: 'single', legs: [picks[0]], combinedOdds, stake: STAKE, returns: round2(STAKE * combinedOdds) };
  }
  return { type: 'none', legs: [] };
}

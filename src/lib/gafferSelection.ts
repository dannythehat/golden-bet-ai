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

/** Today's UK date (YYYY-MM-DD) — the Gaffer only picks from today's card. */
const todayUK = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

/** The bundled fixtures store kick-off as a UK (Europe/London) wall-clock time.
 *  Turn a date + "HH:MM" into an absolute epoch (ms) so it can be shown in the
 *  viewer's own timezone and compared to "now" correctly anywhere. */
const ukWallToMs = (dateStr: string, timeStr: string): number | null => {
  const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
  const tm = /^(\d{1,2}):(\d{2})/.exec(timeStr || '');
  if (!dm || !tm) return null;
  const y = +dm[1], mo = +dm[2] - 1, d = +dm[3], h = +tm[1], mi = +tm[2];
  const utcGuess = Date.UTC(y, mo, d, h, mi);
  // Offset of Europe/London at that instant (handles BST/GMT automatically).
  const asUK = new Date(new Date(utcGuess).toLocaleString('en-US', { timeZone: 'Europe/London' })).getTime();
  const asUTC = new Date(new Date(utcGuess).toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  return utcGuess - (asUK - asUTC);
};

/** Kick-off shown in the viewer's own timezone, e.g. "19:00". */
const localKO = (ms: number | null, fallback: string): string =>
  ms == null ? fallback : new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export interface Leg {
  fixtureId: string;
  home: { name: string; short: string; logo: string | null };
  away: { name: string; short: string; logo: string | null };
  region: string; league: string; time: string;
  // Absolute kickoff (epoch ms) when known — lets us show the time in the
  // viewer's own timezone and detect live/ended correctly anywhere in the world.
  kickoffMs?: number | null;
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
  const today = todayUK();
  for (const f of DATA.fixtures) {
    if (f.date !== today) continue; // today's card only — no games today → no picks
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

/**
 * Best-value fixtures for today, one leg per fixture, best edge first —
 * regardless of whether they cleared the value flag. Used as the board's
 * fallback "value watch" (shown but NOT tips) when there's no official pick.
 */
export function getValueFixtures(): Leg[] {
  const makeLeg = (f: FormFixtureRow, market: Leg['market'], selection: string, cell: FormValueCell): Leg => ({
    fixtureId: f.id, home: f.home, away: f.away, region: f.region, league: f.league, time: f.time,
    market, selection, odds: cell.odds!, prob: cell.prob, edge: cell.edge, flag: cell.flag ?? 'value',
    placeholderReason: gafferReason(
      { team: f.home.name, opp: f.away.name, market, selection, odds: cell.odds!, pct: cell.prob, edge: cell.edge, tier: cell.flag ?? 'value' },
      f.id,
    ),
  });
  const today = todayUK();
  const best: Leg[] = [];
  for (const f of DATA.fixtures) {
    if (f.date !== today) continue;
    const cands: Leg[] = [];
    for (const [mk, cell] of Object.entries(f.value.corners ?? {})) if (cell?.odds) cands.push(makeLeg(f, 'Corners', `Over ${mk} Corners`, cell));
    for (const [mk, cell] of Object.entries(f.value.goals ?? {})) if (cell?.odds) cands.push(makeLeg(f, 'Goals', `Over ${mk} Goals`, cell));
    if (f.value.btts?.odds) cands.push(makeLeg(f, 'BTTS', 'BTTS – Yes', f.value.btts));
    // Best sensible value on this fixture — decent price, form behind it.
    const pick = cands.filter((c) => c.odds >= 1.4 && c.prob >= 60).sort((a, b) => b.edge - a.edge)[0];
    if (pick) best.push(pick);
  }
  return best.sort((a, b) => b.edge - a.edge);
}

/**
 * Every qualifying value leg today across ALL markets (not deduped to one per
 * fixture), best edge first. Used to assemble a market-diverse treble so it
 * isn't three of the same market when other markets have value too.
 */
export function getValueCandidates(): Leg[] {
  const makeLeg = (f: FormFixtureRow, market: Leg['market'], selection: string, cell: FormValueCell): Leg => {
    const koMs = ukWallToMs(f.date, f.time);
    return {
      fixtureId: f.id, home: f.home, away: f.away, region: f.region, league: f.league,
      time: localKO(koMs, f.time), kickoffMs: koMs,
      market, selection, odds: cell.odds!, prob: cell.prob, edge: cell.edge, flag: cell.flag ?? 'value',
      placeholderReason: gafferReason(
        { team: f.home.name, opp: f.away.name, market, selection, odds: cell.odds!, pct: cell.prob, edge: cell.edge, tier: cell.flag ?? 'value' },
        f.id,
      ),
    };
  };
  const today = todayUK();
  const out: Leg[] = [];
  const ok = (c: FormValueCell | null | undefined) => !!c?.odds && c.odds >= 1.4 && c.prob >= 60;
  for (const f of DATA.fixtures) {
    if (f.date !== today) continue;
    for (const [mk, cell] of Object.entries(f.value.corners ?? {})) if (ok(cell)) out.push(makeLeg(f, 'Corners', `Over ${mk} Corners`, cell!));
    for (const [mk, cell] of Object.entries(f.value.goals ?? {})) if (ok(cell)) out.push(makeLeg(f, 'Goals', `Over ${mk} Goals`, cell!));
    if (ok(f.value.btts)) out.push(makeLeg(f, 'BTTS', 'BTTS – Yes', f.value.btts!));
  }
  return out.sort((a, b) => b.edge - a.edge);
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

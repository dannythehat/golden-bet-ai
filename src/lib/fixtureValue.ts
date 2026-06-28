// Frontend mirror of the Gaffer value brain (supabase/functions/_shared/
// gafferEngine.ts) — keep the thresholds in sync. Used to highlight value
// fixtures + show the per-market comparison in the Today's Fixtures view.
import type { Fixture } from "@/data/todaysFixturesSample";

export const MIN_FORM = 60;
export const MIN_ODDS = 1.5;
export const MIN_EDGE = 10;

export interface MarketSignal {
  market: string;
  homePct: number;
  awayPct: number;
  formProb: number;   // blended %
  odds: number;
  impliedProb: number;
  edge: number;
  isValue: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Score every priced market on a fixture (blend both teams' form vs the price). */
export function marketSignals(fx: Fixture): MarketSignal[] {
  const out: MarketSignal[] = [];
  for (const [market, odds] of Object.entries(fx.odds)) {
    const h = fx.home.over[market];
    const a = fx.away.over[market];
    if (h == null || a == null) continue;
    const formProb = round1((h + a) / 2);
    const impliedProb = round1(100 / odds);
    const edge = round1(formProb - impliedProb);
    const isValue = formProb >= MIN_FORM && odds >= MIN_ODDS && edge >= MIN_EDGE;
    out.push({ market, homePct: h, awayPct: a, formProb, odds, impliedProb, edge, isValue });
  }
  return out.sort((x, y) => y.edge - x.edge);
}

/** The Gaffer's best value market on this fixture, if any. */
export function bestValue(fx: Fixture): MarketSignal | null {
  const v = marketSignals(fx).filter((s) => s.isValue);
  return v.length ? v[0] : null;
}

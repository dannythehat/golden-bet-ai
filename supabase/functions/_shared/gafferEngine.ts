// ============================================================================
// Footy Oracle — THE GAFFER'S VALUE BRAIN
// Form gives the probability. Odds give the price. Value is the gap.
// He only swings when the gap is real — and picks 1, max 2, a day.
// Pure + deterministic + fully explainable (no ML, no black box).
// ============================================================================

export interface TeamForm {
  /** last-10 hit-rate per market label, 0–100 (e.g. "Over 2.5 Goals" -> 78). */
  overPct: Record<string, number>;
  avgGoals: number;
  avgCorners: number;
  avgCards: number;
}

export interface Fixture {
  fixtureId: string | number;
  league: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  home: TeamForm;
  away: TeamForm;
  /** decimal odds keyed by the SAME market labels as overPct. Only priced markets included. */
  odds: Record<string, number>;
}

export interface Candidate {
  fixtureId: string | number;
  league: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  market: string;
  formProb: number;     // %
  impliedProb: number;  // %
  edge: number;         // formProb - impliedProb, in points
  odds: number;
  avgLine: number;      // the relevant combined average (for the "why")
}

export interface DailySelection {
  betType: "none" | "single" | "double";
  stake: number;
  legs: Candidate[];
  combinedOdds: number;
  potentialReturn: number;
  reasoning: string;
}

// ── Guardrails (tuneable) ───────────────────────────────────────────────────
export const THRESHOLDS = {
  MIN_FORM: 60,   // form must say it's genuinely likely
  MIN_ODDS: 1.5,  // no skinny, no-value prices
  MIN_EDGE: 10,   // form must beat the bookies by this many points
  STAKE: 10,      // £10 a bet
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function category(market: string): "goals" | "corners" | "cards" | "btts" {
  const m = market.toLowerCase();
  if (m.includes("corner")) return "corners";
  if (m.includes("card")) return "cards";
  if (m.includes("btts")) return "btts";
  return "goals";
}

/** Combined form probability for a market = blend of both teams' last-10 hit-rate. */
export function formProbability(fx: Fixture, market: string): number | null {
  const h = fx.home.overPct[market];
  const a = fx.away.overPct[market];
  if (h == null || a == null) return null;
  return round1((h + a) / 2);
}

function relevantAvg(fx: Fixture, market: string): number {
  const c = category(market);
  const k = c === "corners" ? "avgCorners" : c === "cards" ? "avgCards" : "avgGoals";
  return round1((fx.home[k] + fx.away[k]) / 2);
}

/** Score every priced market on every fixture and return the ones that clear the guardrails. */
export function findValue(fixtures: Fixture[], t = THRESHOLDS): Candidate[] {
  const out: Candidate[] = [];
  for (const fx of fixtures) {
    for (const [market, odds] of Object.entries(fx.odds)) {
      if (!odds || odds < t.MIN_ODDS) continue;           // unpriced or too skinny
      const formProb = formProbability(fx, market);
      if (formProb == null || formProb < t.MIN_FORM) continue;
      const impliedProb = round1(100 / odds);
      const edge = round1(formProb - impliedProb);
      if (edge < t.MIN_EDGE) continue;                    // no real value
      out.push({
        fixtureId: fx.fixtureId, league: fx.league, kickoff: fx.kickoff,
        homeTeam: fx.homeTeam, awayTeam: fx.awayTeam, market,
        formProb, impliedProb, edge, odds, avgLine: relevantAvg(fx, market),
      });
    }
  }
  // Best value first; tie-break on raw form strength.
  return out.sort((a, b) => b.edge - a.edge || b.formProb - a.formProb);
}

// ── The Gaffer's voice (deterministic template — LLM can enrich later) ──────
function legLine(c: Candidate): string {
  const unit = category(c.market) === "btts" ? "" : ` (avg ${c.avgLine})`;
  return `${c.market} — ${c.homeTeam} v ${c.awayTeam}${unit}: my numbers say ${c.formProb}%, ` +
    `bookies have it at ${c.odds.toFixed(2)} (${c.impliedProb}%). ${c.edge} points of value.`;
}

function rationale(betType: "single" | "double", legs: Candidate[], combined: number, stake: number): string {
  if (betType === "single") {
    const c = legs[0];
    return `Today's play: ${legLine(c)} Anyone can back a 1.01 shot — this is where the bookies are asleep. £${stake} on it.`;
  }
  return `Two value plays today, so it's a double:\n` +
    `• ${legLine(legs[0])}\n• ${legLine(legs[1])}\n` +
    `Combined ${combined.toFixed(2)} — £${stake} returns £${(combined * stake).toFixed(2)}. Both have to land, but both are value.`;
}

/**
 * The Gaffer's daily decision: pick the best 1–2 value plays.
 * Two qualify -> a double (legs must be from different fixtures).
 */
export function selectDailyPicks(fixtures: Fixture[], t = THRESHOLDS): DailySelection {
  const value = findValue(fixtures, t);
  if (value.length === 0) {
    return {
      betType: "none", stake: 0, legs: [], combinedOdds: 0, potentialReturn: 0,
      reasoning: "Nothing worth backing today — no game clears the value bar. The Gaffer's keeping his money in his pocket. That's a discipline, not a day off.",
    };
  }

  const best = value[0];
  const second = value.find((c) => c.fixtureId !== best.fixtureId); // double legs from different games

  if (second) {
    const legs = [best, second];
    const combinedOdds = round1(best.odds * second.odds);
    return {
      betType: "double", stake: t.STAKE, legs, combinedOdds,
      potentialReturn: round1(combinedOdds * t.STAKE),
      reasoning: rationale("double", legs, combinedOdds, t.STAKE),
    };
  }

  return {
    betType: "single", stake: t.STAKE, legs: [best], combinedOdds: best.odds,
    potentialReturn: round1(best.odds * t.STAKE),
    reasoning: rationale("single", [best], best.odds, t.STAKE),
  };
}

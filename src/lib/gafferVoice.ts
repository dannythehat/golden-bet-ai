/**
 * THE GAFFER — voice engine.
 *
 * Turns the structured football signals (from the engine) into a FRESH line of
 * the Gaffer's banter every time. He never reads a fixed sentence: each line is
 * assembled from the phrase banks (src/data/gaffer/phraseLibrary.ts) and an
 * anti-repeat memory ensures nothing recently used comes back round.
 *
 * Architecture (locked): football engine → signals → Gaffer voice → fresh words.
 * The signals are objective and mine; the WORDING is the Gaffer's. See
 * docs/gaffer/03_LANGUAGE.md, 04_HUMOUR.md, 10_PHRASE_MEMORY.md.
 */
import {
  OPENERS, MARKET_FLAVOUR, VERDICT_STRONG, VERDICT_VALUE, EDGE_PHRASES,
  HEDGES, SIGN_OFFS, ASIDES, NO_BET, DONKEY_ROASTS, nickname,
} from '../data/gaffer/phraseLibrary';

export type Market = 'Corners' | 'Goals' | 'Cards' | 'BTTS';

export interface PickSignals {
  team: string;
  opp: string;
  market: Market;
  selection: string;     // 'Over 9.5 Corners'
  mark?: string;          // '9.5'
  odds: number;
  pct: number;           // form %
  edge: number;
  streak: number;
  tier: 'strong' | 'value';
}

/* ── Deterministic-but-varied RNG (so a given seed is reproducible) ───────── */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ── Anti-repeat memory: never reuse a bank entry while it's "recent" ─────── */
const recent = new Map<string, number[]>();
function pick<T>(bank: T[], key: string, rng: () => number): T {
  if (bank.length === 0) return undefined as unknown as T;
  const seen = recent.get(key) ?? [];
  const cap = Math.max(1, Math.floor(bank.length * 0.6)); // remember ~60% of the bank
  let idx = Math.floor(rng() * bank.length);
  let guard = 0;
  while (seen.includes(idx) && guard++ < bank.length * 2) idx = Math.floor(rng() * bank.length);
  seen.push(idx);
  while (seen.length > cap) seen.shift();
  recent.set(key, seen);
  return bank[idx];
}

const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? String(v[k]) : `{${k}}`));

/**
 * Build the Gaffer's line for a value pick. Pass a unique `seed` (e.g. fixtureId
 * + date) so the same pick is stable, but different picks/days never collide.
 * `flavourful` adds a banter aside ~half the time.
 */
export function gafferPickLine(s: PickSignals, seed = '', flavourful = true): string {
  const rng = mulberry32(seedOf(`${s.team}|${s.opp}|${s.market}|${seed}`));
  const vars = {
    team: s.team, opp: s.opp,
    teamNick: nickname(s.team, Math.floor(rng() * 4)),
    oppNick: nickname(s.opp, Math.floor(rng() * 4)),
    market: s.market, mark: s.mark ?? '', odds: s.odds.toFixed(2),
    pct: Math.round(s.pct), edge: `+${Math.round(s.edge)}`, streak: `${s.streak}`,
  };

  const verdictBank = s.tier === 'strong' ? VERDICT_STRONG : VERDICT_VALUE;
  const parts = [
    pick(OPENERS, 'opener', rng),
    pick(MARKET_FLAVOUR[s.market] ?? MARKET_FLAVOUR.Goals, `flavour:${s.market}`, rng),
    pick(EDGE_PHRASES, 'edge', rng),
    pick(verdictBank, `verdict:${s.tier}`, rng),
  ];
  if (flavourful && rng() > 0.5) parts.push(pick(ASIDES, 'aside', rng));
  parts.push(pick(HEDGES, 'hedge', rng));
  parts.push(pick(SIGN_OFFS, 'signoff', rng));

  return parts.map((p) => fill(p, vars)).join(' ');
}

/** A fresh "no value today" line. */
export function gafferNoBetLine(seed = ''): string {
  const rng = mulberry32(seedOf(`nobet|${seed}`));
  return pick(NO_BET, 'nobet', rng);
}

/** A fresh Donkey-of-the-Week roast. */
export function gafferDonkeyLine(seed = ''): string {
  const rng = mulberry32(seedOf(`donkey|${seed}`));
  return pick(DONKEY_ROASTS, 'donkey', rng);
}

/** Test helper — clears the anti-repeat memory. */
export function _resetGafferMemory() { recent.clear(); }

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
  EVIDENCE_COMBO, EVIDENCE_HITS,
} from '../data/gaffer/phraseLibrary';
import {
  DAY_OPENERS, DAY_PERFECT, DAY_WIN, DAY_MIXED, DAY_ALL_LOST,
  WIN_LEG, LOSS_LEG, DAY_CLOSERS,
} from '../data/gaffer/dayVerdict';

export type Market = 'Corners' | 'Goals' | 'Cards' | 'BTTS';

/** The concrete facts behind a pick — same fuel the results write-up runs on. */
export interface PickEvidence {
  hits: number;           // times the exact line landed across both teams' recent games
  total: number;          // games counted
  homeAvg?: number | null; // per-game metric average in the home side's recent games
  awayAvg?: number | null;
  unit?: string;           // 'goals' | 'corners' | 'cards'
}

export interface PickSignals {
  team: string;
  opp: string;
  market: Market;
  selection: string;     // 'Over 9.5 Corners'
  mark?: string;          // '9.5'
  odds: number;
  pct: number;           // form %
  edge: number;
  streak?: number;       // current run in the market (optional)
  tier: 'strong' | 'value';
  evidence?: PickEvidence; // when present, the read quotes the real numbers
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

const varsFor = (s: PickSignals, rng: () => number) => ({
  team: s.team, opp: s.opp,
  teamNick: nickname(s.team, Math.floor(rng() * 4)),
  oppNick: nickname(s.opp, Math.floor(rng() * 4)),
  market: s.market, mark: s.mark ?? '', odds: s.odds.toFixed(2),
  pct: Math.round(s.pct), edge: `+${Math.round(s.edge)}`, streak: `${s.streak ?? 0}`,
});

// Only use streak-flavoured edge phrases when there's a real streak to mention.
const edgeBankFor = (s: PickSignals) =>
  s.streak && s.streak > 0 ? EDGE_PHRASES : EDGE_PHRASES.filter((e) => !e.includes('{streak}'));

const verdictBankFor = (s: PickSignals) => (s.tier === 'strong' ? VERDICT_STRONG : VERDICT_VALUE);

/**
 * Full Gaffer pick line — opener → read → value → verdict → (aside) → hedge →
 * sign-off. Pass a unique `seed` (e.g. fixtureId + date) so the same pick is
 * stable, but different picks/days never collide.
 */
export function gafferPickLine(s: PickSignals, seed = '', flavourful = true): string {
  const rng = mulberry32(seedOf(`${s.team}|${s.opp}|${s.market}|${seed}`));
  const vars = varsFor(s, rng);
  const parts = [
    pick(OPENERS, 'opener', rng),
    pick(MARKET_FLAVOUR[s.market] ?? MARKET_FLAVOUR.Goals, `flavour:${s.market}`, rng),
    pick(edgeBankFor(s), 'edge', rng),
    pick(verdictBankFor(s), `verdict:${s.tier}`, rng),
  ];
  // ONE personality beat, not a pile-up — the entries are full thoughts now,
  // so stacking aside AND hedge AND sign-off turns him into a rambler.
  if (flavourful && rng() > 0.55) parts.push(pick(ASIDES, 'aside', rng));
  else parts.push(pick(HEDGES, 'hedge', rng));
  parts.push(pick(SIGN_OFFS, 'signoff', rng));
  return parts.map((p) => fill(p, vars)).join(' ');
}

/**
 * Gaffer's READ for a pick whose fixture is already shown on screen — the
 * football read + the value + verdict + a hedge, with no opener naming the teams
 * and no sign-off. Ideal for the picks box / tip cards.
 */
export function gafferReason(s: PickSignals, seed = ''): string {
  const rng = mulberry32(seedOf(`${s.team}|${s.opp}|${s.market}|reason|${seed}`));
  const vars: Record<string, string | number> = varsFor(s, rng);
  // Read → EVIDENCE (the real numbers, with team names — what makes it a read
  // about THIS game and not any game) → value → PUNCHLINE. He lands on wit or
  // a confident verdict, never a limp hedge.
  const closer = rng() > 0.38
    ? pick(ASIDES, 'aside', rng)
    : pick(verdictBankFor(s), `verdict:${s.tier}`, rng);
  const parts = [pick(MARKET_FLAVOUR[s.market] ?? MARKET_FLAVOUR.Goals, `flavour:${s.market}`, rng)];
  const ev = s.evidence;
  if (ev && ev.total > 0) {
    vars.hits = ev.hits; vars.total = ev.total;
    const combo = ev.homeAvg != null && ev.awayAvg != null && ev.unit;
    if (combo) {
      vars.homeAvg = ev.homeAvg!.toFixed(1); vars.awayAvg = ev.awayAvg!.toFixed(1); vars.unit = ev.unit!;
      parts.push(pick(EVIDENCE_COMBO as unknown as string[], 'evidence:combo', rng));
    } else {
      parts.push(pick(EVIDENCE_HITS as unknown as string[], 'evidence:hits', rng));
    }
  }
  parts.push(pick(edgeBankFor(s), 'edge', rng), closer);
  return parts.map((p) => fill(p, vars)).join(' ');
}

/* ── The Gaffer's word on the day ────────────────────────────────────────── */

export interface DayLeg {
  home: string; away: string; selection: string;
  ft?: string; result: 'won' | 'lost' | string;
  note?: string; // optional match colour (hook for live football news later)
}
export interface DayBet {
  kind: string; status: 'won' | 'lost' | string; legs: DayLeg[];
}

const marketOf = (sel: string): 'Goals' | 'Corners' | 'BTTS' | 'default' =>
  /corner/i.test(sel) ? 'Corners' : /btts|both team/i.test(sel) ? 'BTTS' : /goal/i.test(sel) ? 'Goals' : 'default';

// Fill the leg placeholders from the real scoreline.
function legVars(l: DayLeg): Record<string, string> {
  const [hg, ag] = (l.ft ?? '').split('-').map((n) => parseInt(n, 10));
  const total = Number.isFinite(hg) && Number.isFinite(ag) ? hg + ag : NaN;
  // For a BTTS loss, the culprit is whichever side failed to score.
  const cul = Number.isFinite(hg) && Number.isFinite(ag)
    ? (hg === 0 && ag === 0 ? 'neither side' : hg === 0 ? l.home : ag === 0 ? l.away : l.home)
    : l.home;
  return {
    home: l.home, away: l.away, ft: l.ft ?? '',
    g: Number.isFinite(total) ? String(total) : 'the',
    cul, note: l.note ? ` — ${l.note}` : '',
  };
}

const fillLeg = (tpl: string, l: DayLeg) => fill(tpl, legVars(l));

// Clear only the day-verdict slice of the anti-repeat memory (leaves the
// pick-line memory alone).
function resetDayMemory() {
  for (const k of [...recent.keys()]) if (k.startsWith('day:')) recent.delete(k);
}

/** One day's verdict. Does NOT reset memory — the caller controls that so a run
 *  of days can share the anti-repeat memory and never echo each other. */
function buildDayVerdict(bets: DayBet[], seed: string): string {
  const settled = bets.filter((b) => b.status === 'won' || b.status === 'lost');
  if (settled.length === 0) return '';
  const rng = mulberry32(seedOf(`dayverdict|${seed}`));

  const wins = settled.filter((b) => b.status === 'won');
  const losses = settled.filter((b) => b.status === 'lost');
  const allWon = losses.length === 0;
  const allLost = wins.length === 0;

  const parts: string[] = [pick(DAY_OPENERS, 'day:open', rng)];
  if (allWon && settled.length >= 2) parts.push(pick(DAY_PERFECT, 'day:perfect', rng));
  else if (allWon) parts.push(pick(DAY_WIN, 'day:win', rng));
  else if (allLost) parts.push(pick(DAY_ALL_LOST, 'day:lost', rng));
  else parts.push(pick(DAY_MIXED, 'day:mixed', rng));

  // Shout about one real winning leg (pick the juiciest — most goals).
  const wonLegs = wins.flatMap((b) => b.legs).filter((l) => l.result === 'won');
  if (wonLegs.length) {
    const star = [...wonLegs].sort((a, b) => legGoals(b) - legGoals(a))[Math.floor(rng() * Math.min(2, wonLegs.length))] ?? wonLegs[0];
    const bank = WIN_LEG[marketOf(star.selection)] ?? WIN_LEG.default;
    parts.push(fillLeg(pick(bank, `day:winleg:${marketOf(star.selection)}`, rng), star));
  }
  // Own the leg that cost us.
  const lostLegs = losses.flatMap((b) => b.legs).filter((l) => l.result === 'lost');
  if (lostLegs.length) {
    const dud = lostLegs[Math.floor(rng() * lostLegs.length)];
    const bank = LOSS_LEG[marketOf(dud.selection)] ?? LOSS_LEG.default;
    parts.push(fillLeg(pick(bank, `day:lossleg:${marketOf(dud.selection)}`, rng), dud));
  }

  parts.push(pick(DAY_CLOSERS, 'day:close', rng));
  return parts.join(' ');
}

/**
 * A fresh, in-character verdict on a settled day's slips. Reacts to what really
 * happened — both home (buzzing), mixed (wry), blank (honest chin-up) — names the
 * exact teams and scorelines that won or cost us, and closes looking forward.
 * Seed with the date so it's stable for the day but different day to day.
 */
export function gafferDayVerdict(bets: DayBet[], seed = ''): string {
  resetDayMemory();
  return buildDayVerdict(bets, seed);
}

/**
 * Verdicts for a run of days (oldest → newest), generated under ONE shared
 * anti-repeat memory so no two days ever echo the same line. This is how the
 * whole ledger is voiced: earlier days are unaffected by later ones (memory only
 * looks back), so each day's words stay frozen once its predecessors are fixed.
 * Returns verdicts aligned to the input order.
 */
export function gafferDayVerdictSeries(days: { bets: DayBet[]; seed: string }[]): string[] {
  resetDayMemory();
  return days.map((d) => buildDayVerdict(d.bets, d.seed));
}

function legGoals(l: DayLeg): number {
  const [hg, ag] = (l.ft ?? '').split('-').map((n) => parseInt(n, 10));
  return Number.isFinite(hg) && Number.isFinite(ag) ? hg + ag : 0;
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

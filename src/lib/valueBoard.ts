/**
 * THE GAFFER'S VALUE BOARD — data layer.
 *
 * The exploratory sibling of the daily card: scans every fixture in the
 * committed form-table snapshot across the full market grid (goals, corners,
 * cards, BTTS — overs AND unders), compares model probability against the
 * bookmaker's implied probability, and surfaces the gaps.
 *
 * Endpoint-shaped adapters: every read returns the { ok, data } envelope so
 * the components stay contract-clean if this layer later moves behind real
 * server functions. The daily card is NOT computed here — it surfaces the
 * existing locked selection from gafferSelection (the tipping engine owns it).
 *
 * Honesty rules baked in: markets without prices return empty (never faked),
 * quiet days report as quiet, and nothing here ever invents a fixture.
 */
import rawSnapshot from '@/data/formTablesData.json';
import type { FormFixtureRow } from '@/types/footy';
import { getValueCandidates, type Leg } from '@/lib/gafferSelection';
import { gafferReason, type PickSignals } from '@/lib/gafferVoice';

/* ── Types ─────────────────────────────────────────────────────────────── */

export type ValueMarketFamily = 'goals' | 'corners' | 'cards' | 'btts';

export type ValueMarketKey =
  | 'over_2_5_goals' | 'under_2_5_goals'
  | 'over_3_5_goals' | 'under_3_5_goals'
  | 'over_4_5_goals' | 'under_4_5_goals'
  | 'over_8_5_corners' | 'under_8_5_corners'
  | 'over_9_5_corners' | 'under_9_5_corners'
  | 'over_10_5_corners' | 'under_10_5_corners'
  | 'over_11_5_corners' | 'under_11_5_corners'
  | 'over_3_5_cards' | 'under_3_5_cards'
  | 'over_4_5_cards' | 'under_4_5_cards'
  | 'over_5_5_cards' | 'under_5_5_cards'
  | 'btts_yes' | 'btts_no';

export type Confidence = 'low' | 'medium' | 'high';
export type FixtureStatus = 'scheduled' | 'live' | 'finished' | 'stale';

export interface ValueMarketDef {
  key: ValueMarketKey;
  family: ValueMarketFamily;
  label: string;
  side: 'over' | 'under' | 'yes' | 'no';
  line: string | null; // '2.5' … — null for BTTS
}

export type Ok<T> = { ok: true; data: T };
export type Err = { ok: false; error: { code: string; message: string } };
export type Envelope<T> = Ok<T> | Err;
const ok = <T,>(data: T): Ok<T> => ({ ok: true, data });

export interface ValueFixtureRow {
  id: string;
  fixture: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  league: string;
  region: string;
  kickoff: string;        // ISO (best-effort from UK wall time)
  kickoffLabel: string;   // 'HH:MM' UK
  market: string;         // display label
  marketKey: ValueMarketKey;
  formScore: number;      // last-8 hit rate for the exact line (%)
  modelProbability: number;
  impliedProbability: number;
  valueGap: number;       // model − implied, percentage points
  valueScore: number;
  confidence: Confidence;
  oddsSnapshot: number | null;
  status: FixtureStatus;
  qualifies: boolean;     // clears the value bar (edge + floor odds + floor prob)
  gafferNote: string;
}

export interface MarketSummary {
  marketKey: ValueMarketKey;
  family: ValueMarketFamily;
  label: string;
  fixturesFoundToday: number;   // qualifying value fixtures
  fixturesPriced: number;       // fixtures with a live price for this market
  strongestFixture: string | null;
  averageValueScore: number | null;
  biggestValueGap: number | null;
  confidenceRange: string | null; // e.g. 'medium – high'
  status: 'value' | 'priced' | 'unpriced';
}

export interface HubSummary {
  date: string;
  updatedAt: string;
  quietDay: boolean;
  totalFixturesScanned: number;
  totalMarketsScanned: number;
  totalValueFixtures: number;
  marketFamilyCounts: Record<ValueMarketFamily, number>;
  topMarkets: MarketSummary[];
  allMarkets: MarketSummary[];
}

export interface DailyCardSelection {
  fixtureId: string;
  fixture: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  league: string;
  kickoff: string;
  kickoffLabel: string;
  marketKey: ValueMarketKey | null;
  marketLabel: string;
  modelProbability: number;
  impliedProbability: number;
  valueGap: number;
  confidence: Confidence;
  oddsSnapshot: number | null;
  gafferVerdict: string;      // full read (breakdowns, long formats)
  gafferShortVerdict: string; // first beat only — card-friendly
}

export interface GafferDailyCardData {
  date: string;
  updatedAt: string;
  quietDay: boolean;
  quietDayMessage: string;
  double: { available: boolean; selections: DailyCardSelection[] };
  treble: { available: boolean; selections: DailyCardSelection[] };
  riskNote: string;
}

export interface FixtureBreakdown extends Omit<ValueFixtureRow, 'gafferNote'> {
  family: ValueMarketFamily;
  updatedAt: string;
  recentForm: { home: FormGameLite[]; away: FormGameLite[] };
  marketStats: MarketStats;
  headToHead: { date: string; home: string; away: string; hg: number; ag: number; corners?: number; cards?: number }[];
  gafferVerdict: string;
  riskNote: string;
}

export type FormGameLite = { date: string; opp: string; ha: string; gf: number; ga: number; res: string; corners?: number; cards?: number; btts?: boolean };
export interface MarketStats {
  hitRate: { hits: number; total: number } | null; // exact line, last-8 both teams
  averages: { label: string; home: number | null; away: number | null; combined: number | null };
  series: number[]; // per-game metric across recent games (chronological-ish)
}

/* ── Market definitions (fixed by contract — the ONLY hard-coded part) ──── */

const G = (line: string, side: 'over' | 'under'): ValueMarketDef => ({
  key: `${side}_${line.replace('.', '_')}_goals` as ValueMarketKey,
  family: 'goals', side, line, label: `${side === 'over' ? 'Over' : 'Under'} ${line} Goals`,
});
const C = (line: string, side: 'over' | 'under'): ValueMarketDef => ({
  key: `${side}_${line.replace('.', '_')}_corners` as ValueMarketKey,
  family: 'corners', side, line, label: `${side === 'over' ? 'Over' : 'Under'} ${line} Corners`,
});
const K = (line: string, side: 'over' | 'under'): ValueMarketDef => ({
  key: `${side}_${line.replace('.', '_')}_cards` as ValueMarketKey,
  family: 'cards', side, line, label: `${side === 'over' ? 'Over' : 'Under'} ${line} Cards`,
});

export const VALUE_MARKETS: ValueMarketDef[] = [
  G('2.5', 'over'), G('2.5', 'under'), G('3.5', 'over'), G('3.5', 'under'), G('4.5', 'over'), G('4.5', 'under'),
  C('8.5', 'over'), C('8.5', 'under'), C('9.5', 'over'), C('9.5', 'under'),
  C('10.5', 'over'), C('10.5', 'under'), C('11.5', 'over'), C('11.5', 'under'),
  K('3.5', 'over'), K('3.5', 'under'), K('4.5', 'over'), K('4.5', 'under'), K('5.5', 'over'), K('5.5', 'under'),
  { key: 'btts_yes', family: 'btts', side: 'yes', line: null, label: 'Both Teams To Score — Yes' },
  { key: 'btts_no', family: 'btts', side: 'no', line: null, label: 'Both Teams To Score — No' },
];

export const MARKET_BY_KEY: Record<string, ValueMarketDef> =
  Object.fromEntries(VALUE_MARKETS.map((m) => [m.key, m]));

export const FAMILIES: { family: ValueMarketFamily; label: string; blurb: string }[] = [
  { family: 'goals', label: 'Goals', blurb: 'Overs and unders from 2.5 to 4.5 — the bread and butter.' },
  { family: 'corners', label: 'Corners', blurb: 'Lines from 8.5 to 11.5 — where the sharpest edges hide.' },
  { family: 'cards', label: 'Cards', blurb: 'Bookings from 3.5 to 5.5 — for the card merchants.' },
  { family: 'btts', label: 'BTTS', blurb: 'Both teams to score, yes or no — simple and honest.' },
];

/* ── Value bar (what counts as a value fixture) ────────────────────────── */
const MIN_ODDS = 1.3;
const MIN_MODEL = 55;
const MIN_GAP = 4; // percentage points of model-vs-implied

const confidenceOf = (model: number): Confidence => (model >= 72 ? 'high' : model >= 58 ? 'medium' : 'low');

/* ── Snapshot access ───────────────────────────────────────────────────── */
type Snap = { fixtures: FormFixtureRow[] };
const SNAP = (rawSnapshot as unknown as Snap).fixtures ?? [];

export const todayUK = (): string => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });

// Best-effort ISO for a UK wall-clock kickoff (summer leagues → BST +01:00;
// good enough for display math, and the label is always the UK string anyway).
const ukWallToISO = (date: string, time: string): string => {
  const t = /^\d{2}:\d{2}$/.test(time) ? time : '12:00';
  return `${date}T${t}:00+01:00`;
};

const statusOf = (date: string, time: string): FixtureStatus => {
  const ko = new Date(ukWallToISO(date, time)).getTime();
  if (!Number.isFinite(ko)) return 'scheduled';
  const now = Date.now();
  if (now < ko) return 'scheduled';
  if (now < ko + 130 * 60_000) return 'live';
  return 'finished';
};

/* ── Model probability + odds per fixture + market ─────────────────────── */
type AnyFix = FormFixtureRow & Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const lineVal = (o: unknown, line: string): number | null =>
  o && typeof o === 'object' ? num((o as Record<string, unknown>)[line]) : null;

function modelPct(f: AnyFix, m: ValueMarketDef): number | null {
  if (m.family === 'btts') {
    const yes = num(f.btts_pct);
    return yes == null ? null : m.side === 'yes' ? yes : Math.round((100 - yes) * 10) / 10;
  }
  const over = lineVal(f[`${m.family}_over`], m.line!);
  if (over == null) return null;
  return m.side === 'over' ? over : Math.round((100 - over) * 10) / 10;
}

function marketOdds(f: AnyFix, m: ValueMarketDef): number | null {
  if (m.family === 'btts') return num(m.side === 'yes' ? f.btts_odds : f.btts_no_odds);
  const bank = m.side === 'over' ? f[`${m.family}_odds`] : f[`${m.family}_under_odds`];
  return lineVal(bank, m.line!);
}

/* ── The Gaffer's short table note (deterministic, seeded, never repeats
 *    within a market thanks to per-fixture seeds) ─────────────────────── */
const NOTE_TEMPLATES = [
  'Form has this landing {model}% of the time and the price implies {implied}% — that gap is the whole story.',
  'The book is paying like this is a {implied}% shot; the last eight games say {model}%. I know which I trust.',
  'A {model}% pattern priced at {implied}% — quiet little edge, exactly the kind that adds up.',
  'Model {model}%, market {implied}% — the difference is our margin, not our imagination.',
  '{model}% on the form read against {implied}% in the price — worth a proper look.',
  'The numbers have been saying {model}% for weeks; the odds still say {implied}%. Gaps like that pay the bills.',
];
const seedHash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const shortNote = (id: string, key: string, model: number, implied: number): string =>
  NOTE_TEMPLATES[seedHash(`${id}|${key}`) % NOTE_TEMPLATES.length]
    .replace('{model}', String(Math.round(model)))
    .replace('{implied}', String(Math.round(implied)));

const RISK_NOTES = [
  'This one has edge, but don’t treat it like a certainty — stake what you can shrug off.',
  'An edge is a lean, not a lock. Sensible stakes keep us in the game all season.',
  'The percentages are on our side; the ball doesn’t always read the percentages. Bet tidy.',
  'Good process beats one good result — back it sensibly and let the maths work.',
];
const riskNote = (seed: string): string => RISK_NOTES[seedHash(seed) % RISK_NOTES.length];

/* ── Row builder ───────────────────────────────────────────────────────── */
function buildRow(f: AnyFix, m: ValueMarketDef): ValueFixtureRow | null {
  const model = modelPct(f, m);
  const odds = marketOdds(f, m);
  if (model == null || odds == null || odds <= 1) return null;
  const implied = Math.round((100 / odds) * 10) / 10;
  const gap = Math.round((model - implied) * 10) / 10;
  const fixture = `${f.home.name} v ${f.away.name}`;
  return {
    id: f.id,
    fixture,
    homeTeam: f.home.name, awayTeam: f.away.name,
    homeLogo: f.home.logo ?? null, awayLogo: f.away.logo ?? null,
    league: f.league, region: (f as { region?: string }).region ?? '',
    kickoff: ukWallToISO(f.date, f.time), kickoffLabel: f.time,
    market: m.label, marketKey: m.key,
    formScore: model, modelProbability: model, impliedProbability: implied,
    valueGap: gap, valueScore: gap,
    confidence: confidenceOf(model),
    oddsSnapshot: odds,
    status: statusOf(f.date, f.time),
    qualifies: odds >= MIN_ODDS && model >= MIN_MODEL && gap >= MIN_GAP,
    gafferNote: shortNote(f.id, m.key, model, implied),
  };
}

const fixturesOn = (date: string): AnyFix[] => SNAP.filter((f) => f.date === date) as AnyFix[];

/* ── Adapters (endpoint-shaped) ────────────────────────────────────────── */

export function getValueMarketFamilies(): Envelope<{ families: typeof FAMILIES; markets: ValueMarketDef[] }> {
  return ok({ families: FAMILIES, markets: VALUE_MARKETS });
}

function marketSummary(date: string, m: ValueMarketDef): MarketSummary {
  const rows = fixturesOn(date).map((f) => buildRow(f, m)).filter(Boolean) as ValueFixtureRow[];
  const value = rows.filter((r) => r.qualifies).sort((a, b) => b.valueGap - a.valueGap);
  const confs = [...new Set(value.map((v) => v.confidence))];
  const order: Confidence[] = ['low', 'medium', 'high'];
  const sorted = order.filter((c) => confs.includes(c));
  return {
    marketKey: m.key, family: m.family, label: m.label,
    fixturesFoundToday: value.length,
    fixturesPriced: rows.length,
    strongestFixture: value[0]?.fixture ?? null,
    averageValueScore: value.length ? Math.round((value.reduce((p, v) => p + v.valueScore, 0) / value.length) * 10) / 10 : null,
    biggestValueGap: value[0]?.valueGap ?? null,
    confidenceRange: sorted.length ? (sorted.length > 1 ? `${sorted[0]} – ${sorted[sorted.length - 1]}` : sorted[0]) : null,
    status: value.length ? 'value' : rows.length ? 'priced' : 'unpriced',
  };
}

export function getValueHubSummary(date = todayUK()): Envelope<HubSummary> {
  const all = VALUE_MARKETS.map((m) => marketSummary(date, m));
  const counts: Record<ValueMarketFamily, number> = { goals: 0, corners: 0, cards: 0, btts: 0 };
  for (const s of all) counts[s.family] += s.fixturesFoundToday;
  const totalValue = all.reduce((p, s) => p + s.fixturesFoundToday, 0);
  return ok({
    date,
    updatedAt: new Date().toISOString(),
    quietDay: totalValue === 0,
    totalFixturesScanned: fixturesOn(date).length,
    totalMarketsScanned: VALUE_MARKETS.length,
    totalValueFixtures: totalValue,
    marketFamilyCounts: counts,
    topMarkets: [...all].filter((s) => s.fixturesFoundToday > 0).sort((a, b) => (b.biggestValueGap ?? 0) - (a.biggestValueGap ?? 0)).slice(0, 6),
    allMarkets: all,
  });
}

export interface MarketFixturesQuery {
  date?: string;
  marketKey: ValueMarketKey;
  league?: string;
  minConfidence?: Confidence;
  minValueGap?: number;
}
export function getValueMarketFixtures(q: MarketFixturesQuery): Envelope<{
  date: string; marketKey: ValueMarketKey; marketLabel: string; family: ValueMarketFamily;
  updatedAt: string; fixtures: ValueFixtureRow[]; emptyStateMessage: string;
}> {
  const m = MARKET_BY_KEY[q.marketKey];
  if (!m) return { ok: false, error: { code: 'unknown_market', message: `Unknown market key: ${q.marketKey}` } };
  const date = q.date ?? todayUK();
  const order: Confidence[] = ['low', 'medium', 'high'];
  let rows = (fixturesOn(date).map((f) => buildRow(f, m)).filter(Boolean) as ValueFixtureRow[])
    .sort((a, b) => b.valueGap - a.valueGap);
  if (q.league && q.league !== 'all') rows = rows.filter((r) => r.league === q.league);
  if (q.minConfidence) rows = rows.filter((r) => order.indexOf(r.confidence) >= order.indexOf(q.minConfidence!));
  if (q.minValueGap != null) rows = rows.filter((r) => r.valueGap >= q.minValueGap!);
  return ok({
    date, marketKey: m.key, marketLabel: m.label, family: m.family,
    updatedAt: new Date().toISOString(), fixtures: rows,
    emptyStateMessage: 'No strong edge found for this market today.',
  });
}

/* ── The Gaffer's Daily Card — SURFACES the locked tipping selection ────
 * The tipping engine (gafferSelection) locks the double + treble every
 * morning. This page never re-picks; it presents that same card. */
const legMarketKey = (leg: Leg): ValueMarketKey | null => {
  const line = /(\d+\.\d+)/.exec(leg.selection)?.[1]?.replace('.', '_');
  if (leg.market === 'Goals' && line) return `over_${line}_goals` as ValueMarketKey;
  if (leg.market === 'Corners' && line) return `over_${line}_corners` as ValueMarketKey;
  if (leg.market === 'BTTS') return 'btts_yes';
  return null;
};

// First sentence or two of a long read — cards want a punch, not a column.
function firstBeat(text: string, max = 180): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  let out = '';
  for (const s of sentences) {
    if (out && (out + s).length > max) break;
    out += s;
    if (out.length >= max * 0.55) break;
  }
  return out.trim() || text.slice(0, max);
}

function legToSelection(leg: Leg): DailyCardSelection {
  const implied = leg.odds > 1 ? Math.round((100 / leg.odds) * 10) / 10 : 0;
  const date = todayUK();
  const snap = SNAP.find((x) => x.id === leg.fixtureId);
  return {
    fixtureId: leg.fixtureId,
    fixture: `${leg.home.name} v ${leg.away.name}`,
    homeTeam: leg.home.name, awayTeam: leg.away.name,
    homeLogo: leg.home.logo ?? snap?.home.logo ?? null,
    awayLogo: leg.away.logo ?? snap?.away.logo ?? null,
    league: [leg.region, leg.league].filter(Boolean).join(' · '),
    kickoff: ukWallToISO(date, leg.time), kickoffLabel: leg.time,
    marketKey: legMarketKey(leg), marketLabel: leg.selection,
    modelProbability: leg.prob, impliedProbability: implied,
    valueGap: Math.round((leg.prob - implied) * 10) / 10,
    confidence: confidenceOf(leg.prob),
    oddsSnapshot: leg.odds,
    gafferVerdict: leg.placeholderReason,
    gafferShortVerdict: firstBeat(leg.placeholderReason),
  };
}

export function getGafferDailyCard(date = todayUK()): Envelope<GafferDailyCardData> {
  const candidates = (() => {
    const best = new Map<string, Leg>();
    for (const l of getValueCandidates()) if (!best.has(l.fixtureId)) best.set(l.fixtureId, l);
    return [...best.values()];
  })();
  const doubleLegs = candidates.slice(0, 2);
  const trebleLegs = candidates.slice(2, 5);
  const doubleOk = doubleLegs.length === 2;
  const trebleOk = trebleLegs.length === 3;
  return ok({
    date,
    updatedAt: new Date().toISOString(),
    quietDay: !doubleOk,
    quietDayMessage: 'The Gaffer is keeping his powder dry today — no forced picks. Discipline is part of the game.',
    double: { available: doubleOk, selections: doubleOk ? doubleLegs.map(legToSelection) : [] },
    treble: { available: trebleOk, selections: trebleOk ? trebleLegs.map(legToSelection) : [] },
    riskNote: riskNote(date),
  });
}

/* ── Fixture breakdown ─────────────────────────────────────────────────── */
const familyMetric = (g: FormGameLite, fam: ValueMarketFamily): number =>
  fam === 'goals' ? (g.gf ?? 0) + (g.ga ?? 0)
  : fam === 'corners' ? g.corners ?? 0
  : fam === 'cards' ? g.cards ?? 0
  : g.btts ? 1 : 0;

const gameHits = (g: FormGameLite, m: ValueMarketDef): boolean => {
  if (m.family === 'btts') return m.side === 'yes' ? !!g.btts : !g.btts;
  const v = familyMetric(g, m.family);
  const line = Number(m.line);
  return m.side === 'over' ? v > line : v < line;
};

export function getFixtureValueBreakdown(fixtureId: string, marketKey: ValueMarketKey): Envelope<FixtureBreakdown> {
  const m = MARKET_BY_KEY[marketKey];
  const f = SNAP.find((x) => x.id === fixtureId) as AnyFix | undefined;
  if (!m || !f) return { ok: false, error: { code: 'not_found', message: 'Fixture or market not found.' } };
  const row = buildRow(f, m);
  if (!row) return { ok: false, error: { code: 'unpriced', message: 'No live price for this market on this fixture.' } };

  const homeGames = ((f.home_form as FormGameLite[] | undefined) ?? []).slice(0, 8);
  const awayGames = ((f.away_form as FormGameLite[] | undefined) ?? []).slice(0, 8);
  const both = [...homeGames, ...awayGames];
  const hits = both.length ? { hits: both.filter((g) => gameHits(g, m)).length, total: both.length } : null;

  const avg = (games: FormGameLite[]): number | null =>
    games.length ? Math.round((games.reduce((p, g) => p + familyMetric(g, m.family), 0) / games.length) * 10) / 10 : null;
  const famLabel = m.family === 'goals' ? 'goals/game' : m.family === 'corners' ? 'corners/game' : m.family === 'cards' ? 'cards/game' : 'BTTS rate';
  const homeAvg = avg(homeGames), awayAvg = avg(awayGames);
  const combined = homeAvg != null && awayAvg != null ? Math.round(((homeAvg + awayAvg) / 2) * 10) / 10 : homeAvg ?? awayAvg;

  const signals: PickSignals = {
    team: f.home.name, opp: f.away.name,
    market: m.family === 'goals' ? 'Goals' : m.family === 'corners' ? 'Corners' : m.family === 'cards' ? 'Cards' : 'BTTS',
    selection: m.label, mark: m.line ?? undefined,
    odds: row.oddsSnapshot ?? 0, pct: row.modelProbability, edge: row.valueGap,
    tier: row.confidence === 'high' ? 'strong' : 'value',
    evidence: hits ? {
      hits: hits.hits, total: hits.total,
      homeAvg: m.family === 'btts' ? null : homeAvg,
      awayAvg: m.family === 'btts' ? null : awayAvg,
      unit: m.family === 'btts' ? undefined : m.family,
    } : undefined,
  };

  const { gafferNote: _drop, ...rest } = row;
  return ok({
    ...rest,
    family: m.family,
    updatedAt: new Date().toISOString(),
    recentForm: { home: homeGames, away: awayGames },
    marketStats: {
      hitRate: hits,
      averages: { label: famLabel, home: homeAvg, away: awayAvg, combined },
      series: both.map((g) => familyMetric(g, m.family)),
    },
    headToHead: ((f.h2h as FixtureBreakdown['headToHead'] | undefined) ?? []).slice(0, 6),
    gafferVerdict: gafferReason(signals, `${fixtureId}|${marketKey}|breakdown`),
    riskNote: riskNote(`${fixtureId}|${marketKey}`),
  });
}

/** Leagues present on a date — for table filters. */
export function getLeaguesOn(date = todayUK()): string[] {
  return [...new Set(fixturesOn(date).map((f) => f.league))].sort();
}

/* ── The Gaffer's word on the day's slate — quiet Monday or bumper Saturday,
 *    he sets the scene before you scroll. Seeded by date so it holds all day. */
const PROMPT_QUIET = [
  'Quiet {day}, this — only {n} games on the card, not much to sink our teeth into. Still, the scan pulled {v} proper edge{vs} out of it. Quality over quantity, always.',
  '{day}s like this test a man’s patience: {n} fixtures and the bookies behaving themselves on most. {v} edge{vs} made the cut — I’d rather hand you {v} real one{vs} than ten pretend ones.',
  'Thin card today, I’ll not dress it up — {n} games on a sleepy {day}. But even a quiet card usually hides something, and I’ve dug out {v}.',
  'Not a lot on this {day} — {n} games, most of them priced about right. The {v} below earned their place; nothing else did.',
];
const PROMPT_NONE = [
  'I’ll level with you: {n} game{ns} on this {day} card and not one of them mispriced. No edges, no picks, no pretending — a blank board beats a bad bet every time.',
  'Quiet {day}, quieter board — the scan went through {n} game{ns} and came back empty-handed. The bookies got today right; we go again tomorrow.',
];
const PROMPT_MID = [
  'Decent {day} card — {n} games scanned across the leagues and {v} carrying a genuine edge. Enough to work with, not enough to get carried away.',
  'Fair bit on this {day}: {n} fixtures through the scanner, {v} worth your attention below. Pick your market and have a proper look.',
];
const PROMPT_BUSY = [
  'Now we’re talking — {n} games on the card this {day} and the scanner’s been earning its keep: {v} edges flagged below. Get a brew on and have a wander through your markets.',
  'Big {day}, this: {n} fixtures scanned and {v} carrying real value. The board’s full — dig into the family you fancy and take your time.',
];

export function gafferBoardPrompt(s: HubSummary): string {
  const day = new Date(s.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' });
  const n = s.totalFixturesScanned, v = s.totalValueFixtures;
  const bank = v === 0 ? PROMPT_NONE : n <= 6 ? PROMPT_QUIET : n <= 18 ? PROMPT_MID : PROMPT_BUSY;
  const tpl = bank[seedHash(`prompt|${s.date}`) % bank.length];
  return tpl
    .replace(/\{day\}/g, day)
    .replace(/\{n\}/g, String(n))
    .replace(/\{ns\}/g, n === 1 ? '' : 's')
    .replace(/\{v\}/g, String(v))
    .replace(/\{vs\}/g, v === 1 ? '' : 's');
}

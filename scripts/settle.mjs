#!/usr/bin/env node
/**
 * settle.mjs — the Gaffer's daily ledger engine.
 *
 * Every morning the day's bet is locked from the value board: the two best
 * value picks = the £10 double, the next three = the £10 treble (any market —
 * goals, corners or BTTS). This script settles a given day's locked bet against
 * the REAL result and appends it to src/data/pnlLedger.json — the single source
 * of truth the site reads. Nothing hidden: a losing leg is logged as a loss.
 *
 * Selection is derived from src/data/formTablesData.json with the exact logic
 * the homepage board uses, so the record can never disagree with the board.
 *
 * Usage:
 *   node scripts/settle.mjs                # settle yesterday (UTC)
 *   node scripts/settle.mjs 2026-07-03     # settle a specific day
 *   node scripts/settle.mjs 2026-07-02 2026-07-03 2026-07-04   # backfill many
 *
 * Results source (in priority order):
 *   1. SETTLE_RESULTS_FILE=<path>  — a JSON array of FootyStats match objects
 *      (used for offline testing / replay).
 *   2. FOOTYSTATS_KEY              — live fetch from the FootyStats match API.
 *
 * The script is idempotent: re-running a date replaces that day's entries.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FORM_PATH = join(ROOT, 'src/data/formTablesData.json');
const LEDGER_PATH = join(ROOT, 'src/data/pnlLedger.json');
const VOIDS_PATH = join(ROOT, 'src/data/voids.json');

// Abandoned/void handling — bookmaker convention: a void leg's odds become
// 1.00 and the bet settles on the remaining legs; all legs void = stake back.
// Sources: FootyStats status (when it's honest) + the voids.json override for
// days when the feed marks an abandoned game 'complete' with a partial score.
const VOID_STATUSES = new Set(['suspended', 'canceled', 'cancelled', 'abandoned', 'postponed']);
let VOIDS = {};
try { VOIDS = JSON.parse(readFileSync(VOIDS_PATH, 'utf8')); } catch { /* no overrides */ }
const STAKE = 10;
const round2 = (n) => Math.round(n * 100) / 100;

// ── Selection: mirror the homepage board exactly ────────────────────────────
// Qualify a value cell (min odds 1.4, min form 60%), one leg per fixture (best
// edge), ranked by edge. Top 2 → double, next 3 → treble.
const okCell = (c) => !!c && !!c.odds && c.odds >= 1.4 && c.prob >= 60;

function lockedBetFor(fixtures, date) {
  const legs = [];
  const push = (f, market, selection, cell) =>
    legs.push({
      fixtureId: f.id, home: f.home.name, away: f.away.name,
      region: f.region, league: f.league,
      market, selection, odds: cell.odds, prob: cell.prob, edge: cell.edge,
    });
  for (const f of fixtures) {
    if (f.date !== date) continue;
    for (const [mk, c] of Object.entries(f.value?.corners ?? {})) if (okCell(c)) push(f, 'Corners', `Over ${mk} Corners`, c);
    for (const [mk, c] of Object.entries(f.value?.goals ?? {})) if (okCell(c)) push(f, 'Goals', `Over ${mk} Goals`, c);
    if (okCell(f.value?.btts)) push(f, 'BTTS', 'BTTS - Yes', f.value.btts);
  }
  const best = new Map();
  for (const l of legs.sort((a, b) => b.edge - a.edge)) if (!best.has(l.fixtureId)) best.set(l.fixtureId, l);
  const ranked = [...best.values()].sort((a, b) => b.edge - a.edge);
  return { double: ranked.slice(0, 2), treble: ranked.slice(2, 5) };
}

// ── Settlement: score a leg against the real FootyStats match result ─────────
function settleLeg(leg, m) {
  const hg = m.homeGoalCount ?? m.homeGoals ?? 0;
  const ag = m.awayGoalCount ?? m.awayGoals ?? 0;
  const goals = m.totalGoalCount ?? hg + ag;
  const corners = m.totalCornerCount ?? (m.team_a_corners ?? 0) + (m.team_b_corners ?? 0);
  const ft = `${hg}-${ag}`;
  let result;
  if (leg.market === 'Goals') {
    const line = parseFloat(leg.selection.match(/([\d.]+)/)?.[1] ?? 'NaN');
    result = goals > line ? 'won' : 'lost';
  } else if (leg.market === 'Corners') {
    const line = parseFloat(leg.selection.match(/([\d.]+)/)?.[1] ?? 'NaN');
    result = corners > line ? 'won' : 'lost';
  } else { // BTTS
    result = hg > 0 && ag > 0 ? 'won' : 'lost';
  }
  return { ...leg, ft, result };
}

function buildBet(kind, legs, resultsById) {
  const settled = legs.map((l) => {
    const m = resultsById.get(String(l.fixtureId));
    // Void leg: odds collapse to 1.00, result recorded as 'void'.
    if (VOIDS[String(l.fixtureId)] || (m && VOID_STATUSES.has(String(m.status)))) {
      return { ...l, ft: 'ABD', result: 'void', odds: 1 };
    }
    if (!m || m.status !== 'complete') return null; // not finished → can't settle yet
    return settleLeg(l, m);
  });
  if (settled.some((s) => s === null)) return { pending: true };
  // Multiply the exact odds (a bookmaker settles on the real product, not the
  // rounded-for-display figure), then round the money once at the end.
  const rawOdds = settled.reduce((p, l) => p * l.odds, 1); // void legs are 1.00
  const combinedOdds = round2(rawOdds);
  const anyLost = settled.some((l) => l.result === 'lost');
  const allVoid = settled.every((l) => l.result === 'void');
  const status = anyLost ? 'lost' : allVoid ? 'void' : 'won';
  const returns = status === 'lost' ? 0 : round2(STAKE * rawOdds); // all-void → stake back
  return {
    kind, stake: STAKE, combinedOdds,
    status,
    returns, profit: round2(returns - STAKE),
    legs: settled.map(({ fixtureId, prob, edge, market, ...keep }) => keep),
  };
}

// ── Results source ──────────────────────────────────────────────────────────
async function fetchResults(fixtureIds) {
  const byId = new Map();
  const file = process.env.SETTLE_RESULTS_FILE;
  if (file) {
    const arr = JSON.parse(readFileSync(file, 'utf8'));
    const list = Array.isArray(arr) ? arr : (arr.data ?? []);
    for (const m of list) byId.set(String(m.id), m);
    return byId;
  }
  const key = process.env.FOOTYSTATS_KEY;
  if (!key) throw new Error('No SETTLE_RESULTS_FILE and no FOOTYSTATS_KEY — nothing to settle from.');
  for (const id of fixtureIds) {
    const url = `https://api.football-data-api.com/match?key=${key}&match_id=${id}`;
    const res = await fetch(url);
    if (!res.ok) { console.warn(`  ! match ${id} → HTTP ${res.status}`); continue; }
    const j = await res.json();
    if (j?.data) byId.set(String(id), j.data);
  }
  return byId;
}

// ── The Gaffer's word (frozen into the ledger) ──────────────────────────────
// Bundle the TS voice engine once so the stored verdict uses the exact same
// banks/logic as the site — no duplicated wording. Best-effort: if esbuild
// isn't available the frontend still generates the verdict deterministically.
let _voice;
async function getVoice() {
  if (_voice !== undefined) return _voice;
  try {
    const esbuild = await import('esbuild');
    const r = await esbuild.build({
      entryPoints: [join(ROOT, 'src/lib/gafferVoice.ts')],
      bundle: true, write: false, format: 'esm', platform: 'node',
    });
    _voice = await import('data:text/javascript,' + encodeURIComponent(r.outputFiles[0].text));
  } catch (e) {
    console.warn(`  (verdict baking skipped — ${e.message})`);
    _voice = false;
  }
  return _voice;
}

// Voice EVERY day in the ledger as one chronological series under a shared
// anti-repeat memory, so no two days ever echo the same line. Earlier days are
// unaffected by later ones (the memory only looks back), so their words stay
// frozen once written. Mutates each bet's `verdict` in place.
async function bakeVerdicts(ledger) {
  const voice = await getVoice();
  if (!voice || !voice.gafferDayVerdictSeries) return;
  const byDate = new Map();
  for (const b of ledger.bets) (byDate.get(b.date) ?? byDate.set(b.date, []).get(b.date)).push(b);
  const daysChrono = [...byDate.keys()].sort(); // oldest → newest
  const verdicts = voice.gafferDayVerdictSeries(daysChrono.map((d) => ({ bets: byDate.get(d), seed: d })));
  daysChrono.forEach((d, i) => { for (const b of byDate.get(d)) b.verdict = verdicts[i]; });
}

// ── Main ────────────────────────────────────────────────────────────────────
function yesterdayUTC() {
  const d = new Date(Date.now() - 86400000);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const dates = process.argv.slice(2);
  if (dates.length === 0) dates.push(yesterdayUTC());

  const fixtures = (JSON.parse(readFileSync(FORM_PATH, 'utf8')).fixtures) ?? [];
  const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
  ledger.bets ??= [];

  let changed = false;
  for (const date of dates) {
    const { double, treble } = lockedBetFor(fixtures, date);
    if (double.length === 0) { console.log(`${date}: no picks on the card — nothing to settle.`); continue; }

    const needIds = [...double, ...treble].map((l) => String(l.fixtureId));
    const results = await fetchResults(needIds);

    const entries = [];
    // 1 qualifying pick = the day's bet is a £10 SINGLE (the board shows it as
    // "Gaffer's Top Pick"). It settles like any other bet — never skipped.
    const kind = double.length === 1 ? 'single' : 'double';
    const dbl = buildBet(kind, double, results);
    if (dbl.pending) { console.log(`${date}: ${kind} not final yet — skipped (will settle once complete).`); continue; }
    entries.push({ date, ...dbl });

    if (treble.length === 3) {
      const trb = buildBet('treble', treble, results);
      if (trb.pending) console.log(`${date}: treble not final yet — logging double only for now.`);
      else entries.push({ date, ...trb });
    } else {
      console.log(`${date}: only ${treble.length} treble candidate(s) — double only.`);
    }

    // Idempotent: drop any prior entries for this date, then add the fresh ones.
    ledger.bets = ledger.bets.filter((b) => b.date !== date);
    ledger.bets.push(...entries);
    changed = true;
    for (const e of entries) {
      const res = e.status.toUpperCase();
      console.log(`${date}: ${e.kind.padEnd(6)} ${res.padEnd(4)} ${e.profit >= 0 ? '+' : ''}£${e.profit}  (${e.legs.map((l) => `${l.home} ${l.result === 'won' ? '✓' : '✗'}`).join(', ')})`);
    }
  }

  if (changed) {
    // Voice the whole ledger as one series so no two days echo each other.
    await bakeVerdicts(ledger);
    // Keep the ledger sorted newest first for stable diffs.
    ledger.bets.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.kind < b.kind ? -1 : 1));
    writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n');
    console.log(`\nLedger updated → ${LEDGER_PATH}`);
  } else {
    console.log('\nNo changes.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

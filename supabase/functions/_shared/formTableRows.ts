// ============================================================================
// Footy Oracle — assemble today's FORM TABLE rows.
// Turns today's fixtures (odds + badges) + each team's last-10 form into the
// per-fixture row shape the /form-tables page renders. Pure + deterministic.
// Ranking (by combined average) + filtering happen on the client; here we just
// compute every fixture's numbers. Mirrors src/types/footy.ts FormFixtureRow.
// ============================================================================
import type { TodayFixture, DetailedMatch } from "./footystats.ts";

export interface TeamFormStats {
  overPct: Record<string, number>;
  avgGoals: number;
  avgCorners: number;
  avgCards: number;
}

// Drill-down shapes (mirror src/types/footy.ts).
interface FormGame { date: string; opp: string; ha: "H" | "A"; gf: number; ga: number; res: "W" | "D" | "L"; corners: number; cards: number; btts: boolean; }
interface H2HMeeting { date: string; home: string; away: string; hg: number; ag: number; corners: number; cards: number; }

export interface HistoryLookup {
  gamesFor: (id: number, name: string) => FormGame[];
  h2hFor: (aId: number, aName: string, bId: number, bName: string) => H2HMeeting[];
}

const dstr = (u: number) => new Date(u * 1000).toISOString().slice(0, 10);
const pairKey = (a: string, b: string) => [a, b].sort().join("|");

/**
 * Turn a season's completed matches into per-team form strips + head-to-head.
 * Keyed by both id and name so today's fixtures resolve either way.
 */
export function buildHistory(matches: DetailedMatch[]): HistoryLookup {
  const byId = new Map<number, FormGame[]>();
  const byName = new Map<string, FormGame[]>();
  const h2h = new Map<string, H2HMeeting[]>();
  const add = (m: Map<string | number, FormGame[]>, k: string | number, g: FormGame) => {
    const arr = (m as Map<string | number, FormGame[]>).get(k) ?? []; arr.push(g); m.set(k, arr);
  };

  for (const m of [...matches].sort((a, b) => b.dateUnix - a.dateUnix)) { // newest first
    const date = dstr(m.dateUnix);
    const btts = m.hg > 0 && m.ag > 0;
    const homeRes: FormGame["res"] = m.hg > m.ag ? "W" : m.hg < m.ag ? "L" : "D";
    const awayRes: FormGame["res"] = m.ag > m.hg ? "W" : m.ag < m.hg ? "L" : "D";
    const homeGame: FormGame = { date, opp: m.awayName, ha: "H", gf: m.hg, ga: m.ag, res: homeRes, corners: m.corners, cards: m.cards, btts };
    const awayGame: FormGame = { date, opp: m.homeName, ha: "A", gf: m.ag, ga: m.hg, res: awayRes, corners: m.corners, cards: m.cards, btts };
    add(byId as Map<string | number, FormGame[]>, m.homeId, homeGame);
    add(byId as Map<string | number, FormGame[]>, m.awayId, awayGame);
    add(byName as Map<string | number, FormGame[]>, m.homeName, homeGame);
    add(byName as Map<string | number, FormGame[]>, m.awayName, awayGame);

    const meeting: H2HMeeting = { date, home: m.homeName, away: m.awayName, hg: m.hg, ag: m.ag, corners: m.corners, cards: m.cards };
    const kId = pairKey(String(m.homeId), String(m.awayId));
    const kNm = pairKey(m.homeName, m.awayName);
    for (const k of new Set([kId, kNm])) { const a = h2h.get(k) ?? []; a.push(meeting); h2h.set(k, a); }
  }

  return {
    gamesFor: (id, name) => (byId.get(id) ?? byName.get(name) ?? []).slice(0, 8),
    h2hFor: (aId, aName, bId, bName) =>
      (h2h.get(pairKey(String(aId), String(bId))) ?? h2h.get(pairKey(aName, bName)) ?? []).slice(0, 6),
  };
}

// Marks the page exposes per category (labels match FootyStats overPct/odds keys).
// OVER display marks:
const CORNER_MARKS = ["8.5", "9.5", "10.5"];
const GOAL_MARKS = ["2.5", "3.5", "4.5"];
const CARD_MARKS = ["3.5", "4.5", "5.5"];
// UNDER display marks (odds captured for these):
const CORNER_UNDER_MARKS = ["8.5", "9.5", "10.5", "11.5"];
const GOAL_UNDER_MARKS = ["0.5", "1.5", "2.5", "3.5"];
const CARD_UNDER_MARKS = ["2.5", "3.5", "4.5"];
// Marks we compute over-% at, so under-% = 100 − over-% is available too:
const CORNER_PCT_MARKS = ["8.5", "9.5", "10.5", "11.5"];
const GOAL_PCT_MARKS = ["0.5", "1.5", "2.5", "3.5", "4.5"];
const CARD_PCT_MARKS = ["2.5", "3.5", "4.5", "5.5"];

// Value guardrails — same as the Gaffer value engine.
const STRONG_EDGE = 20;
const VALUE_EDGE = 10;
const MIN_ODDS = 1.5;

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (f: TeamFormStats, label: string) => Number(f.overPct?.[label] ?? 0);
const combined = (a: number, b: number) => round1((a + b) / 2);

type Flag = "strong" | "value" | null;
interface ValueCell { prob: number; odds: number | null; implied: number | null; edge: number; flag: Flag; }

function valueCell(prob: number, odds: number | null): ValueCell | null {
  if (!odds || odds <= 1) return null;
  const implied = round1(100 / odds);
  const edge = round1(prob - implied);
  const flag: Flag = edge >= STRONG_EDGE ? "strong" : edge >= VALUE_EDGE && odds >= MIN_ODDS ? "value" : null;
  return { prob, odds, implied, edge, flag };
}

const overMap = (h: TeamFormStats, a: TeamFormStats, marks: string[], suffix: string) => {
  const out: Record<string, number> = {};
  for (const m of marks) out[m] = combined(pct(h, `Over ${m} ${suffix}`), pct(a, `Over ${m} ${suffix}`));
  return out;
};
const oddsMap = (odds: Record<string, number>, marks: string[], suffix: string) => {
  const out: Record<string, number | null> = {};
  for (const m of marks) out[m] = odds[`Over ${m} ${suffix}`] ?? null;
  return out;
};
const underOddsMap = (odds: Record<string, number>, marks: string[], suffix: string) => {
  const out: Record<string, number | null> = {};
  for (const m of marks) out[m] = odds[`Under ${m} ${suffix}`] ?? null;
  return out;
};

/** UK kick-off HH:MM from an ISO timestamp. */
function ukTime(iso: string): string {
  if (!iso) return "TBC";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" });
  } catch { return "TBC"; }
}

const short = (name: string) => name.slice(0, 3).toUpperCase();

/** Split "Iceland Urvalsdeild" -> { region:"Iceland", league:"Urvalsdeild" }. */
function splitLeague(full: string, leagueId: number): { region: string; league: string } {
  if (!full) return { region: "", league: `League ${leagueId}` };
  const i = full.indexOf(" ");
  return i === -1 ? { region: "", league: full } : { region: full.slice(0, i), league: full.slice(i + 1) };
}

export interface FormTablesPayload {
  leagues: { name: string; region: string }[];
  fixtures: Record<string, unknown>[];
}

/**
 * Build the page payload from today's fixtures + a form lookup.
 * `formFor` resolves a team (by id then name) to its last-10 stats, or null.
 */
export function buildFormTables(
  fixtures: TodayFixture[],
  formFor: (id: number, name: string) => TeamFormStats | null,
  leagueNames: Record<number, string>,
  dateISO: string,
  history?: HistoryLookup,
): FormTablesPayload {
  const rows: Record<string, unknown>[] = [];
  const leagueSet = new Map<string, { name: string; region: string }>();

  for (const f of fixtures) {
    const h = formFor(f.homeId, f.homeName);
    const a = formFor(f.awayId, f.awayName);
    if (!h || !a) continue; // need last-10 on both sides

    const { region, league } = splitLeague(leagueNames[f.leagueId] ?? "", f.leagueId);
    leagueSet.set(`${region}|${league}`, { name: league, region });

    // Over-% at every mark (under-% = 100 − these, computed on the page).
    const goals_over = overMap(h, a, GOAL_PCT_MARKS, "Goals");
    const corners_over = overMap(h, a, CORNER_PCT_MARKS, "Corners");
    const cards_over = overMap(h, a, CARD_PCT_MARKS, "Cards");
    // Over odds (display marks) + Under odds (their marks).
    const goals_odds = oddsMap(f.odds, GOAL_MARKS, "Goals");
    const corners_odds = oddsMap(f.odds, CORNER_MARKS, "Corners");
    const cards_odds = oddsMap(f.odds, CARD_MARKS, "Cards");
    const goals_under_odds = underOddsMap(f.odds, GOAL_UNDER_MARKS, "Goals");
    const corners_under_odds = underOddsMap(f.odds, CORNER_UNDER_MARKS, "Corners");
    const cards_under_odds = underOddsMap(f.odds, CARD_UNDER_MARKS, "Cards");
    const btts_pct = combined(pct(h, "BTTS"), pct(a, "BTTS"));
    const btts_odds = f.odds["BTTS"] ?? null;
    const btts_no_odds = f.odds["BTTS No"] ?? null;

    // Over value cells kept for the picks engine (gafferSelection reads these).
    const goalsValue: Record<string, ValueCell | null> = {};
    for (const m of GOAL_MARKS) goalsValue[m] = valueCell(goals_over[m], goals_odds[m]);
    const cornersValue: Record<string, ValueCell | null> = {};
    for (const m of CORNER_MARKS) cornersValue[m] = valueCell(corners_over[m], corners_odds[m]);

    rows.push({
      id: String(f.fixtureId),
      league, region, date: f.kickoff ? f.kickoff.slice(0, 10) : dateISO, time: ukTime(f.kickoff),
      home: { name: f.homeName, short: short(f.homeName), logo: f.homeLogo },
      away: { name: f.awayName, short: short(f.awayName), logo: f.awayLogo },
      result: { hg: 0, ag: 0, corners: 0, cards: 0, btts: false }, // upcoming
      goals_avg: combined(h.avgGoals, a.avgGoals),
      corners_avg: combined(h.avgCorners, a.avgCorners),
      cards_avg: combined(h.avgCards, a.avgCards),
      btts_pct,
      goals_over, corners_over, cards_over,
      goals_odds, corners_odds, cards_odds, btts_odds,
      goals_under_odds, corners_under_odds, cards_under_odds, btts_no_odds,
      value: { goals: goalsValue, corners: cornersValue, btts: valueCell(btts_pct, btts_odds) },
      home_form: history?.gamesFor(f.homeId, f.homeName) ?? [],
      away_form: history?.gamesFor(f.awayId, f.awayName) ?? [],
      h2h: history?.h2hFor(f.homeId, f.homeName, f.awayId, f.awayName) ?? [],
    });
  }

  return { leagues: [...leagueSet.values()], fixtures: rows };
}

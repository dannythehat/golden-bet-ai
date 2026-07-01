// ============================================================================
// Footy Oracle — assemble today's FORM TABLE rows.
// Turns today's fixtures (odds + badges) + each team's last-10 form into the
// per-fixture row shape the /form-tables page renders. Pure + deterministic.
// Ranking (by combined average) + filtering happen on the client; here we just
// compute every fixture's numbers. Mirrors src/types/footy.ts FormFixtureRow.
// ============================================================================
import type { TodayFixture } from "./footystats.ts";

export interface TeamFormStats {
  overPct: Record<string, number>;
  avgGoals: number;
  avgCorners: number;
  avgCards: number;
}

// Marks the page exposes per category (labels match FootyStats overPct/odds keys).
const CORNER_MARKS = ["8.5", "9.5", "10.5"];
const GOAL_MARKS = ["2.5", "3.5", "4.5"];
const CARD_MARKS = ["3.5", "4.5", "5.5"];

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
): FormTablesPayload {
  const rows: Record<string, unknown>[] = [];
  const leagueSet = new Map<string, { name: string; region: string }>();

  for (const f of fixtures) {
    const h = formFor(f.homeId, f.homeName);
    const a = formFor(f.awayId, f.awayName);
    if (!h || !a) continue; // need last-10 on both sides

    const { region, league } = splitLeague(leagueNames[f.leagueId] ?? "", f.leagueId);
    leagueSet.set(`${region}|${league}`, { name: league, region });

    const goals_over = overMap(h, a, GOAL_MARKS, "Goals");
    const corners_over = overMap(h, a, CORNER_MARKS, "Corners");
    const goals_odds = oddsMap(f.odds, GOAL_MARKS, "Goals");
    const corners_odds = oddsMap(f.odds, CORNER_MARKS, "Corners");
    const cards_odds = oddsMap(f.odds, CARD_MARKS, "Cards");
    const btts_pct = combined(pct(h, "BTTS"), pct(a, "BTTS"));
    const btts_odds = f.odds["BTTS"] ?? null;

    const goalsValue: Record<string, ValueCell | null> = {};
    for (const m of GOAL_MARKS) goalsValue[m] = valueCell(goals_over[m], goals_odds[m]);
    const cornersValue: Record<string, ValueCell | null> = {};
    for (const m of CORNER_MARKS) cornersValue[m] = valueCell(corners_over[m], corners_odds[m]);

    rows.push({
      id: String(f.fixtureId),
      league, region, date: dateISO, time: ukTime(f.kickoff),
      home: { name: f.homeName, short: short(f.homeName), logo: f.homeLogo },
      away: { name: f.awayName, short: short(f.awayName), logo: f.awayLogo },
      result: { hg: 0, ag: 0, corners: 0, cards: 0, btts: false }, // upcoming
      goals_avg: combined(h.avgGoals, a.avgGoals),
      corners_avg: combined(h.avgCorners, a.avgCorners),
      cards_avg: combined(h.avgCards, a.avgCards),
      btts_pct,
      goals_over, corners_over,
      goals_odds, corners_odds, cards_odds, btts_odds,
      value: { goals: goalsValue, corners: cornersValue, btts: valueCell(btts_pct, btts_odds) },
      home_form: [], away_form: [], h2h: [], // drill-down history: follow-up (needs lastx/h2h calls)
    });
  }

  return { leagues: [...leagueSet.values()], fixtures: rows };
}

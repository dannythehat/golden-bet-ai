// ============================================================================
// Footy Oracle — rolling form-table engine (provider-agnostic).
// Takes normalised matches from ANY source (FootyStats, football-data.co.uk…)
// and computes last-N form tables for every market. Pure + unit-testable.
// ============================================================================

export interface NormalizedMatch {
  dateUnix: number;      // kickoff, for chronological ordering
  home: string;
  away: string;
  goals: number;         // total match goals
  corners: number;       // total match corners
  cards: number;         // total match cards (yellows + reds)
  btts: boolean;         // both teams scored
}

export interface TeamGame {
  date: string;          // YYYY-MM-DD
  opp: string;
  ha: "H" | "A";
  goals: number;
  corners: number;
  cards: number;
  btts: boolean;
}

export interface TeamForm {
  team: string;
  played: number;
  avgGoals: number;
  avgCorners: number;
  avgCards: number;
  bttsHit: number;
  markets: Record<string, number>; // market label -> hits out of `played`
  last8: TeamGame[];
}

export interface FormTables {
  window: number;
  teams: TeamForm[];
}

// Market definitions — thresholds the Gaffer reads.
export const MARKETS: { label: string; stat: "goals" | "corners" | "cards"; over: number }[] = [
  { label: "Over 2.5 Goals", stat: "goals", over: 2.5 },
  { label: "Over 3.5 Goals", stat: "goals", over: 3.5 },
  { label: "Over 4.5 Goals", stat: "goals", over: 4.5 },
  { label: "Over 5.5 Goals", stat: "goals", over: 5.5 },
  { label: "Over 8.5 Corners", stat: "corners", over: 8.5 },
  { label: "Over 9.5 Corners", stat: "corners", over: 9.5 },
  { label: "Over 10.5 Corners", stat: "corners", over: 10.5 },
  { label: "Over 11.5 Corners", stat: "corners", over: 11.5 },
  { label: "Over 12.5 Corners", stat: "corners", over: 12.5 },
  { label: "Over 3.5 Cards", stat: "cards", over: 3.5 },
  { label: "Over 4.5 Cards", stat: "cards", over: 4.5 },
  { label: "Over 5.5 Cards", stat: "cards", over: 5.5 },
  { label: "Over 6.5 Cards", stat: "cards", over: 6.5 },
];

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Compute last-`window` rolling form per team across every market.
 * Only completed matches should be passed in.
 */
export function computeFormTables(matches: NormalizedMatch[], window = 8): FormTables {
  // Group games per team (from that team's perspective).
  const byTeam = new Map<string, (TeamGame & { dateUnix: number })[]>();
  const push = (team: string, opp: string, ha: "H" | "A", m: NormalizedMatch) => {
    const arr = byTeam.get(team) ?? [];
    arr.push({ dateUnix: m.dateUnix, date: new Date(m.dateUnix * 1000).toISOString().slice(0, 10), opp, ha, goals: m.goals, corners: m.corners, cards: m.cards, btts: m.btts });
    byTeam.set(team, arr);
  };
  for (const m of matches) {
    push(m.home, m.away, "H", m);
    push(m.away, m.home, "A", m);
  }

  const teams: TeamForm[] = [];
  for (const [team, all] of byTeam) {
    const last = all.sort((a, b) => a.dateUnix - b.dateUnix).slice(-window);
    const n = last.length || 1;
    const markets: Record<string, number> = {};
    for (const mk of MARKETS) markets[mk.label] = last.filter((g) => g[mk.stat] > mk.over).length;
    markets["BTTS"] = last.filter((g) => g.btts).length;

    teams.push({
      team,
      played: last.length,
      avgGoals: round1(last.reduce((s, g) => s + g.goals, 0) / n),
      avgCorners: round1(last.reduce((s, g) => s + g.corners, 0) / n),
      avgCards: round1(last.reduce((s, g) => s + g.cards, 0) / n),
      bttsHit: markets["BTTS"],
      markets,
      last8: last.map(({ dateUnix: _d, ...g }) => g).reverse(),
    });
  }
  return { window, teams };
}

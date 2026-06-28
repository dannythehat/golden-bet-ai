// Sample of today's fixtures for the preview. Real version reads
// FootyStats todays-matches (kickoff + odds) joined to form_tables.

export interface FixtureTeam {
  name: string;
  formStr: string;
  over: Record<string, number>; // last-10 hit-% per market label
}
export interface Fixture {
  id: number;
  kickoff: string;            // "HH:MM"
  home: FixtureTeam;
  away: FixtureTeam;
  odds: Record<string, number>; // decimal odds per market label
}
export interface LeagueGroup {
  league: string;
  country: string;
  flag: string;
  fixtures: Fixture[];
}

const T = (name: string, formStr: string, over: Record<string, number>): FixtureTeam => ({ name, formStr, over });

export const todaysFixturesSample: LeagueGroup[] = [
  {
    league: "Premier League", country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    fixtures: [
      {
        id: 1, kickoff: "15:00",
        home: T("Man City", "WWWDW", { "Over 9.5 Corners": 88, "Over 2.5 Goals": 70, "Over 3.5 Cards": 38 }),
        away: T("Chelsea", "WDWLW", { "Over 9.5 Corners": 78, "Over 2.5 Goals": 72, "Over 3.5 Cards": 50 }),
        odds: { "Over 9.5 Corners": 1.65, "Over 2.5 Goals": 1.80, "Over 3.5 Cards": 2.40 },
      },
      {
        id: 2, kickoff: "17:30",
        home: T("Brighton", "DWLDW", { "Over 9.5 Corners": 60, "Over 2.5 Goals": 64 }),
        away: T("Aston Villa", "WLWDL", { "Over 9.5 Corners": 55, "Over 2.5 Goals": 58 }),
        odds: { "Over 9.5 Corners": 1.90, "Over 2.5 Goals": 1.75 },
      },
    ],
  },
  {
    league: "Serie A", country: "Italy", flag: "🇮🇹",
    fixtures: [
      {
        id: 3, kickoff: "19:45",
        home: T("Inter", "WWDWW", { "Over 3.5 Cards": 75, "Over 2.5 Goals": 66, "Over 9.5 Corners": 52 }),
        away: T("Roma", "DWWDL", { "Over 3.5 Cards": 71, "Over 2.5 Goals": 60, "Over 9.5 Corners": 48 }),
        odds: { "Over 3.5 Cards": 1.95, "Over 2.5 Goals": 1.95, "Over 9.5 Corners": 2.10 },
      },
    ],
  },
  {
    league: "Bundesliga", country: "Germany", flag: "🇩🇪",
    fixtures: [
      {
        id: 4, kickoff: "17:30",
        home: T("Dortmund", "WWLWW", { "Over 2.5 Goals": 84, "BTTS": 80, "Over 9.5 Corners": 62 }),
        away: T("Leipzig", "WDWWL", { "Over 2.5 Goals": 78, "BTTS": 74, "Over 9.5 Corners": 58 }),
        odds: { "Over 2.5 Goals": 1.70, "BTTS": 1.72, "Over 9.5 Corners": 1.85 },
      },
    ],
  },
  {
    league: "La Liga", country: "Spain", flag: "🇪🇸",
    fixtures: [
      {
        id: 5, kickoff: "20:00",
        home: T("Cádiz", "DLDLD", { "Over 2.5 Goals": 40, "Over 9.5 Corners": 44 }),
        away: T("Getafe", "LDDLW", { "Over 2.5 Goals": 38, "Over 9.5 Corners": 41 }),
        odds: { "Over 2.5 Goals": 2.20, "Over 9.5 Corners": 2.05 },
      },
    ],
  },
];

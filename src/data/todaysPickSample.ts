// Sample of the Gaffer's live pick for the in-play tracker preview.
// Real version reads today's pending gaffer_pick + polls live FootyStats stats.

export interface PickLeg {
  market: string;
  home: string;
  away: string;
  league: string;
  line: number;                       // e.g. 9.5
  stat: "goals" | "corners" | "cards";
  live: { minute: number; current: number; status: "upcoming" | "live" | "ft" };
}

export interface TodaysPick {
  date: string;
  betType: "single" | "double" | "none";
  stake: number;
  combinedOdds: number;
  potentialReturn: number;
  reasoning: string;
  legs: PickLeg[];
}

export const todaysPickSample: TodaysPick = {
  date: "today",
  betType: "double",
  stake: 10,
  combinedOdds: 3.4,
  potentialReturn: 34,
  reasoning:
    "Two value plays today, so it's a double. Both sides love a corner and these are goal machines — the bookies are asleep on the price.",
  legs: [
    {
      market: "Over 9.5 Corners",
      home: "Man City", away: "Chelsea", league: "Premier League",
      line: 9.5, stat: "corners",
      live: { minute: 63, current: 8, status: "live" },
    },
    {
      market: "Over 2.5 Goals",
      home: "Inter", away: "Roma", league: "Serie A",
      line: 2.5, stat: "goals",
      live: { minute: 41, current: 2, status: "live" },
    },
  ],
};

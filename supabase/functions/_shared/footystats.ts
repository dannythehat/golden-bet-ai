// ============================================================================
// Footy Oracle — FootyStats data provider.
// Wraps the FootyStats (football-data-api.com) endpoints and normalises their
// match objects into NormalizedMatch for the form-table engine. Field names
// verified against the live API. Environment-agnostic (just uses fetch).
// ============================================================================
import type { NormalizedMatch } from "./formStats.ts";

const BASE = "https://api.football-data-api.com";

export interface FootyStatsLeague {
  name: string;
  season: { id: number; year: number | string }[];
}

async function getJson(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`FootyStats ${path.split("?")[0]} -> HTTP ${res.status}`);
  const json = await res.json();
  if (json && json.success === false) {
    throw new Error(`FootyStats ${path.split("?")[0]} -> ${json.message || "request failed"}`);
  }
  return json;
}

/** Full league catalogue (which leagues/seasons exist). */
export async function fetchLeagueList(key: string): Promise<FootyStatsLeague[]> {
  const json = await getJson(`/league-list?key=${key}`);
  return Array.isArray(json?.data) ? json.data : [];
}

/**
 * All completed matches for a season, normalised for the form engine.
 * Verified fields: home_name/away_name, homeGoalCount/awayGoalCount,
 * totalCornerCount, team_a_cards_num/team_b_cards_num, date_unix, status.
 */
export async function fetchLeagueMatches(seasonId: number, key: string): Promise<NormalizedMatch[]> {
  const json = await getJson(`/league-matches?key=${key}&season_id=${seasonId}`);
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data
    .filter((m) => m.status === "complete")
    .map((m) => {
      const home = m.homeGoalCount ?? 0;
      const away = m.awayGoalCount ?? 0;
      const corners = m.totalCornerCount ?? ((m.team_a_corners ?? 0) + (m.team_b_corners ?? 0));
      const cards = (m.team_a_cards_num ?? 0) + (m.team_b_cards_num ?? 0);
      return {
        dateUnix: m.date_unix,
        home: m.home_name,
        away: m.away_name,
        goals: home + away,
        corners,
        cards,
        btts: home > 0 && away > 0,
      } as NormalizedMatch;
    })
    .filter((m) => m.home && m.away && Number.isFinite(m.dateUnix));
}

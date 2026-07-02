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

export interface TodayFixture {
  fixtureId: number;
  leagueId: number;
  kickoff: string;
  homeId: number; awayId: number;
  homeName: string; awayName: string;
  homeLogo: string | null; awayLogo: string | null;
  odds: Record<string, number>;
}

const IMG_BASE = "https://cdn.footystats.org/img/";
/** Turn a FootyStats image path into an absolute badge URL. */
function badge(path: unknown): string | null {
  if (typeof path !== "string" || !path) return null;
  return /^https?:\/\//.test(path) ? path : `${IMG_BASE}${path.replace(/^\/+/, "")}`;
}

/** Today's fixtures with normalised per-market odds + team badges. */
export async function fetchTodaysMatches(key: string): Promise<TodayFixture[]> {
  const json = await getJson(`/todays-matches?key=${key}`);
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data.map((m) => ({
    fixtureId: m.id,
    leagueId: m.competition_id ?? m.season_id,
    kickoff: m.date_unix ? new Date(m.date_unix * 1000).toISOString() : "",
    homeId: m.homeID ?? m.home_id,
    awayId: m.awayID ?? m.away_id,
    homeName: m.home_name,
    awayName: m.away_name,
    homeLogo: badge(m.home_image),
    awayLogo: badge(m.away_image),
    odds: normalizeOdds(m),
  }));
}

export interface MatchResult {
  status: string;
  goals: number; corners: number; cards: number; btts: boolean;
}

/** Final stats for one match (for settlement). */
export async function fetchMatchResult(matchId: number, key: string): Promise<MatchResult | null> {
  const json = await getJson(`/match?key=${key}&match_id=${matchId}`);
  const m = json?.data;
  if (!m) return null;
  const home = num(m.homeGoalCount), away = num(m.awayGoalCount);
  return {
    status: m.status,
    goals: home + away,
    corners: m.totalCornerCount ?? (num(m.team_a_corners) + num(m.team_b_corners)),
    cards: num(m.team_a_cards_num) + num(m.team_b_cards_num),
    btts: home > 0 && away > 0,
  };
}

/** Full league catalogue (which leagues/seasons exist). */
export async function fetchLeagueList(key: string): Promise<FootyStatsLeague[]> {
  const json = await getJson(`/league-list?key=${key}`);
  return Array.isArray(json?.data) ? json.data : [];
}

/**
 * The leagues chosen on the FootyStats account, each mapped to its latest season
 * id. Used as a fallback when FOOTYSTATS_SEASON_IDS isn't configured, so the whole
 * pipeline runs on FOOTYSTATS_KEY alone.
 */
export async function fetchChosenLeagues(key: string): Promise<{ id: number; name: string }[]> {
  // deno-lint-ignore no-explicit-any
  const json = await getJson(`/league-list?key=${key}&chosen_leagues_only=true`);
  // deno-lint-ignore no-explicit-any
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  const out: { id: number; name: string }[] = [];
  for (const lg of rows) {
    // NB: `league_name` comes back as "" for chosen leagues; the real label is `name`
    // ("Iceland Úrvalsdeild"). Use || (not ??) so an empty string falls through.
    const name = String(lg?.name || lg?.league_name || "").trim();
    // deno-lint-ignore no-explicit-any
    const seasons: any[] = Array.isArray(lg?.season) ? lg.season : [];
    if (!seasons.length) continue;
    const latest = seasons.reduce((a, b) => (Number(b?.year) > Number(a?.year) ? b : a));
    if (latest?.id) out.push({ id: Number(latest.id), name: name || `League ${latest.id}` });
  }
  return out;
}

/**
 * Every season id → its league label ("Iceland Úrvalsdeild"), across all the
 * account's chosen leagues. Used to resolve a fixture's league name from any
 * season/competition id the API hands back — no per-league season guessing.
 */
export async function fetchSeasonNames(key: string): Promise<Record<number, string>> {
  const json = await getJson(`/league-list?key=${key}&chosen_leagues_only=true`);
  // deno-lint-ignore no-explicit-any
  const rows: any[] = Array.isArray(json?.data) ? json.data : [];
  const out: Record<number, string> = {};
  for (const lg of rows) {
    const name = String(lg?.name || lg?.league_name || "").trim();
    if (!name) continue;
    // deno-lint-ignore no-explicit-any
    for (const s of (Array.isArray(lg?.season) ? lg.season : []) as any[]) {
      if (s?.id != null) out[Number(s.id)] = name;
    }
  }
  return out;
}

/** Matches scheduled on a given date (YYYY-MM-DD), across the chosen leagues. */
export async function fetchMatchesOnDate(key: string, date: string): Promise<Record<string, unknown>[]> {
  const json = await getJson(`/todays-matches?key=${key}&date=${date}`);
  return Array.isArray(json?.data) ? json.data : [];
}

/** YYYY-MM-DD, n days from now (UTC). */
function isoDatePlus(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * The leagues (season/competition ids) that actually have fixtures in the next
 * `days` days — auto-discovered each run from today's-matches, so the pipeline
 * only touches leagues in play (fast, and always current as seasons come/go).
 */
export async function fetchActiveLeagues(key: string, days = 3): Promise<{ id: number; name: string }[]> {
  const names = await fetchSeasonNames(key);
  const ids = new Set<number>();
  for (let n = 0; n < days; n++) {
    try {
      for (const m of await fetchMatchesOnDate(key, isoDatePlus(n))) {
        const id = Number((m as Record<string, unknown>).competition_id ?? (m as Record<string, unknown>).season_id);
        if (Number.isFinite(id) && id > 0) ids.add(id);
      }
    } catch { /* skip a bad date, keep the rest */ }
  }
  return [...ids].map((id) => ({ id, name: names[id] ?? `League ${id}` }));
}

// ── Market <-> FootyStats field maps (verified against the API) ─────────────
/** over-% field per market label (works on lastx + league-teams stat objects). */
const OVER_PCT_FIELD: Record<string, string> = {
  "Over 0.5 Goals": "seasonOver05Percentage_overall",
  "Over 1.5 Goals": "seasonOver15Percentage_overall",
  "Over 2.5 Goals": "seasonOver25Percentage_overall",
  "Over 3.5 Goals": "seasonOver35Percentage_overall",
  "Over 4.5 Goals": "seasonOver45Percentage_overall",
  "Over 5.5 Goals": "seasonOver55Percentage_overall",
  "BTTS": "seasonBTTSPercentage_overall",
  "Over 8.5 Corners": "over85CornersPercentage_overall",
  "Over 9.5 Corners": "over95CornersPercentage_overall",
  "Over 10.5 Corners": "over105CornersPercentage_overall",
  "Over 11.5 Corners": "over115CornersPercentage_overall",
  "Over 12.5 Corners": "over125CornersPercentage_overall",
  "Over 2.5 Cards": "over25CardsPercentage_overall",
  "Over 3.5 Cards": "over35CardsPercentage_overall",
  "Over 4.5 Cards": "over45CardsPercentage_overall",
  "Over 5.5 Cards": "over55CardsPercentage_overall",
  "Over 6.5 Cards": "over65CardsPercentage_overall",
};
/** decimal-odds field per market label on a match object (overs + unders). */
const ODDS_FIELD: Record<string, string> = {
  // Goals — over
  "Over 0.5 Goals": "odds_ft_over05",
  "Over 1.5 Goals": "odds_ft_over15",
  "Over 2.5 Goals": "odds_ft_over25",
  "Over 3.5 Goals": "odds_ft_over35",
  "Over 4.5 Goals": "odds_ft_over45",
  "Over 5.5 Goals": "odds_ft_over55",
  // Goals — under
  "Under 0.5 Goals": "odds_ft_under05",
  "Under 1.5 Goals": "odds_ft_under15",
  "Under 2.5 Goals": "odds_ft_under25",
  "Under 3.5 Goals": "odds_ft_under35",
  "Under 4.5 Goals": "odds_ft_under45",
  // BTTS
  "BTTS": "odds_btts_yes",
  "BTTS No": "odds_btts_no",
  // Corners — over
  "Over 8.5 Corners": "odds_corners_over_85",
  "Over 9.5 Corners": "odds_corners_over_95",
  "Over 10.5 Corners": "odds_corners_over_105",
  "Over 11.5 Corners": "odds_corners_over_115",
  "Over 12.5 Corners": "odds_corners_over_125",
  // Corners — under
  "Under 8.5 Corners": "odds_corners_under_85",
  "Under 9.5 Corners": "odds_corners_under_95",
  "Under 10.5 Corners": "odds_corners_under_105",
  "Under 11.5 Corners": "odds_corners_under_115",
  // Cards — over
  "Over 3.5 Cards": "odds_cards_over_35",
  "Over 4.5 Cards": "odds_cards_over_45",
  "Over 5.5 Cards": "odds_cards_over_55",
  "Over 6.5 Cards": "odds_cards_over_65",
  // Cards — under
  "Under 2.5 Cards": "odds_cards_under_25",
  "Under 3.5 Cards": "odds_cards_under_35",
  "Under 4.5 Cards": "odds_cards_under_45",
};

export interface TeamFormStats {
  overPct: Record<string, number>;
  avgGoals: number;
  avgCorners: number;
  avgCards: number;
}

function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }

/** Map a FootyStats stat object (lastx or league-teams) into our form shape. */
export function mapStatsToForm(s: Record<string, any>): TeamFormStats {
  const overPct: Record<string, number> = {};
  for (const [label, field] of Object.entries(OVER_PCT_FIELD)) {
    if (s[field] != null) overPct[label] = num(s[field]);
  }
  const avgCards = s.cardsTotalAVG_overall != null
    ? num(s.cardsTotalAVG_overall)
    : num(s.cardsAVG_overall) + num(s.cardsAgainstAVG_overall);
  return {
    overPct,
    avgGoals: num(s.seasonScoredAVG_overall) + num(s.seasonConcededAVG_overall),
    avgCorners: num(s.cornersTotalAVG_overall),
    avgCards,
  };
}

/** Normalise a match object's per-market odds into our market labels (priced only). */
export function normalizeOdds(m: Record<string, any>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [label, field] of Object.entries(ODDS_FIELD)) {
    const v = Number(m[field]);
    if (Number.isFinite(v) && v > 1) out[label] = v;
  }
  return out;
}

/** Teams in a season (id + name). */
export async function fetchLeagueTeams(seasonId: number, key: string): Promise<{ id: number; name: string }[]> {
  const json = await getJson(`/league-teams?key=${key}&season_id=${seasonId}`);
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data.map((t) => ({ id: t.id, name: t.cleanName || t.name }));
}

/** A team's LAST-10 form (from the /lastx endpoint), mapped into our form shape. */
export async function fetchLast10(teamId: number, key: string): Promise<TeamFormStats | null> {
  const json = await getJson(`/lastx?key=${key}&team_id=${teamId}`);
  const arr: any[] = Array.isArray(json?.data) ? json.data : [];
  if (!arr.length) return null;
  // entries are last 5/6/10 — pick the 10 window (fallback: last entry).
  const pick = arr.find((e) => (e.last_x_match_num ?? e.stats?.last_x_match_num) === 10) ?? arr[arr.length - 1];
  return mapStatsToForm(pick.stats ?? pick);
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

/** A completed match with per-side detail — for form strips + head-to-head. */
export interface DetailedMatch {
  dateUnix: number;
  homeId: number; awayId: number;
  homeName: string; awayName: string;
  hg: number; ag: number;      // home / away goals
  corners: number; cards: number; // match totals
}

/**
 * Upcoming PRICED fixtures for a season, earliest first — the roll-forward
 * source when today's slate is empty. leagueId is set to the season id so it
 * resolves against the configured league-name map.
 */
export async function fetchUpcomingMatches(seasonId: number, key: string): Promise<TodayFixture[]> {
  const json = await getJson(`/league-matches?key=${key}&season_id=${seasonId}`);
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  // Upcoming fixtures — priced OR not. FootyStats usually only prices imminent
  // games, so requiring odds would hide the next 2 days. Form tables rank by the
  // teams' combined average (not odds), so unpriced games still belong; their
  // odds columns simply render "—" until the book prices them.
  return data
    .filter((m) => m.status !== "complete")
    .sort((a, b) => (a.date_unix ?? 0) - (b.date_unix ?? 0))
    .map((m) => ({
      fixtureId: m.id,
      leagueId: seasonId,
      kickoff: m.date_unix ? new Date(m.date_unix * 1000).toISOString() : "",
      homeId: m.homeID ?? m.home_id,
      awayId: m.awayID ?? m.away_id,
      homeName: m.home_name,
      awayName: m.away_name,
      homeLogo: badge(m.home_image),
      awayLogo: badge(m.away_image),
      odds: normalizeOdds(m),
    }));
}

/** All completed matches for a season, with the detail the drill-down needs. */
export async function fetchLeagueMatchesDetailed(seasonId: number, key: string): Promise<DetailedMatch[]> {
  const json = await getJson(`/league-matches?key=${key}&season_id=${seasonId}`);
  const data: any[] = Array.isArray(json?.data) ? json.data : [];
  return data
    .filter((m) => m.status === "complete")
    .map((m) => ({
      dateUnix: m.date_unix,
      homeId: m.homeID ?? m.home_id,
      awayId: m.awayID ?? m.away_id,
      homeName: m.home_name,
      awayName: m.away_name,
      hg: num(m.homeGoalCount),
      ag: num(m.awayGoalCount),
      corners: m.totalCornerCount ?? (num(m.team_a_corners) + num(m.team_b_corners)),
      cards: num(m.team_a_cards_num) + num(m.team_b_cards_num),
    }))
    .filter((m) => m.homeName && m.awayName && Number.isFinite(m.dateUnix));
}

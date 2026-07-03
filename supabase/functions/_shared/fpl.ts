// ============================================================================
// Footy Oracle — shared FPL proxy layer
// Fetches the Fantasy Premier League public API server-side (browser CORS is
// blocked) and maps raw FPL payloads into the LOCKED Footy Oracle contracts in
// src/types/footy.ts. FPL is invisible plumbing — nothing here leaks to the UI
// except the mapped Footy Oracle shapes.
//
// Contract source of truth: src/types/footy.ts + docs/DATA_CONTRACTS.md.
// ============================================================================
import type {
  FantasyPlayer,
  FantasyPosition,
  ClubRef,
  FantasyFixture,
  FantasyGameweekStatus,
  FantasyChip,
} from "../../../src/types/footy.ts";

export const FPL_BASE = "https://fantasy.premierleague.com/api";

/** Locked squad rules (constants, not payload interfaces). */
export const FANTASY_RULES = {
  budget: 100,
  squadSize: 15,
  starters: 11,
  bench: 4,
  perPosition: { GK: 2, DEF: 5, MID: 5, FWD: 3 } as Record<FantasyPosition, number>,
  maxPerClub: 3,
} as const;

const UA = { "User-Agent": "FootyOracle/1.0 (+fantasy proxy)", Accept: "application/json" };

export async function fplGet<T>(path: string): Promise<T> {
  const res = await fetch(`${FPL_BASE}${path}`, { headers: UA });
  if (!res.ok) throw new Error(`FPL ${path} → ${res.status}`);
  return (await res.json()) as T;
}

/* ── raw FPL shapes (server-only; loosely typed) ─────────────────────────── */
export interface FplTeam { id: number; name: string; short_name: string; code: number }
export interface FplElementType { id: number; singular_name_short: string }
export interface FplElement {
  id: number; web_name: string; first_name: string; second_name: string;
  element_type: number; team: number; now_cost: number; status: string; news: string;
  selected_by_percent: string; total_points: number; event_points: number; form: string;
}
export interface FplEvent {
  id: number; name: string; deadline_time: string; finished: boolean;
  is_previous: boolean; is_current: boolean; is_next: boolean; data_checked: boolean;
}
export interface FplBootstrap { events: FplEvent[]; teams: FplTeam[]; element_types: FplElementType[]; elements: FplElement[] }
export interface FplFixture {
  id: number; event: number | null; kickoff_time: string | null; team_h: number; team_a: number;
  team_h_score: number | null; team_a_score: number | null; started: boolean; finished: boolean;
  team_h_difficulty: number; team_a_difficulty: number;
}

/* ── mappers ─────────────────────────────────────────────────────────────── */

export function positionOf(typeId: number, types: FplElementType[]): FantasyPosition {
  const short = types.find((t) => t.id === typeId)?.singular_name_short ?? "";
  if (short === "GKP" || short === "GK") return "GK";
  if (short === "DEF") return "DEF";
  if (short === "MID") return "MID";
  return "FWD";
}

const STATUS_MAP: Record<string, FantasyPlayer["status"]> = {
  a: "available", i: "injured", s: "suspended", d: "doubtful", u: "unavailable", n: "unavailable",
};
export function statusOf(s: string): FantasyPlayer["status"] {
  return STATUS_MAP[s] ?? "available";
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function clubRef(team: FplTeam): ClubRef {
  return {
    id: slug(team.name),
    name: team.name,
    short_name: team.short_name,
    badge_url: `https://resources.premierleague.com/premierleague/badges/50/t${team.code}.png`,
  };
}

export function mapPlayer(el: FplElement, teams: FplTeam[], types: FplElementType[]): FantasyPlayer {
  const team = teams.find((t) => t.id === el.team);
  return {
    id: String(el.id),
    external_id: `fpl_${el.id}`,
    name: `${el.first_name} ${el.second_name}`.trim() || el.web_name,
    position: positionOf(el.element_type, types),
    club: team ? clubRef(team) : { id: "unknown", name: "Unknown", short_name: "UNK" },
    price: Math.round(el.now_cost) / 10,
    status: statusOf(el.status),
    selected_by_percent: Number(el.selected_by_percent) || 0,
    total_points: el.total_points ?? 0,
    gameweek_points: el.event_points ?? 0,
    form: Number(el.form) || 0,
    news: el.news || undefined,
  };
}

/** "2025/26" from the events list (season derived from the first deadline). */
export function seasonLabel(events: FplEvent[]): string {
  const first = events.find((e) => e.id === 1) ?? events[0];
  const y = first ? new Date(first.deadline_time).getUTCFullYear() : new Date().getUTCFullYear();
  return `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
}

/** Resolve the target gameweek: explicit → current → next → 1. */
export function resolveGameweek(events: FplEvent[], requested?: number): FplEvent {
  if (requested) {
    const e = events.find((ev) => ev.id === requested);
    if (e) return e;
  }
  return events.find((e) => e.is_current) ?? events.find((e) => e.is_next) ?? events[0];
}

export function gameweekStatus(event: FplEvent): FantasyGameweekStatus {
  const now = Date.now();
  const deadline = new Date(event.deadline_time).getTime();
  if (event.finished && event.data_checked) return "settled";
  if (event.is_current || (now >= deadline && !event.finished)) return "live";
  if (now < deadline && (event.is_next || event.is_current)) return "open";
  if (now < deadline) return "upcoming";
  return "live";
}

export function mapFixture(fx: FplFixture, teams: FplTeam[]): FantasyFixture {
  const h = teams.find((t) => t.id === fx.team_h);
  const a = teams.find((t) => t.id === fx.team_a);
  const status: FantasyFixture["status"] = fx.finished ? "finished" : fx.started ? "live" : fx.kickoff_time ? "scheduled" : "postponed";
  return {
    id: `fx_${fx.id}`,
    kickoff_time: fx.kickoff_time ?? "",
    home_team: h ? clubRef(h) : { id: "tbd", name: "TBD", short_name: "TBD" },
    away_team: a ? clubRef(a) : { id: "tbd", name: "TBD", short_name: "TBD" },
    status,
    home_score: fx.team_h_score ?? undefined,
    away_score: fx.team_a_score ?? undefined,
  };
}

/** FPL chip code → Footy Oracle chip name. */
export function mapChip(code?: string | null): FantasyChip | undefined {
  switch (code) {
    case "wildcard": return "wildcard";
    case "bboost": return "bench_boost";
    case "3xc": return "triple_captain";
    case "freehit": return "free_hit";
    default: return undefined;
  }
}

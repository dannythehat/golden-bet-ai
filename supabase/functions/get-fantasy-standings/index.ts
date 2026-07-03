// ============================================================================
// Footy Oracle — get-fantasy-standings
// Mini-league leaderboard with rank movement.
// Source: FPL /leagues-classic/{league_id}/standings/ (+ /bootstrap-static/ for
// season + current gameweek). Returns FantasyStandingsResponse.
// The Footy Oracle leagueId slug maps to an FPL numeric id via FPL_LEAGUE_ID.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, fail, preflight, readBody } from "../_shared/api.ts";
import { fplGet, resolveGameweek, gameweekStatus, seasonLabel, type FplBootstrap } from "../_shared/fpl.ts";
import type { FantasyStandingsResponse, FantasyStandingRow, GetFantasyStandingsRequest } from "../../../src/types/footy.ts";

interface FplStandRow {
  id: number; entry: number; entry_name: string; player_name: string;
  rank: number; last_rank: number; total: number; event_total: number;
}
interface FplLeague { league: { id: number; name: string }; standings: { results: FplStandRow[]; has_next: boolean } }

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const { leagueId, gameweek } = await readBody<GetFantasyStandingsRequest>(req);
    // Footy Oracle slug → FPL numeric league id (env-configured for the real league).
    const fplLeagueId = /^\d+$/.test(String(leagueId)) ? String(leagueId) : Deno.env.get("FPL_LEAGUE_ID");
    if (!fplLeagueId) return fail("LEAGUE_NOT_CONFIGURED", "No FPL league id configured for this league.", 404);

    const [boot, league] = await Promise.all([
      fplGet<FplBootstrap>("/bootstrap-static/"),
      fplGet<FplLeague>(`/leagues-classic/${fplLeagueId}/standings/`),
    ]);
    const event = resolveGameweek(boot.events, gameweek);

    const rows: FantasyStandingRow[] = league.standings.results.map((r) => ({
      rank: r.rank,
      previous_rank: r.last_rank > 0 ? r.last_rank : undefined,
      movement: r.last_rank > 0 ? r.last_rank - r.rank : 0,
      team_id: String(r.entry),
      team_name: r.entry_name,
      manager_name: r.player_name,
      gameweek_points: r.event_total,
      total_points: r.total,
      transfers_made: 0,
      transfer_hits: 0,
    }));

    const data: FantasyStandingsResponse = {
      league_id: String(leagueId ?? fplLeagueId),
      season: seasonLabel(boot.events),
      gameweek: event.id,
      status: gameweekStatus(event),
      rows,
      updated_at: new Date().toISOString(),
    };
    return ok(data);
  } catch (err) {
    return fail("FPL_UPSTREAM", `Could not load standings: ${(err as Error).message}`, 502);
  }
});

// ============================================================================
// Footy Oracle — get-fantasy-team
// A manager's 15-player squad: starters/bench, captain, vice, chip, budget.
// Sources: FPL /entry/{id}/, /entry/{id}/event/{gw}/picks/, /bootstrap-static/.
// Returns FantasyTeam (src/types/footy.ts).
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, fail, preflight, readBody } from "../_shared/api.ts";
import {
  fplGet, mapPlayer, mapChip, resolveGameweek, FANTASY_RULES,
  type FplBootstrap,
} from "../_shared/fpl.ts";
import type { FantasyTeam, FantasyTeamSlot, GetFantasyTeamRequest } from "../../../src/types/footy.ts";

interface FplPick { element: number; position: number; is_captain: boolean; is_vice_captain: boolean; multiplier: number }
interface FplPicks {
  active_chip: string | null;
  entry_history: { bank: number; value: number; event_transfers: number; event_transfers_cost: number };
  picks: FplPick[];
}
interface FplEntry { name: string; player_first_name: string; player_last_name: string }

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const { teamId, gameweek } = await readBody<GetFantasyTeamRequest>(req);
    if (!teamId) return fail("MISSING_TEAM_ID", "A teamId is required to load a fantasy team.");

    const boot = await fplGet<FplBootstrap>("/bootstrap-static/");
    const gw = resolveGameweek(boot.events, gameweek).id;

    let entry: FplEntry;
    let picks: FplPicks;
    try {
      [entry, picks] = await Promise.all([
        fplGet<FplEntry>(`/entry/${teamId}/`),
        fplGet<FplPicks>(`/entry/${teamId}/event/${gw}/picks/`),
      ]);
    } catch (_) {
      return fail("TEAM_NOT_FOUND", `No squad found for team ${teamId} in gameweek ${gw}.`, 404);
    }

    const slots: FantasyTeamSlot[] = picks.picks.map((pk) => {
      const el = boot.elements.find((e) => e.id === pk.element)!;
      return {
        player: mapPlayer(el, boot.teams, boot.element_types),
        is_starter: pk.position <= FANTASY_RULES.starters,
        bench_order: pk.position > FANTASY_RULES.starters ? pk.position - FANTASY_RULES.starters : undefined,
        is_captain: pk.is_captain,
        is_vice_captain: pk.is_vice_captain,
      };
    });

    const squadValue = (picks.entry_history?.value ?? 1000) / 10;
    const data: FantasyTeam = {
      id: String(teamId),
      member_id: `fpl_entry_${teamId}`,
      league_id: Deno.env.get("FPL_LEAGUE_ID") ?? "main",
      name: entry.name,
      budget_total: FANTASY_RULES.budget,
      budget_remaining: (picks.entry_history?.bank ?? 0) / 10,
      squad_value: squadValue,
      free_transfers: 1,
      transfer_hits: picks.entry_history?.event_transfers_cost ?? 0,
      active_chip: mapChip(picks.active_chip),
      slots,
      updated_at: new Date().toISOString(),
    };
    return ok(data);
  } catch (err) {
    return fail("FPL_UPSTREAM", `Could not load the team: ${(err as Error).message}`, 502);
  }
});

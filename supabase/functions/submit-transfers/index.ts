// ============================================================================
// Footy Oracle — submit-transfers
// Swap players out/in with free-transfer + points-hit accounting and a deadline
// gate. Returns ApiResponse<SubmitTransfersResponse>. Errors: DEADLINE_PASSED,
// PLAYER_UNAVAILABLE, BUDGET_EXCEEDED, MAX_CLUB_PLAYERS_EXCEEDED,
// INVALID_POSITION_BALANCE.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, fail, preflight, readBody } from "../_shared/api.ts";
import { fplGet, mapPlayer, resolveGameweek, FANTASY_RULES, type FplBootstrap } from "../_shared/fpl.ts";
import { validateSquad } from "../_shared/fantasyRules.ts";
import { serviceClient, loadTeam, saveTeam } from "../_shared/fantasyStore.ts";
import type { SubmitTransfersRequest, SubmitTransfersResponse, FantasyTeamSlot } from "../../../src/types/footy.ts";

const HIT = 4;

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const { teamId, gameweek, outPlayerIds, inPlayerIds } = await readBody<SubmitTransfersRequest>(req);
    if (!teamId || !Array.isArray(outPlayerIds) || !Array.isArray(inPlayerIds)) return fail("BAD_REQUEST", "teamId, outPlayerIds and inPlayerIds are required.");
    if (outPlayerIds.length !== inPlayerIds.length) return fail("BAD_REQUEST", "You must bring in as many players as you ship out.");

    const boot = await fplGet<FplBootstrap>("/bootstrap-static/");
    const event = resolveGameweek(boot.events, gameweek);
    if (Date.now() > new Date(event.deadline_time).getTime()) return fail("DEADLINE_PASSED", "The gameweek deadline has passed. Doors are shut till next week.", 422);

    const sb = serviceClient();
    const team = await loadTeam(sb, teamId);
    if (!team) return fail("STORE_UNAVAILABLE", "No saved squad found for this team.", 404);

    // ensure all outgoing are in the squad
    if (!outPlayerIds.every((id) => team.slots.some((s) => s.player.id === id))) return fail("PLAYER_NOT_IN_SQUAD", "You can only transfer out players in your squad.", 422);

    // map incoming from FPL
    const byId = new Map(boot.elements.map((e) => [String(e.id), e]));
    const incoming = inPlayerIds.map((id) => { const el = byId.get(id); return el ? mapPlayer(el, boot.teams, boot.element_types) : null; });
    if (incoming.some((p) => !p)) return fail("PLAYER_UNAVAILABLE", "One or more incoming players could not be found.", 422);
    const inPlayers = incoming as NonNullable<(typeof incoming)[number]>[];
    const unavailable = inPlayers.find((p) => p.status === "injured" || p.status === "suspended" || p.status === "unavailable");
    if (unavailable) return fail("PLAYER_UNAVAILABLE", `${unavailable.name} is ${unavailable.status} and can't be brought in.`, 422);

    // build the post-transfer squad (like-for-like by index preserves lineup role)
    const newSlots: FantasyTeamSlot[] = team.slots.map((s) => {
      const idx = outPlayerIds.indexOf(s.player.id);
      if (idx === -1) return s;
      return { ...s, player: inPlayers[idx] };
    });

    const squad = newSlots.map((s) => s.player);
    const v = validateSquad(squad);
    if (!v.valid) return fail(v.code ?? "INVALID_SQUAD", v.errors[0], 422, { errors: v.errors });

    const spend = squad.reduce((sum, p) => sum + p.price, 0);
    if (spend > FANTASY_RULES.budget + 1e-9) return fail("BUDGET_EXCEEDED", `That leaves you £${(spend - FANTASY_RULES.budget).toFixed(1)}m over budget.`, 422);

    const count = outPlayerIds.length;
    const freeUsed = Math.min(count, team.free_transfers);
    const hitPoints = Math.max(0, count - team.free_transfers) * HIT;

    team.slots = newSlots;
    team.squad_value = Math.round(spend * 10) / 10;
    team.budget_remaining = Math.round((FANTASY_RULES.budget - spend) * 10) / 10;
    team.free_transfers = Math.max(0, team.free_transfers - freeUsed);
    team.transfer_hits = (team.transfer_hits ?? 0) + hitPoints;
    team.updated_at = new Date().toISOString();
    await saveTeam(sb, team);

    const data: SubmitTransfersResponse = {
      team, free_transfers_used: freeUsed, hit_points: hitPoints, applies_to_gameweek: event.id,
      validation: { valid: true, errors: [], warnings: v.warnings },
    };
    return ok(data);
  } catch (err) {
    return fail("TRANSFERS_FAILED", `Could not submit transfers: ${(err as Error).message}`, 500);
  }
});

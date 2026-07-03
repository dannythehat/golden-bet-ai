// ============================================================================
// Footy Oracle — save-squad
// Validate a draft squad against the locked rules and persist it.
// Returns ApiResponse<SaveSquadResponse>. Errors use typed codes
// (INVALID_POSITION_BALANCE, BUDGET_EXCEEDED, MAX_CLUB_PLAYERS_EXCEEDED,
// INVALID_FORMATION, …).
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, fail, preflight, readBody } from "../_shared/api.ts";
import { fplGet, mapPlayer, FANTASY_RULES, type FplBootstrap } from "../_shared/fpl.ts";
import { validateSquad, validateLineup } from "../_shared/fantasyRules.ts";
import { serviceClient, loadTeam, saveTeam } from "../_shared/fantasyStore.ts";
import type { SaveSquadRequest, SaveSquadResponse, FantasyTeam, FantasyTeamSlot } from "../../../src/types/footy.ts";

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const body = await readBody<SaveSquadRequest>(req);
    const { teamId, playerIds, starters, bench, captainId, viceCaptainId } = body;
    if (!teamId || !Array.isArray(playerIds)) return fail("BAD_REQUEST", "A teamId and playerIds are required.");

    const boot = await fplGet<FplBootstrap>("/bootstrap-static/");
    const byId = new Map(boot.elements.map((e) => [String(e.id), e]));
    const players = playerIds.map((id) => {
      const el = byId.get(id);
      return el ? mapPlayer(el, boot.teams, boot.element_types) : null;
    });
    if (players.some((p) => !p)) return fail("PLAYER_UNAVAILABLE", "One or more selected players could not be found.");
    const squad = players as NonNullable<(typeof players)[number]>[];

    const sV = validateSquad(squad);
    if (!sV.valid) return fail(sV.code ?? "INVALID_SQUAD", sV.errors[0], 422, { errors: sV.errors });
    const lV = validateLineup(squad, starters, bench, captainId, viceCaptainId);
    if (!lV.valid) return fail(lV.code ?? "INVALID_FORMATION", lV.errors[0], 422, { errors: lV.errors });

    const sb = serviceClient();
    const existing = await loadTeam(sb, teamId);
    const spend = squad.reduce((s, p) => s + p.price, 0);
    const slots: FantasyTeamSlot[] = squad.map((player) => ({
      player,
      is_starter: starters.includes(player.id),
      bench_order: bench.includes(player.id) ? bench.indexOf(player.id) + 1 : undefined,
      is_captain: player.id === captainId,
      is_vice_captain: player.id === viceCaptainId,
    }));

    const team: FantasyTeam = {
      id: teamId,
      member_id: existing?.member_id ?? `member_${teamId}`,
      league_id: existing?.league_id ?? Deno.env.get("FPL_LEAGUE_ID") ?? "main-2025-26",
      name: existing?.name ?? "My Team",
      avatar_url: existing?.avatar_url,
      budget_total: FANTASY_RULES.budget,
      budget_remaining: Math.round((FANTASY_RULES.budget - spend) * 10) / 10,
      squad_value: Math.round(spend * 10) / 10,
      free_transfers: existing?.free_transfers ?? 1,
      transfer_hits: existing?.transfer_hits ?? 0,
      active_chip: existing?.active_chip,
      slots,
      updated_at: new Date().toISOString(),
    };
    await saveTeam(sb, team);

    const data: SaveSquadResponse = { team, validation: { valid: true, errors: [], warnings: [...sV.warnings, ...lV.warnings] } };
    return ok(data);
  } catch (err) {
    return fail("SAVE_FAILED", `Could not save the squad: ${(err as Error).message}`, 500);
  }
});

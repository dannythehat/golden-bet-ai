// ============================================================================
// Footy Oracle — set-captain
// Set the captain on a stored squad. Returns ApiResponse<CaptainMutationResponse>.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, fail, preflight, readBody } from "../_shared/api.ts";
import { serviceClient, loadTeam, saveTeam } from "../_shared/fantasyStore.ts";
import type { SetCaptainRequest, CaptainMutationResponse } from "../../../src/types/footy.ts";

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const { teamId, playerId } = await readBody<SetCaptainRequest>(req);
    if (!teamId || !playerId) return fail("BAD_REQUEST", "A teamId and playerId are required.");

    const sb = serviceClient();
    const team = await loadTeam(sb, teamId);
    if (!team) return fail("STORE_UNAVAILABLE", "No saved squad found for this team.", 404);

    const target = team.slots.find((s) => s.player.id === playerId);
    if (!target) return fail("PLAYER_NOT_IN_SQUAD", "That player is not in your squad.", 422);
    if (!target.is_starter) return fail("INVALID_CAPTAIN", "Your captain must be in the starting XI.", 422);

    team.slots = team.slots.map((s) => ({
      ...s,
      is_captain: s.player.id === playerId,
      // captain can't also be vice
      is_vice_captain: s.player.id === playerId ? false : s.is_vice_captain,
    }));
    team.updated_at = new Date().toISOString();
    await saveTeam(sb, team);

    const data: CaptainMutationResponse = { team, updated_at: team.updated_at };
    return ok(data);
  } catch (err) {
    return fail("CAPTAIN_FAILED", `Could not set the captain: ${(err as Error).message}`, 500);
  }
});

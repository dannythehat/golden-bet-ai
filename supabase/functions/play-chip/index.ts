// ============================================================================
// Footy Oracle — play-chip
// Activate a chip for a gameweek. Chips are RESERVED in the v1 schema
// (wildcard, bench_boost, triple_captain, free_hit): this records the choice on
// the stored squad; full scoring effects land after the core loop.
// Returns ApiResponse<PlayChipResponse>.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, fail, preflight, readBody } from "../_shared/api.ts";
import { serviceClient, loadTeam, saveTeam } from "../_shared/fantasyStore.ts";
import type { PlayChipRequest, PlayChipResponse, FantasyChip } from "../../../src/types/footy.ts";

const CHIPS: FantasyChip[] = ["wildcard", "bench_boost", "triple_captain", "free_hit"];

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const { teamId, chip, gameweek } = await readBody<PlayChipRequest>(req);
    if (!teamId || !chip) return fail("BAD_REQUEST", "A teamId and chip are required.");
    if (!CHIPS.includes(chip)) return fail("INVALID_CHIP", `Unknown chip "${chip}".`, 422);

    const sb = serviceClient();
    const team = await loadTeam(sb, teamId);
    if (!team) return fail("STORE_UNAVAILABLE", "No saved squad found for this team.", 404);
    if (team.active_chip) return fail("CHIP_ALREADY_ACTIVE", `You already have ${team.active_chip} active this gameweek.`, 422);

    team.active_chip = chip;
    const activated_at = new Date().toISOString();
    team.updated_at = activated_at;
    await saveTeam(sb, team);

    const data: PlayChipResponse = { team, chip, gameweek, activated_at };
    return ok(data);
  } catch (err) {
    return fail("CHIP_FAILED", `Could not play the chip: ${(err as Error).message}`, 500);
  }
});

// ============================================================================
// Footy Oracle — get-fantasy-gameweek
// Current (or requested) gameweek: deadline, status, fixtures, bonus rules.
// Source: FPL /bootstrap-static/ + /fixtures/?event={gw}. Returns
// FantasyGameweekResponse (src/types/footy.ts). No contract changes.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, fail, preflight, readBody } from "../_shared/api.ts";
import {
  fplGet, resolveGameweek, gameweekStatus, seasonLabel, mapFixture,
  type FplBootstrap, type FplFixture,
} from "../_shared/fpl.ts";
import type { FantasyGameweekResponse, GetFantasyGameweekRequest } from "../../../src/types/footy.ts";

// The Gaffer Bonus is an admin/manual presentation concept in v1 (per contract).
const BONUS_RULES: FantasyGameweekResponse["bonus_rules"] = [
  { key: "manual_bonus", label: "Gaffer Bonus", description: "Optional 0–3 bonus points, awarded by The Gaffer for standout performances." },
];

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const { gameweek } = await readBody<GetFantasyGameweekRequest>(req);
    const boot = await fplGet<FplBootstrap>("/bootstrap-static/");
    const event = resolveGameweek(boot.events, gameweek);
    if (!event) return fail("NO_GAMEWEEK", "No gameweek could be resolved from the FPL calendar.", 404);

    let fixtures: FantasyGameweekResponse["fixtures"] = [];
    try {
      const raw = await fplGet<FplFixture[]>(`/fixtures/?event=${event.id}`);
      fixtures = raw.map((fx) => mapFixture(fx, boot.teams));
    } catch (_) {
      fixtures = [];
    }

    const data: FantasyGameweekResponse = {
      season: seasonLabel(boot.events),
      gameweek: event.id,
      status: gameweekStatus(event),
      deadline_at: event.deadline_time,
      fixtures,
      bonus_rules: BONUS_RULES,
      updated_at: new Date().toISOString(),
    };
    return ok(data);
  } catch (err) {
    return fail("FPL_UPSTREAM", `Could not load the gameweek: ${(err as Error).message}`, 502);
  }
});

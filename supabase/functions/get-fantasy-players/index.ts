// ============================================================================
// Footy Oracle — get-fantasy-players
// Filterable/sortable player pool for Pick Squad + Transfers.
// Source: FPL /bootstrap-static/. Returns FantasyPlayersResponse.
// Supports filters: position, club, min/max price, search, sort, direction,
// limit, offset. Locked rules (£100m / 15 / 2·5·5·3 / max 3 per club) are
// enforced client-side + in save-squad; this endpoint is the catalogue.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, fail, preflight, readBody } from "../_shared/api.ts";
import { fplGet, mapPlayer, type FplBootstrap } from "../_shared/fpl.ts";
import type {
  FantasyPlayersResponse, FantasyPlayer, FantasyPlayersFilters, GetFantasyPlayersRequest,
} from "../../../src/types/footy.ts";

const SORT_KEY: Record<NonNullable<FantasyPlayersFilters["sort"]>, (p: FantasyPlayer) => number | string> = {
  price: (p) => p.price,
  total_points: (p) => p.total_points,
  form: (p) => p.form ?? 0,
  selected_by_percent: (p) => p.selected_by_percent ?? 0,
  name: (p) => p.name.toLowerCase(),
};

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const { filters = {} } = await readBody<GetFantasyPlayersRequest>(req);
    const boot = await fplGet<FplBootstrap>("/bootstrap-static/");
    let players = boot.elements.map((el) => mapPlayer(el, boot.teams, boot.element_types));

    if (filters.position) players = players.filter((p) => p.position === filters.position);
    if (filters.club) {
      const c = filters.club.toLowerCase();
      players = players.filter((p) => p.club.id === c || p.club.short_name?.toLowerCase() === c);
    }
    if (typeof filters.min_price === "number") players = players.filter((p) => p.price >= filters.min_price!);
    if (typeof filters.max_price === "number") players = players.filter((p) => p.price <= filters.max_price!);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      players = players.filter((p) => p.name.toLowerCase().includes(q) || p.club.name.toLowerCase().includes(q));
    }

    const sortBy = filters.sort ?? "total_points";
    const dir = filters.direction ?? (sortBy === "name" ? "asc" : "desc");
    const key = SORT_KEY[sortBy];
    players.sort((a, b) => {
      const av = key(a), bv = key(b);
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return dir === "asc" ? cmp : -cmp;
    });

    const total = players.length;
    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? 50;
    const page = players.slice(offset, offset + limit);

    const data: FantasyPlayersResponse = {
      players: page,
      total,
      filters: { ...filters, sort: sortBy, direction: dir, limit, offset },
      updated_at: new Date().toISOString(),
    };
    return ok(data);
  } catch (err) {
    return fail("FPL_UPSTREAM", `Could not load players: ${(err as Error).message}`, 502);
  }
});

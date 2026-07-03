// ============================================================================
// Footy Oracle — get-fantasy-prizes
// Admin-set prize config (NOT from FPL). Reads the `fantasy_prizes` table if it
// exists, otherwise returns a typed fallback. Returns FantasyPrizesResponse.
//
// NOTE (contract): FantasyPrize.category is 'weekly' | 'random' | 'themed' |
// 'seasonal'. The locked prize list also mentions a "monthly" cadence, which the
// union cannot express. Flagged to add `'monthly'` to the union before use — see
// the summary. Until then monthly prizes are modelled as 'themed'.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { ok, fail, preflight, readBody } from "../_shared/api.ts";
import type { FantasyPrizesResponse, FantasyPrize, GetFantasyPrizesRequest } from "../../../src/types/footy.ts";

function fallbackPrizes(season: string): FantasyPrize[] {
  const p = (o: Partial<FantasyPrize> & Pick<FantasyPrize, "id" | "title" | "description" | "category">): FantasyPrize => ({
    season, enabled: true, ...o,
  });
  return [
    p({ id: "prize_tropical_holiday", title: "Tropical Escape", description: "The season headline — a dream holiday for the overall Fantasy League champion.", category: "seasonal", image_url: "/images/fantasy/prizes/prize-tropical.jpg" }),
    p({ id: "prize_weekly_cash", title: "Weekly Cash Prize", description: "Top the gameweek and take home cold, hard cash. Every single week.", category: "weekly", image_url: "/images/fantasy/prizes/prize-voucher.jpg" }),
    p({ id: "prize_luxury_weekend", title: "Luxury Weekend Away", description: "A monthly escape in style, on the club.", category: "themed", image_url: "/images/fantasy/prizes/prize-villa.jpg" }),
    p({ id: "prize_football_experiences", title: "Football Experiences", description: "Matchday tickets and money-can't-buy days out.", category: "themed", image_url: "/images/fantasy/prizes/prize-experiences.jpg" }),
    p({ id: "prize_xmas_hamper", title: "£1,000 Christmas Hamper", description: "A themed festive giveaway during the Christmas fixture rush.", category: "themed", starts_at: `${season.slice(0, 4)}-11-20T00:00:00Z`, ends_at: `${season.slice(0, 4)}-12-26T23:59:59Z` }),
    p({ id: "prize_donkey", title: "Donkey of the Week", description: "Finish bottom and wear the ears with pride. Fame — of a sort.", category: "random", image_url: "/images/fantasy/prizes/prize-donkey.jpg" }),
  ];
}

serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  try {
    const { season } = await readBody<GetFantasyPrizesRequest>(req);
    const seasonKey = season || "2025/26";

    let prizes: FantasyPrize[] | null = null;
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data, error } = await supabase
        .from("fantasy_prizes")
        .select("id, season, title, description, image_url, category, starts_at, ends_at, enabled")
        .eq("season", seasonKey)
        .eq("enabled", true);
      if (!error && data && data.length) prizes = data as FantasyPrize[];
    } catch (_) {
      prizes = null;
    }

    const data: FantasyPrizesResponse = {
      season: seasonKey,
      prizes: prizes ?? fallbackPrizes(seasonKey),
      updated_at: new Date().toISOString(),
    };
    return ok(data);
  } catch (err) {
    return fail("PRIZES_ERROR", `Could not load prizes: ${(err as Error).message}`, 500);
  }
});

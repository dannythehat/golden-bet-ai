// ============================================================================
// Footy Oracle — get-fantasy-prizes
// Admin-set prize config (NOT from FPL). Reads the `fantasy_prizes` table if it
// exists, otherwise returns a typed fallback. Returns FantasyPrizesResponse.
//
// Prizes are admin-driven and NON-CASH only. This fallback is illustrative
// sample config used until the `fantasy_prizes` table is populated; the real
// prizes come from Supabase. Never hard-code cash or fixed reward logic.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { ok, fail, preflight, readBody } from "../_shared/api.ts";
import type { FantasyPrizesResponse, FantasyPrize, GetFantasyPrizesRequest } from "../../../src/types/footy.ts";

function fallbackPrizes(season: string): FantasyPrize[] {
  const p = (o: Partial<FantasyPrize> & Pick<FantasyPrize, "id" | "title" | "description" | "category">): FantasyPrize => ({
    season, enabled: true, ...o,
  });
  const yr = season.slice(0, 4);
  return [
    // ── serious leaderboard rewards ──
    p({ id: "prize_season_trip", title: "Tropical Escape", description: "The season champion's grand reward — a dream footy getaway.", category: "seasonal", trigger: "season_top", tone: "serious", reward_type: "trip", image_url: "/images/fantasy/prizes/prize-tropical.jpg" }),
    p({ id: "prize_monthly_trip", title: "Luxury Weekend Away", description: "Top the monthly standings for an escape in style.", category: "monthly", trigger: "monthly_top", tone: "serious", reward_type: "trip", image_url: "/images/fantasy/prizes/prize-villa.jpg" }),
    p({ id: "prize_gw_experience", title: "Matchday Experience", description: "Highest scorer of the gameweek bags an exclusive day out.", category: "weekly", trigger: "gameweek_top", tone: "serious", reward_type: "experience", image_url: "/images/fantasy/prizes/prize-experiences.jpg" }),
    p({ id: "prize_climber_voucher", title: "Climber's Reward", description: "The biggest rank climber of the week earns a Footy Oracle voucher.", category: "weekly", trigger: "rank_climber", tone: "serious", reward_type: "voucher", image_url: "/images/fantasy/prizes/prize-voucher.jpg" }),
    p({ id: "prize_best_bench", title: "Super Sub Special", description: "Best bench points of the week — reward for the ones you left out.", category: "weekly", trigger: "best_bench", tone: "serious", reward_type: "merch" }),
    // ── funny engagement rewards (for managers having a nightmare) ──
    p({ id: "prize_worst_captain", title: "Captain Calamity", description: "Pick the week's worst captain and claim a consolation special. Ouch.", category: "random", trigger: "worst_captain", tone: "fun", reward_type: "special" }),
    p({ id: "prize_donkey", title: "Donkey of the Week", description: "Finish bottom and claim the ears — a badge of dishonour and a little something.", category: "random", trigger: "wooden_spoon", tone: "fun", reward_type: "merch", image_url: "/images/fantasy/prizes/prize-donkey.jpg" }),
    // ── themed calendar special ──
    p({ id: "prize_festive_hamper", title: "Festive Hamper Special", description: "A themed hamper giveaway during the Christmas fixture rush.", category: "themed", trigger: "themed", tone: "serious", reward_type: "special", starts_at: `${yr}-11-20T00:00:00Z`, ends_at: `${yr}-12-26T23:59:59Z` }),
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
        .select("id, season, title, description, image_url, category, trigger, tone, reward_type, starts_at, ends_at, enabled")
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

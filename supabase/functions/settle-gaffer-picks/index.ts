// ============================================================================
// Footy Oracle — settle-gaffer-picks
// For pending picks whose fixtures have finished, fetch the real results,
// decide win/loss honestly (every leg must land), and write the P&L.
// Schedule a few times each evening. Needs FOOTYSTATS_KEY.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { fetchMatchResult, type MatchResult } from "../_shared/footystats.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Did a single leg's market land, given the real match result? */
function legHit(market: string, r: MatchResult): boolean {
  const m = market.toLowerCase();
  if (m.includes("btts")) return r.btts;
  const mark = Number((market.match(/(\d+\.\d+)/) || [])[1]);
  if (!Number.isFinite(mark)) return false;
  const val = m.includes("corner") ? r.corners : m.includes("card") ? r.cards : r.goals;
  return val > mark;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fsKey = Deno.env.get("FOOTYSTATS_KEY");
  if (!fsKey) return json({ ok: false, error: "FOOTYSTATS_KEY not configured" }, 500);
  const admin = createClient(url, svc, { auth: { persistSession: false } });

  // Settle anything still live (published) or legacy pending whose date has passed.
  const { data: pending } = await admin.from("gaffer_picks")
    .select("*").in("status", ["published", "pending"]).lte("pick_date", new Date().toISOString().slice(0, 10));

  let settled = 0; const stillPending: string[] = [];
  for (const p of pending ?? []) {
    const legs = (p.legs as { fixtureId: number; market: string }[]) ?? [];
    let allComplete = true; let allHit = true;
    for (const leg of legs) {
      const r = await fetchMatchResult(leg.fixtureId, fsKey);
      if (!r || r.status !== "complete") { allComplete = false; break; }
      if (!legHit(leg.market, r)) allHit = false;
    }
    if (!allComplete) { stillPending.push(p.pick_date); continue; }

    const won = allHit;
    const pl = won ? Math.round((Number(p.combined_odds) * Number(p.stake) - Number(p.stake)) * 100) / 100 : -Number(p.stake);
    const { error } = await admin.from("gaffer_picks")
      .update({ status: won ? "won" : "lost", profit_loss: pl, settled_at: new Date().toISOString() })
      .eq("id", p.id);
    if (!error) settled++;
  }
  return json({ ok: true, settled, still_pending: stillPending });
});

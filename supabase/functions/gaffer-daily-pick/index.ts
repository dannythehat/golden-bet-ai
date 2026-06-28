// ============================================================================
// Footy Oracle — gaffer-daily-pick
// Each morning: read today's fixtures + odds, look up both teams' last-10 form,
// run the Gaffer value engine, and store the day's pick(s) in gaffer_picks.
// Schedule daily (after ingest-form-stats). Needs FOOTYSTATS_KEY.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { fetchTodaysMatches } from "../_shared/footystats.ts";
import { selectDailyPicks, type Fixture, type TeamForm } from "../_shared/gafferEngine.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fsKey = Deno.env.get("FOOTYSTATS_KEY");
  if (!fsKey) return json({ ok: false, error: "FOOTYSTATS_KEY not configured" }, 500);
  const admin = createClient(url, svc, { auth: { persistSession: false } });

  // Form for every team we've ingested.
  const { data: forms } = await admin.from("form_tables").select("team_id,team,stats").eq("window_size", 10);
  const byId = new Map<number, TeamForm>();
  const byName = new Map<string, TeamForm>();
  for (const f of forms ?? []) {
    if (f.team_id != null) byId.set(f.team_id, f.stats as TeamForm);
    byName.set(f.team, f.stats as TeamForm);
  }

  const fixtures = await fetchTodaysMatches(fsKey);
  const engineFixtures: Fixture[] = [];
  for (const f of fixtures) {
    const home = byId.get(f.homeId) ?? byName.get(f.homeName);
    const away = byId.get(f.awayId) ?? byName.get(f.awayName);
    if (!home || !away || Object.keys(f.odds).length === 0) continue; // need form on both sides + a price
    engineFixtures.push({
      fixtureId: f.fixtureId, league: String(f.leagueId), kickoff: f.kickoff,
      homeTeam: f.homeName, awayTeam: f.awayName, home, away, odds: f.odds,
    });
  }

  const selection = selectDailyPicks(engineFixtures);
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await admin.from("gaffer_picks").upsert({
    pick_date: today,
    bet_type: selection.betType,
    stake: selection.stake,
    combined_odds: selection.combinedOdds,
    potential_return: selection.potentialReturn,
    legs: selection.legs,
    reasoning: selection.reasoning,
    status: selection.betType === "none" ? "void" : "pending",
  }, { onConflict: "pick_date" });
  if (error) return json({ ok: false, error: error.message }, 500);

  return json({ ok: true, fixtures_considered: engineFixtures.length, selection });
});

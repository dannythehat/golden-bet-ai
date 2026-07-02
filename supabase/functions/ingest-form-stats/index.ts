// ============================================================================
// Footy Oracle — ingest-form-stats
// Pulls last-10 form for every team in the configured leagues from FootyStats
// and upserts it into form_tables (powers the form tables + the Gaffer engine).
// Schedule daily. Needs FOOTYSTATS_KEY + the league season_ids configured.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { fetchLeagueTeams, fetchLast10, fetchChosenLeagues } from "../_shared/footystats.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// "1625:England Premier League,2:Scotland Premiership,..." in FOOTYSTATS_SEASON_IDS
function configuredLeagues(): { id: number; name: string }[] {
  return (Deno.env.get("FOOTYSTATS_SEASON_IDS") || "").split(",").map((s) => s.trim()).filter(Boolean)
    .map((s) => { const [id, ...n] = s.split(":"); return { id: Number(id), name: n.join(":") || `League ${id}` }; });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fsKey = Deno.env.get("FOOTYSTATS_KEY");
  if (!fsKey) return json({ ok: false, error: "FOOTYSTATS_KEY not configured" }, 500);
  const admin = createClient(url, svc, { auth: { persistSession: false } });

  let body: { leagues?: { id: number; name: string }[] } = {};
  try { body = await req.json(); } catch { /* no body */ }
  let leagues = body.leagues?.length ? body.leagues : configuredLeagues();
  // Fallback: no FOOTYSTATS_SEASON_IDS configured -> discover the account's chosen leagues from the key.
  if (!leagues.length) leagues = await fetchChosenLeagues(fsKey);
  if (!leagues.length) return json({ ok: false, error: "no leagues configured" }, 400);

  let upserts = 0; const errors: string[] = [];
  for (const lg of leagues) {
    try {
      const teams = await fetchLeagueTeams(lg.id, fsKey);
      for (const t of teams) {
        const form = await fetchLast10(t.id, fsKey);
        if (!form) continue;
        const { error } = await admin.from("form_tables").upsert(
          { league_id: lg.id, league_name: lg.name, team_id: t.id, team: t.name, window_size: 10, stats: form, updated_at: new Date().toISOString() },
          { onConflict: "league_id,team,window_size" },
        );
        if (error) errors.push(`${lg.name}/${t.name}: ${error.message}`); else upserts++;
      }
    } catch (e) { errors.push(`${lg.name}: ${(e as Error).message}`); }
  }
  return json({ ok: true, leagues: leagues.length, upserts, errors });
});

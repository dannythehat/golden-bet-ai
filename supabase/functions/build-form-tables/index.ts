// ============================================================================
// Footy Oracle — build-form-tables
// Assemble today's form-table slate: today's fixtures + odds + each team's
// last-10 form -> per-fixture rows, stored in daily_form_tables for the
// /form-tables page to read. Schedule daily after ingest-form-stats.
// Needs FOOTYSTATS_KEY (+ FOOTYSTATS_SEASON_IDS for league names).
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { fetchTodaysMatches } from "../_shared/footystats.ts";
import { buildFormTables, type TeamFormStats } from "../_shared/formTableRows.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** "16696:Iceland Urvalsdeild,16558:Norway Eliteserien" -> { id: name } */
function leagueNames(): Record<number, string> {
  const out: Record<number, string> = {};
  for (const part of (Deno.env.get("FOOTYSTATS_SEASON_IDS") || "").split(",")) {
    const [id, ...n] = part.trim().split(":");
    if (id && Number(id)) out[Number(id)] = n.join(":") || `League ${id}`;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const fsKey = Deno.env.get("FOOTYSTATS_KEY");
  if (!fsKey) return json({ ok: false, error: "FOOTYSTATS_KEY not configured" }, 500);
  const admin = createClient(url, svc, { auth: { persistSession: false } });

  // Form lookup for every ingested team.
  const { data: forms } = await admin.from("form_tables").select("team_id,team,stats").eq("window_size", 10);
  const byId = new Map<number, TeamFormStats>();
  const byName = new Map<string, TeamFormStats>();
  for (const f of forms ?? []) {
    if (f.team_id != null) byId.set(f.team_id, f.stats as TeamFormStats);
    byName.set(f.team, f.stats as TeamFormStats);
  }
  const formFor = (id: number, name: string) => byId.get(id) ?? byName.get(name) ?? null;

  const today = new Date().toISOString().slice(0, 10);
  const fixtures = await fetchTodaysMatches(fsKey);
  const payload = buildFormTables(fixtures, formFor, leagueNames(), today);

  const { error } = await admin.from("daily_form_tables").upsert(
    { table_date: today, leagues: payload.leagues, fixtures: payload.fixtures, updated_at: new Date().toISOString() },
    { onConflict: "table_date" },
  );
  if (error) return json({ ok: false, error: error.message }, 500);

  return json({ ok: true, date: today, leagues: payload.leagues.length, fixtures: payload.fixtures.length });
});

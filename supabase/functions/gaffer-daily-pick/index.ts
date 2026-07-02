// ============================================================================
// Footy Oracle — gaffer-daily-pick
// Each morning: read today's fixtures + odds, look up both teams' last-10 form,
// run the Gaffer value engine, dress each leg in the Gaffer's REAL voice, and
// store the day's pick(s) in gaffer_picks in the shape the homepage reads.
// Schedule daily (after ingest-form-stats). Needs FOOTYSTATS_KEY.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { fetchTodaysMatches, fetchChosenLeagues, type TodayFixture } from "../_shared/footystats.ts";
import { selectDailyPicks, type Fixture, type TeamForm, type Candidate } from "../_shared/gafferEngine.ts";
import { gafferReason, gafferPickLine, gafferNoBetLine, type Market, type PickSignals } from "../_shared/gafferVoice.ts";

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

/** Engine market label -> the Gaffer's market category. */
function marketCategory(market: string): Market {
  const m = market.toLowerCase();
  if (m.includes("corner")) return "Corners";
  if (m.includes("card")) return "Cards";
  if (m.includes("btts")) return "BTTS";
  return "Goals";
}

/** STRONG when the form's emphatic; otherwise a VALUE play. */
function tierOf(c: Candidate): "strong" | "value" {
  return c.edge >= 20 || c.formProb >= 80 ? "strong" : "value";
}

/** Build the rich-voice signals for one candidate leg. */
function signalsOf(c: Candidate): PickSignals {
  return {
    team: c.homeTeam, opp: c.awayTeam, market: marketCategory(c.market),
    selection: c.market, odds: c.odds, pct: c.formProb, edge: c.edge, tier: tierOf(c),
  };
}

/** Translate an engine Candidate into the leg shape the homepage board reads. */
function dressLeg(c: Candidate, fx: TodayFixture | undefined, leagueName: string | undefined) {
  return {
    fixtureId: c.fixtureId,
    home_team: c.homeTeam,
    away_team: c.awayTeam,
    home_logo: fx?.homeLogo ?? null,
    away_logo: fx?.awayLogo ?? null,
    league: leagueName ?? "",
    region: "Today",
    kickoff_time: fx?.kickoff ?? c.kickoff ?? "",
    market: c.market,
    selection: c.market,
    odds: c.odds,
    formProb: c.formProb,
    impliedProb: c.impliedProb,
    edge: c.edge,
    avgLine: c.avgLine,
    // The Gaffer's real voice — fresh, anti-repeat, fixture-seeded.
    gaffer_line: gafferReason(signalsOf(c), String(c.fixtureId)),
  };
}

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

  const names = leagueNames();
  // Fallback: no FOOTYSTATS_SEASON_IDS -> discover the account's chosen leagues from the key (for labels).
  if (!Object.keys(names).length) {
    for (const lg of await fetchChosenLeagues(fsKey)) names[lg.id] = lg.name;
  }
  const fixtures = await fetchTodaysMatches(fsKey);
  const fxById = new Map<number | string, TodayFixture>();
  const engineFixtures: Fixture[] = [];
  for (const f of fixtures) {
    fxById.set(f.fixtureId, f);
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

  // Dress the legs in the Gaffer's voice + the homepage's field names.
  const legs = selection.legs.map((c) =>
    dressLeg(c, fxById.get(c.fixtureId), names[Number(c.league)] ?? undefined),
  );

  // Hero copy: a full rich line for the lead pick, or an honest no-bet line.
  const lead = selection.legs[0];
  const gafferIntro = lead ? gafferPickLine(signalsOf(lead), today) : gafferNoBetLine(today);
  const reasoning = legs.length ? legs.map((l) => l.gaffer_line).join("  ") : gafferIntro;
  const title = selection.betType === "double"
    ? "Today's Daily Double"
    : selection.betType === "single"
      ? "Today's Daily Single"
      : "No Bet Today";

  const { error } = await admin.from("gaffer_picks").upsert({
    pick_date: today,
    bet_type: selection.betType,
    stake: selection.stake,
    combined_odds: selection.combinedOdds,
    potential_return: selection.potentialReturn,
    legs,
    title,
    gaffer_intro: gafferIntro,
    reasoning,
    // 'published' = show on the live board; 'void' = an honest no-bet day.
    status: selection.betType === "none" ? "void" : "published",
  }, { onConflict: "pick_date" });
  if (error) return json({ ok: false, error: error.message }, 500);

  return json({ ok: true, fixtures_considered: engineFixtures.length, bet_type: selection.betType, legs: legs.length });
});

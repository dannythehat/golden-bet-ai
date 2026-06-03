// Tier 2 — "Why this bet?" Gaffer explainer
// On-demand AI breakdown of a single pick using form, intelligence, referee, h2h data.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { fixtureId, homeTeam, awayTeam, league, market, odds, mlConfidence, valueEdge, gafferReasoning } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull match_intelligence + referee context if available
    let intel: any = null;
    if (fixtureId) {
      const { data } = await supabase
        .from("match_intelligence")
        .select("weather_summary,is_adverse_weather,wind_kph,referee_name,is_new_manager_home,is_new_manager_away,key_players_out_home,key_players_out_away,kickoff_hour,h2h_summary,is_derby")
        .eq("fixture_id", String(fixtureId))
        .maybeSingle();
      intel = data;
    }

    const ctx: string[] = [];
    ctx.push(`Fixture: ${homeTeam} vs ${awayTeam} (${league})`);
    ctx.push(`Market: ${market} @ ${odds}`);
    if (mlConfidence != null) ctx.push(`Model confidence: ${(mlConfidence * 100).toFixed(0)}%`);
    if (valueEdge != null) ctx.push(`Value edge: +${(valueEdge * 100).toFixed(1)}%`);
    if (intel?.referee_name) ctx.push(`Referee: ${intel.referee_name}`);
    if (intel?.is_adverse_weather) ctx.push(`Weather: adverse (${intel.weather_summary || ""}, wind ${intel.wind_kph || "?"}kph)`);
    else if (intel?.weather_summary) ctx.push(`Weather: ${intel.weather_summary}`);
    if (intel?.is_new_manager_home) ctx.push(`New manager: ${homeTeam}`);
    if (intel?.is_new_manager_away) ctx.push(`New manager: ${awayTeam}`);
    if (intel?.key_players_out_home?.length) ctx.push(`Out (home): ${intel.key_players_out_home.slice(0, 3).join(", ")}`);
    if (intel?.key_players_out_away?.length) ctx.push(`Out (away): ${intel.key_players_out_away.slice(0, 3).join(", ")}`);
    if (intel?.is_derby) ctx.push(`Derby fixture`);
    if (intel?.h2h_summary) ctx.push(`H2H: ${intel.h2h_summary}`);
    if (gafferReasoning) ctx.push(`Prior notes: ${String(gafferReasoning).slice(0, 400)}`);

    const prompt = `You are The Gaffer — a witty, sharp football betting analyst with a Northern boozer twang. A punter wants to know WHY this bet is on the slip. Give them a confident, specific 4–6 sentence breakdown. Lead with the strongest signal (form, ref, weather, injuries, value), then back it up. No hedging waffle. No emojis. End with one punchy verdict line.

Context:
${ctx.join("\n")}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are The Gaffer. Witty, data-driven, no fluff. 4–6 sentences. No emojis." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) return new Response(JSON.stringify({ error: "Rate limited — try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (res.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      throw new Error("AI gateway error");
    }

    const data = await res.json();
    const explanation = data.choices?.[0]?.message?.content?.trim() || "No verdict available right now.";

    return new Response(JSON.stringify({ explanation, intel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("why-this-bet error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

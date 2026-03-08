import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teamName, league, stats } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are The Gaffer, a sharp football analyst. Analyze this team's L10 rolling stats and give punters actionable betting insight in 3-4 sentences. Be direct, use the numbers, and mention the best market opportunities.

Team: ${teamName} (${league})
Last 10 Games:
- Avg Total Goals: ${stats.avgTotalGoals}
- Goals Scored: ${stats.avgGoalsScored}/game, Conceded: ${stats.avgGoalsConceded}/game
- Over 1.5 Goals: ${stats.over15}%, Over 2.5: ${stats.over25}%, Over 3.5: ${stats.over35}%
- BTTS: ${stats.btts}%
- Clean Sheets: ${stats.cleanSheet}%, Failed to Score: ${stats.failedToScore}%
- xG For: ${stats.xgFor}, xG Against: ${stats.xgAgainst}
- Avg Shots: ${stats.avgShots}, On Target: ${stats.avgShotsOnTarget}
- Form: ${stats.form}

Give your analysis as The Gaffer. Focus on goal markets and BTTS. Mention specific stats to back your view.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are The Gaffer, a witty and data-driven football betting analyst. Keep responses concise (3-4 sentences), punchy, and actionable." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "No analysis available.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("form-table-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

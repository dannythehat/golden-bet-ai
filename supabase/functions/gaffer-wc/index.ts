// Gaffer World Cup content generator — team reviews, group previews, match tips
// Caches every result in public.wc_content. Public function (no JWT required).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are The Gaffer — a witty, sharp, lovable football analyst with a Northern boozer twang. World Cup mode: bold, funny, opinionated, but always grounded in real footballing logic. No emojis. No hedging waffle. No corporate cliches. Sound like the smartest, funniest mate down the pub who actually knows ball.`;

interface Req {
  kind: "team_review" | "group_preview" | "match_tip" | "tournament_intro";
  key: string; // team code, group letter, fixture id, "intro"
  context?: Record<string, unknown>;
  force?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { kind, key, context, force }: Req = await req.json();
    if (!kind || !key) throw new Error("kind and key required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!force) {
      const { data: cached } = await supabase
        .from("wc_content")
        .select("content, updated_at")
        .eq("kind", kind)
        .eq("key", key)
        .maybeSingle();
      if (cached) {
        return new Response(JSON.stringify({ ...cached.content, cached: true, updated_at: cached.updated_at }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const prompt = buildPrompt(kind, key, context || {});

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
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
    let raw = data.choices?.[0]?.message?.content?.trim() || "";
    // strip code fences if model wraps json
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { text: raw };
    }

    await supabase.from("wc_content").upsert({
      kind, key, content: parsed, updated_at: new Date().toISOString(),
    }, { onConflict: "kind,key" });

    return new Response(JSON.stringify({ ...parsed, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gaffer-wc error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildPrompt(kind: string, key: string, ctx: Record<string, unknown>): string {
  if (kind === "team_review") {
    return `Write a Gaffer-style World Cup 2026 team review for ${ctx.name} (${key}). They're in Group ${ctx.group} alongside ${(ctx.groupRivals as string[] || []).join(", ")}.

Return STRICT JSON only:
{
  "verdict": "one punchy sentence — the headline take",
  "summary": "4-6 sentence Gaffer review: tactical identity, manager, key player(s), what they're really capable of",
  "strengths": ["3 short bullets"],
  "weaknesses": ["3 short bullets"],
  "dark_horse_rating": 1-10 integer,
  "title_chances": "Champions / Dark Horses / Quarters Ceiling / Group Stage Filler / Lambs to the Slaughter",
  "gaffer_pick": "one cheeky line — the bet or storyline to watch with this lot"
}`;
  }

  if (kind === "group_preview") {
    return `Write a Gaffer-style preview of World Cup 2026 Group ${key}: ${(ctx.teams as string[] || []).join(", ")}.

Return STRICT JSON only:
{
  "headline": "one witty sentence summing up the group",
  "preview": "5-7 sentence Gaffer breakdown — who wins it, who scraps for second, who's going home early",
  "predicted_order": ["1st team name", "2nd", "3rd", "4th"],
  "banker_pick": "one bet/angle the Gaffer is locking in for this group",
  "upset_warning": "the team most likely to ruin a coupon"
}`;
  }

  if (kind === "match_tip") {
    return `Write a Gaffer-style World Cup 2026 match tip for: ${ctx.home} vs ${ctx.away} (Group ${ctx.group}, ${ctx.date || "TBD"}).

Return STRICT JSON only:
{
  "verdict": "one punchy headline pick",
  "main_tip": { "selection": "e.g. Over 2.5 Goals", "odds_estimate": "e.g. 1.85", "stake_units": 1-3 },
  "value_tip": { "selection": "a juicier secondary pick", "odds_estimate": "e.g. 3.50", "stake_units": 0.5-1 },
  "reasoning": "3-5 sentence Gaffer breakdown — form, style clash, key man, why this is the bet",
  "confidence": 1-10 integer,
  "avoid": "the trap bet to swerve"
}`;
  }

  if (kind === "tournament_intro") {
    return `Write a Gaffer-style hype intro for the World Cup 2026 hub — 48 teams across USA, Canada and Mexico, June 11 to July 19 2026.

Return STRICT JSON only:
{
  "hook": "one banging opening line",
  "intro": "3-4 sentence rabble-rouser — what the Gaffer is feeling, what to expect, why this hub exists",
  "favourites": ["3 teams in order"],
  "dark_horse": "one team name",
  "wildcard_storyline": "one thing nobody is talking about that the Gaffer is"
}`;
  }

  return `Generate a witty Gaffer line about: ${key}. Return STRICT JSON: {"text": "..."}`;
}

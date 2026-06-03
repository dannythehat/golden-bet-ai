import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const INTERNAL_LINKS = `
<h3>🔗 More from The Footy Oracle</h3>
<ul>
  <li><a href="https://thefootyoracle.com/">Today's AI Golden Bets – Free Daily Picks</a></li>
  <li><a href="https://thefootyoracle.com/#pl">Verified P&amp;L Results – Full Transparency</a></li>
  <li><a href="https://thefootyoracle.com/blog">The Gaffer's Blog</a></li>
  <li><a href="https://thefootyoracle.com/acca-delight">ACCA Delight – Today's Accumulator</a></li>
  <li><a href="https://thefootyoracle.com/bet-builder">Bet Builder – Same Game Multi</a></li>
</ul>`;

const EEAT_BIO = `
<div class="author-bio">
  <h3>About The Gaffer</h3>
  <p><strong>The Gaffer</strong> is The Footy Oracle's AI-powered football analyst. Every prediction is backed by verified statistics from 130+ leagues worldwide, with a <a href="https://thefootyoracle.com/#pl">fully transparent P&amp;L record</a>.</p>
  <p><em>⚠️ Gambling involves risk. Please bet responsibly. 18+ only.</em></p>
</div>`;

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function sanitizeArticleHtml(html: string): string {
  let cleaned = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blockTagPattern = /(<\/?(?:h[1-6]|p|div|ul|ol|li|blockquote|table|thead|tbody|tr|th|td|hr|pre|figure|figcaption|section|article|header|footer|nav|aside|details|summary)[^>]*>)/gi;
  const parts = cleaned.split(blockTagPattern);
  const result: string[] = [];
  for (const part of parts) {
    if (blockTagPattern.test(part)) {
      blockTagPattern.lastIndex = 0;
      result.push(part);
      continue;
    }
    blockTagPattern.lastIndex = 0;
    const trimmed = part.trim();
    if (!trimmed || /^\s*$/.test(trimmed)) continue;
    const paragraphs = trimmed.split(/\n\n+/).filter((p) => p.trim());
    for (const p of paragraphs) {
      const pTrimmed = p.trim();
      if (pTrimmed && !pTrimmed.startsWith("<")) {
        result.push(`<p>${pTrimmed.replace(/\n/g, "<br/>")}</p>`);
      } else {
        result.push(pTrimmed);
      }
    }
  }
  return result.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let targetDate = getTodayDate();
    try {
      const body = await req.json();
      if (body?.date) targetDate = body.date;
    } catch {}

    console.log(`Generating Gaffer's Golden Picks article for: ${targetDate}`);

    // 1. Fetch today's Golden Bets ONLY
    const { data: goldenBets } = await supabase
      .from("golden_bet_history")
      .select("*")
      .eq("prediction_date", targetDate)
      .order("ml_confidence", { ascending: false });

    if (!goldenBets || goldenBets.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No golden bets found for " + targetDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch match intelligence for context
    const fixtureIds = goldenBets.map((gb: any) => gb.fixture_id);
    const { data: intelligence } = await supabase
      .from("match_intelligence")
      .select("fixture_id, intelligence_summary, referee_name, referee_strictness, home_injury_count, away_injury_count, weather_condition")
      .in("fixture_id", fixtureIds);

    const intelMap = new Map(
      (intelligence || []).map((i: any) => [i.fixture_id, i])
    );

    // 3. Build the prompt
    const goldenBetDetails = goldenBets.map((gb: any) => {
      const intel = intelMap.get(gb.fixture_id);
      const confidence = gb.ml_confidence ? (gb.ml_confidence * 100).toFixed(0) + "%" : "N/A";
      const valueEdge = gb.value_edge ? (gb.value_edge * 100).toFixed(0) + "%" : "N/A";
      let detail = `🏆 ${gb.home_team} v ${gb.away_team} (${gb.league})
  Market: ${gb.market} | Odds: ${gb.bookmaker_odds || "N/A"} | ML Confidence: ${confidence} | Value Edge: ${valueEdge}
  The Gaffer's Reasoning: ${gb.gaffer_reasoning}`;
      if (intel) {
        if (intel.intelligence_summary) detail += `\n  Match Intel: ${intel.intelligence_summary}`;
        if (intel.referee_name) detail += ` | Ref: ${intel.referee_name}${intel.referee_strictness ? ` (${intel.referee_strictness})` : ""}`;
        if (intel.weather_condition) detail += ` | Weather: ${intel.weather_condition}`;
        if ((intel.home_injury_count || 0) + (intel.away_injury_count || 0) > 0)
          detail += ` | Injuries: ${intel.home_injury_count} home, ${intel.away_injury_count} away`;
      }
      return detail;
    }).join("\n\n");

    const prompt = `You are "The Gaffer" — a straight-talking, lovable football pundit. You're writing today's GOLDEN BETS PICKS PREVIEW for ${targetDate}.

THESE ARE THE ONLY BETS YOU COVER. No ACCA, no Bet Builder. Just the three Golden Bets — the Gaffer's precision ML selections, one per market. This is the main event.

LANGUAGE: British English only. "selections", "picks", "punts", "double", "treble". NEVER say "lines", "parlay", "moneyline", "juice", or "chalk".

HOW GOLDEN BETS WORK (weave this naturally into the article):
The Gaffer's ML engine picks exactly ONE best game per market — Over 2.5 Goals, Over 9.5 Corners, and Over 3.5/4.5 Cards. Each selection must have real value edge against the bookmakers. They're combined as three doubles and one treble at £10 each (£40 total stake). It's precision over volume — quality, not quantity.

PERSONALITY:
- Confident but not arrogant — you back the picks with DATA
- Build excitement — make the reader feel like they're in on something
- Reference specific stats: ML confidence, value edge, referee data, injury intel
- "One of the lads" energy — pub banter, but you clearly know your stuff

TODAY'S GOLDEN BETS — COVER EACH ONE PROPERLY:
${goldenBetDetails}

STAKING: 3 doubles + 1 treble — £10 each = £40 total daily stake.
Potential max return if all 3 land: [don't calculate exactly, just reference as "tasty returns"]

STRUCTURE (900-1,200 words):
1. Opening — set the scene. What's today's football landscape? Any big fixtures around?
2. Golden Bet 1 — the fixture, WHY the Gaffer picked it (stats, value edge, context), what to expect
3. Golden Bet 2 — same treatment, different market
4. Golden Bet 3 — same treatment
5. Doubles & Treble breakdown — how the staking works, which combos are most exciting
6. Sign-off — confident but measured, tell readers where to follow results

FORMAT:
- Title: Under 60 chars, punchy (e.g. "Three Golden Picks for [Day/Date]")
- Excerpt: Under 160 chars, social-media ready
- HTML: h2, p, strong, blockquote, em, ul/li
- SEO keywords: golden bets today, AI football picks, football predictions today, footy oracle, best bets today

Return JSON:
{
  "title": "...",
  "excerpt": "...",
  "content": "<h2>...</h2><p>...</p>..."
}`;

    // 4. Generate article
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.85,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI error: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let parsed: { title?: string; excerpt?: string; content?: string };
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON block found");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      const titleMatch = rawContent.match(/"title"\s*:\s*"([^"]+)"/);
      if (!titleMatch) throw new Error("Could not extract title from AI response");
      parsed = { title: titleMatch[1], excerpt: "", content: rawContent };
    }

    if (!parsed.title || !parsed.content) throw new Error("AI returned incomplete response");

    const sanitizedContent = sanitizeArticleHtml(parsed.content);
    const fullContent = sanitizedContent + INTERNAL_LINKS + EEAT_BIO;

    const slug = parsed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const wordCount = sanitizedContent.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const readingTime = Math.max(1, Math.round(wordCount / 200));

    // 5. Generate hero image
    let heroImageUrl: string | null = null;
    try {
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{
            role: "user",
            content: `16:9 dramatic editorial illustration of a football manager in a flat cap studying a tactical board with golden glowing betting slips, confident morning energy, stadium backdrop, ink and watercolor style, no text, ultra high resolution`,
          }],
          modalities: ["image", "text"],
        }),
      });

      if (imageResponse.ok) {
        const imgData = await imageResponse.json();
        const base64 = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (base64) {
          const rawB64 = base64.includes(",") ? base64.split(",")[1] : base64;
          const imageBytes = Uint8Array.from(atob(rawB64), (c) => c.charCodeAt(0));
          const fileName = `blog/${slug}-${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
            .from("bet-proofs")
            .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("bet-proofs").getPublicUrl(fileName);
            heroImageUrl = urlData.publicUrl;
          }
        }
      }
    } catch (imgErr) {
      console.error("Hero image generation failed (non-fatal):", imgErr);
    }

    // 6. Save to blog_posts
    const finalSlug = `${slug}-${Date.now().toString(36)}`;
    const { data: post, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        slug: finalSlug,
        title: parsed.title,
        excerpt: parsed.excerpt || sanitizedContent.substring(0, 160).replace(/<[^>]*>/g, ""),
        content: fullContent,
        hero_image_url: heroImageUrl,
        category: "daily-picks",
        tags: ["golden-bets", "daily-picks", "football-predictions", targetDate],
        post_type: "daily-picks",
        related_prediction_date: targetDate,
        is_published: true,
        published_at: new Date().toISOString(),
        reading_time_minutes: readingTime,
        seo_title: parsed.title.substring(0, 60),
        seo_description: (parsed.excerpt || "").substring(0, 160),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`Gaffer's Golden Picks article published: ${finalSlug}`);

    return new Response(
      JSON.stringify({ success: true, slug: finalSlug, post }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Daily picks article error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

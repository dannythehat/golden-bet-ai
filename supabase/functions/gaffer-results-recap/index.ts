import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const API_BASE = "https://v3.football.api-sports.io";

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

function getYesterdayDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
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

async function apiFetch(apiKey: string, endpoint: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}${endpoint}?${qs}`;
  console.log(`API-Football: ${url}`);
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
  });
  if (!res.ok) throw new Error(`API-Football error: ${res.status}`);
  const data = await res.json();
  return data.response || [];
}

interface GoldenBetContext {
  homeTeam: string;
  awayTeam: string;
  league: string;
  market: string;
  status: string;
  result: string | null;
  profitLoss: number | null;
  stake: number | null;
  odds: number | null;
  confidence: number;
  fixtureId: string;
  matchEvents?: string;
  scoreHome?: number;
  scoreAway?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    if (!apiKey) throw new Error("API_FOOTBALL_KEY not configured");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let targetDate = getYesterdayDate();
    try {
      const body = await req.json();
      if (body?.date) targetDate = body.date;
    } catch {}

    console.log(`Generating Golden Bets results recap for: ${targetDate}`);

    // 1. Fetch yesterday's Golden Bets — PRIMARY content
    const { data: goldenBets } = await supabase
      .from("golden_bet_history")
      .select("*")
      .eq("prediction_date", targetDate);

    if (!goldenBets || goldenBets.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No golden bets found for " + targetDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bets: GoldenBetContext[] = goldenBets.map((gb: any) => ({
      homeTeam: gb.home_team,
      awayTeam: gb.away_team,
      league: gb.league,
      market: gb.market,
      status: gb.status,
      result: gb.result,
      profitLoss: gb.profit_loss,
      stake: gb.stake,
      odds: gb.bookmaker_odds,
      confidence: gb.ml_confidence,
      fixtureId: gb.fixture_id,
      scoreHome: gb.actual_goals_home,
      scoreAway: gb.actual_goals_away,
    }));

    // 2. Fetch Bet Builders & ACCAs — only winners for a brief bonus mention
    const [{ data: betBuilderWins }, { data: accaWins }] = await Promise.all([
      supabase
        .from("bet_builder_history")
        .select("home_team, away_team, markets, combined_odds")
        .eq("prediction_date", targetDate)
        .eq("status", "won"),
      supabase
        .from("acca_history")
        .select("legs_won, selection_count, combined_odds")
        .eq("prediction_date", targetDate)
        .eq("status", "won"),
    ]);

    // 3. Fetch match events from API-Football for Golden Bets
    const uniqueFixtureIds = [...new Set(bets.map(b => b.fixtureId))];
    for (const fid of uniqueFixtureIds) {
      try {
        const events = await apiFetch(apiKey, "/fixtures/events", { fixture: fid });
        const keyEvents = (events || [])
          .filter((e: any) =>
            e.type === "Goal" ||
            (e.type === "Card" && e.detail === "Red Card") ||
            (e.type === "Var" && e.detail === "Penalty")
          )
          .map((e: any) => {
            const time = e.time?.extra ? `${e.time.elapsed}+${e.time.extra}'` : `${e.time?.elapsed}'`;
            const player = e.player?.name || "Unknown";
            if (e.type === "Goal") return `⚽ ${time} ${player} (${e.detail})`;
            if (e.type === "Card") return `🟥 ${time} ${player} RED CARD`;
            return `📺 ${time} VAR: ${e.detail}`;
          })
          .slice(0, 8)
          .join("; ");
        for (const bet of bets) {
          if (bet.fixtureId === fid) {
            bet.matchEvents = keyEvents || "No major incidents";
          }
        }
      } catch (e) {
        console.error(`Failed to fetch events for fixture ${fid}:`, e);
      }
    }

    // 4. Build the prompt content
    const goldenBetSummaries = bets.map((b) => {
      const result = b.status === "won" ? "✅ WON" : b.status === "lost" ? "❌ LOST" : "⏳ PENDING";
      const score = b.scoreHome !== undefined && b.scoreAway !== undefined ? `(Final: ${b.scoreHome}-${b.scoreAway})` : "";
      const pnl = b.profitLoss ? (b.profitLoss >= 0 ? `+£${b.profitLoss.toFixed(2)}` : `-£${Math.abs(b.profitLoss).toFixed(2)}`) : "";
      let details = `🏆 ${b.homeTeam} v ${b.awayTeam} ${score}
  Market: ${b.market} | Odds: ${b.odds || "N/A"} | ML Confidence: ${b.confidence ? (b.confidence * 100).toFixed(0) + "%" : "N/A"}
  Result: ${result} ${pnl}`;
      if (b.matchEvents) details += `\n  Key Events: ${b.matchEvents}`;
      return details;
    }).join("\n\n");

    const bbWinsText = (betBuilderWins || []).map((bb: any) =>
      `🔨 Bet Builder: ${bb.home_team} v ${bb.away_team} — WON @ ${bb.combined_odds} (${(bb.markets || []).join(", ")})`
    ).join("\n");

    const accaWinsText = (accaWins || []).map((a: any) =>
      `🎯 ACCA Delight: ${a.legs_won}/${a.selection_count} legs won @ ${a.combined_odds?.toFixed(2)}`
    ).join("\n");

    const goldenWon = bets.filter(b => b.status === "won").length;
    const goldenLost = bets.filter(b => b.status === "lost").length;
    const totalPL = bets.reduce((sum, b) => sum + (b.profitLoss || 0), 0);

    const hasBonusWins = bbWinsText || accaWinsText;

    const prompt = `You are "The Gaffer" — a straight-talking, lovable football pundit with a sharp mind and pub-lad personality. You're writing your MORNING RESULTS ROUNDUP for ${targetDate}.

PRIMARY FOCUS: The Golden Bets — three precision ML selections, one per market (Goals, Corners, Cards). These are what the operation is built around. Walk through each in detail, referencing actual match events.

LANGUAGE: British English only. "selections", "picks", "punts", "double", "treble". NEVER say "lines", "parlay", "moneyline", "juice", or "chalk".

PERSONALITY:
- Confident but honest — straight-talking, no waffle
- Buzzing on wins, philosophical on losses ("the data was right, football had other ideas")
- Reference specific events from the match — red cards, late goals, keeper errors, VAR
- Pub-lad energy — proper banter, never sycophantic

GOLDEN BETS RESULTS — YOUR MAIN CONTENT (go through each properly):
${goldenBetSummaries}

OVERALL GOLDEN BETS: ${goldenWon}/${bets.length} won | Net P&L: ${totalPL >= 0 ? "+" : ""}£${totalPL.toFixed(2)}
(Staked as 3 doubles + 1 treble — £10 each = £40 total daily stake)

${hasBonusWins ? `BONUS WINS — brief mention only (one sentence each, then move on):
${bbWinsText}
${accaWinsText}
These are tracked as wins/losses only — no P&L on them. Give a quick cheer, that's it.` : ""}

STRUCTURE (700-1,000 words):
1. Opening — morning vibe. Set the tone based on how the Golden Bets did
2. Golden Bet 1 — fixture context, what the stat said, what happened on the pitch, result
3. Golden Bet 2 — same treatment
4. Golden Bet 3 — same treatment  
5. Doubles & Treble summary — which combos landed, any returns
${hasBonusWins ? "6. One-liner on any ACCA/Bet Builder wins" : ""}
6. Sign-off — brief tease of today's picks coming

FORMAT:
- Title: Under 60 chars, punchy (e.g. "Golden Morning: 2 from 3")
- Excerpt: Under 160 chars, social-media ready
- HTML: h2, p, strong, blockquote, em, ul/li
- SEO keywords: golden bets results, AI football predictions, football betting results today, footy oracle

Return JSON:
{
  "title": "...",
  "excerpt": "...",
  "content": "<h2>...</h2><p>...</p>..."
}`;

    // 5. Generate article
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
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

    // 6. Generate hero image
    let heroImageUrl: string | null = null;
    try {
      const vibe = totalPL >= 0 ? "celebrating, triumphant, golden light" : "dramatic, determined, comeback spirit";
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
            content: `16:9 dramatic editorial illustration of a football manager in a flat cap reviewing golden betting slips at dawn, ${vibe}, stadium atmosphere, ink and watercolor style, no text, ultra high resolution`,
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

    // 7. Save to blog_posts
    const finalSlug = `${slug}-${Date.now().toString(36)}`;
    const { data: post, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        slug: finalSlug,
        title: parsed.title,
        excerpt: parsed.excerpt || sanitizedContent.substring(0, 160).replace(/<[^>]*>/g, ""),
        content: fullContent,
        hero_image_url: heroImageUrl,
        category: "results",
        tags: ["golden-bets", "results", "daily-recap", targetDate],
        post_type: "golden-results",
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

    console.log(`Golden Bets results recap published: ${finalSlug}`);

    return new Response(
      JSON.stringify({ success: true, slug: finalSlug, post }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Results recap error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

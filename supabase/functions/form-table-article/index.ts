/**
 * Form Table Article Generator
 * 
 * Generates a daily article showing the Top 5 most in-form teams playing today
 * for each bet type: Over 2.5 Goals, Over 9.5 Corners, Over 3.5 Cards.
 * 
 * Useful for fans who want to quickly find the best teams for their preferred market.
 * Scheduled: ~09:45 UTC daily via orchestrator.
 */

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
  <li><a href="https://thefootyoracle.com/#form-tables">Full Live Form Tables – All Leagues</a></li>
  <li><a href="https://thefootyoracle.com/">Today's AI Golden Bets – Free Daily Picks</a></li>
  <li><a href="https://thefootyoracle.com/#pl">Verified P&amp;L Results – Full Transparency</a></li>
  <li><a href="https://thefootyoracle.com/acca-delight">ACCA Delight – Today's Accumulator</a></li>
  <li><a href="https://thefootyoracle.com/bet-builder">Bet Builder – Same Game Multi</a></li>
</ul>`;

const EEAT_BIO = `
<div class="author-bio">
  <h3>About The Gaffer</h3>
  <p><strong>The Gaffer</strong> is The Footy Oracle's AI-powered football analyst. Every stat is sourced from 130+ leagues worldwide, updated daily. <a href="https://thefootyoracle.com/#form-tables">Browse the full live form tables here.</a></p>
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

// Excluded leagues / regions
const EXCLUDED_PATTERNS = [
  /friendl/i, /cup.*qual/i, /youth/i, /reserve/i, /u\d{2}/i, /women/i, /female/i
];

function isAllowedLeague(league: string, region: string): boolean {
  if (region === "other") return false;
  return !EXCLUDED_PATTERNS.some(p => p.test(league));
}

function normalizeTeam(name: string): string {
  return name.toLowerCase()
    .replace(/\b(fc|cf|sc|ac|as|afc|rfc)\b/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function teamMatchesFixture(teamName: string, homeTeam: string, awayTeam: string): "home" | "away" | null {
  const tn = normalizeTeam(teamName);
  const ht = normalizeTeam(homeTeam);
  const at = normalizeTeam(awayTeam);
  if (tn.length < 4) return null;
  if (tn === ht) return "home";
  if (tn === at) return "away";
  const fuzzy = (a: string, b: string) => {
    if (a.includes(b) && b.length >= a.length * 0.5) return true;
    if (b.includes(a) && a.length >= b.length * 0.5) return true;
    return false;
  };
  if (fuzzy(tn, ht)) return "home";
  if (fuzzy(tn, at)) return "away";
  return null;
}

interface TeamStat {
  team_name: string;
  league: string;
  region: string;
  matches_used: number;
  over_25_goals_pct: number;
  btts_pct: number;
  over_95_corners_pct: number;
  over_35_cards_pct: number;
  avg_total_goals: number;
  avg_total_corners: number;
  avg_total_cards: number;
  form_string: string;
}

interface PlayingTeam extends TeamStat {
  opponent: string;
  isHome: boolean;
  kickoff: string;
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

    console.log(`Generating Form Table article for: ${targetDate}`);

    // 1. Fetch all team rolling stats (min 6 matches)
    const { data: teamStats } = await supabase
      .from("team_rolling_stats")
      .select("team_name, league, region, matches_used, over_25_goals_pct, btts_pct, over_95_corners_pct, over_35_cards_pct, avg_total_goals, avg_total_corners, avg_total_cards, form_string")
      .gte("matches_used", 6)
      .neq("league", "Friendlies Clubs")
      .neq("league", "Club Friendly")
      .neq("region", "other")
      .limit(2000);

    if (!teamStats || teamStats.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No team stats available" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const filteredTeams = (teamStats as TeamStat[]).filter(t => isAllowedLeague(t.league, t.region));

    // 2. Fetch today's fixtures
    let fixtures: { fixture_id: string; home_team: string; away_team: string; league: string; kickoff: string }[] = [];
    try {
      const fixturesRes = await fetch(
        `${supabaseUrl}/functions/v1/ml-fixtures`,
        { headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" }, method: "GET" }
      );
      if (fixturesRes.ok) {
        const fixturesData = await fixturesRes.json();
        if (fixturesData?.success && Array.isArray(fixturesData.fixtures)) {
          fixtures = fixturesData.fixtures
            .filter((f: any) => !EXCLUDED_PATTERNS.some(p => p.test(f.league || "")))
            .map((f: any) => ({
              fixture_id: String(f.fixture_id),
              home_team: f.home_team,
              away_team: f.away_team,
              league: f.league || "",
              kickoff: f.kickoff,
            }));
        }
      }
    } catch (e) {
      console.error("Fixtures fetch failed, falling back to gaffer_alerts:", e);
    }

    // Fallback: gaffer_alerts
    if (fixtures.length === 0) {
      const { data: alertData } = await supabase
        .from("gaffer_alerts")
        .select("fixture_id, home_team, away_team, league, kickoff")
        .eq("fixture_date", targetDate);
      if (alertData) fixtures = alertData as any[];
    }

    if (fixtures.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No fixtures found for " + targetDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Cross-reference teams with today's fixtures
    const seen = new Set<string>();
    const playingTeams: PlayingTeam[] = [];

    for (const team of filteredTeams) {
      for (const fixture of fixtures) {
        const side = teamMatchesFixture(team.team_name, fixture.home_team, fixture.away_team);
        if (side && !seen.has(team.team_name)) {
          seen.add(team.team_name);
          playingTeams.push({
            ...team,
            opponent: side === "home" ? fixture.away_team : fixture.home_team,
            isHome: side === "home",
            kickoff: fixture.kickoff,
          });
          break;
        }
      }
    }

    if (playingTeams.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No playing teams matched for " + targetDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Build Top 5 for each market
    const top5Goals = [...playingTeams]
      .sort((a, b) => b.over_25_goals_pct - a.over_25_goals_pct)
      .slice(0, 5);

    const top5Corners = [...playingTeams]
      .sort((a, b) => b.over_95_corners_pct - a.over_95_corners_pct)
      .slice(0, 5);

    const top5Cards = [...playingTeams]
      .sort((a, b) => b.over_35_cards_pct - a.over_35_cards_pct)
      .slice(0, 5);

    const formatTeamLine = (t: PlayingTeam, stat: number, avgLabel: string, avg: number, rank: number) =>
      `  ${rank}. ${t.team_name} (${t.isHome ? "Home" : "Away"} vs ${t.opponent}) — ${stat}% hit rate | Avg ${avgLabel}: ${avg.toFixed(1)} | ${t.matches_used} games | League: ${t.league}`;

    const goalsSection = top5Goals.map((t, i) =>
      formatTeamLine(t, t.over_25_goals_pct, "Goals", t.avg_total_goals, i + 1)
    ).join("\n");

    const cornersSection = top5Corners.map((t, i) =>
      formatTeamLine(t, t.over_95_corners_pct, "Corners", t.avg_total_corners, i + 1)
    ).join("\n");

    const cardsSection = top5Cards.map((t, i) =>
      formatTeamLine(t, t.over_35_cards_pct, "Cards", t.avg_total_cards, i + 1)
    ).join("\n");

    const totalPlayingToday = playingTeams.length;
    const dateFormatted = new Date(targetDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

    const prompt = `You are "The Gaffer" — a straight-talking, lovable football pundit. You're writing today's FORM TABLE INTELLIGENCE article for ${dateFormatted}.

PURPOSE OF THIS ARTICLE: Save fans the research. If someone loves betting on Over 9.5 Corners, they shouldn't have to trawl through 100 fixtures. We've done the work — here are the top 5 most in-form teams for each market, playing today. Crack on.

LANGUAGE: British English only. "selections", "picks", "punts", "mark", "threshold". NEVER say "lines", "parlay", "moneyline", "juice", or "chalk".

PERSONALITY:
- The Gaffer as football stats professor — knowledgeable, enthusiastic, one of the lads
- Make the stats feel exciting, not just a data dump
- For each team, briefly explain WHY they're in-form (goals machine, set-piece specialists, card magnets)
- Light humour OK — "if you love watching the referee reach for his pocket, these are your lads"

TOTAL TEAMS PLAYING TODAY: ${totalPlayingToday} teams matched across today's fixtures from our database of 130+ leagues.

⚽ TOP 5 FOR OVER 2.5 GOALS — teams most likely to be involved in goal-fests today:
${goalsSection}

🚩 TOP 5 FOR OVER 9.5 CORNERS — set-piece machines generating flags by the bucketload:
${cornersSection}

🟨 TOP 5 FOR OVER 3.5 CARDS — disciplinary disasters that bring the ref to life:
${cardsSection}

STRUCTURE (800-1,100 words):
1. Opening — set the scene. "It's [day], here's your intelligence briefing. No more research, The Gaffer's done it for you."
2. Over 2.5 Goals Section — go through each team briefly. Why are they a goal machine? What's their form like?
3. Over 9.5 Corners Section — set-piece pressure merchants. Why do corners flow in these fixtures?
4. Over 3.5 Cards Section — card magnets. Aggressive? High fouls? Ref tendency?
5. How to use this intel — remind readers these are team-level stats. Combine both teams in a fixture for best results. Link to our full form tables.
6. Sign-off — remind readers the Golden Bets picks are live on the homepage

FORMAT:
- Title: Under 60 chars, punchy (e.g. "Today's Form Table Intel: ${dateFormatted}")
- Excerpt: Under 160 chars, SEO-ready
- HTML: h2, h3, p, strong, ul/li, em
- SEO keywords: football form tables today, over 2.5 goals teams today, over 9.5 corners tips, best teams for cards today, football betting research

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
        temperature: 0.8,
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
            content: `16:9 dramatic editorial illustration of a football manager in a flat cap studying a large statistical leaderboard with football teams ranked by stats, glowing data displays, stadium atmosphere behind, ink and watercolor style, no text, ultra high resolution`,
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
        category: "form-tables",
        tags: ["form-tables", "over-25-goals", "over-95-corners", "over-35-cards", "betting-intelligence", targetDate],
        post_type: "form-table-intel",
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

    console.log(`Form Table article published: ${finalSlug}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        slug: finalSlug, 
        post,
        stats: {
          teamsPlayingToday: totalPlayingToday,
          top5Goals: top5Goals.map(t => t.team_name),
          top5Corners: top5Corners.map(t => t.team_name),
          top5Cards: top5Cards.map(t => t.team_name),
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Form Table article error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

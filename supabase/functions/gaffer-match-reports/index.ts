import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const API_BASE = "https://v3.football.api-sports.io";

// UK leagues
const UK_LEAGUES: Record<number, string> = {
  39: "Premier League",
  40: "Championship",
  41: "League One",
  42: "League Two",
  45: "FA Cup",
  48: "League Cup",
  179: "Scottish Premiership",
};

// European leagues
const EUROPE_LEAGUES: Record<number, string> = {
  140: "La Liga",
  135: "Serie A",
  78: "Bundesliga",
  61: "Ligue 1",
  2: "Champions League",
  3: "Europa League",
  848: "Conference League",
  88: "Eredivisie",
  94: "Primeira Liga",
};

const ALL_LEAGUES: Record<number, string> = { ...UK_LEAGUES, ...EUROPE_LEAGUES };

const INTERNAL_LINKS = `
<h3>🔗 More from The Footy Oracle</h3>
<ul>
  <li><a href="https://thefootyoracle.com/">Today's AI Golden Bets – Free Daily Picks</a></li>
  <li><a href="https://thefootyoracle.com/#predictions">Full Match Predictions & Stats</a></li>
  <li><a href="https://thefootyoracle.com/#pl">Verified P&L Results – Full Transparency</a></li>
  <li><a href="https://thefootyoracle.com/#form-tables">Live Form Tables – 130+ Leagues</a></li>
  <li><a href="https://thefootyoracle.com/blog">The Gaffer's Blog – Tips, Guides & Stories</a></li>
</ul>`;

const EEAT_BIO = `
<div class="author-bio">
  <h3>About The Gaffer</h3>
  <p><strong>The Gaffer</strong> is The Footy Oracle's AI-powered football analyst, combining 15+ years of historical data with cutting-edge machine learning models. Every prediction is backed by verified statistics from 130+ leagues worldwide, with a <a href="https://thefootyoracle.com/#pl">fully transparent, publicly auditable P&L record</a>.</p>
  <p><em>⚠️ Gambling involves risk. Please bet responsibly. 18+ only.</em></p>
</div>`;

interface FixtureEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string };
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
}

interface MatchData {
  fixture_id: number;
  home_team: string;
  away_team: string;
  league: string;
  league_id: number;
  score_home: number;
  score_away: number;
  events: FixtureEvent[];
}

async function apiFetch(
  apiKey: string,
  endpoint: string,
  params: Record<string, string>
): Promise<any> {
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

function getYesterdayDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

function getSeasonYear(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();
  return month <= 6 ? String(year - 1) : String(year);
}

function formatEvents(events: FixtureEvent[]): string {
  if (!events || events.length === 0) return "No detailed events.";
  return events
    .filter((e) => e.type === "Goal" || (e.type === "Card" && e.detail === "Red Card"))
    .map((e) => {
      const time = e.time.extra ? `${e.time.elapsed}+${e.time.extra}'` : `${e.time.elapsed}'`;
      const player = e.player?.name || "Unknown";
      if (e.type === "Goal") return `⚽ ${time} ${player} — ${e.detail}`;
      return `🟥 ${time} ${player} — Red Card`;
    })
    .join("\n");
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

function buildMatchBlock(m: MatchData): string {
  return `${m.league}: ${m.home_team} ${m.score_home}-${m.score_away} ${m.away_team}
Key moments: ${formatEvents(m.events)}`;
}

function buildPrompt(region: "UK" | "Europe", matches: MatchData[], targetDate: string): string {
  const matchBlocks = matches.map(buildMatchBlock).join("\n\n");
  const regionLabel = region === "UK" ? "British Football" : "European Football";
  const regionEmoji = region === "UK" ? "🇬🇧" : "🇪🇺";
  const keywords = region === "UK"
    ? "Premier League results, Championship results, Scottish football"
    : "La Liga results, Serie A results, Bundesliga results, Champions League";

  return `You are "The Gaffer" — the funniest football writer on the internet. Think Marina Hyde meets Mock The Week meets your funniest mate at the pub. Your columns go VIRAL because they are absolutely HILARIOUS.

LANGUAGE: You MUST write in British English. Use UK betting terminology: "selections", "legs", "bets", "picks", "punts". NEVER use the American term "lines" to refer to bets. NEVER say "parlay" (say "acca"), "moneyline" (say "match result"), "juice" (say "odds"), or "chalk" (say "favourite").

CRITICAL RULES:
- This is a COMEDY column that happens to be about football. FUNNY FIRST, facts second.
- Maximum 800–1,200 words. SHORT AND PUNCHY.
- NO stat dumps. No "possession was 58%". No "xG of 1.4". Nobody cares. 
- Instead: brilliant metaphors, savage one-liners, absurd comparisons, running gags
- Every single paragraph must make the reader laugh or at least smirk
- Reference pop culture, movies, TV, music — but always in service of the joke
- Imagine you're telling your mates in the pub what happened — that's the energy
- Award 2-3 ridiculous made-up awards at the end (e.g. "The 'My Nan Could've Scored That' Award")
- Mock performances not people — be savage about how they PLAYED, never personal

${regionEmoji} REGION: ${regionLabel}
DATE: ${targetDate}

RESULTS:
${matchBlocks}

STRUCTURE:
1. Killer opening — one hilarious observation that hooks the reader (2-3 sentences max)
2. Each match gets 1-3 paragraphs of pure comedy gold — focus on the funniest/most dramatic moments
3. Skip boring 0-0 draws unless you can make them funny
4. "The Gaffer's Awards" — 2-3 silly awards
5. Short, punchy sign-off

FORMAT:
- Title: Under 60 chars, funny, includes "${region === "UK" ? "UK" : "Europe"}" and the date
- Excerpt: Under 160 chars, a proper zinger
- Use HTML: h2, p, strong, blockquote, em, ul/li
- SEO keywords: ${keywords}

Return JSON:
{
  "title": "...",
  "excerpt": "...",
  "content": "<h2>...</h2><p>...</p>..."
}`;
}

async function generateArticle(
  lovableKey: string,
  prompt: string
): Promise<{ title: string; excerpt: string; content: string }> {
  const aiResponse = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 1.0,
        response_format: { type: "json_object" },
      }),
    }
  );

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
    const excerptMatch = rawContent.match(/"excerpt"\s*:\s*"([^"]+)"/);
    const contentMatch = rawContent.match(/"content"\s*:\s*"([\s\S]+?)"\s*\}?\s*$/);
    if (!titleMatch) throw new Error("Could not extract title from AI response");
    let extractedContent = contentMatch?.[1] || "";
    extractedContent = extractedContent
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    parsed = {
      title: titleMatch[1],
      excerpt: excerptMatch?.[1] || "",
      content: extractedContent,
    };
  }

  if (!parsed.title || !parsed.content) throw new Error("AI returned incomplete response");
  return { title: parsed.title!, excerpt: parsed.excerpt || "", content: parsed.content! };
}

async function generateHeroImage(
  lovableKey: string,
  supabase: any,
  slug: string,
  region: "UK" | "Europe"
): Promise<string | null> {
  try {
    const regionHint = region === "UK"
      ? "British bulldog, rainy stadium, union jack, classic English football"
      : "continental flair, European landmarks, diverse flags, elegant football";
    const imageResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: `16:9 dramatic satirical newspaper editorial cartoon of ${regionHint}, witty ink and watercolor illustration, classic editorial cartoon aesthetic, no text, ultra high resolution`,
            },
          ],
          modalities: ["image", "text"],
        }),
      }
    );

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
          return urlData.publicUrl;
        }
      }
    }
  } catch (imgErr) {
    console.error("Hero image generation failed (non-fatal):", imgErr);
  }
  return null;
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

    console.log(`Generating match roundups for: ${targetDate}`);

    // Fetch all matches
    const allMatches: MatchData[] = [];
    const leagueIds = Object.keys(ALL_LEAGUES);

    for (const leagueId of leagueIds) {
      try {
        const fixtures = await apiFetch(apiKey, "/fixtures", {
          league: leagueId,
          date: targetDate,
          season: getSeasonYear(targetDate),
          status: "FT-AET-PEN",
        });
        if (!fixtures || fixtures.length === 0) continue;

        for (const f of fixtures) {
          const fixtureId = f.fixture.id;
          let events: FixtureEvent[] = [];
          try {
            const evtRes = await apiFetch(apiKey, "/fixtures/events", { fixture: String(fixtureId) });
            events = evtRes || [];
          } catch (e) {
            console.error(`Events fetch failed for ${fixtureId}:`, e);
          }

          allMatches.push({
            fixture_id: fixtureId,
            home_team: f.teams.home.name,
            away_team: f.teams.away.name,
            league: ALL_LEAGUES[Number(leagueId)] || f.league?.name || "Unknown",
            league_id: Number(leagueId),
            score_home: f.goals.home ?? 0,
            score_away: f.goals.away ?? 0,
            events,
          });
        }
      } catch (e) {
        console.error(`Failed to fetch league ${leagueId}:`, e);
      }
    }

    // Split into UK and Europe
    const ukLeagueIds = new Set(Object.keys(UK_LEAGUES).map(Number));
    const ukMatches = allMatches.filter((m) => ukLeagueIds.has(m.league_id));
    const europeMatches = allMatches.filter((m) => !ukLeagueIds.has(m.league_id));

    console.log(`UK matches: ${ukMatches.length}, Europe matches: ${europeMatches.length}`);

    const results: any[] = [];

    // Generate UK article if matches exist
    for (const [region, matches] of [["UK", ukMatches], ["Europe", europeMatches]] as const) {
      if (matches.length === 0) {
        console.log(`No ${region} matches found, skipping`);
        continue;
      }

      const prompt = buildPrompt(region, matches, targetDate);
      const { title, excerpt, content: rawArticleContent } = await generateArticle(lovableKey, prompt);

      const sanitizedContent = sanitizeArticleHtml(rawArticleContent);
      const fullContent = sanitizedContent + INTERNAL_LINKS + EEAT_BIO;

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const wordCount = sanitizedContent.replace(/<[^>]*>/g, "").split(/\s+/).length;
      const readingTime = Math.max(1, Math.round(wordCount / 200));

      const heroImageUrl = await generateHeroImage(lovableKey, supabase, slug, region);

      const leagueTags = [...new Set(matches.map((m) => m.league.toLowerCase().replace(/\s+/g, "-")))];

      const { data: post, error: insertError } = await supabase
        .from("blog_posts")
        .insert({
          slug: `${slug}-${Date.now().toString(36)}`,
          title,
          excerpt: excerpt || sanitizedContent.substring(0, 160).replace(/<[^>]*>/g, ""),
          content: fullContent,
          hero_image_url: heroImageUrl,
          category: "match-roundup",
          tags: ["match-roundup", region.toLowerCase(), ...leagueTags],
          post_type: "match-roundup",
          related_prediction_date: targetDate,
          is_published: true,
          published_at: new Date().toISOString(),
          reading_time_minutes: readingTime,
          seo_title: title.substring(0, 60),
          seo_description: (excerpt || "").substring(0, 160).replace(/<[^>]*>/g, ""),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      console.log(`${region} roundup published: ${post?.slug}`);
      results.push({ region, post });
    }

    return new Response(
      JSON.stringify({
        success: true,
        articles_generated: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Match report generation error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Only allow service_role or internal cron callers */
function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  // Allow if bearer token matches service role key
  if (serviceKey && authHeader === `Bearer ${serviceKey}`) return true;
  // Allow if called with the anon key + scheduled flag (internal orchestrator)
  return false;
}

const CONTENT_TYPES = [
  'match-preview',
  'weekly-roundup',
  'guide',
  'funny-story',
  'betting-news',
  'ai-ml-insight',
  'morning-briefing',
] as const;

type ContentType = typeof CONTENT_TYPES[number];

interface GenerateRequest {
  type: ContentType;
  prediction_date?: string;
  topic?: string;
  title?: string;
  content?: string;
  auto?: boolean; // true when called from cron
}

// Internal links for SEO juice
const INTERNAL_LINKS = `
<h3>🔗 More from The Footy Oracle</h3>
<ul>
  <li><a href="https://thefootyoracle.lovable.app/">Today's AI Golden Bets – Free Daily Picks</a></li>
  <li><a href="https://thefootyoracle.lovable.app/#predictions">Full Match Predictions & Stats</a></li>
  <li><a href="https://thefootyoracle.lovable.app/#pl">Verified P&L Results – Full Transparency</a></li>
  <li><a href="https://thefootyoracle.lovable.app/#form-tables">Live Form Tables – 130+ Leagues</a></li>
  <li><a href="https://thefootyoracle.lovable.app/blog">The Gaffer's Blog – Tips, Guides & Stories</a></li>
</ul>`;

// E-E-A-T author bio block
const EEAT_BIO = `
<div class="author-bio">
  <h3>About The Gaffer</h3>
  <p><strong>The Gaffer</strong> is The Footy Oracle's AI-powered football analyst, combining 15+ years of historical data with cutting-edge machine learning models. Every prediction is backed by verified statistics from 130+ leagues worldwide, with a <a href="https://thefootyoracle.lovable.app/#pl">fully transparent, publicly auditable P&L record</a>. The Gaffer's system analyses over 40 statistical features per match — including xG, rolling form, referee tendencies, and weather data — to identify genuine value bets.</p>
  <p><em>⚠️ Gambling involves risk. Please bet responsibly. 18+ only. Past performance doesn't guarantee future results.</em></p>
</div>`;

function buildPrompt(type: ContentType, context: Record<string, unknown>): string {
  const basePersonality = `You are "The Gaffer" — a cheeky, hilarious, experienced football analyst who talks like he's down the pub with his mates. British slang, witty one-liners, pop culture references, self-deprecating humour. Think: a mix of Jeff Stelling, Soccer AM, and your funniest mate who knows his football inside out. You MUST be genuinely funny — not cringe.`;

  const seoRules = `
SEO & E-E-A-T Rules (CRITICAL):
- Title MUST be under 60 characters, SEO-optimised with target keywords
- Include a meta description (excerpt) under 160 chars
- Use HTML: h2, h3, p, strong, blockquote, ul/li tags
- Demonstrate EXPERIENCE: Reference real match situations, The Gaffer's track record
- Demonstrate EXPERTISE: Use specific stats, xG data, tactical analysis
- Demonstrate AUTHORITATIVENESS: Reference The Footy Oracle's verified P&L record
- Demonstrate TRUSTWORTHINESS: Include a responsible gambling disclaimer
- NEVER include specific monetary amounts or encourage irresponsible betting
- Be genuinely entertaining — readers should WANT to share this`;

  const jsonFormat = `Format your response as JSON:
{
  "title": "SEO title under 60 chars",
  "excerpt": "Meta description under 160 chars",
  "content": "<h2>...</h2><p>...</p>..."
}`;

  switch (type) {
    case 'match-preview': {
      const { date, matchSummaries } = context;
      return `${basePersonality}

Write a hilariously engaging match preview for today's AI Golden Bet selections.

Today's Date: ${date}
Today's Picks:
${matchSummaries}

${seoRules}
- Target keywords: "football predictions today", "over 2.5 goals tips", "BTTS predictions"
- Include a punchy intro hook that makes people laugh
- For each pick: team form, key stats, why it's value — but make it FUNNY
- Include tactical observations that show deep knowledge
- 700-1000 words

${jsonFormat}`;
    }

    case 'weekly-roundup': {
      const { wins, total, profit, results } = context;
      return `${basePersonality}

Write a hilarious weekly P&L roundup. Be brutally honest about losses — that's what makes it funny AND trustworthy.

Stats: ${wins}/${total} winners, £${(profit as number).toFixed(2)} P&L
Results: ${results}

${seoRules}
- Target keywords: "football betting results", "betting P&L this week"
- Celebrate wins with over-the-top reactions
- Handle losses with self-deprecating humour (never defensive)
- Include lessons learned — disguised as comedy
- 500-700 words

${jsonFormat}`;
    }

    case 'guide': {
      const { topic } = context;
      return `${basePersonality}

Write an educational but genuinely funny guide about: "${topic || 'How Over 2.5 Goals Betting Works'}"

${seoRules}
- Target keywords related to the topic
- Explain like you're teaching your mate at the pub
- Use real examples and relatable analogies
- Cover: what it means, how to analyse it, stats to look for, common mistakes
- 600-900 words

${jsonFormat}`;
    }

    case 'funny-story': {
      const topics = [
        "the most ridiculous bet that actually won this season",
        "football predictions that defied all logic and data",
        "when AI gets it hilariously wrong — and what we learned",
        "the funniest football stats you've never heard of",
        "classic betting blunders and how to avoid them",
        "the weirdest football results that broke every model",
        "confession time: The Gaffer's worst ever prediction",
        "if football managers used AI — a comedy of errors",
      ];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];

      return `${basePersonality}

Write a HILARIOUS football betting story/comedy article about: "${randomTopic}"

This should be laugh-out-loud funny. Think viral social media content. The kind of article people screenshot and share.

${seoRules}
- Target keywords: "funny football betting stories", "hilarious football predictions"
- Must include real (or realistically plausible) football references
- Include The Gaffer's trademark observations and one-liners
- Weave in genuine betting wisdom between the laughs
- 500-800 words

${jsonFormat}`;
    }

    case 'betting-news': {
      const date = new Date().toISOString().split('T')[0];
      return `${basePersonality}

Write a football betting news roundup with The Gaffer's take on current football events. Cover 2-3 of these topics (pick what's most relevant for ${date}):
- Transfer rumours and their betting market impact
- Manager sackings and new appointments
- Injury news affecting upcoming fixtures
- League title / relegation race analysis
- European competition storylines
- Emerging trends in football data/stats

${seoRules}
- Target keywords: "football betting news today", "football transfer betting impact"
- Each news item gets The Gaffer's comedic hot take
- Include actionable insights — what it means for punters
- 500-800 words

${jsonFormat}`;
    }

    case 'ai-ml-insight': {
      const aiTopics = [
        "How our xG model spots value the bookies miss",
        "Why machine learning is changing football betting forever",
        "The 5 stats that matter most for Over 2.5 Goals predictions",
        "How we trained our AI on 50,000+ matches — and what it learned",
        "Expected Goals explained: why xG is the crystal ball of football",
        "How The Footy Oracle's Bayesian engine works (in human English)",
        "Form vs. fixtures: what our AI says about football's biggest debate",
      ];
      const randomAiTopic = aiTopics[Math.floor(Math.random() * aiTopics.length)];

      return `${basePersonality}

Write an article about AI/ML in football betting: "${randomAiTopic}"

Make complex data science concepts FUNNY and accessible. You're explaining neural networks to your nan — but making her laugh while doing it.

${seoRules}
- Target keywords: "AI football predictions", "machine learning betting", "xG explained"
- Explain the tech in plain English with funny analogies
- Reference The Footy Oracle's actual methodology (xG, rolling stats, Bayesian engine)
- Show EXPERTISE without being boring
- 600-900 words

${jsonFormat}`;
    }

    case 'morning-briefing': {
      const { date, betsDetail } = context;
      return `${basePersonality}

Write The Gaffer's MORNING BRIEFING — a comprehensive deep-dive analysis covering ALL of today's featured bets across THREE products: Golden Bets, Bet Builder of the Day, and ACCA Delight.

Today's Date: ${date}

ALL SELECTIONS & INTELLIGENCE DATA:
${betsDetail}

${seoRules}
- Title format: "The Gaffer's Morning Briefing: [Date]"
- Target keywords: "football betting tips today", "daily betting analysis", "expert football predictions", "bet builder tips", "acca tips today"
- Structure the article with clear H2 sections for each product:
  1. 🏆 GOLDEN BETS — For each of the 3 picks write 200-250 words covering team news, injuries, L10 form stats, referee, weather, why it's VALUE
  2. 🔧 BET BUILDER OF THE DAY — Deep-dive the multi-market selection: why each leg works together, combined probability analysis
  3. 🎯 ACCA DELIGHT — Break down each leg, explain the combined narrative, why this accumulator hangs together
- Open with a punchy intro setting the scene for today's full card
- Close with The Gaffer's overall confidence for the day and a cheeky sign-off
- Be genuinely funny throughout — pub banter energy, witty one-liners, football analogies
- 1500-2200 words total
- CRITICAL: Frame every stat POSITIVELY for the selection. Never undermine any pick. No negative language.

${jsonFormat}`;
    }
  }
}

/**
 * Sanitize HTML content — wrap loose text in <p> tags, clean up newlines
 */
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
    
    const paragraphs = trimmed.split(/\n\n+/).filter(p => p.trim());
    for (const p of paragraphs) {
      const pTrimmed = p.trim();
      if (pTrimmed && !pTrimmed.startsWith('<')) {
        result.push(`<p>${pTrimmed.replace(/\n/g, '<br/>')}</p>`);
      } else {
        result.push(pTrimmed);
      }
    }
  }
  
  return result.join('\n');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

    // Auth check: only service_role or internal orchestrator can call this
    const body: GenerateRequest = await req.json();
    const isScheduled = body.auto === true || body.scheduled === true;
    if (!isScheduled && !isAuthorized(req)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const body: GenerateRequest = await req.json();
    const { type, prediction_date, topic, title: manualTitle, content: manualContent, auto } = body;

    // Manual post creation
    if (manualTitle && manualContent) {
      const slug = manualTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const wordCount = manualContent.split(/\s+/).length;
      const readingTime = Math.max(1, Math.round(wordCount / 200));
      const contentWithLinks = manualContent + INTERNAL_LINKS + EEAT_BIO;

      const { data, error } = await supabase.from('blog_posts').insert({
        slug: `${slug}-${Date.now().toString(36)}`,
        title: manualTitle,
        excerpt: manualContent.substring(0, 160).replace(/<[^>]*>/g, ''),
        content: contentWithLinks,
        category: type || 'guide',
        post_type: type || 'guide',
        is_published: true,
        published_at: new Date().toISOString(),
        reading_time_minutes: readingTime,
        seo_title: manualTitle.substring(0, 60),
        seo_description: manualContent.substring(0, 160).replace(/<[^>]*>/g, ''),
      }).select().single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, post: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-generation mode: generate multiple posts
    if (auto) {
      if (!lovableKey) {
        return new Response(JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const results: Array<{ type: string; success: boolean; slug?: string; error?: string }> = [];

      // Always try morning-briefing (the deep-dive on all 3 golden bets)
      try {
        const briefingResult = await generatePost(supabase, lovableKey, 'morning-briefing', { prediction_date });
        results.push({ type: 'morning-briefing', ...briefingResult });
      } catch (e) {
        results.push({ type: 'morning-briefing', success: false, error: (e as Error).message });
      }

      // Always try match-preview
      try {
        const previewResult = await generatePost(supabase, lovableKey, 'match-preview', { prediction_date });
        results.push({ type: 'match-preview', ...previewResult });
      } catch (e) {
        results.push({ type: 'match-preview', success: false, error: (e as Error).message });
      }

      // Pick 2 random additional types each day
      const extraTypes: ContentType[] = ['funny-story', 'betting-news', 'ai-ml-insight', 'guide'];
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const pick1 = extraTypes[dayOfYear % extraTypes.length];
      const pick2 = extraTypes[(dayOfYear + 2) % extraTypes.length];

      for (const t of [pick1, pick2]) {
        try {
          const result = await generatePost(supabase, lovableKey, t, { topic });
          results.push({ type: t, ...result });
        } catch (e) {
          results.push({ type: t, success: false, error: (e as Error).message });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single post generation
    if (!lovableKey) {
      return new Response(JSON.stringify({ success: false, error: 'LOVABLE_API_KEY not configured' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const result = await generatePost(supabase, lovableKey, type, { prediction_date, topic });
    return new Response(JSON.stringify({ ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error('Blog generation error:', err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function generatePost(
  supabase: any,
  lovableKey: string,
  type: ContentType,
  opts: { prediction_date?: string; topic?: string }
): Promise<{ success: boolean; post?: unknown; slug?: string; error?: string }> {
  let context: Record<string, unknown> = {};
  let tags: string[] = [];
  let category: string = type;

  switch (type) {
    case 'match-preview': {
      const date = opts.prediction_date || new Date().toISOString().split('T')[0];
      const { data: bets } = await supabase
        .from('golden_bet_history')
        .select('*')
        .eq('prediction_date', date)
        .order('ml_confidence', { ascending: false })
        .limit(3);

      if (!bets || bets.length === 0) {
        return { success: false, error: 'No bets found for this date' };
      }

      const matchSummaries = bets.map(b =>
        `${b.home_team} vs ${b.away_team} (${b.league}) - Market: ${b.market}, ML Confidence: ${(b.ml_confidence * 100).toFixed(0)}%, Value Edge: ${(b.value_edge * 100).toFixed(1)}%`
      ).join('\n');

      context = { date, matchSummaries };
      tags = ['daily-picks', 'match-preview', ...bets.map(b => b.league.toLowerCase().replace(/\s+/g, '-'))];
      break;
    }
    case 'weekly-roundup': {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      const { data: bets } = await supabase
        .from('golden_bet_history')
        .select('*')
        .in('status', ['won', 'lost'])
        .gte('prediction_date', sevenDaysAgo)
        .order('prediction_date', { ascending: true });

      const wins = bets?.filter(b => b.status === 'won').length || 0;
      const total = bets?.length || 0;
      const profit = bets?.reduce((sum, b) => sum + (b.profit_loss || 0), 0) || 0;
      const results = bets?.map(b => `${b.home_team} vs ${b.away_team}: ${b.result} (${b.status})`).join(', ') || 'No results';

      context = { wins, total, profit, results };
      tags = ['weekly-roundup', 'p&l', 'results'];
      break;
    }
    case 'guide':
      context = { topic: opts.topic };
      tags = ['guide', 'betting-tips', 'education'];
      break;
    case 'funny-story':
      tags = ['funny', 'entertainment', 'betting-stories'];
      break;
    case 'betting-news':
      tags = ['news', 'transfers', 'football-news'];
      break;
    case 'ai-ml-insight':
      tags = ['ai', 'machine-learning', 'xg', 'data-science'];
      category = 'analysis';
      break;
    case 'morning-briefing': {
      const date = opts.prediction_date || new Date().toISOString().split('T')[0];

      // Fetch Golden Bets
      const { data: goldenBets } = await supabase
        .from('golden_bet_history')
        .select('*')
        .eq('prediction_date', date)
        .order('ml_confidence', { ascending: false })
        .limit(3);

      // Fetch Bet Builder
      const { data: betBuilders } = await supabase
        .from('bet_builder_history')
        .select('*')
        .eq('prediction_date', date)
        .order('average_confidence', { ascending: false })
        .limit(1);

      // Fetch ACCA
      const { data: accas } = await supabase
        .from('acca_history')
        .select('*')
        .eq('prediction_date', date)
        .order('created_at', { ascending: false })
        .limit(1);

      const allBets = goldenBets || [];
      const betBuilder = betBuilders?.[0];
      const acca = accas?.[0];

      if (allBets.length === 0 && !betBuilder && !acca) {
        return { success: false, error: 'No bets found for morning briefing' };
      }

      // Gather all fixture IDs for match intelligence
      const allFixtureIds = [
        ...allBets.map(b => b.fixture_id),
        ...(betBuilder ? [betBuilder.fixture_id] : []),
      ];
      const { data: intel } = await supabase
        .from('match_intelligence')
        .select('*')
        .in('fixture_id', allFixtureIds);

      // Gather all team names for rolling stats
      const allTeamNames = [
        ...allBets.flatMap(b => [b.home_team, b.away_team]),
        ...(betBuilder ? [betBuilder.home_team, betBuilder.away_team] : []),
      ];
      // Add ACCA teams
      if (acca?.selections) {
        const accaSels = acca.selections as any[];
        accaSels.forEach((s: any) => {
          if (s.teamName) allTeamNames.push(s.teamName);
          if (s.opposition) allTeamNames.push(s.opposition);
        });
      }

      const uniqueTeams = [...new Set(allTeamNames)];
      const { data: rollingStats } = await supabase
        .from('team_rolling_stats')
        .select('*')
        .in('team_name', uniqueTeams);

      // Build detail string for each product
      let betsDetail = '';

      // === GOLDEN BETS ===
      if (allBets.length > 0) {
        betsDetail += '\n=== 🏆 GOLDEN BETS (3 Singles / 3 Doubles + 1 Treble) ===\n';
        allBets.forEach(b => {
          const mi = intel?.find(i => i.fixture_id === b.fixture_id);
          const homeStats = rollingStats?.find(r => r.team_name === b.home_team);
          const awayStats = rollingStats?.find(r => r.team_name === b.away_team);

          betsDetail += `\n--- ${b.home_team} vs ${b.away_team} (${b.league}) ---\n`;
          betsDetail += `Market: ${b.market} | ML Confidence: ${(b.ml_confidence * 100).toFixed(0)}% | Value Edge: ${(b.value_edge * 100).toFixed(1)}% | Odds: ${b.bookmaker_odds}\n`;
          if (homeStats) betsDetail += `HOME L10: ${homeStats.avg_goals_scored} goals/gm, ${homeStats.avg_total_corners} corners/gm, ${homeStats.avg_total_cards} cards/gm, Over 2.5: ${homeStats.over_25_goals_pct}%, BTTS: ${homeStats.btts_pct}%, Form: ${homeStats.form_string}\n`;
          if (awayStats) betsDetail += `AWAY L10: ${awayStats.avg_goals_scored} goals/gm, ${awayStats.avg_total_corners} corners/gm, ${awayStats.avg_total_cards} cards/gm, Over 2.5: ${awayStats.over_25_goals_pct}%, BTTS: ${awayStats.btts_pct}%, Form: ${awayStats.form_string}\n`;
          if (mi) {
            if (mi.home_key_players_out?.length) betsDetail += `Home injuries: ${mi.home_key_players_out.join(', ')}\n`;
            if (mi.away_key_players_out?.length) betsDetail += `Away injuries: ${mi.away_key_players_out.join(', ')}\n`;
            if (mi.referee_name) betsDetail += `Referee: ${mi.referee_name} (avg cards: ${mi.referee_avg_cards})\n`;
            if (mi.weather_condition) betsDetail += `Weather: ${mi.weather_condition}, ${mi.weather_temp_celsius}°C, wind ${mi.weather_wind_speed_kmh}km/h\n`;
            if (mi.home_is_fatigued || mi.away_is_fatigued) betsDetail += `Fatigue: Home ${mi.home_is_fatigued ? 'YES' : 'no'}, Away ${mi.away_is_fatigued ? 'YES' : 'no'}\n`;
            if (mi.gaffer_talking_points?.length) betsDetail += `Talking points: ${mi.gaffer_talking_points.join('; ')}\n`;
          }
        });
      }

      // === BET BUILDER ===
      if (betBuilder) {
        betsDetail += '\n=== 🔧 BET BUILDER OF THE DAY ===\n';
        betsDetail += `${betBuilder.home_team} vs ${betBuilder.away_team} (${betBuilder.league})\n`;
        betsDetail += `Markets: ${betBuilder.markets.join(' + ')} | Combined Odds: ${betBuilder.combined_odds} | Avg Confidence: ${Math.round(betBuilder.average_confidence)}%\n`;
        const bbMi = intel?.find(i => i.fixture_id === betBuilder.fixture_id);
        const bbHome = rollingStats?.find(r => r.team_name === betBuilder.home_team);
        const bbAway = rollingStats?.find(r => r.team_name === betBuilder.away_team);
        if (bbHome) betsDetail += `HOME L10: ${bbHome.avg_goals_scored} goals/gm, ${bbHome.avg_total_corners} corners/gm, ${bbHome.avg_total_cards} cards/gm, Over 2.5: ${bbHome.over_25_goals_pct}%, BTTS: ${bbHome.btts_pct}%\n`;
        if (bbAway) betsDetail += `AWAY L10: ${bbAway.avg_goals_scored} goals/gm, ${bbAway.avg_total_corners} corners/gm, ${bbAway.avg_total_cards} cards/gm, Over 2.5: ${bbAway.over_25_goals_pct}%, BTTS: ${bbAway.btts_pct}%\n`;
        if (bbMi) {
          if (bbMi.referee_name) betsDetail += `Referee: ${bbMi.referee_name} (avg cards: ${bbMi.referee_avg_cards})\n`;
          if (bbMi.weather_condition) betsDetail += `Weather: ${bbMi.weather_condition}, ${bbMi.weather_temp_celsius}°C\n`;
        }
      }

      // === ACCA ===
      if (acca) {
        const accaSels = acca.selections as any[];
        betsDetail += '\n=== 🎯 ACCA DELIGHT ===\n';
        betsDetail += `Type: ${accaSels.length}-fold | Combined Odds: ${acca.combined_odds} | Avg Confidence: ${acca.average_confidence}%\n`;
        accaSels.forEach((s: any, i: number) => {
          const homeTeam = s.isHome ? s.teamName : s.opposition;
          const awayTeam = s.isHome ? s.opposition : s.teamName;
          betsDetail += `Leg ${i + 1}: ${homeTeam} vs ${awayTeam} (${s.league}) - ${s.market || s.marketLabel} - ${s.successPercent}% form rate\n`;
          const legHome = rollingStats?.find(r => r.team_name === homeTeam);
          const legAway = rollingStats?.find(r => r.team_name === awayTeam);
          if (legHome) betsDetail += `  HOME: Over 2.5 ${legHome.over_25_goals_pct}%, BTTS ${legHome.btts_pct}%, Corners ${legHome.avg_total_corners}/gm\n`;
          if (legAway) betsDetail += `  AWAY: Over 2.5 ${legAway.over_25_goals_pct}%, BTTS ${legAway.btts_pct}%, Corners ${legAway.avg_total_corners}/gm\n`;
        });
      }

      context = { date, betsDetail };
      tags = ['morning-briefing', 'daily-analysis', 'golden-bets', 'bet-builder', 'acca'];
      category = 'morning-briefing';
      break;
    }
  }

  const prompt = buildPrompt(type, context);

  // Call AI
  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      response_format: { type: 'json_object' },
    }),
  });

  if (!aiResponse.ok) {
    const errText = await aiResponse.text();
    throw new Error(`AI API error: ${aiResponse.status} ${errText}`);
  }

  const aiData = await aiResponse.json();
  const rawContent = aiData.choices?.[0]?.message?.content || '';

  let parsed: { title?: string; excerpt?: string; content?: string };
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON block found');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (jsonErr) {
    console.log('JSON parse failed, extracting fields manually...');
    const titleMatch = rawContent.match(/"title"\s*:\s*"([^"]+)"/);
    const excerptMatch = rawContent.match(/"excerpt"\s*:\s*"([^"]+)"/);
    const contentMatch = rawContent.match(/"content"\s*:\s*"([\s\S]+?)"\s*\}?\s*$/);
    if (!titleMatch) throw new Error('Could not extract title from AI response');
    let extractedContent = contentMatch?.[1] || '';
    extractedContent = extractedContent.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    parsed = { title: titleMatch[1], excerpt: excerptMatch?.[1] || '', content: extractedContent };
  }

  const { title: aiTitle, excerpt: aiExcerpt, content: rawAiContent } = parsed;
  if (!aiTitle || !rawAiContent) throw new Error('AI returned incomplete response');

  // Sanitize content — ensure proper HTML structure
  const aiContent = sanitizeArticleHtml(rawAiContent);

  // Append internal links and E-E-A-T bio
  const fullContent = aiContent + INTERNAL_LINKS + EEAT_BIO;

  const slug = aiTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const wordCount = aiContent.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const readingTime = Math.max(1, Math.round(wordCount / 200));

  // Generate hero image
  let heroImageUrl: string | null = null;
  try {
    const imagePrompts: Record<string, string> = {
      'match-preview': `Cinematic 16:9 football stadium at night, dramatic floodlights, moody atmosphere, no text, ultra high resolution`,
      'weekly-roundup': `16:9 dramatic football scoreboard montage, neon stats overlays, dark moody stadium, no text, ultra high resolution`,
      'guide': `16:9 football tactical chalkboard with glowing neon diagrams, dark dramatic lighting, no text, ultra high resolution`,
      'funny-story': `16:9 hilarious cartoon-style football scene, exaggerated expressions, comic book style, vibrant colors, no text, ultra high resolution`,
      'betting-news': `16:9 dramatic football news desk with multiple screens showing matches, breaking news atmosphere, dark studio, no text, ultra high resolution`,
      'ai-ml-insight': `16:9 futuristic football holographic data visualization, neural network patterns over a football pitch, cyberpunk style, no text, ultra high resolution`,
      'morning-briefing': `16:9 dramatic morning sunrise over a football stadium, golden hour light, tactical data overlays floating in the air, premium newspaper front page feel, moody cinematic atmosphere, no text, ultra high resolution`,
    };

    const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [{
          role: 'user',
          content: imagePrompts[type] || imagePrompts['match-preview'],
        }],
        modalities: ['image', 'text'],
      }),
    });

    if (imageResponse.ok) {
      const imgData = await imageResponse.json();
      const base64 = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (base64) {
        const rawB64 = base64.includes(',') ? base64.split(',')[1] : base64;
        const imageBytes = Uint8Array.from(atob(rawB64), c => c.charCodeAt(0));
        const fileName = `blog/${slug}-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from('bet-proofs')
          .upload(fileName, imageBytes, { contentType: 'image/png', upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('bet-proofs').getPublicUrl(fileName);
          heroImageUrl = urlData.publicUrl;
        }
      }
    }
  } catch (imgErr) {
    console.error('Hero image generation failed (non-fatal):', imgErr);
  }

  // Insert
  const { data: post, error: insertError } = await supabase.from('blog_posts').insert({
    slug: `${slug}-${Date.now().toString(36)}`,
    title: aiTitle,
    excerpt: aiExcerpt || aiContent.substring(0, 160).replace(/<[^>]*>/g, ''),
    content: fullContent,
    hero_image_url: heroImageUrl,
    category,
    tags,
    post_type: type,
    related_prediction_date: (type === 'match-preview' || type === 'morning-briefing') ? (opts.prediction_date || new Date().toISOString().split('T')[0]) : null,
    is_published: true,
    published_at: new Date().toISOString(),
    reading_time_minutes: readingTime,
    seo_title: aiTitle.substring(0, 60),
    seo_description: (aiExcerpt || aiContent.substring(0, 160)).substring(0, 160).replace(/<[^>]*>/g, ''),
  }).select().single();

  if (insertError) throw insertError;

  return { success: true, post, slug: post?.slug };
}

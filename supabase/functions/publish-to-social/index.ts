import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Publish to Social Media via Zapier → Buffer → Facebook
 * 
 * ONLY shares the 3 daily challenge articles:
 * 1. challenge-results  (Yesterday's Results Recap)
 * 2. daily-picks         (Gaffer's Daily Picks)
 * 3. bets-on             (Bets On / Proof Update)
 * 
 * Tracks shared posts via a "social_shared_at" tag to prevent duplicates.
 */

const ALLOWED_POST_TYPES = ["challenge-results", "daily-picks", "bets-on"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ZAPIER_WEBHOOK_URL = Deno.env.get("ZAPIER_WEBHOOK_URL");
  if (!ZAPIER_WEBHOOK_URL) {
    return new Response(JSON.stringify({ error: "ZAPIER_WEBHOOK_URL not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const publishedUrl = body.published_url || "https://thefootyoracle.lovable.app";
    const targetDate = body.date || new Date().toISOString().split("T")[0];

    // Only fetch the 3 challenge article types for today, that haven't been shared yet
    const { data: posts, error } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, hero_image_url, category, post_type, tags")
      .eq("is_published", true)
      .eq("related_prediction_date", targetDate)
      .in("post_type", ALLOWED_POST_TYPES)
      .order("published_at", { ascending: true });

    if (error) throw error;

    // Filter out already-shared posts (tagged with "social-shared")
    const unsent = (posts || []).filter(
      (p: any) => !Array.isArray(p.tags) || !p.tags.includes("social-shared")
    );

    if (unsent.length === 0) {
      return new Response(JSON.stringify({ message: "No new challenge articles to share today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const post of unsent) {
      const emoji = post.post_type === "challenge-results" ? "📊"
        : post.post_type === "daily-picks" ? "⚽"
        : "🏆";

      const link = `${publishedUrl}/blog/${post.slug}`;
      const fullImageUrl = post.hero_image_url || `${publishedUrl}/favicon.png`;
      const socialText = `${emoji} ${post.title}\n\n${post.excerpt}\n\n👉 ${link}\n\n#100to1000 #BettingChallenge #TheFootyOracle #TheGaffer`;

      const payload = {
        title: post.title,
        excerpt: post.excerpt,
        text: socialText,
        social_text: socialText,
        image_url: fullImageUrl,
        media_url: fullImageUrl,
        photo: fullImageUrl,
        media: fullImageUrl,
        link,
        category: post.category || post.post_type,
        emoji,
      };

      const res = await fetch(ZAPIER_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await res.text(); // consume body

      if (res.ok) {
        // Mark as shared by adding "social-shared" tag
        const existingTags: string[] = Array.isArray(post.tags) ? post.tags : [];
        await supabase
          .from("blog_posts")
          .update({ tags: [...existingTags, "social-shared"] })
          .eq("id", post.id);
      }

      console.log(`📱 Social share: ${post.slug} → ${res.status}`);
      results.push({ slug: post.slug, status: res.status, ok: res.ok });
    }

    return new Response(JSON.stringify({ shared: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Social publish error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

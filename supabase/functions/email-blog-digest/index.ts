import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Hardcoded recipient — The Gaffer's daily digest
const DIGEST_RECIPIENTS = ["dannythehat2@gmail.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get today's date
    const today = new Date().toISOString().split("T")[0];

    // Fetch all blog posts published today
    const { data: posts, error: postsError } = await supabase
      .from("blog_posts")
      .select("title, excerpt, slug, hero_image_url, post_type, category, reading_time_minutes")
      .eq("is_published", true)
      .gte("published_at", `${today}T00:00:00Z`)
      .lte("published_at", `${today}T23:59:59Z`)
      .order("published_at", { ascending: true });

    if (postsError) throw postsError;

    if (!posts || posts.length === 0) {
      console.log("No blog posts published today — skipping digest");
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: "No posts today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📰 Found ${posts.length} articles for today's digest`);

    const siteUrl = "https://thefootyoracle.lovable.app";

    // Build the email HTML
    const postCards = posts
      .map((p) => {
        const typeEmoji: Record<string, string> = {
          "morning-briefing": "☀️",
          "match-preview": "⚽",
          "match-roundup": "📝",
          "funny-story": "😂",
          "ai-ml-insight": "🤖",
          "betting-news": "📰",
          guide: "📚",
          "weekly-roundup": "📊",
        };
        const emoji = typeEmoji[p.post_type] || "📄";
        const heroImg = p.hero_image_url
          ? `<img src="${p.hero_image_url}" alt="${p.title}" style="width:100%;border-radius:8px 8px 0 0;max-height:200px;object-fit:cover;" />`
          : "";

        return `
        <div style="background:#252542;border-radius:8px;margin-bottom:16px;overflow:hidden;border:1px solid #333;">
          ${heroImg}
          <div style="padding:16px;">
            <div style="font-size:12px;color:#ffd700;margin-bottom:6px;">${emoji} ${(p.post_type || p.category).replace(/-/g, " ").toUpperCase()} · ${p.reading_time_minutes || 3} min read</div>
            <h3 style="margin:0 0 8px 0;font-size:18px;color:#fff;">${p.title}</h3>
            <p style="margin:0 0 12px 0;color:#aaa;font-size:14px;line-height:1.4;">${p.excerpt || ""}</p>
            <a href="${siteUrl}/blog/${p.slug}" style="color:#ffd700;text-decoration:none;font-weight:bold;font-size:14px;">Read Full Article →</a>
          </div>
        </div>`;
      })
      .join("");

    // Social sharing section
    const socialSection = posts
      .map((p) => {
        const postUrl = encodeURIComponent(`${siteUrl}/blog/${p.slug}`);
        const postTitle = encodeURIComponent(p.title);
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${postUrl}`;
        const twitterUrl = `https://twitter.com/intent/tweet?url=${postUrl}&text=${postTitle}`;

        return `
        <div style="background:#1e1e36;padding:10px 14px;border-radius:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#ccc;font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.title}</span>
          <span style="white-space:nowrap;margin-left:10px;">
            <a href="${fbUrl}" style="color:#4267B2;text-decoration:none;margin-right:10px;font-size:13px;">📘 FB</a>
            <a href="${twitterUrl}" style="color:#1DA1F2;text-decoration:none;margin-right:10px;font-size:13px;">🐦 X</a>
            ${p.hero_image_url ? `<a href="${p.hero_image_url}" style="color:#E1306C;text-decoration:none;font-size:13px;" title="Download image for Instagram">📸 IG</a>` : ""}
          </span>
        </div>`;
      })
      .join("");

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a2e;color:#fff;padding:24px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#ffd700;margin:0;font-size:24px;">📰 The Gaffer's Daily Digest</h1>
        <p style="color:#888;margin:6px 0 0;">${today} · ${posts.length} article${posts.length > 1 ? "s" : ""} published</p>
      </div>

      ${postCards}

      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #333;">
        <h3 style="color:#ffd700;margin:0 0 12px;">📱 Quick Share for Social Media</h3>
        <p style="color:#888;font-size:13px;margin:0 0 12px;">Click to share directly or download hero images for Instagram:</p>
        ${socialSection}
      </div>

      <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #333;">
        <a href="${siteUrl}/blog" style="background:#ffd700;color:#000;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">View All on Blog</a>
      </div>

      <p style="text-align:center;color:#555;font-size:11px;margin-top:20px;">
        The Footy Oracle · AI-Powered Football Predictions · <a href="${siteUrl}" style="color:#666;">thefootyoracle.com</a>
      </p>
    </div>`;

    // Send to all recipients
    let sentCount = 0;
    for (const email of DIGEST_RECIPIENTS) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "The Footy Oracle <onboarding@resend.dev>",
            to: [email],
            subject: `📰 Today's Articles Ready — ${posts.length} New Posts (${today})`,
            html,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`❌ Resend error for ${email}:`, errText);
          continue;
        }
        sentCount++;
        console.log(`✅ Digest sent to ${email}`);
      } catch (emailErr) {
        console.error(`❌ Failed to send to ${email}:`, emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        articles: posts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Blog digest error:", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

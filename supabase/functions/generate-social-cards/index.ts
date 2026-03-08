import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const zapierUrl = Deno.env.get("ZAPIER_WEBHOOK_URL");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let targetDate = getTodayDate();
    let cardType = "both"; // "picks", "challenge", or "both"
    try {
      const body = await req.json();
      if (body?.date) targetDate = body.date;
      if (body?.type) cardType = body.type;
    } catch {}

    console.log(`🎬 Generating social cards for ${targetDate} (type: ${cardType})`);

    // Fetch data
    const [goldenRes, bbRes, accaRes, challengeRes] = await Promise.all([
      supabase.from("golden_bet_history").select("*").eq("prediction_date", targetDate).order("ml_confidence", { ascending: false }).limit(6),
      supabase.from("bet_builder_history").select("*").eq("prediction_date", targetDate).limit(3),
      supabase.from("acca_history").select("*").eq("prediction_date", targetDate).limit(1),
      supabase.from("challenge_log").select("*").eq("challenge_date", targetDate).single(),
    ]);

    const goldenBets = goldenRes.data || [];
    const betBuilders = bbRes.data || [];
    const accas = accaRes.data || [];
    const challenge = challengeRes.data;

    const cards: Array<{ name: string; prompt: string; caption: string }> = [];

    // Card 1: Daily Picks Title Card
    if (cardType === "picks" || cardType === "both") {
      const picksSummary = goldenBets.slice(0, 3).map((gb: any) =>
        `${gb.home_team} v ${gb.away_team}: ${gb.market}`
      ).join(", ");

      const acca = accas[0];
      const accaOdds = acca ? acca.combined_odds.toFixed(1) : null;

      cards.push({
        name: "daily-picks",
        prompt: `Create a bold 9:16 mobile social media card for a football betting tips account called "The Footy Oracle". 
Dark navy/black background with gold accents and electric blue highlights. 
Top: Gold badge "THE GAFFER'S PICKS" with a flat cap icon.
Center: Today's date "${targetDate}" in large text.
Below: "${goldenBets.length} Golden Bets" and "${betBuilders.length} Bet Builder${betBuilders.length !== 1 ? 's' : ''}" and ${acca ? `"ACCA @ ${accaOdds}"` : '"No ACCA today"'}.
Bottom: "thefootyoracle.com" in small gold text.
Style: Premium, cinematic sports graphics, dramatic lighting, no real photos. Ultra high resolution.`,
        caption: `⚽ The Gaffer's Picks – ${targetDate}

${goldenBets.length} Golden Bets | ${betBuilders.length} Bet Builder${betBuilders.length !== 1 ? 's' : ''}${acca ? ` | ACCA @ ${accaOdds}` : ''}

${goldenBets.slice(0, 3).map((gb: any) => `🏆 ${gb.home_team} v ${gb.away_team} — ${gb.market}`).join('\n')}

👉 Link in bio for full analysis

#FootballPredictions #BettingTips #TheFootyOracle #GoldenBets #TheGaffer`,
      });

      // Card 2: Individual top pick highlight
      if (goldenBets.length > 0) {
        const topPick = goldenBets[0];
        cards.push({
          name: "top-pick",
          prompt: `Create a striking 9:16 mobile social card for "The Footy Oracle" football predictions.
Dark dramatic background with spotlight effect.
Large text: "${(topPick as any).home_team} vs ${(topPick as any).away_team}".
Below: "${(topPick as any).market}" in gold text.
Confidence meter showing ${Math.round((topPick as any).ml_confidence * 100)}%.
${(topPick as any).bookmaker_odds ? `Odds: ${(topPick as any).bookmaker_odds}` : ''}
League badge area: "${(topPick as any).league}".
Bottom: "THE GAFFER'S TOP PICK 🏆" gold banner.
Style: Premium sports broadcast graphics, cinematic, bold typography. Ultra high resolution.`,
          caption: `🏆 TOP PICK OF THE DAY

${(topPick as any).home_team} vs ${(topPick as any).away_team}
⚽ ${(topPick as any).market}
📊 ${Math.round((topPick as any).ml_confidence * 100)}% Confidence
${(topPick as any).bookmaker_odds ? `💰 Odds: ${(topPick as any).bookmaker_odds}` : ''}

${(topPick as any).gaffer_reasoning?.substring(0, 120)}...

👉 Full analysis at thefootyoracle.com

#FootballTips #BettingTips #TheFootyOracle #TheGaffer`,
        });
      }
    }

    // Card 3: Challenge Update
    if ((cardType === "challenge" || cardType === "both") && challenge) {
      const dayNum = challenge.day_number;
      const balance = challenge.starting_balance;
      const stake = challenge.stake_amount;
      const status = challenge.status;
      const closingBalance = challenge.closing_balance;

      const balanceDisplay = closingBalance && status !== "pending"
        ? `€${closingBalance.toFixed(2)}`
        : `€${balance.toFixed(2)}`;

      const profitDisplay = challenge.profit_loss != null
        ? (challenge.profit_loss >= 0 ? `+€${challenge.profit_loss.toFixed(2)}` : `-€${Math.abs(challenge.profit_loss).toFixed(2)}`)
        : null;

      cards.push({
        name: "challenge-update",
        prompt: `Create an exciting 9:16 mobile social card for "The Footy Oracle" €100 to €1,000 Challenge.
Dark background with gold gradient border.
Top: "€100 → €1,000 CHALLENGE" in bold gold.
Center large: "DAY ${dayNum}" with dramatic typography.
Balance display: "${balanceDisplay}" in large electric blue/gold numbers.
Today's stake: "€${stake.toFixed(2)} STAKED" in white.
${profitDisplay ? `Result: "${profitDisplay}" in ${challenge.profit_loss >= 0 ? 'green' : 'red'}` : 'Status: "BETS PLACED ⏳"'}
Progress bar showing balance relative to €1,000 target.
Bottom: "thefootyoracle.com" small gold text.
Style: Premium, cinematic, dark luxury sports aesthetic. Ultra high resolution.`,
        caption: `🏆 €100 → €1,000 CHALLENGE — DAY ${dayNum}

💰 Balance: ${balanceDisplay}
📊 Today's Stake: €${stake.toFixed(2)}
${profitDisplay ? `📈 Result: ${profitDisplay}` : '⏳ Bets placed — results incoming!'}
${challenge.bets_won != null ? `✅ ${challenge.bets_won}W / ❌ ${challenge.bets_lost}L` : ''}

Follow the journey 👉 thefootyoracle.com/challenge

#100to1000 #BettingChallenge #TheFootyOracle #TheGaffer`,
      });
    }

    if (cards.length === 0) {
      return new Response(JSON.stringify({ success: false, message: "No data to generate cards for " + targetDate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate images
    const results: Array<{ name: string; imageUrl: string | null; caption: string; sent: boolean }> = [];

    for (const card of cards) {
      let imageUrl: string | null = null;

      try {
        const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: card.prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (imageResponse.ok) {
          const imgData = await imageResponse.json();
          const base64 = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (base64) {
            const rawB64 = base64.includes(",") ? base64.split(",")[1] : base64;
            const imageBytes = Uint8Array.from(atob(rawB64), (c) => c.charCodeAt(0));
            const fileName = `social/${targetDate}-${card.name}-${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
              .from("bet-proofs")
              .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });
            if (!uploadError) {
              const { data: urlData } = supabase.storage.from("bet-proofs").getPublicUrl(fileName);
              imageUrl = urlData.publicUrl;
            }
          }
        } else {
          console.error(`Image gen failed for ${card.name}: ${imageResponse.status}`);
        }
      } catch (imgErr) {
        console.error(`Image gen error for ${card.name}:`, imgErr);
      }

      // Send to Zapier
      let sent = false;
      if (zapierUrl && imageUrl) {
        try {
          const zapRes = await fetch(zapierUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `Social Card: ${card.name}`,
              social_text: card.caption,
              text: card.caption,
              image_url: imageUrl,
              media_url: imageUrl,
              photo: imageUrl,
              media: imageUrl,
              link: "https://thefootyoracle.lovable.app",
              card_type: card.name,
              date: targetDate,
            }),
          });
          sent = zapRes.ok || zapRes.status === 200;
          console.log(`📱 Social card ${card.name} → Zapier: ${zapRes.status}`);
        } catch (zapErr) {
          console.error(`Zapier send failed for ${card.name}:`, zapErr);
        }
      }

      results.push({ name: card.name, imageUrl, caption: card.caption, sent });

      // Small delay between AI calls
      if (cards.indexOf(card) < cards.length - 1) {
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    console.log(`🎬 Social cards complete: ${results.filter(r => r.imageUrl).length}/${results.length} generated`);

    return new Response(JSON.stringify({ success: true, cards: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Social cards error:", err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

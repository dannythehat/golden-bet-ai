import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  type: "new_bets" | "settlement";
  data: {
    goldenBets?: Array<{
      homeTeam: string;
      awayTeam: string;
      market: string;
      confidence: number;
      odds: number;
    }>;
    betBuilder?: {
      homeTeam: string;
      awayTeam: string;
      markets: string[];
      combinedOdds: number;
    };
    settlements?: Array<{
      type: string;
      homeTeam: string;
      awayTeam: string;
      result: string;
      profitLoss: number;
    }>;
  };
}

const marketLabels: Record<string, string> = {
  over_2_5_goals: "Over 2.5 Goals",
  btts: "Both Teams to Score",
  over_9_5_corners: "Over 9.5 Corners",
  over_3_5_cards: "Over 3.5 Cards",
  over_25_cards: "Over 2.5 Cards",
  over_25_goals: "Over 2.5 Goals",
  over_95_corners: "Over 9.5 Corners",
};

function formatMarket(market: string): string {
  return marketLabels[market] || market.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function generateNewBetsEmail(data: EmailPayload["data"]): string {
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #ffffff; padding: 20px; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #ffd700; margin: 0;">🎯 The Gaffer's Daily Picks</h1>
        <p style="color: #888;">Fresh selections just landed!</p>
      </div>
  `;

  if (data.goldenBets && data.goldenBets.length > 0) {
    html += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #ffd700; border-bottom: 2px solid #ffd700; padding-bottom: 10px;">⭐ Golden Bets</h2>
    `;
    data.goldenBets.forEach((bet, i) => {
      html += `
        <div style="background: #252542; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #ffd700;">
          <div style="font-weight: bold; font-size: 16px;">${i + 1}. ${bet.homeTeam} vs ${bet.awayTeam}</div>
          <div style="color: #ffd700; margin-top: 5px;">${formatMarket(bet.market)}</div>
          <div style="display: flex; justify-content: space-between; margin-top: 10px; color: #888;">
            <span>Confidence: ${(bet.confidence * 100).toFixed(0)}%</span>
            <span>Odds: ${bet.odds.toFixed(2)}</span>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  if (data.betBuilder) {
    html += `
      <div style="margin-bottom: 30px;">
        <h2 style="color: #4ade80; border-bottom: 2px solid #4ade80; padding-bottom: 10px;">🏗️ Bet Builder of the Day</h2>
        <div style="background: #252542; padding: 15px; border-radius: 8px; border-left: 4px solid #4ade80;">
          <div style="font-weight: bold; font-size: 16px;">${data.betBuilder.homeTeam} vs ${data.betBuilder.awayTeam}</div>
          <div style="margin-top: 10px;">
            ${data.betBuilder.markets.map((m) => `<span style="background: #4ade80; color: #000; padding: 3px 8px; border-radius: 4px; margin-right: 5px; font-size: 12px;">${formatMarket(m)}</span>`).join("")}
          </div>
          <div style="margin-top: 10px; color: #4ade80; font-weight: bold;">Combined Odds: ${data.betBuilder.combinedOdds.toFixed(2)}</div>
        </div>
      </div>
    `;
  }

  html += `
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
        <a href="https://thefootyoracle.lovable.app" style="background: #ffd700; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View All Picks</a>
      </div>
      <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
        You're receiving this because you enabled email alerts. <a href="https://thefootyoracle.lovable.app/#settings" style="color: #888;">Manage preferences</a>
      </p>
    </div>
  `;

  return html;
}

function generateSettlementEmail(data: EmailPayload["data"]): string {
  const settlements = data.settlements || [];
  const wins = settlements.filter((s) => s.result === "won");
  const losses = settlements.filter((s) => s.result === "lost");
  const totalPL = settlements.reduce((sum, s) => sum + s.profitLoss, 0);

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #ffffff; padding: 20px; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: ${totalPL >= 0 ? "#4ade80" : "#ef4444"}; margin: 0;">📊 Daily Results</h1>
        <p style="color: #888;">Here's how The Gaffer's picks performed</p>
      </div>
      
      <div style="display: flex; justify-content: space-around; margin-bottom: 30px; text-align: center;">
        <div style="background: #252542; padding: 15px 25px; border-radius: 8px;">
          <div style="color: #4ade80; font-size: 24px; font-weight: bold;">${wins.length}</div>
          <div style="color: #888; font-size: 12px;">WINS</div>
        </div>
        <div style="background: #252542; padding: 15px 25px; border-radius: 8px;">
          <div style="color: #ef4444; font-size: 24px; font-weight: bold;">${losses.length}</div>
          <div style="color: #888; font-size: 12px;">LOSSES</div>
        </div>
        <div style="background: #252542; padding: 15px 25px; border-radius: 8px;">
          <div style="color: ${totalPL >= 0 ? "#4ade80" : "#ef4444"}; font-size: 24px; font-weight: bold;">${totalPL >= 0 ? "+" : ""}£${totalPL.toFixed(2)}</div>
          <div style="color: #888; font-size: 12px;">P&L</div>
        </div>
      </div>
  `;

  settlements.forEach((bet) => {
    const isWin = bet.result === "won";
    html += `
      <div style="background: #252542; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid ${isWin ? "#4ade80" : "#ef4444"};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="background: ${isWin ? "#4ade80" : "#ef4444"}; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">${bet.type}</span>
            <div style="font-weight: bold; margin-top: 5px;">${bet.homeTeam} vs ${bet.awayTeam}</div>
          </div>
          <div style="text-align: right;">
            <div style="color: ${isWin ? "#4ade80" : "#ef4444"}; font-weight: bold;">${isWin ? "WON ✓" : "LOST ✗"}</div>
            <div style="color: ${isWin ? "#4ade80" : "#ef4444"};">${bet.profitLoss >= 0 ? "+" : ""}£${bet.profitLoss.toFixed(2)}</div>
          </div>
        </div>
      </div>
    `;
  });

  html += `
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
        <a href="https://thefootyoracle.lovable.app/#pnl" style="background: #ffd700; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Full P&L</a>
      </div>
      <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
        You're receiving this because you enabled email alerts. <a href="https://thefootyoracle.lovable.app/#settings" style="color: #888;">Manage preferences</a>
      </p>
    </div>
  `;

  return html;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: EmailPayload = await req.json();
    console.log("📧 Sending bet emails:", payload.type);

    // Get users with email preferences enabled for this type
    const preferenceField = payload.type === "new_bets" ? "new_bets_enabled" : "settlement_enabled";
    
    const { data: preferences, error: prefError } = await supabase
      .from("email_preferences")
      .select("user_id")
      .eq(preferenceField, true);

    if (prefError) {
      console.error("Error fetching preferences:", prefError);
      throw prefError;
    }

    if (!preferences || preferences.length === 0) {
      console.log("No users with email preferences enabled");
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user emails from auth
    const userIds = preferences.map((p) => p.user_id);
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    const emailsToSend = users
      .filter((u) => userIds.includes(u.id) && u.email)
      .map((u) => u.email!);

    if (emailsToSend.length === 0) {
      console.log("No valid emails to send");
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate email content
    const subject = payload.type === "new_bets" 
      ? "🎯 The Gaffer's Daily Picks Are Live!" 
      : "📊 Your Daily Bet Results Are In";
    
    const html = payload.type === "new_bets" 
      ? generateNewBetsEmail(payload.data)
      : generateSettlementEmail(payload.data);

    // Send emails (batch to avoid rate limits)
    let sentCount = 0;
    for (const email of emailsToSend) {
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
            subject,
            html,
          }),
        });
        
        if (!res.ok) {
          const errorData = await res.text();
          console.error(`❌ Resend API error for ${email}:`, errorData);
          continue;
        }
        
        sentCount++;
        console.log(`✅ Email sent to ${email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send to ${email}:`, emailError);
      }
    }

    console.log(`📧 Sent ${sentCount}/${emailsToSend.length} emails`);

    return new Response(JSON.stringify({ sent: sentCount, total: emailsToSend.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in send-bet-emails:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

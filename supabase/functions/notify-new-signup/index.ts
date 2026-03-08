import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Note: Until you verify your domain at resend.com/domains, 
// emails can only be sent to the account owner's email
const ADMIN_EMAIL = "dannythehat2@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupNotification {
  email: string;
  signedUpAt: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, signedUpAt }: SignupNotification = await req.json();
    
    console.log(`📧 New user signup notification for: ${email}`);

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #ffffff; padding: 20px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ffd700; margin: 0;">🎉 New User Signup!</h1>
          <p style="color: #888;">Someone just joined The Gaffer's Inner Circle</p>
        </div>
        
        <div style="background: #252542; padding: 20px; border-radius: 8px; border-left: 4px solid #4ade80;">
          <div style="margin-bottom: 15px;">
            <span style="color: #888;">Email:</span>
            <div style="color: #fff; font-weight: bold; font-size: 18px;">${email}</div>
          </div>
          <div>
            <span style="color: #888;">Signed up at:</span>
            <div style="color: #fff;">${new Date(signedUpAt).toLocaleString('en-GB', { 
              dateStyle: 'full', 
              timeStyle: 'short' 
            })}</div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
          <a href="https://thefootyoracle.lovable.app" style="background: #ffd700; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Dashboard</a>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "The Footy Oracle <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `🎉 New Signup: ${email}`,
        html,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error("❌ Failed to send notification:", errorData);
      throw new Error(errorData);
    }

    console.log(`✅ Admin notified of new signup: ${email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in notify-new-signup:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { useState } from "react";

const features = [
  "Today's 3 Golden Bets",
  "ACCA Delight & Bet Builder daily picks",
  "\"Why this bet?\" Gaffer explainer",
  "Telegram alerts at 09:30 + in-play value",
  "World Cup Specials hub",
  "Email digest of daily picks",
  "Alert preferences (league & market filters)",
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { openCheckout, checkoutElement } = useStripeCheckout();
  const { isActive, subscription } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const startCheckout = (priceId: string) => {
    if (!isAuthenticated) {
      navigate("/auth?next=/pricing");
      return;
    }
    openCheckout({
      priceId,
      customerEmail: user?.email,
      userId: user?.id,
    });
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/pricing` },
      });
      if (error || !data?.url) throw new Error(error?.message || data?.error || "Could not open portal");
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Gaffer's Inner Circle
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">Join the Inner Circle</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Due to growing demand and to keep the lights on, we've added a tiny charge to keep the picks rolling.
            Free stuff stays free — Form Tables, blog, verified P&amp;L.
          </p>
        </div>

        {isActive && (
          <Card className="p-5 mb-6 border-emerald-500/40 bg-emerald-500/5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold">You're in the Inner Circle ✅</p>
                <p className="text-xs text-muted-foreground">
                  Plan: {subscription?.price_id} · Status: {subscription?.status}
                  {subscription?.cancel_at_period_end && " · Cancels at period end"}
                </p>
              </div>
              <Button variant="outline" onClick={openPortal} disabled={portalLoading}>
                {portalLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Manage subscription
              </Button>
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Monthly</p>
            <div className="flex items-baseline gap-1 my-2">
              <span className="text-4xl font-bold">£3</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground mb-5">Cancel any time.</p>
            <Button className="w-full" onClick={() => startCheckout("inner_circle_monthly")} disabled={isActive}>
              {isActive ? "Active" : "Start monthly"}
            </Button>
          </Card>

          <Card className="p-6 border-primary/50 relative overflow-hidden">
            <div className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded">
              Save £6
            </div>
            <p className="text-sm text-muted-foreground">Yearly</p>
            <div className="flex items-baseline gap-1 my-2">
              <span className="text-4xl font-bold">£30</span>
              <span className="text-muted-foreground">/year</span>
            </div>
            <p className="text-xs text-muted-foreground mb-5">£2.50/month, billed annually.</p>
            <Button className="w-full" onClick={() => startCheckout("inner_circle_yearly")} disabled={isActive}>
              {isActive ? "Active" : "Start yearly"}
            </Button>
          </Card>
        </div>

        <Card className="p-6 mt-6">
          <h3 className="font-semibold mb-4">What's included</h3>
          <ul className="grid sm:grid-cols-2 gap-2.5">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          No free trial. No hidden fees. Cancel any time.
        </p>
      </div>
      {checkoutElement}
    </div>
  );
}

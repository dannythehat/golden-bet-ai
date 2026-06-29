import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Crown, Trophy, Sparkles, ArrowRight, ExternalLink, Settings, Calendar, Loader2,
  Newspaper, Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { InnerCircleBadge } from "@/components/InnerCircleBadge";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";
import theGafferImage from "@/assets/the-gaffer.png";

export default function MembersDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isActive, subscription, loading: subLoading } = useSubscription();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Members — The Footy Oracle Club";
  }, []);

  // Gate: redirect non-members away.
  useEffect(() => {
    if (authLoading || subLoading) return;
    if (!isAuthenticated) {
      navigate("/auth?next=/members", { replace: true });
      return;
    }
    if (!isActive) navigate("/pricing", { replace: true });
  }, [authLoading, subLoading, isAuthenticated, isActive, navigate]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = (user?.email?.split("@")[0] || "Gaffer").replace(/[._-]/g, " ").split(" ")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const planLabel = subscription?.price_id === "inner_circle_yearly" ? "Yearly" :
    subscription?.price_id === "inner_circle_monthly" ? "Monthly" : "Member";

  const handleManageBilling = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { environment: getStripeEnvironment(), returnUrl: window.location.origin + "/members" },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error || !data?.url) throw new Error(error?.message || "Could not open billing portal");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast({ title: "Couldn't open billing", description: (e as Error).message, variant: "destructive" });
    }
  };

  if (authLoading || subLoading || !isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background sparkle-bg relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/3 w-[480px] h-[480px] bg-gold/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <Navigation activeSection="home" onSectionChange={() => {}} />

      <main className="relative container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-24 flex-1">
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
          {/* Greeting Hero */}
          <header className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/10 via-card/80 to-card p-6 md:p-8 shadow-xl shadow-gold/5">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-5">
              <img
                src={theGafferImage}
                alt="The Gaffer"
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-gold/40 shadow-lg shrink-0"
                style={{ objectPosition: '58% 20%' }}
                width={80}
                height={80}
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                <InnerCircleBadge size="md" />
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {greeting}, <span className="text-gold">{displayName}</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome to the Club. The new season's being built — your Fantasy League place and member perks land soon.
                </p>
              </div>
              <div className="flex flex-col items-stretch md:items-end gap-2 shrink-0">
                <Badge variant="outline" className="border-gold/40 text-gold bg-gold/5 gap-1.5 self-start md:self-auto">
                  <Crown className="w-3 h-3" /> {planLabel}
                </Badge>
                {renewalDate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {subscription?.cancel_at_period_end ? "Ends" : "Renews"} {renewalDate}
                  </p>
                )}
              </div>
            </div>
          </header>

          {/* Coming this season */}
          <section className="grid md:grid-cols-3 gap-4">
            <Card className="border-gold/20 bg-gradient-to-br from-card to-gold/[0.03]">
              <CardContent className="p-5 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-gold" />
                </div>
                <h3 className="font-bold">Fantasy League</h3>
                <p className="text-sm text-muted-foreground">Your place in the Footy Oracle Fantasy League — take on The Gaffer all season.</p>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-gold hover:text-gold hover:bg-gold/10 px-0">
                  <Link to="/fantasy-league">Reserve your place <ArrowRight className="w-3.5 h-3.5" /></Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-5 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold">Daily Gaffer Articles</h3>
                <p className="text-sm text-muted-foreground">The Gaffer's daily take — winners, howlers and proper banter.</p>
                <Button asChild variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary hover:bg-primary/10 px-0">
                  <Link to="/blog">Read the latest <ArrowRight className="w-3.5 h-3.5" /></Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-5 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold">Awards & Community</h3>
                <p className="text-sm text-muted-foreground">Weekly awards, prizes and a community that remembers everything.</p>
              </CardContent>
            </Card>
          </section>

          {/* Membership management */}
          <section className="rounded-2xl border border-border/50 bg-card/60 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-gold" />
              <h3 className="font-semibold text-sm">Your membership</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <Button onClick={handleManageBilling} variant="outline" size="sm" className="justify-start gap-2">
                <Settings className="w-4 h-4" /> Manage billing
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start gap-2">
                <Link to="/fantasy-league">
                  <Trophy className="w-4 h-4" /> Fantasy League
                  <ArrowRight className="w-3 h-3 ml-auto opacity-50" />
                </Link>
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Crown, Trophy, Layers, Hammer, BarChart3, Flame, Sparkles,
  ArrowRight, ExternalLink, Settings, Calendar, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { InnerCircleBadge } from "@/components/InnerCircleBadge";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useGoldenBets } from "@/hooks/useGoldenBets";
import { useAccaBuilder } from "@/hooks/useAccaBuilder";
import { useBetBuilder } from "@/hooks/useBetBuilder";
import { usePLHistory } from "@/hooks/usePLHistory";
import { formatTeamName } from "@/lib/teamNames";
import {
  getMarketIcon, getMarketLabel, normalizeMarketKey,
} from "@/lib/marketDisplay";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";
import theGafferImage from "@/assets/the-gaffer.webp";

function StatTile({
  label, value, sub, accent = false,
}: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent
      ? "border-gold/30 bg-gradient-to-br from-gold/10 via-card to-card"
      : "border-border/50 bg-card/80"
    }`}>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? "text-gold" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function MembersDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isActive, subscription, loading: subLoading } = useSubscription();
  const { bets: goldenBets, isLoading: goldenLoading } = useGoldenBets();
  const { todaysAcca, noAcca } = useAccaBuilder();
  const { betBuilder, noBetBuilder } = useBetBuilder();
  const { stats, byDate, isLoading: plLoading } = usePLHistory();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Members Dashboard — Inner Circle | The Footy Oracle";
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

  // Streak from byDate (consecutive profitable days, newest first).
  const { streakDays, streakProfit } = useMemo(() => {
    if (!byDate?.length) return { streakDays: 0, streakProfit: 0 };
    const sorted = [...byDate].sort((a, b) => b.date.localeCompare(a.date));
    let days = 0, profit = 0;
    for (const d of sorted) {
      if ((d.netProfit ?? 0) > 0) { days++; profit += d.netProfit; } else break;
    }
    return { streakDays: days, streakProfit: profit };
  }, [byDate]);

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

  const topGolden = goldenBets.slice(0, 3);

  return (
    <div className="min-h-screen bg-background sparkle-bg relative overflow-hidden flex flex-col">
      {/* Subtle ambient gold glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/3 w-[480px] h-[480px] bg-gold/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <Navigation activeSection="home" onSectionChange={() => {}} />

      <main className="relative container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-24 flex-1">
        <div className="space-y-8 animate-fade-in">
          {/* Greeting Hero */}
          <header className="relative overflow-hidden rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/10 via-card/80 to-card p-6 md:p-8 shadow-xl shadow-gold/5">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-5">
              <img
                src={theGafferImage}
                alt="The Gaffer"
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-gold/40 shadow-lg shrink-0"
                width={80}
                height={80}
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                <InnerCircleBadge size="md" />
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  {greeting}, <span className="text-gold">{displayName}</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  The Gaffer's been busy. Your picks, your numbers — all in one place.
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

          {/* Quick Stats Strip */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              accent
              label="Streak"
              value={streakDays > 0 ? `${streakDays}d` : "—"}
              sub={streakDays > 0 ? `+£${streakProfit.toFixed(2)} profit` : "Reset"}
            />
            <StatTile
              label="Monthly P&L"
              value={plLoading ? "…" : `${stats.monthly.netProfit >= 0 ? "+" : ""}£${stats.monthly.netProfit.toFixed(2)}`}
              sub={`${stats.monthly.wins}W ${stats.monthly.losses}L`}
            />
            <StatTile
              label="All-Time ROI"
              value={plLoading ? "…" : `${stats.allTime.roi >= 0 ? "+" : ""}${stats.allTime.roi}%`}
              sub={`${stats.allTime.totalBets} bets`}
            />
            <StatTile
              label="Today's Picks"
              value={`${topGolden.length}`}
              sub={`${noAcca ? 0 : 1} ACCA · ${noBetBuilder ? 0 : 1} BB`}
            />
          </section>

          {/* Today's Golden Picks */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center shadow-lg shadow-gold/20">
                  <Trophy className="w-4.5 h-4.5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Today's <span className="text-gold">Golden Picks</span></h2>
                  <p className="text-xs text-muted-foreground">The Gaffer's three sharpest plays</p>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-gold hover:text-gold hover:bg-gold/10 gap-1">
                <Link to="/#home">All picks <ArrowRight className="w-3.5 h-3.5" /></Link>
              </Button>
            </div>

            {goldenLoading ? (
              <div className="flex items-center justify-center py-10 rounded-2xl border border-border/40 bg-card/50">
                <Loader2 className="w-5 h-5 animate-spin text-gold" />
              </div>
            ) : topGolden.length > 0 ? (
              <div className="grid sm:grid-cols-3 gap-3">
                {topGolden.map((bet) => {
                  const mkt = normalizeMarketKey(bet.market);
                  const ko = new Date(bet.kickoff);
                  return (
                    <div
                      key={bet.id}
                      className="group relative rounded-xl border border-gold/20 bg-gradient-to-br from-card via-card to-gold/[0.04] p-4 hover:border-gold/40 transition-all hover:shadow-lg hover:shadow-gold/10"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                          {bet.league}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {ko.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm font-semibold leading-tight mb-1">
                        {formatTeamName(bet.homeTeam)} <span className="text-muted-foreground">vs</span> {formatTeamName(bet.awayTeam)}
                      </p>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gold/15">
                        <span className="text-xs text-gold/90">{getMarketIcon(mkt)} {getMarketLabel(mkt)}</span>
                        <span className="text-sm font-bold text-gold">{bet.bookmakerOdds.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/40 bg-card/50 p-8 text-center text-sm text-muted-foreground">
                No Golden Picks yet today — The Gaffer's still scanning.
              </div>
            )}
          </section>

          {/* ACCA + Bet Builder side-by-side */}
          <section className="grid md:grid-cols-2 gap-4">
            {/* ACCA Tile */}
            <Card className="border-gold/20 bg-gradient-to-br from-card to-gold/[0.03] hover:border-gold/35 transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-navy flex items-center justify-center shadow">
                      <Layers className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold">Today's <span className="text-primary">ACCA</span></h3>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary hover:bg-primary/10">
                    <Link to="/acca-delight">Open <ArrowRight className="w-3.5 h-3.5" /></Link>
                  </Button>
                </div>
                {todaysAcca ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {(todaysAcca as { selections?: unknown[] }).selections?.length ?? 3}-leg treble · combined odds{" "}
                      <span className="text-foreground font-semibold">
                        {((todaysAcca as { combined_odds?: number }).combined_odds ?? 0).toFixed(2)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">€10 stake · daily form-table treble</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No qualifying treble today.</p>
                )}
              </CardContent>
            </Card>

            {/* Bet Builder Tile */}
            <Card className="border-gold/20 bg-gradient-to-br from-card to-gold/[0.03] hover:border-gold/35 transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-navy flex items-center justify-center shadow">
                      <Hammer className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold">Today's <span className="text-primary">Bet Builder</span></h3>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary hover:bg-primary/10">
                    <Link to="/bet-builder">Open <ArrowRight className="w-3.5 h-3.5" /></Link>
                  </Button>
                </div>
                {betBuilder ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold leading-tight">
                      {formatTeamName((betBuilder as { home_team: string }).home_team)}{" "}
                      <span className="text-muted-foreground">vs</span>{" "}
                      {formatTeamName((betBuilder as { away_team: string }).away_team)}
                    </p>
                    <p className="text-xs text-muted-foreground">Same Game Multi · 70%+ confidence per leg</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No Bet Builder today.</p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* P&L Snapshot + Streak */}
          <section className="grid md:grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-gold" />
                  <h3 className="font-bold">P&L Snapshot</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Weekly", v: stats.weekly },
                    { label: "Monthly", v: stats.monthly },
                    { label: "Yearly", v: stats.yearly },
                    { label: "All-Time", v: stats.allTime },
                  ].map((r) => (
                    <div key={r.label} className="rounded-lg bg-background/50 border border-border/30 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{r.label}</p>
                      <p className={`text-lg font-bold ${r.v.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                        {r.v.netProfit >= 0 ? "+" : ""}£{r.v.netProfit.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{r.v.wins}W · {r.v.losses}L · {r.v.roi}% ROI</p>
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm" className="w-full gap-2">
                  <Link to="/#pnl"><BarChart3 className="w-4 h-4" /> Full P&L Hub</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-gold/25 bg-gradient-to-br from-gold/8 via-card to-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold">Gaffer's Streak</h3>
                </div>
                {streakDays > 0 ? (
                  <>
                    <div className="text-center py-4">
                      <p className="text-5xl font-extrabold text-gold">{streakDays}</p>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                        Consecutive profitable {streakDays === 1 ? "day" : "days"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-center">
                      <p className="text-sm font-semibold text-success">+£{streakProfit.toFixed(2)} on the run</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No active streak. Tomorrow's a fresh start.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Quick Actions */}
          <section className="rounded-2xl border border-border/50 bg-card/60 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-gold" />
              <h3 className="font-semibold text-sm">Inner Circle Perks</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <Button onClick={handleManageBilling} variant="outline" size="sm" className="justify-start gap-2">
                <Settings className="w-4 h-4" /> Manage Billing
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start gap-2">
                <Link to="/blog">
                  <Sparkles className="w-4 h-4" /> Daily Articles
                  <ArrowRight className="w-3 h-3 ml-auto opacity-50" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start gap-2">
                <Link to="/#in-play">
                  <Trophy className="w-4 h-4" /> In-Play Tracker
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

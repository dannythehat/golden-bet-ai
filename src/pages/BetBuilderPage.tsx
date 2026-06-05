import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Sparkles, Loader2, ArrowLeft, Brain, Target, Shield, TrendingUp, CheckCircle2, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BetBuilderCard } from '@/components/BetBuilderCard';
import { Paywall } from '@/components/Paywall';
import { useBetBuilder } from '@/hooks/useBetBuilder';
import { useInPlayStats, LiveFixtureStats } from '@/hooks/useInPlayStats';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import theGafferImage from '@/assets/the-gaffer.webp';

function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/fc|cf|sc|ac|as|us|ss|afc|rfc$/gi, '').replace(/^fc|^cf|^sc|^ac|^as|^us|^ss|^afc|^rfc/gi, '').replace(/[^a-z0-9]/g, '').trim();
}

function findLiveStatsForMatch(homeTeam: string, awayTeam: string, liveFixtures: LiveFixtureStats[], fixtureId?: string | number): LiveFixtureStats | undefined {
  if (fixtureId !== undefined && fixtureId !== null) {
    const idNum = typeof fixtureId === 'number' ? fixtureId : Number(fixtureId);
    if (Number.isFinite(idNum)) {
      const byId = liveFixtures.find(live => live.fixture_id === idNum);
      if (byId) return byId;
    }
  }
  const homeNorm = normalizeTeam(homeTeam);
  const awayNorm = normalizeTeam(awayTeam);
  const includesMatch = (a: string, b: string) => a.includes(b) || b.includes(a);
  return liveFixtures.find(live => {
    const liveHome = normalizeTeam(live.home_team);
    const liveAway = normalizeTeam(live.away_team);
    return (includesMatch(homeNorm, liveHome) && includesMatch(awayNorm, liveAway)) ||
           (includesMatch(homeNorm, liveAway) && includesMatch(awayNorm, liveHome));
  });
}

export default function BetBuilderPage() {
  const { betBuilder, isLoading, noBetBuilder, noBetBuilderMessage } = useBetBuilder();
  const { liveFixtures, startPolling, stopPolling } = useInPlayStats();

  useEffect(() => {
    startPolling(60000);
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  useEffect(() => {
    document.title = 'AI Bet Builder of the Day – Same Game Multi Football Picks | The Footy Oracle';
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Daily AI-powered Bet Builder picks combining goals, corners, cards and BTTS into one high-value same game multi. The Gaffer only fires when 2+ markets hit 70% confidence.');
    setMeta('keywords', 'bet builder football, same game multi, football bet builder today, AI bet builder picks, bet builder predictions, The Footy Oracle bet builder');

    // JSON-LD structured data for SEO
    const script = document.getElementById('bet-builder-jsonld') || document.createElement('script');
    script.id = 'bet-builder-jsonld';
    (script as HTMLScriptElement).type = 'application/ld+json';
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "AI Bet Builder of the Day",
      "description": "Daily AI-powered football bet builder picks from The Footy Oracle. Same game multi predictions with transparent stats.",
      "url": "https://thefootyoracle.lovable.app/bet-builder",
      "publisher": { "@type": "Organization", "name": "The Footy Oracle" }
    });
    document.head.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen bg-background sparkle-bg relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <Navigation activeSection="home" onSectionChange={() => {}} />

      <main className="relative container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-24 flex-1">
        <div className="space-y-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          {/* SEO Hero */}
          <header className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">Daily Same Game Multi Picks</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              AI <span className="text-primary">Bet Builder</span> of the Day
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Multiple markets, one fixture, one powerful AI-backed same game multi. The Gaffer only fires when the stats scream value across 2+ markets simultaneously.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="border-primary/40 text-primary/80 bg-primary/5">⚽ Goals Markets</Badge>
              <Badge variant="outline" className="border-primary/40 text-primary/80 bg-primary/5">🚩 Corners Markets</Badge>
              <Badge variant="outline" className="border-primary/40 text-primary/80 bg-primary/5">🟨 Cards Markets</Badge>
              <Badge variant="outline" className="border-primary/40 text-primary/80 bg-primary/5">🥅 BTTS</Badge>
            </div>
          </header>

          {/* How It Works banner */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20">
            <span className="text-2xl">📊</span>
            <div>
              <p className="text-sm font-semibold text-foreground">For Bet Builder Fans</p>
              <p className="text-xs text-muted-foreground">The Gaffer selects one standout same game multi per day — wins and losses tracked with full transparency. Our precision P&L product is <Link to="/" className="underline text-primary">Golden Bets</Link>, where we focus our best model per market.</p>
            </div>
          </div>

          {/* How It Works */}
          <section aria-labelledby="how-it-works-heading" className="grid gap-4 md:grid-cols-3">
            <h2 id="how-it-works-heading" className="sr-only">How the AI Bet Builder Works</h2>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/8 to-card">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-navy flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground">Multi-Market Analysis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  8 markets per fixture scanned — goals, BTTS, corners, cards — finding the fixture where multiple stats converge into one powerful same game multi.
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/8 to-card">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-navy flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground">70%+ Confidence Gate</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every leg must clear a 70% confidence threshold. If no fixture qualifies, The Gaffer won't force a pick — quality over quantity, always.
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/8 to-card">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-navy flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground">20% Value Edge Required</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every leg needs a minimum 20% value edge vs bookmaker odds. Only bets where AI finds genuine value make the cut.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Gaffer Intro */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-xl p-5 md:p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-center gap-5 relative">
              <img src={theGafferImage} alt="The Gaffer AI Football Analyst" className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/40 shadow-xl shrink-0" width={80} height={80} />
              <div className="text-center sm:text-left space-y-2">
                <h2 className="text-xl font-bold text-foreground">The Gaffer's <span className="text-primary">Same Game Multi</span></h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "The Bet Builder is my same game multi special — one fixture where I stack multiple markets. 
                  Goals AND corners AND cards in the same match. I only pull the trigger when the stats line up across 
                  at least two markets with 70%+ confidence. When it hits, it hits big."
                </p>
              </div>
            </div>
          </div>

          {/* Today's Bet Builder */}
          <section aria-labelledby="todays-betbuilder-heading">
            <h2 id="todays-betbuilder-heading" className="text-2xl font-bold text-foreground mb-4">Today's <span className="text-primary">Bet Builder</span></h2>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">The Gaffer is building today's special...</span>
              </div>
            ) : betBuilder ? (
              <div className="max-w-2xl mx-auto">
                <BetBuilderCard
                  betBuilder={betBuilder}
                  liveStats={findLiveStatsForMatch(betBuilder.home_team, betBuilder.away_team, liveFixtures, betBuilder.fixture_id)}
                />
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-card p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Layers className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="text-xl font-bold">No Bet Builder Today</h3>
                <p className="text-muted-foreground max-w-md mx-auto text-sm">
                  {noBetBuilderMessage || 'No qualifying fixtures today — this can happen during international breaks or light fixture days. The Gaffer only backs winners, so check back tomorrow!'}
                </p>
              </div>
            )}
          </section>

          {/* What qualifies */}
          <section aria-labelledby="markets-heading">
            <h2 id="markets-heading" className="text-2xl font-bold text-foreground mb-4">What <span className="text-primary">Qualifies</span></h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: '⚽', title: 'Over/Under 2.5 Goals', desc: 'Goals ML model identifies high/low scoring fixtures based on 60-match rolling averages for both teams.' },
                { icon: '🥅', title: 'Both Teams to Score (BTTS)', desc: 'BTTS model leverages head-to-head clean sheet records and defensive stability ratings.' },
                { icon: '🚩', title: 'Over/Under 9.5 Corners', desc: 'Corners ML analyses possession style, set-piece frequency, and pitch tempo indicators.' },
                { icon: '🟨', title: 'Over/Under 3.5 Cards', desc: 'Cards model uses referee profiles, rivalry intensity, and historical disciplinary data.' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors">
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SEO Content Article */}
          <section aria-labelledby="about-heading">
            <Card className="border-border/30 bg-card/50">
              <CardContent className="p-6 space-y-4">
                <h2 id="about-heading" className="text-xl font-bold text-foreground">What is The Footy Oracle's AI Bet Builder?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The Footy Oracle's AI Bet Builder (also known as a Same Game Multi or SGM) combines multiple betting markets from a single football match into one combined selection. 
                  Each day, our machine learning models scan fixtures across Europe's top leagues — Premier League, La Liga, Bundesliga, Serie A, Ligue 1 and more — 
                  to find matches where multiple markets align statistically with high confidence.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every leg must meet a minimum <strong className="text-foreground">70% model confidence</strong> and a <strong className="text-foreground">20% value edge</strong> vs bookmaker implied probability. 
                  This means The Gaffer only recommends bet builders when the data genuinely supports the combination — no forced picks, no padding.
                </p>
                <h3 className="text-base font-bold text-foreground">Why use an AI Bet Builder?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    'Transparent reasoning — every leg explained with real stats',
                    'Only Tier 1–2 leagues for bookmaker market availability',
                    'Live in-play tracking once matches kick off',
                    'Daily picks generated fresh each morning at 6am UTC',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">
                    📰 Daily bet builder articles are published in our <Link to="/blog" className="text-primary hover:underline inline-flex items-center gap-1">Blog <ExternalLink className="w-3 h-3" /></Link> — 
                    each post links back to this page for full context and today's selection.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

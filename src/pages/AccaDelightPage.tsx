import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Brain, Trophy, Target, CheckCircle2, ExternalLink, Zap } from 'lucide-react';
import { useInPlayStats } from '@/hooks/useInPlayStats';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AccaBuilderSection } from '@/components/AccaBuilderSection';
import { Paywall } from '@/components/Paywall';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import theGafferImage from '@/assets/the-gaffer.webp';

export default function AccaDelightPage() {
  const { liveFixtures } = useInPlayStats();

  useEffect(() => {
    document.title = 'Accas Delight – Daily AI Football Accumulator Predictions | The Footy Oracle';

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Daily 4-fold football accumulator from European form table teams. AI picks the hardest qualifying market per team for maximum combined odds. Free ACCA predictions updated every morning.');
    setMeta('keywords', 'football accumulator predictions, daily acca tips, ACCA delight, AI football accumulator, 4 fold acca today, European ACCA predictions, The Footy Oracle acca');

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement('link'); (canonical as HTMLLinkElement).rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = 'https://thefootyoracle.lovable.app/acca-delight';

    // JSON-LD
    const script = document.getElementById('acca-delight-jsonld') || document.createElement('script');
    script.id = 'acca-delight-jsonld';
    (script as HTMLScriptElement).type = 'application/ld+json';
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Accas Delight – Daily AI Football Accumulator",
      "description": "Daily 4-fold football accumulator predictions powered by AI form table analysis. European leagues, maximum value picks.",
      "url": "https://thefootyoracle.lovable.app/acca-delight",
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
              <span className="text-sm font-medium text-primary">Daily AI Accumulator Predictions</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Accas <span className="text-primary">Delight</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Daily 3-fold treble from Europe's top form table teams. One leg each: Over 1.5 Goals, Over 8.5 Corners, Over 3.5 Cards — lower risk, consistent returns, €10 stake.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="border-primary/40 text-primary/80 bg-primary/5">⚽ Over 1.5 Goals</Badge>
              <Badge variant="outline" className="border-primary/40 text-primary/80 bg-primary/5">🚩 Over 8.5 Corners</Badge>
              <Badge variant="outline" className="border-primary/40 text-primary/80 bg-primary/5">🟨 Over 3.5 Cards</Badge>
              <Badge variant="outline" className="border-primary/40 text-primary/80 bg-primary/5">💰 €10 Stake</Badge>
            </div>
          </header>

          {/* How It Works banner */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/8 border border-primary/20">
            <span className="text-2xl">📈</span>
            <div>
              <p className="text-sm font-semibold text-foreground">For ACCA Fans</p>
              <p className="text-xs text-muted-foreground">The Gaffer builds a daily treble from European form table teams — one leg each from goals, corners and cards markets. Wins and losses tracked with full transparency. Our precision P&L product is <Link to="/" className="underline text-primary">Golden Bets</Link>, where we focus one top selection per core ML model.</p>
            </div>
          </div>

          {/* How It Works */}
          <section aria-labelledby="how-works-heading" className="grid gap-4 md:grid-cols-3">
            <h2 id="how-works-heading" className="sr-only">How Accas Delight Works</h2>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/8 to-card">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-navy flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground">Form Table Scanning</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every morning, the AI scans European form tables across goals, corners and cards markets to find the best qualifying team playing that day for each leg.
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/8 to-card">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-navy flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground">Fixed 3-Leg Treble</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Each treble has exactly 3 legs: Over 1.5 Goals, Over 8.5 Corners, Over 3.5 Cards. Lower-risk markets for consistent returns at €10 per day.
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/8 to-card">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-navy flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground">Bet365 Odds Required</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All 3 legs must have verified Bet365 odds. No estimated or fallback pricing — only real bookmaker lines make the cut.
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
                <h2 className="text-xl font-bold text-foreground">The Gaffer's <span className="text-primary">Accas Delight</span></h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                   "This is my daily treble — one goal leg, one corners leg, one cards leg. Lower risk, lower odds, but consistency 
                   is king. Every leg comes from the form tables with verified Bet365 odds. €10 a day, let the data do the talking."
                </p>
              </div>
            </div>
          </div>

          {/* Today's ACCA */}
          <section aria-labelledby="todays-acca-heading">
            <h2 id="todays-acca-heading" className="text-2xl font-bold text-foreground mb-4">Today's <span className="text-primary">ACCA</span></h2>
            <AccaBuilderSection liveFixtures={liveFixtures} />
          </section>

          {/* How the Odds Work */}
          <section aria-labelledby="odds-heading">
            <h2 id="odds-heading" className="text-2xl font-bold text-foreground mb-4">The <span className="text-primary">3 Legs</span></h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: '⚽', label: 'Over 1.5 Goals', desc: 'Low-risk goal market — most matches clear this line comfortably', color: 'border-emerald-500/40 bg-emerald-500/5' },
                { icon: '🚩', label: 'Over 8.5 Corners', desc: 'Corner market — form table teams with attacking styles generate corners', color: 'border-blue-500/40 bg-blue-500/5' },
                { icon: '🟨', label: 'Over 3.5 Cards', desc: 'Card market — competitive fixtures consistently produce bookings', color: 'border-amber-500/40 bg-amber-500/5' },
              ].map(item => (
                <div key={item.label} className={`p-4 rounded-xl border-2 ${item.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{item.icon}</span>
                  </div>
                  <p className="font-bold text-foreground text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SEO Content Article */}
          <section aria-labelledby="about-acca-heading">
            <Card className="border-border/30 bg-card/50">
              <CardContent className="p-6 space-y-4">
                <h2 id="about-acca-heading" className="text-xl font-bold text-foreground">What is The Footy Oracle's Accas Delight?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Accas Delight is The Footy Oracle's daily AI-powered football treble. Every morning, our machine learning models 
                  scan European form tables to identify the strongest team for each of three fixed markets: Over 1.5 Goals, Over 8.5 Corners, 
                  and Over 3.5 Cards. Only teams playing <em>that day</em> with verified Bet365 odds qualify.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  By using lower-risk markets (Over 1.5 Goals instead of Over 2.5, for example), the treble aims for consistent returns 
                  rather than big payouts. Each leg is backed by form table data and real bookmaker pricing — no padding, no estimated odds.
                </p>

                <h3 className="text-base font-bold text-foreground">Why Choose Accas Delight?</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    'Fixed 3-leg treble: Over 1.5 Goals, Over 8.5 Corners, Over 3.5 Cards',
                    'Lower-risk markets for more consistent hit rates',
                    '€10 fixed stake — transparent P&L tracking',
                    'All odds verified on Bet365 — no estimated pricing',
                    'European form table teams only — no filler leagues',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    Daily ACCA Delight articles are published in our{' '}
                    <Link to="/blog" className="text-primary hover:underline inline-flex items-center gap-1">Blog <ExternalLink className="w-3 h-3" /></Link>
                    {' '}— each post links directly to this page for today's selection.
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

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Sparkles, Loader2, Layers, Radio, RefreshCw, Target, Flag, CreditCard, Swords, Brain, TrendingUp, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoldenBetCard } from '@/components/GoldenBetCard';
import { GoldenDoubleCard } from '@/components/GoldenDoubleCard';
import { useGoldenBets } from '@/hooks/useGoldenBets';
import { useInPlayStats, LiveFixtureStats } from '@/hooks/useInPlayStats';
import { cn } from '@/lib/utils';
import theGafferImage from '@/assets/the-gaffer.webp';
import { formatTeamName } from '@/lib/teamNames';
import { getMarketLabel, getMarketIcon, normalizeMarketKey } from '@/lib/marketDisplay';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

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

export default function GoldenBets() {
  const { bets: goldenBets, isLoading, statusMessage, refetch } = useGoldenBets();
  const { liveFixtures, isLoading: liveLoading, lastUpdated, fetchLiveStats, startPolling, stopPolling } = useInPlayStats();

  useEffect(() => {
    startPolling(60000);
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // SEO
  useEffect(() => {
    document.title = 'AI Golden Bets - Daily Football Predictions | The Footy Oracle';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Free AI football predictions daily. Over 2.5 goals, BTTS, corners & cards picks powered by machine learning. Track record with full P&L transparency.');
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = 'Free AI football predictions daily. Over 2.5 goals, BTTS, corners & cards picks powered by machine learning. Track record with full P&L transparency.';
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background sparkle-bg relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <Navigation activeSection="predictions" onSectionChange={() => {}} />
      
      <main className="relative container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-24 flex-1">
        <div className="space-y-8">
          {/* Back link */}
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          {/* SEO Hero */}
          <header className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20">
              <Sparkles className="w-4 h-4 text-gold animate-pulse" />
              <span className="text-sm font-medium text-gold">AI Football Predictions</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold">
              <span className="gold-text">AI Golden Bets</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Daily AI-powered football predictions backed by 15+ years of data across 200+ leagues worldwide.
            </p>
          </header>

          {/* How It Works Explainer */}
          <section className="grid gap-4 md:grid-cols-3">
            <Card className="border-gold/20 bg-gradient-to-br from-gold/8 to-card">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mx-auto shadow-lg shadow-gold/20">
                  <Brain className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-foreground">AI-Powered Analysis</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Machine learning models trained on millions of matches crunch real-time form stats, head-to-head records, and market movements.
                </p>
              </CardContent>
            </Card>
            <Card className="border-gold/20 bg-gradient-to-br from-gold/8 to-card">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mx-auto shadow-lg shadow-gold/20">
                  <Trophy className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-foreground">3 Daily Picks</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The Gaffer delivers exactly 3 golden selections daily — Goals, BTTS, and Corners markets with real bookmaker odds from bet365.
                </p>
              </CardContent>
            </Card>
            <Card className="border-gold/20 bg-gradient-to-br from-gold/8 to-card">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center mx-auto shadow-lg shadow-gold/20">
                  <TrendingUp className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-bold text-foreground">3 Doubles + 1 Treble</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The recommended strategy: combine the 3 picks into 3 doubles and 1 treble. £10 each = £40 total stake for maximum value.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Gaffer Intro */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-gold/30 bg-gradient-to-br from-gold/10 via-card to-card shadow-xl shadow-gold/10 p-5 md:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <img src={theGafferImage} alt="The Gaffer AI" className="w-20 h-20 rounded-2xl object-cover border-2 border-gold/40 shadow-xl shrink-0" />
              <div className="text-center sm:text-left space-y-2">
                <h2 className="text-xl font-bold text-foreground">Meet <span className="text-gold">The Gaffer</span></h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "I've been crunching football data since before your bookie had a website. Every morning I scan 200+ leagues, 
                  run the numbers through my AI models, and hand-pick 3 golden selections. No gut feelings — just cold, hard stats 
                  with a manager's instinct. I show you exactly why each pick qualifies with transparent reasoning."
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Badge variant="outline" className="border-gold/40 text-gold bg-gold/10 text-xs"><Target className="w-3 h-3 mr-1" /> Goals</Badge>
                  <Badge variant="outline" className="border-gold/40 text-gold bg-gold/10 text-xs"><Swords className="w-3 h-3 mr-1" /> BTTS</Badge>
                  <Badge variant="outline" className="border-gold/40 text-gold bg-gold/10 text-xs"><Flag className="w-3 h-3 mr-1" /> Corners</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Picks */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-foreground">Today's <span className="text-gold">Golden Picks</span></h2>
              <div className="flex items-center gap-2">
                {liveFixtures.length > 0 && (
                  <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                    <Radio className="w-3 h-3 animate-pulse" /> {liveFixtures.length} LIVE
                  </Badge>
                )}
                <Button variant="ghost" size="icon" onClick={fetchLiveStats} disabled={liveLoading} className="h-8 w-8" title="Refresh">
                  <RefreshCw className={cn("w-4 h-4", liveLoading && "animate-spin")} />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gold" />
                <span className="ml-2 text-muted-foreground">The Gaffer is analyzing fixtures...</span>
              </div>
            ) : goldenBets.length > 0 ? (
              <div className="space-y-6">
                {/* Cards - single column on mobile for readability */}
                <div className="grid gap-4 md:grid-cols-3">
                  {goldenBets.slice(0, 3).map((bet, index) => {
                    const liveStats = findLiveStatsForMatch(bet.homeTeam, bet.awayTeam, liveFixtures, bet.fixtureId);
                    return <GoldenBetCard key={bet.id} bet={bet} index={index} liveStats={liveStats} />;
                  })}
                </div>

                {/* Doubles & Treble */}
                {goldenBets.length >= 3 && (() => {
                  const picks = goldenBets.slice(0, 3);
                  const doubles = [
                    { a: picks[0], b: picks[1], label: 'Double 1' },
                    { a: picks[0], b: picks[2], label: 'Double 2' },
                    { a: picks[1], b: picks[2], label: 'Double 3' },
                  ];
                  const trebleOdds = picks.reduce((acc, b) => acc * b.bookmakerOdds, 1);
                  const stake = 10;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shadow-lg shadow-gold/20">
                          <Layers className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-foreground">The Gaffer <span className="text-gold">Recommends</span></h3>
                          <p className="text-sm text-muted-foreground">3 doubles & 1 treble • £{stake} each = £{stake * 4} total stake</p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        {doubles.map((d, i) => {
                          const combinedOdds = d.a.bookmakerOdds * d.b.bookmakerOdds;
                          return (
                            <div key={i} className="p-4 rounded-xl bg-gradient-to-br from-gold/10 to-card border-2 border-gold/30 shadow-md">
                              <div className="text-xs font-bold text-gold uppercase tracking-wider mb-2">{d.label}</div>
                              <div className="space-y-2 mb-3">
                                <div className="text-sm text-foreground/90">
                                  <span className="text-muted-foreground">1.</span> {formatTeamName(d.a.homeTeam)} vs {formatTeamName(d.a.awayTeam)}
                                  <div className="text-xs text-gold/80 mt-0.5 ml-3">{getMarketIcon(normalizeMarketKey(d.a.market))} {getMarketLabel(normalizeMarketKey(d.a.market))}</div>
                                </div>
                                <div className="text-sm text-foreground/90">
                                  <span className="text-muted-foreground">2.</span> {formatTeamName(d.b.homeTeam)} vs {formatTeamName(d.b.awayTeam)}
                                  <div className="text-xs text-gold/80 mt-0.5 ml-3">{getMarketIcon(normalizeMarketKey(d.b.market))} {getMarketLabel(normalizeMarketKey(d.b.market))}</div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-gold/20">
                                <span className="text-xs text-muted-foreground">Odds</span>
                                <span className="text-lg font-black text-gold">{combinedOdds.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">£{stake} returns</span>
                                <span className="text-sm font-bold text-success">£{(stake * combinedOdds).toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Treble */}
                      <div className="p-5 rounded-xl bg-gradient-to-br from-gold/15 via-gold/5 to-card border-2 border-gold/40 shadow-lg">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                          <div className="flex-1">
                            <div className="text-xs font-bold text-gold uppercase tracking-wider mb-2">Golden Treble</div>
                            <div className="space-y-1">
                              {picks.map((p, i) => (
                                <div key={i} className="text-sm text-foreground/90">
                                  <span className="text-muted-foreground">{i + 1}.</span> {formatTeamName(p.homeTeam)} vs {formatTeamName(p.awayTeam)}
                                  <div className="text-xs text-gold/80 mt-0.5 ml-3">{getMarketIcon(normalizeMarketKey(p.market))} {getMarketLabel(normalizeMarketKey(p.market))}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-gradient-to-b from-gold/25 to-gold/10 border-2 border-gold/50 text-center min-w-[90px]">
                              <div className="text-[10px] text-gold/80 uppercase font-medium mb-1">Odds</div>
                              <div className="text-xl font-black text-gold">{trebleOdds.toFixed(2)}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-gradient-to-b from-success/20 to-success/5 border-2 border-success/50 text-center min-w-[90px]">
                              <div className="text-[10px] text-success/80 uppercase font-medium mb-1">£10 Returns</div>
                              <div className="text-xl font-black text-success">£{(stake * trebleOdds).toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="glass-card rounded-xl p-8 text-center space-y-4">
                <Trophy className="w-12 h-12 text-gold mx-auto" />
                <h3 className="text-xl font-bold">{statusMessage || "Today's picks coming soon"}</h3>
                <p className="text-muted-foreground">The Gaffer is analyzing today's fixtures. Check back shortly!</p>
                <Button variant="outline" onClick={() => refetch()} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
              </div>
            )}
          </section>

          {/* SEO Content */}
          <section className="prose prose-invert max-w-none">
            <Card className="border-border/30 bg-card/50">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold text-foreground">How AI Football Predictions Work</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The Footy Oracle uses advanced machine learning algorithms trained on over 15 years of football data spanning 200+ leagues worldwide. 
                  Our AI models analyse team form, historical head-to-head records, goal-scoring patterns, corner statistics, card trends, and real-time 
                  betting market movements to identify high-value selections every day.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Each Golden Bet comes with transparent reasoning — you see exactly why the AI selected each pick with stats and facts, 
                  plus The Gaffer's expert verdict. We track every prediction with full P&L transparency so you can verify our track record.
                </p>
                <h3 className="text-lg font-bold text-foreground">Markets We Cover</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>⚽ <strong>Over 2.5 Goals</strong> — High-scoring fixture predictions</li>
                  <li>🥅 <strong>Both Teams to Score (BTTS)</strong> — When both sides will find the net</li>
                  <li>🚩 <strong>Over 9.5 Corners</strong> — Corner-heavy match selections</li>
                </ul>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

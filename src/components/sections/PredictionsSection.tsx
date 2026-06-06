import { useState, useEffect } from 'react';
import { Trophy, Sparkles, Loader2, Layers, Radio, RefreshCw, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoldenBetCard } from '@/components/GoldenBetCard';
import { Paywall } from '@/components/Paywall';
import { InnerCircleFrame } from '@/components/InnerCircleFrame';
import { GoldenDoubleCard } from '@/components/GoldenDoubleCard';
import { useGoldenBets } from '@/hooks/useGoldenBets';
import { useInPlayStats, LiveFixtureStats } from '@/hooks/useInPlayStats';
import { cn } from '@/lib/utils';
import theGafferImage from '@/assets/the-gaffer.webp';
import { formatTeamName } from '@/lib/teamNames';
import { getMarketLabel, getMarketIcon, normalizeMarketKey } from '@/lib/marketDisplay';

function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/fc|cf|sc|ac|as|us|ss|afc|rfc$/gi, '')
    .replace(/^fc|^cf|^sc|^ac|^as|^us|^ss|^afc|^rfc/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function findLiveStatsForMatch(
  homeTeam: string,
  awayTeam: string,
  liveFixtures: LiveFixtureStats[],
  fixtureId?: string | number
): LiveFixtureStats | undefined {
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

export function PredictionsSection() {
  const { bets: goldenBets, isLoading, statusMessage, refetch } = useGoldenBets();
  const { liveFixtures, isLoading: liveLoading, lastUpdated, fetchLiveStats, startPolling, stopPolling } = useInPlayStats();

  useEffect(() => {
    startPolling(60000);
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20">
          <Sparkles className="w-4 h-4 text-gold animate-pulse" />
          <span className="text-sm font-medium text-gold">Today's Picks</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold">
          <span className="gold-text">AI Golden Bets</span>
        </h2>
      </div>

      {/* Golden Bet Cards */}
      <Card className="border-2 border-gold/30 bg-gradient-to-br from-gold/8 via-card to-card shadow-xl shadow-gold/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shadow-lg shadow-gold/20">
                <Trophy className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">The Gaffer's <span className="text-gold">Golden Picks</span></CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  Today's Gold selection from Goals, Corners & Cards
                  {liveFixtures.length > 0 && (
                    <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                      <Radio className="w-3 h-3 animate-pulse" />
                      {liveFixtures.length} LIVE
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground hidden md:block">
                  Updated: {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchLiveStats}
                disabled={liveLoading}
                className="h-8 w-8"
                title="Refresh live stats"
              >
                <RefreshCw className={cn("w-4 h-4", liveLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Explainer */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-4">
              <img src={theGafferImage} alt="The Gaffer" className="w-12 h-12 rounded-full object-cover border-2 border-primary/40 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">How The Gaffer Picks Winners</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-semibold">15+ years of football data. 200+ leagues worldwide.</span>
                  {' '}The Gaffer crunches real-time form stats, head-to-head records, and betting market movements to spot value others miss.
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">The Gaffer is analyzing fixtures...</span>
            </div>
          ) : goldenBets.length > 0 ? (
            <Paywall title="The Gaffer's Golden Picks — Inner Circle" message="Today's 3 Golden Picks plus recommended doubles & treble. Unlock with Inner Circle — £3/mo.">
              {/* Individual Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                {goldenBets.slice(0, 3).map((bet, index) => {
                  const liveStats = findLiveStatsForMatch(bet.homeTeam, bet.awayTeam, liveFixtures, bet.fixtureId);
                  return (
                    <InnerCircleFrame key={bet.id} showRibbon={index === 0}>
                      <GoldenBetCard bet={bet} index={index} liveStats={liveStats} />
                    </InnerCircleFrame>
                  );
                })}
              </div>

              {/* Recommended Doubles & Treble */}
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
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shadow-lg shadow-gold/20">
                        <Layers className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-foreground">The Gaffer <span className="text-gold">Recommends</span></h3>
                        <p className="text-sm text-muted-foreground">3 doubles & 1 treble • £{stake} each = £{stake * 4} total stake</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
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
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Combined Odds</span>
                              <span className="font-bold text-gold">{combinedOdds.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">£{stake} Returns</span>
                              <span className="font-bold text-success">£{(stake * combinedOdds).toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Treble */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-gold/12 to-gold/4 border-2 border-gold/40 shadow-md">
                      <div className="text-xs font-bold text-gold uppercase tracking-wider mb-2">Treble</div>
                      <div className="space-y-1.5 mb-3">
                        {picks.map((p, i) => (
                          <div key={i} className="text-sm text-foreground/90">
                            <span className="text-muted-foreground">{i + 1}.</span> {formatTeamName(p.homeTeam)} vs {formatTeamName(p.awayTeam)}
                            <div className="text-xs text-gold/80 mt-0.5 ml-3">{getMarketIcon(normalizeMarketKey(p.market))} {getMarketLabel(normalizeMarketKey(p.market))}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Combined Odds</span>
                        <span className="font-bold text-gold">{trebleOdds.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">£{stake} Returns</span>
                        <span className="font-bold text-success">£{(stake * trebleOdds).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Paywall>
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
        </CardContent>
      </Card>

      {/* Info Card */}
      <div className="glass-card rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center shrink-0">
          <Trophy className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="text-center md:text-left">
          <h3 className="text-xl font-semibold mb-2">How AI Golden Bets Work</h3>
          <p className="text-muted-foreground">
            Our AI analyzes real match data from API-Football: team form, recent results,
            goal averages, and BTTS rates. It identifies fixtures where statistics strongly
            favor <span className="text-gold">Over 2.5 Goals</span> or{' '}
            <span className="text-gold">BTTS Yes</span> markets, calculating confidence
            scores and value edges for each prediction.
          </p>
        </div>
      </div>
    </div>
  );
}

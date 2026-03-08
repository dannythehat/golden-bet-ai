/**
 * Accas Delight - Single 4-fold ACCA from European form table teams
 * Now with full in-play tracking, progress bars, and neon green won states
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Target, Flag, CreditCard, Swords, Clock, Trophy, RefreshCw, Radio, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import theGafferImage from '@/assets/the-gaffer.webp';
import { formatTeamName } from '@/lib/teamNames';
import { parseReasoning } from '@/lib/parseReasoning';
import { getEffectiveBetDate, isBeforeRefresh } from '@/lib/betDate';
import { Bet365Badge } from '@/components/Bet365Badge';
import { cn } from '@/lib/utils';
import type { LiveFixtureStats } from '@/hooks/useInPlayStats';
import { isInPlayStatus, isFinishedStatus } from '@/lib/fixtureStatus';
import { didMarketHit } from '@/lib/marketEval';
import { LiveMarketTracker, LiveScore, MatchStatusBadge } from '@/components/LiveMarketTracker';

interface BookmakerInfo {
  key: string;
  title: string;
}

interface AccaSelection {
  teamName: string;
  league: string;
  market: string;
  marketLabel: string;
  successPercent: number;
  opposition: string;
  oppositionStats: number | null;
  kickoff: string;
  isHome: boolean;
  gafferComment?: string;
  legOdds?: number;
  legBookmaker?: BookmakerInfo;
  fixtureId?: string | number;
}

interface AccaResult {
  success: boolean;
  noAcca?: boolean;
  reason?: string;
  message?: string;
  selections?: AccaSelection[];
  combined_odds?: number;
  average_confidence?: number;
  selection_count?: number;
  gaffer_reasoning?: string;
}

const MARKET_LABELS: Record<string, string> = {
  'goals:over_1_5': 'Over 1.5 Goals',
  'corners:over_8_5': 'Over 8.5 Corners',
  'cards:over_2_5': 'Over 2.5 Cards',
  'cards:over_3_5': 'Over 3.5 Cards',
  'goals:under_2_5': 'Under 2.5 Goals',
  'corners:under_9_5': 'Under 9.5 Corners',
  'cards:under_2_5': 'Under 2.5 Cards',
};

const getMarketIcon = (market: string) => {
  if (market.startsWith('goals:')) return <Target className="w-4 h-4" />;
  if (market.startsWith('corners:')) return <Flag className="w-4 h-4" />;
  if (market.startsWith('cards:')) return <CreditCard className="w-4 h-4" />;
  return <Target className="w-4 h-4" />;
};

const renderGafferComment = (comment: string | undefined) => {
  if (!comment) return null;
  const parts = comment.split(/(\[\[(?:BET_TYPE|RANK|INTEL):[^\]]+\]\])/g);
  return parts.map((part, index) => {
    const betTypeMatch = part.match(/\[\[BET_TYPE:([^\]]+)\]\]/);
    if (betTypeMatch) return <span key={index} className="font-bold text-[hsl(var(--neon-green))]">{betTypeMatch[1]}</span>;
    const rankMatch = part.match(/\[\[RANK:([^\]]+)\]\]/);
    if (rankMatch) return <span key={index} className="font-bold text-[hsl(var(--neon-green))]">{rankMatch[1]}</span>;
    const intelMatch = part.match(/\[\[INTEL:([^\]]+)\]\]/);
    if (intelMatch) return <span key={index} className="italic text-primary">{intelMatch[1]}.</span>;
    return <span key={index}>{part}</span>;
  });
};

interface AccaBuilderSectionProps {
  liveFixtures?: LiveFixtureStats[];
}

// Match live fixture to ACCA selection by team names
function findLiveMatch(
  selection: AccaSelection,
  liveFixtures: LiveFixtureStats[]
): LiveFixtureStats | undefined {
  const homeTeam = selection.isHome ? selection.teamName : selection.opposition;
  const awayTeam = selection.isHome ? selection.opposition : selection.teamName;

  const normalize = (name: string) =>
    name.toLowerCase().replace(/fc|cf|sc|ac|as|us|ss|afc|rfc$/gi, '').replace(/^fc|^cf|^sc/gi, '').replace(/[^a-z0-9]/g, '').trim();

  const betHome = normalize(homeTeam);
  const betAway = normalize(awayTeam);

  return liveFixtures.find((lf) => {
    const liveHome = normalize(lf.home_team);
    const liveAway = normalize(lf.away_team);
    const direct = (betHome.includes(liveHome) || liveHome.includes(betHome)) &&
                   (betAway.includes(liveAway) || liveAway.includes(betAway));
    const swapped = (betHome.includes(liveAway) || liveAway.includes(betHome)) &&
                    (betAway.includes(liveHome) || liveHome.includes(betAway));
    return direct || swapped;
  });
}

export function AccaBuilderSection({ liveFixtures = [] }: AccaBuilderSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AccaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = getEffectiveBetDate();

  useEffect(() => {
    const cacheKey = `acca-builder-daily`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.date === today && parsed.result && parsed.version === 5) {
          setResult(parsed.result);
          return;
        }
      } catch (e) { /* rebuild */ }
    }
    localStorage.removeItem(cacheKey);
    buildAcca();
  }, []);

  const buildAcca = async (force = false) => {
    const cacheKey = `acca-builder-daily`;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.date === today && parsed.result && parsed.version === 5) {
            setResult(parsed.result);
            return;
          }
        } catch (e) { /* continue */ }
      }
    }

    if (isBeforeRefresh() && !force) {
      try {
        const { data } = await supabase
          .from('acca_history')
          .select('*')
          .eq('prediction_date', today)
          .single();
        if (data) {
          const dbResult: AccaResult = {
            success: true,
            selections: data.selections as any[],
            combined_odds: data.combined_odds,
            average_confidence: data.average_confidence,
            selection_count: data.selection_count,
            gaffer_reasoning: data.gaffer_reasoning,
          };
          setResult(dbResult);
          localStorage.setItem(cacheKey, JSON.stringify({ date: today, result: dbResult, version: 5 }));
          return;
        }
        setResult({ success: true, noAcca: true, message: "Today's ACCA will be ready at 6 AM UTC. Yesterday had no qualifying fixtures." });
        return;
      } catch { /* fall through */ }
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('acca-builder', {
        body: { legs: 4 },
      });
      if (invokeError) throw invokeError;
      setResult(data);
      localStorage.setItem(cacheKey, JSON.stringify({ date: today, result: data, version: 5 }));
    } catch (err) {
      console.error('ACCA Builder error:', err);
      setError('Failed to build ACCA. Try again!');
    } finally {
      setIsLoading(false);
    }
  };

  const formatKickoff = (kickoff: string) => {
    const date = new Date(kickoff);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' GMT';
  };

  // Compute per-leg live status
  const legStatuses = useMemo(() => {
    if (!result?.selections) return [];
    return result.selections.map((sel) => {
      const liveMatch = findLiveMatch(sel, liveFixtures);
      const isLive = !!liveMatch && isInPlayStatus(liveMatch.status);
      const isFT = !!liveMatch && isFinishedStatus(liveMatch.status);
      const hit = liveMatch ? didMarketHit(sel.market, liveMatch) : null;
      return { liveMatch, isLive, isFT, hit };
    });
  }, [result?.selections, liveFixtures]);

  // Overall ACCA status from live data
  const anyLive = legStatuses.some((s) => s.isLive);
  const allFinished = legStatuses.length > 0 && legStatuses.every((s) => s.isFT || s.hit !== null);
  const allHit = legStatuses.length > 0 && legStatuses.every((s) => s.hit === true);
  const anyMissed = legStatuses.some((s) => s.hit === false && s.isFT);

  return (
    <Card className={cn(
      "border-2 shadow-lg transition-all duration-300",
      allHit && allFinished && "border-[hsl(var(--neon-green)/.5)] bg-[hsl(var(--neon-green)/.06)] animate-neon-pulse shadow-[0_0_30px_hsl(var(--neon-green)/.2)]",
      anyMissed && "border-destructive/40 bg-destructive/5",
      anyLive && !allHit && !anyMissed && "border-[hsl(var(--neon-green)/.4)] bg-gradient-to-br from-[hsl(var(--neon-green)/.08)] via-card to-card shadow-[0_0_20px_hsl(var(--neon-green)/.15)]",
      !anyLive && !allFinished && "border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-primary/10"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <img src={theGafferImage} alt="The Gaffer" className="w-12 h-12 rounded-full object-cover border-2 border-primary/40 shadow-lg" />
            <CardTitle className="text-xl">Accas <span className="text-primary">Delight</span></CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {anyLive && (
              <div className="px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 bg-[hsl(var(--neon-green))] text-black shadow-[0_0_15px_hsl(var(--neon-green)/.4)]">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                LIVE
              </div>
            )}
            {allHit && allFinished && (
              <div className="px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 bg-[hsl(var(--neon-green))] text-black shadow-[0_0_15px_hsl(var(--neon-green)/.4)]">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ALL LEGS HIT
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => buildAcca(true)} disabled={isLoading} className="border-primary/30 hover:bg-primary/10">
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Rebuild
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
          "I scan the European form tables every morning, find the gems playing today, and pick the hardest market each team qualifies for. Pure stats, maximum value."
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">The Gaffer is picking the best teams...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {!isLoading && result && (
          <>
            {result.noAcca ? (
              <div className="py-6 text-center">
                <div className="flex items-start gap-4 max-w-lg mx-auto text-left p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <img src={theGafferImage} alt="The Gaffer" className="w-12 h-12 rounded-full object-cover border-2 border-primary/40 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">The Gaffer says...</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.message || "Not enough qualifying European teams today. Check back tomorrow!"}
                    </p>
                  </div>
                </div>
              </div>
            ) : result.selections ? (
              <div className="space-y-4">
                {/* Fewer than 4 legs message */}
                {(() => {
                  const count = result.selections.length;
                  if (count < 4 && count >= 2) {
                    const betType = count === 2 ? 'Cheeky Double' : 'Treble';
                    const emoji = count === 2 ? '🤝' : '🎯';
                    return (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <img src={theGafferImage} alt="The Gaffer" className="w-10 h-10 rounded-full object-cover border-2 border-amber-500/40 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-400 mb-0.5">The Gaffer says...</p>
                          <p className="text-sm text-muted-foreground">
                            {emoji} Only <span className="font-bold text-amber-400">{count}</span> European fixtures qualify today — here's a <span className="font-bold text-primary">{betType}</span> instead!
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Selections with Live Tracking */}
                <div className="grid gap-4">
                  {result.selections.map((selection, index) => {
                    const homeTeam = formatTeamName(selection.isHome ? selection.teamName : selection.opposition);
                    const awayTeam = formatTeamName(selection.isHome ? selection.opposition : selection.teamName);
                    const betIsHome = selection.isHome;
                    const legStatus = legStatuses[index];
                    const liveMatch = legStatus?.liveMatch;
                    const legIsLive = legStatus?.isLive;
                    const legIsFT = legStatus?.isFT;
                    const legHit = legStatus?.hit;

                    return (
                      <div key={index} className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-300 shadow-md",
                        legHit === true && "border-[hsl(var(--neon-green)/.5)] bg-[hsl(var(--neon-green)/.06)]",
                        legHit === false && legIsFT && "border-destructive/40 bg-destructive/5",
                        legIsLive && legHit !== true && "border-[hsl(var(--neon-green)/.3)] bg-gradient-to-br from-[hsl(var(--neon-green)/.05)] via-card to-card",
                        !legIsLive && !legIsFT && "bg-gradient-to-br from-card via-card to-primary/5 border-primary/20 hover:border-primary/40",
                      )}>
                        {/* Leg number */}
                        <div className={cn(
                          "absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg",
                          legHit === true
                            ? "bg-[hsl(var(--neon-green))] text-black shadow-[0_0_10px_hsl(var(--neon-green)/.4)]"
                            : legHit === false && legIsFT
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                        )}>
                          {legHit === true ? <Check className="w-4 h-4" strokeWidth={3} /> : legHit === false && legIsFT ? <X className="w-4 h-4" /> : index + 1}
                        </div>

                        <div className="ml-4 space-y-3">
                          {/* Teams + status */}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              {liveMatch ? (
                                <LiveScore stats={liveMatch} homeTeam={homeTeam} awayTeam={awayTeam} className="justify-start" />
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className={betIsHome ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}>{homeTeam}</span>
                                    <span className="text-muted-foreground shrink-0">vs</span>
                                    <span className={!betIsHome ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}>{awayTeam}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{selection.league}</span>
                                    <span>•</span>
                                    <Clock className="w-3 h-3" />
                                    <span>{formatKickoff(selection.kickoff)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {!liveMatch && (
                                <div className="w-fit flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                                  {getMarketIcon(selection.market)}
                                  <span className="text-xs font-semibold text-primary whitespace-nowrap">
                                    {MARKET_LABELS[selection.market] || selection.marketLabel}
                                  </span>
                                </div>
                              )}
                              {selection.legOdds && (
                                <Bet365Badge odds={selection.legOdds} size="sm" showLabel={false} />
                              )}
                            </div>
                          </div>

                          {/* Live Market Tracker for this leg */}
                          {liveMatch && (
                            <LiveMarketTracker
                              market={selection.market}
                              stats={liveMatch}
                              isSettled={legIsFT && legHit !== null}
                              isWon={legHit === true}
                              compact
                            />
                          )}

                          {/* Gaffer comment (only when not live) */}
                          {!liveMatch && (() => {
                            const reasoning = parseReasoning(selection.gafferComment);
                            return (
                              <>
                                {reasoning.statsFacts && (
                                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-[hsl(var(--stats)/.20)] to-[hsl(var(--stats)/.08)] border-2 border-[hsl(var(--stats)/.80)] shadow-[0_0_10px_-4px_hsl(var(--stats)/.35)]">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <div className="w-5 h-5 rounded bg-[hsl(var(--stats)/.40)] flex items-center justify-center">
                                        <span className="text-[10px]">📊</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-[hsl(var(--stats))] uppercase tracking-wider">Stats & Facts</span>
                                    </div>
                                    <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-line">{reasoning.statsFacts}</p>
                                  </div>
                                )}
                                {reasoning.gafferTake && (
                                  <div className="p-2.5 rounded-lg bg-gradient-to-br from-[hsl(var(--neon-yellow)/.20)] to-[hsl(var(--neon-yellow)/.08)] border-2 border-[hsl(var(--neon-yellow)/.80)] shadow-[0_0_10px_-4px_hsl(var(--neon-yellow)/.35)]">
                                    <div className="flex items-start gap-2">
                                      <img src={theGafferImage} alt="The Gaffer" className="w-6 h-6 rounded-full object-cover border-2 border-[hsl(var(--neon-yellow)/.80)] shadow-none shrink-0" />
                                      <div>
                                        <span className="text-[10px] font-bold text-[hsl(var(--neon-yellow))] uppercase tracking-wider">The Gaffer's Verdict</span>
                                        <p className="text-xs text-foreground/85 leading-relaxed mt-0.5">{reasoning.gafferTake}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ACCA Summary */}
                <div className={cn(
                  "flex flex-col gap-3 p-3 sm:p-4 rounded-xl border",
                  allHit && allFinished
                    ? "bg-[hsl(var(--neon-green)/.1)] border-[hsl(var(--neon-green)/.3)]"
                    : "bg-gradient-to-r from-[#1a3a1a]/40 to-transparent border-[#2d6b2d]/30"
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <Bet365Badge odds={result.combined_odds || 0} size="lg" />
                    <div className="w-px h-10 bg-border" />
                    <div className="text-center">
                      <p className={cn(
                        "text-xl sm:text-2xl font-bold",
                        allHit && allFinished ? "text-[hsl(var(--neon-green))]" : "text-emerald-400"
                      )}>
                        {result.average_confidence || 0}%
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">Avg Confidence</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary shrink-0" />
                    <p className="text-sm font-medium text-foreground">
                      £10 returns <span className={cn(
                        "font-bold",
                        allHit && allFinished ? "text-[hsl(var(--neon-green))]" : "text-primary"
                      )}>£{((result.combined_odds || 0) * 10).toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">if all legs land</span>
                    </p>
                  </div>
                </div>

                {/* Legs progress summary bar */}
                {legStatuses.some(s => s.liveMatch) && (
                  <div className="flex gap-1.5">
                    {legStatuses.map((s, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 h-3 rounded-full transition-all duration-500",
                          s.hit === true && "bg-[hsl(var(--neon-green))] shadow-[0_0_8px_hsl(var(--neon-green)/.4)]",
                          s.hit === false && s.isFT && "bg-destructive/60",
                          s.isLive && s.hit !== true && "bg-[hsl(var(--neon-green)/.3)] animate-pulse",
                          !s.liveMatch && "bg-muted/30"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

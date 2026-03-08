/**
 * ACCA of the Day Card
 * Displays daily accumulator from form table teams
 * With P&L tracking and Gaffer reasoning
 * Supports doubles (2 legs), trebles, and 4-fold ACCAs
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseReasoning } from '@/lib/parseReasoning';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Trophy, AlertCircle, Clock, Target } from 'lucide-react';
import { useAccaBuilder, AccaSelection } from '@/hooks/useAccaBuilder';
import { format } from 'date-fns';
import gafferImage from '@/assets/the-gaffer.webp';
import { formatTeamName } from '@/lib/teamNames';
import { getMarketLabel } from '@/lib/marketDisplay';
import { getLeagueFlag } from '@/lib/countryFlags';
import { supabase } from '@/integrations/supabase/client';

// Get ACCA type label based on number of legs
function getAccaTypeLabel(legCount: number): string {
  switch (legCount) {
    case 2: return 'Double';
    case 3: return 'Treble';
    case 4: return '4-Fold';
    case 5: return '5-Fold';
    case 6: return '6-Fold';
    default: return `${legCount}-Fold`;
  }
}

export function AccaOfTheDayCard() {
  const [briefingSlug, setBriefingSlug] = useState<string | null>(null);
  const { 
    todaysAcca, 
    noAcca, 
    noAccaMessage, 
    partialCandidates,
    stats,
    isLoading 
  } = useAccaBuilder();

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase
      .from('blog_posts')
      .select('slug')
      .eq('post_type', 'morning-briefing')
      .eq('related_prediction_date', today)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.slug) setBriefingSlug(data.slug);
      });
  }, []);

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">The Gaffer is analyzing the form tables...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No ACCA available today - but show partial candidates if we have 1-2
  if (noAcca) {
    // If we have 1-2 partial candidates, display them as Single or Double with calculated odds
    if (partialCandidates && partialCandidates.length >= 1) {
      const displayLabel = partialCandidates.length === 1 ? "Pick of the Day" : "Double of the Day";
      
      // Calculate combined odds for partial candidates
      const MARKET_ODDS: Record<string, number> = {
        'goals:over_1_5': 1.35,
        'corners:over_8_5': 1.55,
        'cards:over_2_5': 1.55,
        'cards:over_3_5': 1.75,
        'over_1_5': 1.35,
        'over_8_5': 1.55,
      };
      
      let calculatedOdds = 1;
      partialCandidates.forEach((c: AccaSelection) => {
        const marketKey = c.market || c.marketLabel || '';
        const baseOdds = MARKET_ODDS[marketKey] || MARKET_ODDS[marketKey.replace('goals:', '').replace('corners:', '').replace('cards:', '').replace('btts:', '')] || 1.80;
        calculatedOdds *= baseOdds;
      });
      calculatedOdds = Math.round(calculatedOdds * 100) / 100;
      
      const avgConfidence = Math.round(
        partialCandidates.reduce((sum: number, c: AccaSelection) => sum + (c.successPercent || 0), 0) / partialCandidates.length
      );
      const stake = 10;
      const potentialReturn = (stake * calculatedOdds).toFixed(2);
      
      return (
        <Card className="glass-card border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <img src={gafferImage} alt="The Gaffer" className="w-8 h-8 rounded-full object-cover" />
              <span className="text-primary font-bold">{displayLabel}</span>
              <Badge variant="outline" className="ml-auto text-muted-foreground border-border/50">
                Pending
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selections */}
            <div className="space-y-2">
              {partialCandidates.map((sel: AccaSelection, i: number) => {
                const homeTeamRaw = sel.isHome ? sel.teamName : sel.opposition;
                const awayTeamRaw = sel.isHome ? sel.opposition : sel.teamName;
                const homeTeam = formatTeamName(homeTeamRaw);
                const awayTeam = formatTeamName(awayTeamRaw);
                const betIsHome = sel.isHome;
                const betTeamClass = 'font-medium text-sm text-foreground';
                const otherTeamClass = 'font-medium text-sm text-muted-foreground';

                return (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/50"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className={betIsHome ? betTeamClass : otherTeamClass}>{homeTeam}</span>
                        <span className="text-xs text-muted-foreground">vs</span>
                        <span className={!betIsHome ? betTeamClass : otherTeamClass}>{awayTeam}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-7">
                        <Badge variant="secondary" className="text-xs">{getMarketLabel(sel.market || sel.marketLabel)}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground ml-7 truncate flex items-center gap-1" title={sel.league}>
                        <span>{getLeagueFlag(sel.league)}</span> {sel.league}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-success">{sel.successPercent}%</p>
                      <p className="text-xs text-muted-foreground">
                        Opp: {sel.oppositionStats ?? '-'}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Combined Odds & Confidence */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Combined Odds</p>
                  <p className="text-lg font-bold text-foreground">{calculatedOdds.toFixed(2)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Avg Confidence</p>
                <p className="text-lg font-bold text-success">{avgConfidence}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Stake</p>
                <p className="text-lg font-bold text-foreground">£{stake}</p>
              </div>
            </div>

            {/* Potential Return */}
            <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-xs text-muted-foreground">Potential Return</p>
              <p className="text-xl font-bold text-primary">£{potentialReturn}</p>
            </div>

            {/* Gaffer Says */}
            <div className="p-3 rounded-lg bg-navy/10 border border-navy/30">
              <div className="flex items-start gap-3">
                <img src={gafferImage} alt="The Gaffer" className="w-10 h-10 rounded-full object-cover shrink-0" />
                <div>
                  <p className="text-xs font-bold text-primary mb-1">The Gaffer Says:</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    "{partialCandidates.length === 1 
                      ? `Only one form table team in action today, but ${partialCandidates[0].teamName} looks solid for ${getMarketLabel(partialCandidates[0].market || partialCandidates[0].marketLabel)}!` 
                      : `Slim pickings today with just two fixtures qualifying, but this double still looks tasty at ${calculatedOdds.toFixed(2)}!`}"
                  </p>
                </div>
              </div>
            </div>

            {/* P&L Track Record */}
            {stats.totalAccas > 0 && (
              <div className="pt-3 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> ACCA Track Record
                  </p>
                  <p className={`text-xs font-bold ${stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {stats.netProfit >= 0 ? '+' : ''}£{stats.netProfit.toFixed(2)} ({stats.roi >= 0 ? '+' : ''}{stats.roi}% ROI)
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-card/50">
                    <p className="font-bold text-foreground">{stats.totalAccas}</p>
                    <p className="text-muted-foreground">ACCAs</p>
                  </div>
                  <div className="p-2 rounded bg-card/50">
                    <p className="font-bold text-success">{stats.wins}</p>
                    <p className="text-muted-foreground">Won</p>
                  </div>
                  <div className="p-2 rounded bg-card/50">
                    <p className="font-bold text-destructive">{stats.losses}</p>
                    <p className="text-muted-foreground">Lost</p>
                  </div>
                  <div className="p-2 rounded bg-card/50">
                    <p className="font-bold text-foreground">{stats.winRate}%</p>
                    <p className="text-muted-foreground">Win Rate</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    
    // Truly no candidates at all
    return (
      <Card className="glass-card border-primary/30 bg-navy/10">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <img src={gafferImage} alt="The Gaffer" className="w-8 h-8 rounded-full object-cover" />
            <span className="text-primary font-bold">ACCA of the Day</span>
            <Badge variant="outline" className="ml-auto text-muted-foreground border-border/50">
              No ACCA Today
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/50">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                {noAccaMessage || "No form table teams playing today. Check back tomorrow!"}
              </p>
            </div>
          </div>
          
          {/* P&L Stats */}
          {stats.totalAccas > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">ACCA Track Record:</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{stats.totalAccas}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-success">{stats.wins}</p>
                  <p className="text-xs text-muted-foreground">Won</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-destructive">{stats.losses}</p>
                  <p className="text-xs text-muted-foreground">Lost</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${stats.roi >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {stats.roi >= 0 ? '+' : ''}{stats.roi}%
                  </p>
                  <p className="text-xs text-muted-foreground">ROI</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // We have an ACCA!
  if (!todaysAcca) return null;

  const selections = todaysAcca.selections as AccaSelection[];
  const accaTypeLabel = getAccaTypeLabel(selections.length);
  const isPending = todaysAcca.status === 'pending';
  const isWon = todaysAcca.status === 'won';
  const isLost = todaysAcca.status === 'lost';
  
  // Check if match has started but not yet settled
  const latestKickoff = selections.reduce((latest, s) => {
    const kickoffTime = new Date(s.kickoff).getTime();
    return kickoffTime > latest ? kickoffTime : latest;
  }, 0);
  const matchStarted = Date.now() > latestKickoff;
  const matchLikelyFinished = Date.now() > latestKickoff + (2 * 60 * 60 * 1000); // 2 hours after last kickoff
  const awaitingResult = isPending && matchStarted;
  const isFinished = awaitingResult && matchLikelyFinished;

  return (
    <Card className="glass-card border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <img src={gafferImage} alt="The Gaffer" className="w-8 h-8 rounded-full object-cover" />
          <span className="text-primary font-bold">{accaTypeLabel} of the Day</span>
          <Badge 
            variant="outline" 
            className={`ml-auto ${
              awaitingResult ? (isFinished ? 'text-amber-500 border-amber-500/50' : 'text-amber-500 border-amber-500/50 animate-pulse') :
              isPending ? 'text-muted-foreground border-border/50' :
              isWon ? 'text-success border-success/50' : 
              'text-destructive border-destructive/50'
            }`}
          >
            {awaitingResult ? (isFinished ? '⏳ FT - Awaiting Result' : '⏳ In Progress') : isPending ? 'Pending' : isWon ? 'Won ✓' : 'Lost ✗'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selections */}
        <div className="space-y-2">
          {selections.map((sel, i) => {
              const homeTeamRaw = sel.isHome ? sel.teamName : sel.opposition;
              const awayTeamRaw = sel.isHome ? sel.opposition : sel.teamName;
              const homeTeam = formatTeamName(homeTeamRaw);
              const awayTeam = formatTeamName(awayTeamRaw);
              const betIsHome = sel.isHome;
              const betTeamClass = 'font-medium text-sm text-foreground';
              const otherTeamClass = 'font-medium text-sm text-muted-foreground';
              const legReasoning = parseReasoning(sel.gafferComment);

              return (
                <div 
                  key={i} 
                  className="p-3 rounded-lg bg-card/50 border border-border/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                          {i + 1}
                        </span>
                        <span className={betIsHome ? betTeamClass : otherTeamClass}>{homeTeam}</span>
                        <span className="text-xs text-muted-foreground">vs</span>
                        <span className={!betIsHome ? betTeamClass : otherTeamClass}>{awayTeam}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-7">
                        <Badge variant="secondary" className="text-xs">{getMarketLabel(sel.market || sel.marketLabel)}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground ml-7 truncate flex items-center gap-1" title={sel.league}>
                        <span>{getLeagueFlag(sel.league)}</span> {sel.league}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-success">{sel.successPercent}%</p>
                      <p className="text-xs text-muted-foreground">
                        Opp: {sel.oppositionStats}%
                      </p>
                    </div>
                  </div>
                  {/* Per-leg Stats & Gaffer */}
                  {legReasoning.statsFacts && (
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-[hsl(var(--stats)/.12)] to-[hsl(var(--stats)/.04)] border border-[hsl(var(--stats)/.30)] ml-7">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 rounded bg-[hsl(var(--stats)/.2)] flex items-center justify-center">
                          <span className="text-[10px]">📊</span>
                        </div>
                        <span className="text-[10px] font-bold text-[hsl(var(--stats))] uppercase tracking-wider">Stats & Facts</span>
                      </div>
                      <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-line">{legReasoning.statsFacts}</p>
                    </div>
                  )}
                  {legReasoning.gafferTake && (
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/4 border border-primary/25 ml-7">
                      <div className="flex items-start gap-2">
                        <img src={gafferImage} alt="The Gaffer" className="w-6 h-6 rounded-full object-cover border border-primary/40 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">Gaffer Says</span>
                          <p className="text-xs text-foreground/85 leading-relaxed italic">"{legReasoning.gafferTake}"</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Combined Odds & Confidence */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Combined Odds</p>
              <p className="text-lg font-bold text-foreground">{todaysAcca.combined_odds.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Avg Confidence</p>
            <p className="text-lg font-bold text-success">{todaysAcca.average_confidence}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Stake</p>
            <p className="text-lg font-bold text-foreground">£{todaysAcca.stake}</p>
          </div>
        </div>

        {/* Potential Return */}
        {isPending && (
          <div className="text-center p-2 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-xs text-muted-foreground">Potential Return</p>
            <p className="text-xl font-bold text-primary">
              £{(todaysAcca.stake * todaysAcca.combined_odds).toFixed(2)}
            </p>
          </div>
        )}

        {/* Result if settled */}
        {!isPending && todaysAcca.profit_loss !== null && (
          <div className={`text-center p-2 rounded-lg ${
            isWon ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
          }`}>
            <p className="text-xs text-muted-foreground">
              {isWon ? 'Profit' : 'Loss'}
            </p>
            <p className={`text-xl font-bold ${isWon ? 'text-green-500' : 'text-red-500'}`}>
              {todaysAcca.profit_loss >= 0 ? '+' : ''}£{todaysAcca.profit_loss.toFixed(2)}
            </p>
            {todaysAcca.legs_won !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                {todaysAcca.legs_won}/{todaysAcca.selection_count} legs won
              </p>
            )}
          </div>
        )}

        {/* Stats & Facts + Gaffer Says */}
        {(() => {
          const { statsFacts, gafferTake } = parseReasoning(todaysAcca.gaffer_reasoning);
          return (
            <div className="space-y-2">
              {statsFacts && (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[hsl(var(--stats)/.12)] to-[hsl(var(--stats)/.04)] border-2 border-[hsl(var(--stats)/.35)] shadow-[0_2px_12px_-4px_hsl(var(--stats)/.2)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-md bg-[hsl(var(--stats)/.2)] flex items-center justify-center">
                      <span className="text-xs">📊</span>
                    </div>
                    <span className="text-xs font-bold text-[hsl(var(--stats))] uppercase tracking-wider">Stats & Facts</span>
                  </div>
                  <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                    {statsFacts}
                  </p>
                </div>
              )}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-primary/12 to-primary/4 border-2 border-primary/35 shadow-[0_2px_12px_-4px_hsl(var(--primary)/.2)]">
                <div className="flex items-start gap-3">
                  <img src={gafferImage} alt="The Gaffer" className="w-10 h-10 rounded-full object-cover border-2 border-primary/50 shadow-md shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1.5">The Gaffer Says</span>
                    <p className="text-sm text-foreground/90 font-medium leading-relaxed italic">
                      "{gafferTake}"
                    </p>
                    {briefingSlug && (
                      <Link 
                        to={`/blog/${briefingSlug}`}
                        className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                      >
                        📖 Read The Gaffer's Full Briefing →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* P&L Track Record */}
        {stats.totalAccas > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Trophy className="w-3 h-3" /> ACCA Track Record
              </p>
              <p className={`text-xs font-bold ${stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.netProfit >= 0 ? '+' : ''}£{stats.netProfit.toFixed(2)} ({stats.roi >= 0 ? '+' : ''}{stats.roi}% ROI)
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-card/50">
                <p className="font-bold text-foreground">{stats.totalAccas}</p>
                <p className="text-muted-foreground">ACCAs</p>
              </div>
              <div className="p-2 rounded bg-card/50">
                <p className="font-bold text-success">{stats.wins}</p>
                <p className="text-muted-foreground">Won</p>
              </div>
              <div className="p-2 rounded bg-card/50">
                <p className="font-bold text-destructive">{stats.losses}</p>
                <p className="text-muted-foreground">Lost</p>
              </div>
              <div className="p-2 rounded bg-card/50">
                <p className="font-bold text-foreground">{stats.winRate}%</p>
                <p className="text-muted-foreground">Win Rate</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

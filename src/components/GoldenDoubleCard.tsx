/**
 * Golden Double Card
 * Displays a double bet (2 picks combined) with odds and potential returns
 */

import { GoldenBet } from '@/types/betting';
import { Badge } from '@/components/ui/badge';
import { Trophy, CheckCircle2, XCircle, Radio, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTeamName } from '@/lib/teamNames';
import { getMarketLabel, getMarketIcon, normalizeMarketKey } from '@/lib/marketDisplay';
import theGafferImage from '@/assets/the-gaffer.webp';
import type { LiveFixtureStats } from '@/hooks/useInPlayStats';
import { isInPlayStatus, isFinishedStatus } from '@/lib/fixtureStatus';
import { didMarketHit } from '@/lib/marketEval';
import { useStickyFixtureStats } from '@/hooks/useStickyFixtureStats';

interface GoldenDoubleCardProps {
  bet1: GoldenBet;
  bet2: GoldenBet;
  index: number;
  liveStats1?: LiveFixtureStats;
  liveStats2?: LiveFixtureStats;
}

export function GoldenDoubleCard({ bet1, bet2, index, liveStats1, liveStats2 }: GoldenDoubleCardProps) {
  const { stats: displayStats1 } = useStickyFixtureStats(liveStats1);
  const { stats: displayStats2 } = useStickyFixtureStats(liveStats2);
  
  const combinedOdds = bet1.bookmakerOdds * bet2.bookmakerOdds;
  const potentialReturn = 10 * combinedOdds;
  
  // Check status for each bet
  const bet1Settled = bet1.status === 'won' || bet1.status === 'lost';
  const bet2Settled = bet2.status === 'won' || bet2.status === 'lost';
  const bet1Won = bet1.status === 'won';
  const bet2Won = bet2.status === 'won';
  
  // Check live/finished status
  const bet1IsLive = !!displayStats1 && isInPlayStatus(displayStats1.status);
  const bet2IsLive = !!displayStats2 && isInPlayStatus(displayStats2.status);
  const bet1IsFinished = !!displayStats1 && isFinishedStatus(displayStats1.status);
  const bet2IsFinished = !!displayStats2 && isFinishedStatus(displayStats2.status);
  
  const anyLive = bet1IsLive || bet2IsLive;
  
  // Calculate provisional status based on live stats
  const getProvisionalStatus = (bet: GoldenBet, stats: LiveFixtureStats | undefined, isFinished: boolean) => {
    if (bet.status === 'won' || bet.status === 'lost') return bet.status;
    if (!isFinished || !stats) return null;
    const marketKey = normalizeMarketKey(bet.market);
    const hit = didMarketHit(marketKey, stats);
    if (hit === null) return null;
    return hit ? 'won' : 'lost';
  };
  
  const bet1Provisional = getProvisionalStatus(bet1, displayStats1, bet1IsFinished);
  const bet2Provisional = getProvisionalStatus(bet2, displayStats2, bet2IsFinished);
  
  // Double status: both must win
  const bothSettled = (bet1Settled || bet1Provisional) && (bet2Settled || bet2Provisional);
  const doubleWon = (bet1Won || bet1Provisional === 'won') && (bet2Won || bet2Provisional === 'won');
  const doubleLost = bothSettled && !doubleWon;
  
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderLeg = (bet: GoldenBet, stats: LiveFixtureStats | undefined, isLive: boolean, isFinished: boolean, settled: boolean, won: boolean, provisional: string | null) => {
    const marketKey = normalizeMarketKey(bet.market);
    const showScore = !!stats && (isLive || isFinished);
    const displayWon = settled ? won : provisional === 'won';
    const displayLost = settled ? !won : provisional === 'lost';
    const displaySettled = settled || provisional !== null;
    
    return (
      <div className={cn(
        "p-3 rounded-lg border",
        displaySettled && displayWon && "bg-success/10 border-success/30",
        displaySettled && displayLost && "bg-destructive/10 border-destructive/30",
        isLive && !displaySettled && "bg-green-500/10 border-green-500/30",
        !displaySettled && !isLive && "bg-card/50 border-border/50"
      )}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant={displaySettled && displayWon ? 'default' : displaySettled && displayLost ? 'destructive' : 'gold'} className="text-xs shrink-0">
              <span className="mr-1">{getMarketIcon(marketKey)}</span>
              {getMarketLabel(marketKey)}
            </Badge>
            {isLive && !displaySettled && (
              <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                <Radio className="w-2 h-2 animate-pulse" />
                {stats?.elapsed}'
              </Badge>
            )}
          </div>
          {displaySettled && (
            <span className={cn("text-xs font-bold", displayWon ? "text-success" : "text-destructive")}>
              {displayWon ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            </span>
          )}
          {!displaySettled && !isLive && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(bet.kickoff)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            {showScore && stats ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium truncate">{formatTeamName(bet.homeTeam)}</span>
                <span className="font-black text-green-400 tabular-nums shrink-0">
                  {stats.score_home} - {stats.score_away}
                </span>
                <span className="font-medium truncate">{formatTeamName(bet.awayTeam)}</span>
              </div>
            ) : (
              <div className="text-sm">
                <span className="font-medium">{formatTeamName(bet.homeTeam)}</span>
                <span className="text-muted-foreground mx-1">vs</span>
                <span className="font-medium">{formatTeamName(bet.awayTeam)}</span>
              </div>
            )}
          </div>
          <span className="text-sm font-bold text-gold ml-2 shrink-0">@{bet.bookmakerOdds.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "rounded-xl p-4 relative overflow-hidden border-2 shadow-lg transition-all duration-300",
      bothSettled && doubleWon && "border-success/50 bg-success/5",
      bothSettled && doubleLost && "border-destructive/50 bg-destructive/5",
      anyLive && !bothSettled && "border-green-500/50 bg-gradient-to-br from-green-500/10 via-card to-card",
      !bothSettled && !anyLive && "border-gold/30 bg-gradient-to-br from-gold/10 via-card to-card hover:border-gold/50"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm",
            bothSettled && doubleWon ? "bg-success" : bothSettled && doubleLost ? "bg-destructive" : anyLive ? "bg-green-500" : "gold-gradient"
          )}>
            {index + 1}
          </div>
          <div>
            <span className="font-bold text-foreground">Double {index + 1}</span>
            <span className="text-xs text-muted-foreground ml-2">2 legs</span>
          </div>
        </div>
        {bothSettled && (
          <Badge variant={doubleWon ? 'default' : 'destructive'} className="flex items-center gap-1">
            {doubleWon ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {doubleWon ? 'WON' : 'LOST'}
          </Badge>
        )}
        {anyLive && !bothSettled && (
          <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-500 border-green-500/30">
            <Radio className="w-3 h-3 animate-pulse" />
            LIVE
          </Badge>
        )}
      </div>
      
      {/* Legs */}
      <div className="space-y-2 mb-3">
        {renderLeg(bet1, displayStats1, bet1IsLive, bet1IsFinished, bet1Settled, bet1Won, bet1Provisional)}
        {renderLeg(bet2, displayStats2, bet2IsLive, bet2IsFinished, bet2Settled, bet2Won, bet2Provisional)}
      </div>
      
      {/* Combined Odds & Returns */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-gold/10 border border-gold/30">
        <div>
          <span className="text-xs text-muted-foreground">Combined Odds</span>
          <p className="text-lg font-black text-gold">{combinedOdds.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground">£10 Returns</span>
          <p className={cn(
            "text-lg font-black",
            bothSettled && doubleWon ? "text-success" : bothSettled && doubleLost ? "text-destructive" : "text-success"
          )}>
            £{potentialReturn.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

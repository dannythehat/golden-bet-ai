import { useEffect } from 'react';
import { useInPlayStats, InPlayBet } from '@/hooks/useInPlayStats';
import { useAlertMonitor } from '@/hooks/useAlertMonitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatTeamName } from '@/lib/teamNames';
import { 
  RefreshCw, 
  Radio, 
  Clock, 
  Target, 
  Flag, 
  Square, 
  Trophy,
  Zap,
  Layers,
  Bell
} from 'lucide-react';

// Get relevant stat based on market type
function getRelevantStat(bet: InPlayBet): { label: string; value: string | number; target: number; icon: React.ReactNode } | null {
  if (!bet.liveStats) return null;
  
  const stats = bet.liveStats;
  const market = bet.market.toLowerCase();
  const markets = bet.markets || [bet.market];
  
  // Goals markets
  if (market.includes('goal') || market.includes('btts') || markets.some(m => m.includes('goal') || m.includes('btts'))) {
    const totalGoals = stats.score_home + stats.score_away;
    const target = market.includes('2.5') || market.includes('25') ? 3 : 
                   market.includes('1.5') || market.includes('15') ? 2 : 
                   market.includes('3.5') || market.includes('35') ? 4 : 3;
    return {
      label: 'Goals',
      value: `${stats.score_home} - ${stats.score_away}`,
      target,
      icon: <Target className="w-4 h-4" />,
    };
  }
  
  // Corners markets
  if (market.includes('corner') || markets.some(m => m.includes('corner'))) {
    const target = market.includes('8.5') || market.includes('85') ? 9 :
                   market.includes('9.5') || market.includes('95') ? 9 :
                   market.includes('10.5') || market.includes('105') ? 11 : 9;
    return {
      label: 'Corners',
      value: stats.corners_total,
      target,
      icon: <Flag className="w-4 h-4" />,
    };
  }
  
  // Cards markets
  if (market.includes('card') || markets.some(m => m.includes('card'))) {
    const target = market.includes('3.5') || market.includes('35') ? 4 :
                   market.includes('2.5') || market.includes('25') ? 3 : 4;
    return {
      label: 'Cards',
      value: stats.cards_total,
      target,
      icon: <Square className="w-4 h-4 fill-amber-400 text-amber-400" />,
    };
  }
  
  return null;
}

// Market label formatter
function formatMarket(market: string): string {
  const labels: Record<string, string> = {
    'over_2.5_goals': 'O2.5 Goals',
    'over_25_goals': 'O2.5 Goals',
    'over_9.5_corners': 'O8.5 Corners',
    'over_95_corners': 'O8.5 Corners',
    'over_9_5_corners': 'O8.5 Corners',
    'over_3.5_cards': 'O3.5 Cards',
    'over_35_cards': 'O3.5 Cards',
    'over_2.5_cards': 'O2.5 Cards',
    'over_25_cards': 'O2.5 Cards',
  };
  return labels[market] || market.replace(/_/g, ' ').replace(/over/i, 'O');
}

// Type badge color
function getTypeBadgeClass(type: InPlayBet['type']): string {
  switch (type) {
    case 'golden': return 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black';
    case 'bet-builder': return 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white';
    case 'acca': return 'bg-gradient-to-r from-emerald-600 to-green-500 text-white';
    default: return 'bg-muted';
  }
}

function InPlayBetCard({ bet }: { bet: InPlayBet }) {
  const stat = getRelevantStat(bet);
  const isOnTrack = stat && typeof stat.value === 'number' && stat.value >= stat.target * 0.5;
  const showScore = !!bet.liveStats && (bet.isLive || bet.isFinished);
  
  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      bet.isLive
        ? "border-2 border-green-500/50 bg-gradient-to-br from-green-500/5 to-emerald-500/5 shadow-lg shadow-green-500/10"
        : bet.isFinished
          ? "border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-transparent"
          : "border-border/50 bg-card/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Match info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn("text-xs font-bold", getTypeBadgeClass(bet.type))}>
                {bet.type === 'golden' && <Trophy className="w-3 h-3 mr-1" />}
                {bet.type === 'bet-builder' && <Layers className="w-3 h-3 mr-1" />}
                {bet.type === 'acca' && <Zap className="w-3 h-3 mr-1" />}
                {bet.type === 'golden' ? 'Golden' : bet.type === 'bet-builder' ? 'Bet Builder' : 'ACCA'}
              </Badge>
              
              {bet.isLive ? (
                <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/50 animate-pulse">
                  <Radio className="w-3 h-3 mr-1" />
                  LIVE {bet.liveStats?.elapsed}'
                </Badge>
              ) : bet.isFinished ? (
                <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-500">
                  FT
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(bet.kickoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              )}
            </div>
            
            <h3 className="font-bold text-base truncate">
              {formatTeamName(bet.homeTeam)} vs {formatTeamName(bet.awayTeam)}
            </h3>
            <p className="text-xs text-muted-foreground truncate">{bet.league}</p>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {bet.markets ? (
                bet.markets.map((m, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {formatMarket(m)}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {formatMarket(bet.market)}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Right: Live stats or odds */}
          <div className="text-right shrink-0">
            {bet.liveStats && stat ? (
              <div className={cn(
                "p-3 rounded-lg min-w-[80px]",
                isOnTrack ? "bg-green-500/20" : "bg-muted/50"
              )}>
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  {stat.icon}
                  <span className="text-xs">{stat.label}</span>
                </div>
                <div className={cn(
                  "text-2xl font-bold tabular-nums",
                  isOnTrack ? "text-green-400" : "text-foreground"
                )}>
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">
                  Target: {stat.target}+
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-muted/30 min-w-[80px]">
                <div className="text-xs text-muted-foreground mb-1">Odds</div>
                <div className="text-xl font-bold text-primary tabular-nums">
                  {bet.odds.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {bet.confidence.toFixed(0)}% conf
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Score bar (live + finished) */}
        {showScore && bet.liveStats && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{formatTeamName(bet.liveStats.home_team)}</span>
              <span className="text-2xl font-bold text-primary tabular-nums">
                {bet.liveStats.score_home} - {bet.liveStats.score_away}
              </span>
              <span className="font-medium">{formatTeamName(bet.liveStats.away_team)}</span>
            </div>
            
            {/* All relevant stats for multi-leg bets */}
            {bet.markets && bet.markets.length > 1 && (
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-muted/30 rounded p-2">
                  <Target className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-bold">{bet.liveStats.score_home + bet.liveStats.score_away}</div>
                  <div className="text-xs text-muted-foreground">Goals</div>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <Flag className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-bold">{bet.liveStats.corners_total}</div>
                  <div className="text-xs text-muted-foreground">Corners</div>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <Square className="w-4 h-4 mx-auto mb-1 fill-amber-400 text-amber-400" />
                  <div className="text-lg font-bold">{bet.liveStats.cards_total}</div>
                  <div className="text-xs text-muted-foreground">Cards</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function InPlaySection() {
  const { 
    inPlayBets, 
    isLoading, 
    lastUpdated, 
    error, 
    fetchLiveStats,
    startPolling,
    stopPolling 
  } = useInPlayStats();

  // Connect to alert monitoring system
  const { activeAlerts, notificationsEnabled } = useAlertMonitor(inPlayBets);

  // Start polling on mount, stop on unmount
  useEffect(() => {
    startPolling(60000); // Poll every 60 seconds
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const liveBets = inPlayBets.filter(b => b.isLive);
  const finishedBets = inPlayBets.filter(b => b.isFinished);
  const upcomingBets = inPlayBets.filter(b => !b.isLive && !b.isFinished);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Radio className="w-8 h-8 text-green-500 animate-pulse" />
            In-Play Tracker
          </h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            Live stats for your active bets • Updates every 60 seconds
            {notificationsEnabled && activeAlerts > 0 && (
              <Badge variant="outline" className="text-xs">
                <Bell className="w-3 h-3 mr-1" />
                {activeAlerts} alert{activeAlerts !== 1 ? 's' : ''} active
              </Badge>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString('en-GB')}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLiveStats}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-4 text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Live Bets Section */}
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <Radio className="w-5 h-5 text-green-500" />
            Live Now
            {liveBets.length > 0 && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                {liveBets.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && liveBets.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : liveBets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {liveBets.map(bet => (
                <InPlayBetCard key={bet.id} bet={bet} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No live matches right now</p>
              <p className="text-sm">Your bets will appear here when matches kick off</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finished Bets Section */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Finished
            {finishedBets.length > 0 && (
              <Badge variant="outline" className="border-amber-500/30 text-amber-500">
                {finishedBets.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {finishedBets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {finishedBets.map(bet => (
                <InPlayBetCard key={bet.id} bet={bet} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No finished matches yet</p>
              <p className="text-sm">They’ll appear here as soon as the final whistle goes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Bets Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Upcoming
            {upcomingBets.length > 0 && (
              <Badge variant="secondary">{upcomingBets.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingBets.map(bet => (
                <InPlayBetCard key={bet.id} bet={bet} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No upcoming bets</p>
              <p className="text-sm">Check Golden Bets or Bet Builder for today's picks</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

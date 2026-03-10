import { TrendingUp, TrendingDown, Target, Trophy, Wallet, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PLSummaryCardProps {
  period: string;
  totalBets: number;
  wins: number;
  losses: number;
  winRate: number;
  totalStaked: number;
  netProfit: number;
  roi: number;
}

export function PLSummaryCard({
  period,
  totalBets,
  wins,
  losses,
  winRate,
  totalStaked,
  netProfit,
  roi,
}: PLSummaryCardProps) {
  const isProfit = netProfit >= 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/30 p-6 shadow-xl overflow-hidden relative">
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
      
      {/* Header with ROI */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">{period} Performance</h3>
          <div className="flex items-center gap-3">
            <div className={cn(
              "text-4xl font-black",
              isProfit ? "text-success" : "text-destructive"
            )}>
              {isProfit ? '+' : ''}{roi.toFixed(1)}%
            </div>
            <span className="text-lg text-muted-foreground font-medium">ROI</span>
          </div>
        </div>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center premium-3d">
          {isProfit ? (
            <TrendingUp className="w-8 h-8 text-success" />
          ) : (
            <TrendingDown className="w-8 h-8 text-destructive" />
          )}
        </div>
      </div>

      {/* Stats Grid - Premium Boxed Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Net Profit */}
        <div className={cn('p-4 rounded-xl text-center premium-3d')}>
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Net Profit</span>
          </div>
          <div className={cn(
            'text-2xl font-black tabular-nums',
            isProfit ? "text-success" : "text-destructive"
          )}>
            {isProfit ? '+' : ''}£{netProfit.toFixed(2)}
          </div>
        </div>

        {/* Win Rate */}
        <div className="p-4 rounded-xl text-center premium-3d">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Win Rate</span>
          </div>
          <div className="text-2xl font-black text-primary tabular-nums">
            {winRate.toFixed(0)}%
          </div>
        </div>

        {/* Record */}
        <div className="p-4 rounded-xl text-center premium-3d">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">W-L</span>
          </div>
          <div className="text-xl font-black">
            <span className="text-success">{wins}W</span>
            <span className="text-muted-foreground mx-1">-</span>
            <span className="text-destructive">{losses}L</span>
          </div>
        </div>

        {/* Total Staked */}
        <div className="p-4 rounded-xl text-center premium-3d">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Wallet className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Staked</span>
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            £{totalStaked.toFixed(0)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {totalBets} bets
          </div>
        </div>
      </div>
    </div>
  );
}

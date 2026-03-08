/**
 * Monthly Profit Banner - Shows previous month's total P&L
 * Displays prominently on homepage and P&L section
 */

import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthlyProfitBannerProps {
  monthName: string; // e.g., "January 2026"
  totalProfit: number;
  totalBets: number;
  wins: number;
  losses: number;
  roi: number;
  className?: string;
  compact?: boolean;
}

export function MonthlyProfitBanner({
  monthName,
  totalProfit,
  totalBets,
  wins,
  losses,
  roi,
  className,
  compact = false,
}: MonthlyProfitBannerProps) {
  const isProfit = totalProfit >= 0;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center justify-between px-4 py-3 rounded-xl border-2",
        isProfit 
          ? "bg-success/10 border-success/40" 
          : "bg-destructive/10 border-destructive/40",
        className
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            isProfit ? "bg-success/20" : "bg-destructive/20"
          )}>
            <Calendar className={cn("w-4 h-4", isProfit ? "text-success" : "text-destructive")} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{monthName}</p>
            <p className="text-xs text-muted-foreground">{totalBets} bets • {wins}W-{losses}L</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn(
            "text-xl font-black tabular-nums",
            isProfit ? "text-success" : "text-destructive"
          )}>
            {isProfit ? '+' : ''}£{totalProfit.toFixed(2)}
          </p>
          <p className={cn(
            "text-xs font-semibold tabular-nums",
            isProfit ? "text-success/80" : "text-destructive/80"
          )}>
            {isProfit ? '+' : ''}{roi.toFixed(1)}% ROI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border-2 p-6",
      isProfit 
        ? "bg-gradient-to-br from-success/15 via-success/5 to-card border-success/40" 
        : "bg-gradient-to-br from-destructive/15 via-destructive/5 to-card border-destructive/40",
      className
    )}>
      {/* Accent bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        isProfit ? "bg-success" : "bg-destructive"
      )} />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-xl",
            isProfit ? "bg-success/20" : "bg-destructive/20"
          )}>
            {isProfit ? (
              <TrendingUp className="w-6 h-6 text-success" />
            ) : (
              <TrendingDown className="w-6 h-6 text-destructive" />
            )}
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{monthName} Results</p>
            <p className="text-sm text-muted-foreground">
              {totalBets} bets • <span className="text-success">{wins}W</span> - <span className="text-destructive">{losses}L</span>
            </p>
          </div>
        </div>

        <div className="text-center sm:text-right">
          <p className={cn(
            "text-3xl md:text-4xl font-black tabular-nums",
            isProfit ? "text-success" : "text-destructive"
          )}>
            {isProfit ? '+' : ''}£{totalProfit.toFixed(2)}
          </p>
          <p className={cn(
            "text-sm font-bold tabular-nums",
            isProfit ? "text-success/80" : "text-destructive/80"
          )}>
            {isProfit ? '+' : ''}{roi.toFixed(1)}% ROI
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Monthly P&L Summary Table — Shows per-market rows (Goals, Corners, Cards) + combined total
 */

import { TrendingUp, TrendingDown, ArrowRight, Target, Flag, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import theGafferImage from '@/assets/the-gaffer.webp';

interface BetTypeRow {
  name: string;
  wins: number;
  losses: number;
  profit: number;
  staked: number;
  colorVar: string;
  icon: React.ReactNode;
}

interface MonthlyPLTableProps {
  goals: { wins: number; losses: number; profit: number; staked: number };
  corners: { wins: number; losses: number; profit: number; staked: number };
  cards: { wins: number; losses: number; profit: number; staked: number };
  monthName: string;
  isLoading?: boolean;
  onViewFullPL?: () => void;
}

export function MonthlyPLTable({ goals, corners, cards, monthName, isLoading, onViewFullPL }: MonthlyPLTableProps) {
  const rows: BetTypeRow[] = [
    { name: 'Over 2.5 Goals', icon: <Target className="w-3.5 h-3.5" />, colorVar: '--bet-goals', ...goals },
    { name: 'Over 8.5 Corners', icon: <Flag className="w-3.5 h-3.5" />, colorVar: '--bet-corners', ...corners },
    { name: 'Over 3.5 Cards', icon: <CreditCard className="w-3.5 h-3.5" />, colorVar: '--bet-cards', ...cards },
  ];

  const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
  const totalStaked = rows.reduce((s, r) => s + r.staked, 0);
  const totalWins = rows.reduce((s, r) => s + r.wins, 0);
  const totalLosses = rows.reduce((s, r) => s + r.losses, 0);
  const totalROI = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const isOverallProfit = totalProfit >= 0;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-1/2 mx-auto" />
          <div className="h-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/25 bg-card/90 overflow-hidden shadow-lg shadow-primary/5">
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <img 
              src={theGafferImage} 
              alt="The Gaffer" 
              className="w-9 h-9 rounded-full border border-primary/40 object-cover"
            />
            <div>
              <h2 className="text-base font-bold text-foreground">
                {monthName} <span className="text-primary">P&L</span>
              </h2>
              <p className="text-[11px] text-muted-foreground">The Gaffer's track record</p>
            </div>
          </div>
          
          {/* Total */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border",
            isOverallProfit
              ? "bg-success/10 border-success/40 text-success"
              : "bg-destructive/10 border-destructive/40 text-destructive"
          )}>
            {isOverallProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span className="text-lg font-black">
              {isOverallProfit ? '+' : ''}£{totalProfit.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50">
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Market</th>
                <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">W/L</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">P&L</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isProfit = row.profit >= 0;
                const hasData = row.wins > 0 || row.losses > 0;
                return (
                  <tr key={row.name} className={cn(
                    "border-t border-border/30 transition-colors",
                    i % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                  )}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{ background: `hsl(var(${row.colorVar}))` }}>
                          {row.icon}
                        </div>
                        <span className="font-medium text-foreground">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {hasData ? (
                        <span className="text-foreground/80">
                          <span className="text-success font-semibold">{row.wins}</span>
                          <span className="text-muted-foreground mx-0.5">/</span>
                          <span className="text-destructive font-semibold">{row.losses}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className={cn(
                      "py-2.5 px-3 text-right font-black",
                      hasData
                        ? isProfit ? "text-success" : "text-destructive"
                        : "text-muted-foreground"
                    )}>
                      {hasData
                        ? `${isProfit ? '+' : ''}£${row.profit.toFixed(2)}`
                        : '—'
                      }
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="border-t-2 border-primary/40 bg-primary/8">
                <td className="py-2.5 px-3 font-bold text-foreground">Total</td>
                <td className="py-2.5 px-2 text-center">
                  <span className="text-success font-bold">{totalWins}</span>
                  <span className="text-muted-foreground mx-0.5">/</span>
                  <span className="text-destructive font-bold">{totalLosses}</span>
                </td>
                <td className={cn(
                  "py-2.5 px-3 text-right font-black text-lg",
                  isOverallProfit ? "text-success" : "text-destructive"
                )}>
                  {isOverallProfit ? '+' : ''}£{totalProfit.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ROI + CTA row */}
        <div className="flex items-center justify-between mt-3">
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            isOverallProfit ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
          )}>
            {isOverallProfit ? '+' : ''}{totalROI.toFixed(1)}% ROI
          </span>
          {onViewFullPL && (
            <button 
              onClick={onViewFullPL}
              className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded-full border border-primary/30 hover:bg-primary/10"
            >
              See Detailed Overview <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

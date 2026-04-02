import { TrendingUp, TrendingDown, ArrowRight, Target, Flag, CreditCard, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import theGafferImage from '@/assets/the-gaffer.webp';
import { COMBO_BET_STAKE, MARKET_DAILY_STAKE, SINGLE_BET_STAKE } from '@/lib/plModel';

interface BetTypeRow {
  name: string;
  wins: number;
  losses: number;
  profit: number;
  staked: number;
   description: string;
  icon: React.ReactNode;
  iconClass: string;
}

interface MonthlyPLTableProps {
  goals: { wins: number; losses: number; profit: number; staked: number };
  corners: { wins: number; losses: number; profit: number; staked: number };
  cards: { wins: number; losses: number; profit: number; staked: number };
  betBuilder: { wins: number; losses: number; profit: number; staked: number };
  acca: { wins: number; losses: number; profit: number; staked: number };
  monthName: string;
  isLoading?: boolean;
  onViewFullPL?: () => void;
}

export function MonthlyPLTable({ goals, corners, cards, betBuilder, acca, monthName, isLoading, onViewFullPL }: MonthlyPLTableProps) {
  const rows: BetTypeRow[] = [
    {
      name: 'Over 2.5 Goals',
      description: `3 picks · 3 doubles + 1 treble · £${COMBO_BET_STAKE.toFixed(2)} each · £${MARKET_DAILY_STAKE.toFixed(0)} total`,
      icon: <Target className="w-3.5 h-3.5" />,
      iconClass: 'bg-bet-goals/20 text-foreground border border-bet-goals/40',
      ...goals,
    },
    {
      name: 'Over 8.5 Corners',
      description: `3 picks · 3 doubles + 1 treble · £${COMBO_BET_STAKE.toFixed(2)} each · £${MARKET_DAILY_STAKE.toFixed(0)} total`,
      icon: <Flag className="w-3.5 h-3.5" />,
      iconClass: 'bg-bet-corners/20 text-foreground border border-bet-corners/40',
      ...corners,
    },
    {
      name: 'Over 3.5 Cards',
      description: `3 picks · 3 doubles + 1 treble · £${COMBO_BET_STAKE.toFixed(2)} each · £${MARKET_DAILY_STAKE.toFixed(0)} total`,
      icon: <CreditCard className="w-3.5 h-3.5" />,
      iconClass: 'bg-bet-cards/20 text-foreground border border-bet-cards/40',
      ...cards,
    },
    {
      name: 'Bet Builder',
      description: `Same-game combo · fixed £${SINGLE_BET_STAKE.toFixed(0)} stake`,
      icon: <Layers className="w-3.5 h-3.5" />,
      iconClass: 'bg-bet-builder/20 text-foreground border border-bet-builder/40',
      ...betBuilder,
    },
    {
      name: 'Accas Delight',
      description: `3-leg ACCA · fixed £${SINGLE_BET_STAKE.toFixed(0)} stake`,
      icon: <Sparkles className="w-3.5 h-3.5" />,
      iconClass: 'bg-bet-acca/20 text-foreground border border-bet-acca/40',
      ...acca,
    },
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
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/25 bg-card/90 overflow-hidden shadow-lg shadow-primary/5">
      <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

      <div className="p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <img src={theGafferImage} alt="The Gaffer" className="w-9 h-9 rounded-full border border-primary/40 object-cover" />
            <div>
              <h2 className="text-base font-bold text-foreground">
                {monthName} <span className="text-primary">Month-to-Date P&amp;L</span>
              </h2>
              <p className="text-[11px] text-muted-foreground">Every bet type, one fixed stake model</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className={cn(
              'rounded-xl border px-3 py-2 text-center',
              isOverallProfit ? 'border-success/40 bg-success/10' : 'border-destructive/40 bg-destructive/10',
            )}>
              <div className="flex items-center justify-center gap-1 text-xs font-semibold text-muted-foreground">
                {isOverallProfit ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                Combined
              </div>
              <div className={cn('text-lg font-black tabular-nums', isOverallProfit ? 'text-success' : 'text-destructive')}>
                {isOverallProfit ? '+' : ''}£{totalProfit.toFixed(2)}
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-center">
              <div className="text-xs font-semibold text-muted-foreground">Staked</div>
              <div className="text-lg font-black tabular-nums text-foreground">£{totalStaked.toFixed(2)}</div>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-center">
              <div className="text-xs font-semibold text-muted-foreground">ROI</div>
              <div className={cn('text-lg font-black tabular-nums', isOverallProfit ? 'text-success' : 'text-destructive')}>
                {isOverallProfit ? '+' : ''}{totalROI.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((row) => {
            const isProfit = row.profit >= 0;
            const hasData = row.wins > 0 || row.losses > 0;

            return (
              <div key={row.name} className="rounded-xl border border-border/50 bg-muted/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', row.iconClass)}>
                      {row.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{row.name}</h3>
                      <p className="text-xs text-muted-foreground">{row.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:min-w-[320px]">
                    <div className="rounded-lg bg-card/70 px-3 py-2 text-center border border-border/40">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">W/L</div>
                      <div className="text-sm font-black">
                        {hasData ? (
                          <>
                            <span className="text-success">{row.wins}</span>
                            <span className="text-muted-foreground mx-1">/</span>
                            <span className="text-destructive">{row.losses}</span>
                          </>
                        ) : '—'}
                      </div>
                    </div>

                    <div className="rounded-lg bg-card/70 px-3 py-2 text-center border border-border/40">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Staked</div>
                      <div className="text-sm font-black tabular-nums text-foreground">
                        {hasData ? `£${row.staked.toFixed(2)}` : '—'}
                      </div>
                    </div>

                    <div className="rounded-lg bg-card/70 px-3 py-2 text-center border border-border/40">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">P&amp;L</div>
                      <div className={cn('text-sm font-black tabular-nums', hasData ? (isProfit ? 'text-success' : 'text-destructive') : 'text-muted-foreground')}>
                        {hasData ? `${isProfit ? '+' : ''}£${row.profit.toFixed(2)}` : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-primary/35 bg-primary/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-foreground">Combined month-to-date total</h3>
                <p className="text-xs text-muted-foreground">{totalWins} wins · {totalLosses} losses across all five bet types</p>
              </div>
              <div className="text-left sm:text-right">
                <div className={cn('text-2xl font-black tabular-nums', isOverallProfit ? 'text-success' : 'text-destructive')}>
                  {isOverallProfit ? '+' : ''}£{totalProfit.toFixed(2)}
                </div>
                <div className="text-xs font-semibold text-muted-foreground">£{totalStaked.toFixed(2)} staked</div>
              </div>
            </div>
          </div>
        </div>

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

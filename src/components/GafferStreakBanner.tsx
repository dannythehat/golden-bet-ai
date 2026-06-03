import { useMemo } from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import { usePLHistory } from '@/hooks/usePLHistory';
import { cn } from '@/lib/utils';

/**
 * Gaffer Streak Banner — social proof from real settled days.
 * Computes the current run of consecutive profitable days from byDate.
 */
export function GafferStreakBanner() {
  const { byDate, isLoading } = usePLHistory();

  const { streakDays, streakProfit, biggestDay } = useMemo(() => {
    if (!byDate?.length) return { streakDays: 0, streakProfit: 0, biggestDay: null as null | { date: string; profit: number } };
    // byDate is descending by date in this app — walk from newest until a non-profitable day breaks it
    const sorted = [...byDate].sort((a, b) => b.date.localeCompare(a.date));
    let days = 0;
    let profit = 0;
    let biggest: { date: string; profit: number } | null = null;
    for (const d of sorted) {
      if ((d.netProfit ?? 0) > 0) {
        days += 1;
        profit += d.netProfit;
        if (!biggest || d.netProfit > biggest.profit) biggest = { date: d.date, profit: d.netProfit };
      } else {
        break;
      }
    }
    return { streakDays: days, streakProfit: profit, biggestDay: biggest };
  }, [byDate]);

  if (isLoading || streakDays < 2) return null;

  const formatDay = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
    catch { return d; }
  };

  return (
    <div className={cn(
      "rounded-2xl p-4 md:p-5 mb-4 relative overflow-hidden",
      "bg-gradient-to-r from-[hsl(var(--neon-yellow)/.18)] via-[hsl(var(--neon-green)/.10)] to-[hsl(var(--neon-yellow)/.18)]",
      "border-2 border-[hsl(var(--neon-yellow)/.5)] shadow-[0_0_20px_-6px_hsl(var(--neon-yellow)/.4)]"
    )}>
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-12 h-12 rounded-full bg-[hsl(var(--neon-yellow)/.25)] border-2 border-[hsl(var(--neon-yellow)/.6)] flex items-center justify-center">
          <Flame className="w-6 h-6 text-[hsl(var(--neon-yellow))]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider font-bold text-[hsl(var(--neon-yellow))]">The Gaffer is on a roll</span>
          </div>
          <p className="text-sm md:text-base text-foreground font-semibold leading-tight mt-0.5">
            <span className="text-[hsl(var(--neon-green))] font-black">{streakDays}-day</span> profitable streak
            {streakProfit > 0 && (
              <span className="text-muted-foreground font-normal"> · </span>
            )}
            {streakProfit > 0 && (
              <span className="text-[hsl(var(--neon-green))] font-black">+£{streakProfit.toFixed(2)}</span>
            )}
          </p>
          {biggestDay && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Best day: {formatDay(biggestDay.date)} (+£{biggestDay.profit.toFixed(2)})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

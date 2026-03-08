/**
 * LiveMarketTracker - Unified in-play progress tracker for all bet types
 * Shows live progress bars, neon green won states, and real-time stats
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Target, Flag, Square, Check, X, Radio } from 'lucide-react';
import type { LiveFixtureStats } from '@/hooks/useInPlayStats';
import { didMarketHit } from '@/lib/marketEval';
import { isInPlayStatus, isFinishedStatus } from '@/lib/fixtureStatus';

interface MarketProgress {
  label: string;
  icon: React.ReactNode;
  current: number;
  target: number;
  hit: boolean | null;
  isBTTS?: boolean;
  homeScored?: boolean;
  awayScored?: boolean;
}

function getMarketProgress(market: string, stats: LiveFixtureStats): MarketProgress {
  const m = market.toLowerCase();

  // BTTS
  if (m.includes('btts')) {
    const homeScored = stats.score_home > 0;
    const awayScored = stats.score_away > 0;
    return {
      label: 'BTTS',
      icon: <Target className="w-3.5 h-3.5" />,
      current: (homeScored ? 1 : 0) + (awayScored ? 1 : 0),
      target: 2,
      hit: homeScored && awayScored,
      isBTTS: true,
      homeScored,
      awayScored,
    };
  }

  // Goals
  if (m.includes('goal') || (m.includes('over') && !m.includes('corner') && !m.includes('card'))) {
    const totalGoals = stats.score_home + stats.score_away;
    let target = 3;
    if (m.includes('1_5') || m.includes('1.5') || m.includes('15')) target = 2;
    if (m.includes('3_5') || m.includes('3.5') || m.includes('35')) target = 4;
    return {
      label: `Over ${target - 1}.5 Goals`,
      icon: <Target className="w-3.5 h-3.5" />,
      current: totalGoals,
      target,
      hit: totalGoals >= target,
    };
  }

  // Corners
  if (m.includes('corner')) {
    let target = 10;
    if (m.includes('8_5') || m.includes('8.5') || m.includes('85')) target = 9;
    if (m.includes('10_5') || m.includes('10.5') || m.includes('105')) target = 11;
    return {
      label: `Over ${target - 1}.5 Corners`,
      icon: <Flag className="w-3.5 h-3.5" />,
      current: stats.corners_total,
      target,
      hit: stats.corners_total >= target,
    };
  }

  // Cards
  if (m.includes('card')) {
    let target = 4;
    if (m.includes('2_5') || m.includes('2.5') || m.includes('25')) target = 3;
    if (m.includes('4_5') || m.includes('4.5') || m.includes('45')) target = 5;
    return {
      label: `Over ${target - 1}.5 Cards`,
      icon: <Square className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />,
      current: stats.cards_total,
      target,
      hit: stats.cards_total >= target,
    };
  }

  // Fallback - use didMarketHit
  return {
    label: market,
    icon: <Target className="w-3.5 h-3.5" />,
    current: 0,
    target: 1,
    hit: didMarketHit(market, stats),
  };
}

interface LiveMarketTrackerProps {
  market: string;
  stats: LiveFixtureStats;
  isSettled?: boolean;
  isWon?: boolean;
  compact?: boolean;
}

export function LiveMarketTracker({ market, stats, isSettled, isWon, compact = false }: LiveMarketTrackerProps) {
  const isLive = isInPlayStatus(stats.status);
  const isFT = isFinishedStatus(stats.status);
  const progress = useMemo(() => getMarketProgress(market, stats), [market, stats]);

  // Determine final state
  const legHit = isSettled ? isWon : progress.hit;
  const showResult = isFT || isSettled || legHit === true;
  const pct = progress.isBTTS
    ? (progress.current / 2) * 100
    : Math.min(100, (progress.current / progress.target) * 100);

  return (
    <div className={cn(
      "rounded-xl border-2 transition-all duration-500",
      compact ? "p-2.5" : "p-3",
      legHit === true && "border-[hsl(var(--neon-green)/.6)] bg-[hsl(var(--neon-green)/.08)]",
      legHit === false && showResult && "border-destructive/40 bg-destructive/5",
      legHit === null && isLive && "border-[hsl(var(--neon-green)/.3)] bg-[hsl(var(--neon-green)/.04)]",
      legHit === null && !isLive && !isFT && "border-border/50 bg-muted/20",
    )}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn(
            "shrink-0",
            legHit === true ? "text-[hsl(var(--neon-green))]" : "text-muted-foreground"
          )}>
            {progress.icon}
          </span>
          <span className={cn(
            "text-xs font-semibold truncate",
            legHit === true ? "text-[hsl(var(--neon-green))]" : "text-foreground/80"
          )}>
            {progress.label}
          </span>
        </div>

        {/* Result icon */}
        {showResult && legHit !== null && (
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
            legHit
              ? "bg-[hsl(var(--neon-green))] text-black shadow-[0_0_12px_hsl(var(--neon-green)/.5)]"
              : "bg-destructive/20 text-destructive"
          )}>
            {legHit ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <X className="w-3.5 h-3.5" />}
          </div>
        )}

        {/* Live pulse when in-play and not yet decided */}
        {isLive && !showResult && (
          <div className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-[hsl(var(--neon-green))] animate-pulse" />
            <span className="text-[10px] font-bold text-[hsl(var(--neon-green))]">{stats.elapsed}'</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {progress.isBTTS ? (
        <div className="flex gap-1">
          <div className={cn(
            "flex-1 h-2.5 rounded-full transition-all duration-700 relative overflow-hidden",
            progress.homeScored
              ? "bg-[hsl(var(--neon-green))] shadow-[0_0_8px_hsl(var(--neon-green)/.4)]"
              : "bg-muted/40"
          )}>
            {progress.homeScored && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
            )}
          </div>
          <div className={cn(
            "flex-1 h-2.5 rounded-full transition-all duration-700 relative overflow-hidden",
            progress.awayScored
              ? "bg-[hsl(var(--neon-green))] shadow-[0_0_8px_hsl(var(--neon-green)/.4)]"
              : "bg-muted/40"
          )}>
            {progress.awayScored && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
            )}
          </div>
        </div>
      ) : (
        <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden relative">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 relative",
              legHit === true
                ? "bg-[hsl(var(--neon-green))] shadow-[0_0_8px_hsl(var(--neon-green)/.4)]"
                : pct >= 50
                  ? "bg-[hsl(var(--neon-green)/.7)]"
                  : "bg-primary/60"
            )}
            style={{ width: `${pct}%` }}
          >
            {isLive && pct > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
            )}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between mt-1.5">
        {progress.isBTTS ? (
          <div className="flex items-center gap-2 text-[10px]">
            <span className={cn("font-bold", progress.homeScored ? "text-[hsl(var(--neon-green))]" : "text-muted-foreground")}>
              Home: {stats.score_home} {progress.homeScored ? '✓' : ''}
            </span>
            <span className={cn("font-bold", progress.awayScored ? "text-[hsl(var(--neon-green))]" : "text-muted-foreground")}>
              Away: {stats.score_away} {progress.awayScored ? '✓' : ''}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "text-sm font-black tabular-nums",
              legHit === true ? "text-[hsl(var(--neon-green))]" : pct >= 50 ? "text-[hsl(var(--neon-green)/.8)]" : "text-foreground"
            )}>
              {progress.current}
            </span>
            <span className="text-[10px] text-muted-foreground">/ {progress.target} needed</span>
          </div>
        )}
        {legHit === true && (
          <span className="text-[10px] font-black uppercase tracking-wider text-[hsl(var(--neon-green))] animate-pulse">
            ✓ HIT
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Live Score Display - shared between all bet cards
 */
interface LiveScoreProps {
  stats: LiveFixtureStats;
  homeTeam: string;
  awayTeam: string;
  className?: string;
}

export function LiveScore({ stats, homeTeam, awayTeam, className }: LiveScoreProps) {
  const isLive = isInPlayStatus(stats.status);

  return (
    <div className={cn("flex items-center justify-center gap-3 w-full", className)}>
      <div className="text-base font-semibold text-foreground text-right flex-1 min-w-0">
        <span className="block truncate">{homeTeam}</span>
      </div>
      <div className={cn(
        "text-2xl font-black tabular-nums shrink-0 px-3 py-1 rounded-lg",
        isLive
          ? "text-[hsl(var(--neon-green))] bg-[hsl(var(--neon-green)/.1)] border border-[hsl(var(--neon-green)/.3)] shadow-[0_0_12px_hsl(var(--neon-green)/.2)]"
          : "text-foreground bg-muted/30 border border-border/50"
      )}>
        {stats.score_home} - {stats.score_away}
      </div>
      <div className="text-base font-semibold text-foreground text-left flex-1 min-w-0">
        <span className="block truncate">{awayTeam}</span>
      </div>
    </div>
  );
}

/**
 * Match Status Badge - unified live/FT/awaiting badge
 */
interface MatchStatusBadgeProps {
  stats?: LiveFixtureStats | null;
  kickoff: string;
  status: string;
  isSettled?: boolean;
  isWon?: boolean;
}

export function MatchStatusBadge({ stats, kickoff, status, isSettled, isWon }: MatchStatusBadgeProps) {
  const isLive = !!stats && isInPlayStatus(stats.status);
  const isFT = !!stats && isFinishedStatus(stats.status);
  const matchStarted = Date.now() > new Date(kickoff).getTime();
  const awaitingResult = status === 'pending' && matchStarted && !isLive && !isFT;

  if (isSettled) {
    return (
      <div className={cn(
        "px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5",
        isWon
          ? "bg-[hsl(var(--neon-green))] text-black shadow-[0_0_15px_hsl(var(--neon-green)/.4)]"
          : "bg-destructive text-destructive-foreground"
      )}>
        {isWon ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <X className="w-3.5 h-3.5" />}
        {isWon ? 'WON' : 'LOST'}
      </div>
    );
  }

  if (isLive) {
    return (
      <div className="px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 bg-[hsl(var(--neon-green))] text-black shadow-[0_0_15px_hsl(var(--neon-green)/.4)]">
        <Radio className="w-3.5 h-3.5 animate-pulse" />
        LIVE {stats?.elapsed}'
      </div>
    );
  }

  if (isFT) {
    return (
      <div className="px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 bg-muted text-foreground border border-border">
        FT
      </div>
    );
  }

  if (awaitingResult) {
    return (
      <div className="px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
        ⏳ Awaiting
      </div>
    );
  }

  return null;
}

/**
 * Bet365 branded odds badge - shows the Bet365 logo + odds value
 * Used across Golden Bets, Bet Builder, and ACCA Delight cards
 */

import { cn } from '@/lib/utils';

interface Bet365BadgeProps {
  odds: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

/** Inline SVG recreation of the bet365 wordmark */
function Bet365Logo({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const h = size === 'sm' ? 14 : size === 'md' ? 16 : 20;
  return (
    <svg viewBox="0 0 80 24" height={h} className="shrink-0 max-w-full" aria-label="bet365">
      {/* "bet" in white */}
      <text x="0" y="19" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="20" fill="#ffffff" letterSpacing="-0.5">
        bet
      </text>
      {/* "365" on yellow rounded rect */}
      <rect x="38" y="2" width="40" height="20" rx="4" fill="#FFD700" />
      <text x="41" y="18.5" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="18" fill="#004d00" letterSpacing="-0.5">
        365
      </text>
    </svg>
  );
}

export function Bet365Badge({ odds, size = 'md', className, showLabel = true }: Bet365BadgeProps) {
  return (
    <div className={cn(
      "inline-flex items-center rounded-lg border max-w-full",
      size === 'sm' && "px-1.5 py-1 gap-1",
      size === 'md' && "px-2 py-1 gap-1.5",
      size === 'lg' && "px-3 py-1.5 gap-2",
      "bg-[#003d00] border-[#005500]/60",
      className
    )}>
      <Bet365Logo size={size} />
      {showLabel && (
        <div className="w-px h-4 bg-white/20" />
      )}
      <span className={cn(
        "font-black text-[#4ade80] tabular-nums",
        size === 'sm' && "text-xs",
        size === 'md' && "text-sm",
        size === 'lg' && "text-lg",
      )}>
        {odds.toFixed(2)}
      </span>
    </div>
  );
}

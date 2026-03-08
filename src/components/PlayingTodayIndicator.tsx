/**
 * Playing Today Indicator
 * Shows a colored dot next to teams playing today
 * Clickable to show match time in GMT
 */

import { useState, forwardRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';

interface PlayingTodayIndicatorProps {
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  isHome: boolean;
}

export const PlayingTodayIndicator = forwardRef<HTMLButtonElement, PlayingTodayIndicatorProps>(
  function PlayingTodayIndicator({ kickoff, homeTeam, awayTeam, isHome }, ref) {
    const [open, setOpen] = useState(false);
    
    const kickoffDate = new Date(kickoff);
    const formattedTime = format(kickoffDate, 'HH:mm');
    
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button 
            ref={ref}
            className="relative flex items-center justify-center w-4 h-4 group"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            {/* Animated pulsing dot */}
            <span className="absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-3 bg-card border-border shadow-lg" 
          side="top"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wide">
              ⚽ Playing Today
            </p>
            <p className="text-sm font-medium">
              {homeTeam} vs {awayTeam}
            </p>
            <p className="text-sm text-muted-foreground">
              Kickoff: <span className="font-bold text-foreground">{formattedTime} GMT</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {isHome ? '(Home)' : '(Away)'}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

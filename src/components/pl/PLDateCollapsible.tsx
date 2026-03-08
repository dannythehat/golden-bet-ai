import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PLDateCollapsibleProps {
  date: string;
  children: React.ReactNode;
  wins: number;
  losses: number;
  voids?: number;
  profit: number;
  count: number;
  defaultOpen?: boolean;
}

export function PLDateCollapsible({ 
  date, 
  children, 
  wins, 
  losses, 
  voids = 0,
  profit, 
  count,
  defaultOpen = false 
}: PLDateCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isProfit = profit >= 0;

  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-between p-3 h-auto rounded-xl text-left',
            'bg-muted/20 hover:bg-muted/40 border border-border/50',
            isOpen && 'bg-muted/30 border-border'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              isProfit ? 'bg-success/20' : 'bg-destructive/20'
            )}>
              <Calendar className={cn(
                "w-4 h-4",
                isProfit ? "text-success" : "text-destructive"
              )} />
            </div>
            <div className="text-left min-w-0">
              <div className="font-semibold text-sm text-foreground truncate">{formattedDate}</div>
              <div className="text-xs text-muted-foreground">
                {count} bet{count !== 1 ? 's' : ''} • <span className="text-success">{wins}W</span> - <span className="text-destructive">{losses}L</span>
                {voids > 0 && (
                  <>
                    <span className="mx-1">•</span>
                    <span className="font-bold text-muted-foreground">{voids}V</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className={cn(
              'text-sm sm:text-base font-bold tabular-nums px-2 py-0.5 rounded-md whitespace-nowrap',
              isProfit 
                ? "text-success bg-success/10" 
                : "text-destructive bg-destructive/10"
            )}>
              {isProfit ? '+' : ''}£{profit.toFixed(2)}
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-2 space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

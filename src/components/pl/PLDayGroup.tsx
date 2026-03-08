import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PLHistoryBetRow } from './PLHistoryBetRow';

interface SettledBet {
  id: string;
  home_team: string;
  away_team: string;
  league: string;
  market: string;
  bookmaker_odds: number;
  result: string;
  status: 'won' | 'lost';
  stake: number;
  profit_loss: number;
  gaffer_reasoning: string;
  kickoff: string;
}

interface PLDayGroupProps {
  date: string;
  bets: SettledBet[];
  defaultOpen?: boolean;
}

export function PLDayGroup({ date, bets, defaultOpen = false }: PLDayGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const wins = bets.filter(b => b.status === 'won').length;
  const losses = bets.filter(b => b.status === 'lost').length;
  const dayProfit = bets.reduce((sum, b) => sum + (b.profit_loss || 0), 0);
  const isProfit = dayProfit >= 0;

  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-between p-4 h-auto rounded-xl mb-2 text-left',
            'premium-3d',
            'hover:bg-muted/30',
            isOpen && 'bg-muted/20'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center premium-3d-inset',
            )}>
              <Calendar className={cn(
                "w-5 h-5",
                isProfit ? "text-success" : "text-destructive"
              )} />
            </div>
            <div className="text-left">
              <div className="font-semibold">{formattedDate}</div>
              <div className="text-sm text-muted-foreground">
                {bets.length} bets • <span className="text-success">{wins}W</span> - <span className="text-destructive">{losses}L</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={cn(
              'text-xl font-bold tabular-nums',
              isProfit ? "text-success" : "text-destructive"
            )}>
              {isProfit ? '+' : ''}£{dayProfit.toFixed(2)}
            </div>
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-2 pb-4">
        {bets.map((bet) => (
          <PLHistoryBetRow
            key={bet.id}
            homeTeam={bet.home_team}
            awayTeam={bet.away_team}
            league={bet.league}
            market={bet.market}
            odds={bet.bookmaker_odds}
            result={bet.result}
            status={bet.status}
            stake={bet.stake}
            profitLoss={bet.profit_loss}
            kickoff={bet.kickoff}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}


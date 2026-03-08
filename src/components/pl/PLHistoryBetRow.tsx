import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatTeamName } from '@/lib/teamNames';
import type { SettlementStatus } from '@/hooks/usePLHistory';

interface PLHistoryBetRowProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
  market: string;
  odds: number;
  result: string;
  status: SettlementStatus;
  stake: number;
  profitLoss: number;
  kickoff: string;
  className?: string;
}

const marketLabels: Record<string, string> = {
  'over_2.5_goals': 'Over 2.5',
  'btts': 'BTTS',
  'over_9.5_corners': 'Over 9.5 Corners',
  'over_3.5_cards': 'Over 3.5 Cards',
};

export function PLHistoryBetRow({
  homeTeam,
  awayTeam,
  league,
  market,
  odds,
  result,
  status,
  stake,
  profitLoss,
  kickoff,
  className,
}: PLHistoryBetRowProps) {
  const isWin = status === 'won';
  const isVoid = status === 'void';
  const home = formatTeamName(homeTeam);
  const away = formatTeamName(awayTeam);
  const time = new Date(kickoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={cn(
        'premium-3d-inset rounded-xl px-3 py-2.5',
        'grid grid-cols-1 sm:grid-cols-[48px_1fr_auto] gap-2 sm:items-center',
        className,
      )}
    >
      <div className="text-xs font-semibold text-muted-foreground tabular-nums">{time}</div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-semibold text-sm truncate text-foreground">{home} vs {away}</div>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {marketLabels[market] || market}
          </Badge>
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {league} • @ {Number.isFinite(odds) ? odds.toFixed(2) : '-'} • £{stake.toFixed(0)}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3">
        <div className="text-xs font-semibold text-muted-foreground tabular-nums">{isVoid ? 'VOID' : result}</div>
        <div
          className={cn(
            'text-sm font-black tabular-nums',
            isVoid ? 'text-muted-foreground' : isWin ? 'text-success' : 'text-destructive'
          )}
        >
          {profitLoss > 0 ? '+' : ''}£{profitLoss.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

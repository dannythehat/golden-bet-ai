import { cn } from '@/lib/utils';
import { Check, X, Minus } from 'lucide-react';
import { formatTeamName } from '@/lib/teamNames';
import { BetProofDialog } from './BetProofDialog';
import type { SettlementStatus } from '@/hooks/usePLHistory';

interface PLBetRowProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
  market: string;
  odds: number;
  result: string;
  status: SettlementStatus;
  profitLoss: number;
  proofScreenshotUrl?: string | null;
  proofCapturedAt?: string | null;
}

const marketLabels: Record<string, string> = {
  'over_2.5_goals': 'Over 2.5',
  'over_25_goals': 'Over 2.5',
  'btts': 'BTTS',
  'over_9.5_corners': 'Over 9.5 Corners',
  'over_3.5_cards': 'Over 3.5 Cards',
};

export function PLBetRow({ 
  homeTeam, 
  awayTeam, 
  league, 
  market, 
  odds, 
  result, 
  status, 
  profitLoss,
  proofScreenshotUrl,
  proofCapturedAt,
}: PLBetRowProps) {
  const isWon = status === 'won';
  const isVoid = status === 'void';
  const isLost = status === 'lost';
  
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        isWon && 'bg-success/5 border-success/30',
        isLost && 'bg-destructive/5 border-destructive/30',
        isVoid && 'bg-muted/20 border-border/50'
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:items-center">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              isWon && 'bg-success/20',
              isLost && 'bg-destructive/20',
              isVoid && 'bg-muted/40'
            )}
          >
            {isWon ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : isLost ? (
              <X className="w-3.5 h-3.5 text-destructive" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0">
            <div className="font-medium text-sm text-foreground truncate">
              {formatTeamName(homeTeam)} vs {formatTeamName(awayTeam)}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
              <span className="truncate">{league}</span>
              <span>•</span>
              <span className="font-medium truncate">{marketLabels[market] || market}</span>
              <span>•</span>
              <span className="tabular-nums">@{Number.isFinite(odds) ? odds.toFixed(2) : '-'}</span>
              {proofScreenshotUrl && (
                <>
                  <span>•</span>
                  <BetProofDialog
                    proofUrl={proofScreenshotUrl}
                    proofCapturedAt={proofCapturedAt}
                    betType="golden_bet"
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:block sm:text-right">
          <div className="text-xs text-muted-foreground tabular-nums">
            {isVoid ? 'VOID' : result}
          </div>
          <div
            className={cn(
              'font-bold text-sm tabular-nums',
              isWon && 'text-success',
              isLost && 'text-destructive',
              isVoid && 'text-muted-foreground'
            )}
          >
            {profitLoss > 0 ? '+' : ''}£{profitLoss.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

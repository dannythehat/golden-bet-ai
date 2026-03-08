import { CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatTeamName } from '@/lib/teamNames';
import React from 'react';
import { BetProofDialog } from './BetProofDialog';

interface PLResultCardProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
  market: string;
  odds: number;
  result: string;
  status: 'won' | 'lost';
  stake: number;
  profitLoss: number;
  gafferReasoning?: string;
  kickoff: string;
  proofScreenshotUrl?: string | null;
  proofCapturedAt?: string | null;
}

const marketLabels: Record<string, string> = {
  'over_2.5_goals': 'Over 2.5',
  'btts': 'BTTS',
  'over_9.5_corners': 'Over 9.5 Corners',
  'over_3.5_cards': 'Over 3.5 Cards',
};

export function PLResultCard({
  homeTeam,
  awayTeam,
  league,
  market,
  odds,
  result,
  status,
  stake,
  profitLoss,
  gafferReasoning,
  kickoff,
  proofScreenshotUrl,
  proofCapturedAt,
}: PLResultCardProps) {
  const isWin = status === 'won';
  const formattedDate = new Date(kickoff).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  });

  const home = formatTeamName(homeTeam);
  const away = formatTeamName(awayTeam);

  return (
    <div className={cn(
      'rounded-xl p-4 premium-3d transition-colors'
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: Match info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 premium-3d-inset'
            )}>
              {isWin ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
            </div>
            <span className="font-bold text-lg truncate text-foreground">
              {home} vs {away}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2 ml-10">
            <span>{formattedDate}</span>
            <span>•</span>
            <span className="truncate">{league}</span>
            <Badge variant="secondary" className="text-xs">
              {marketLabels[market] || market}
            </Badge>
          </div>

          {/* Gaffer reasoning */}
          {gafferReasoning && (
            <p className="text-sm text-muted-foreground italic line-clamp-2 mt-2 ml-10">
              "{gafferReasoning}"
            </p>
          )}

          {/* Proof button */}
          {proofScreenshotUrl && (
            <div className="ml-10 mt-2">
              <BetProofDialog
                proofUrl={proofScreenshotUrl}
                proofCapturedAt={proofCapturedAt}
                betType="golden_bet"
                homeTeam={home}
                awayTeam={away}
              />
            </div>
          )}
        </div>

        {/* Right: Result & P/L - Boxed */}
        <div className="shrink-0 flex flex-col gap-2">
          {/* Score Box */}
          <div className="px-4 py-2 rounded-xl text-center min-w-[80px] premium-3d">
            <div className={cn('text-2xl font-black tabular-nums', isWin ? 'text-success' : 'text-destructive')}>
              {result}
            </div>
            <div className="text-xs text-muted-foreground">
              @ {odds.toFixed(2)}
            </div>
          </div>

          {/* Profit/Loss Box */}
          <div className="px-4 py-2 rounded-xl text-center premium-3d">
            <div className={cn(
              'text-lg font-black tabular-nums',
              isWin ? "text-success" : "text-destructive"
            )}>
              {isWin ? '+' : ''}£{profitLoss.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">
              £{stake.toFixed(0)} stake
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

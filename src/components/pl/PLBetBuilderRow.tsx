import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, ChevronDown, Minus } from 'lucide-react';
import { formatTeamName } from '@/lib/teamNames';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BetProofDialog } from './BetProofDialog';
import type { SettlementStatus } from '@/hooks/usePLHistory';

interface PLBetBuilderRowProps {
  homeTeam: string;
  awayTeam: string;
  league: string;
  markets: string[];
  odds: number;
  result: string;
  status: SettlementStatus;
  profitLoss: number;
  actualGoalsHome?: number;
  actualGoalsAway?: number;
  actualCorners?: number | null;
  actualCards?: number | null;
  bttsResult?: boolean | null;
  defaultOpen?: boolean;
  proofScreenshotUrl?: string | null;
  proofCapturedAt?: string | null;
}

const marketLabels: Record<string, string> = {
  'over_25_goals': 'Over 2.5 Goals',
  'over_2_5_goals': 'Over 2.5 Goals',
  'btts': 'BTTS',
  'over_85_corners': 'Over 8.5 Corners',
  'over_8_5_corners': 'Over 8.5 Corners',
  'over_95_corners': 'Over 9.5 Corners',
  'over_9_5_corners': 'Over 9.5 Corners',
  'over_35_cards': 'Over 3.5 Cards',
  'over_3_5_cards': 'Over 3.5 Cards',
  'over_25_cards': 'Over 2.5 Cards',
  'over_2_5_cards': 'Over 2.5 Cards',
};

function getMarketResult(
  market: string, 
  result: string,
  actualCorners?: number | null,
  actualCards?: number | null,
  bttsResult?: boolean | null,
  overallStatus?: SettlementStatus
): 'won' | 'lost' | 'void' {
  // Parse result for goals
  const [homeGoals, awayGoals] = result?.split('-').map(Number) || [0, 0];
  const totalGoals = (homeGoals || 0) + (awayGoals || 0);
  const m = market.toLowerCase();
  
  // Goals markets - always computable from result
  if (m.includes('goal') && m.includes('25')) {
    return totalGoals > 2.5 ? 'won' : 'lost';
  }
  if (m.includes('goal') && m.includes('15')) {
    return totalGoals > 1.5 ? 'won' : 'lost';
  }
  if (m.includes('goal') && m.includes('35')) {
    return totalGoals > 3.5 ? 'won' : 'lost';
  }
  
  // BTTS - computable from result or explicit bttsResult
  if (m === 'btts' || m.includes('btts')) {
    const hit = (bttsResult !== null && bttsResult !== undefined)
      ? bttsResult
      : (homeGoals || 0) > 0 && (awayGoals || 0) > 0;
    return hit ? 'won' : 'lost';
  }
  
  // Corners - need actual data, fallback to overall status
  if (m.includes('corner')) {
    if (actualCorners !== null && actualCorners !== undefined) {
      if (m.includes('85') || m.includes('8_5')) return actualCorners > 8.5 ? 'won' : 'lost';
      if (m.includes('95') || m.includes('9_5')) return actualCorners > 9.5 ? 'won' : 'lost';
      if (m.includes('105') || m.includes('10_5')) return actualCorners > 10.5 ? 'won' : 'lost';
    }
    // Fallback to overall status if corners data missing
    if (overallStatus === 'void') return 'void';
    return overallStatus === 'won' ? 'won' : 'lost';
  }
  
  // Cards - need actual data, fallback to overall status
  if (m.includes('card')) {
    if (actualCards !== null && actualCards !== undefined) {
      if (m.includes('25') || m.includes('2_5')) return actualCards > 2.5 ? 'won' : 'lost';
      if (m.includes('35') || m.includes('3_5')) return actualCards > 3.5 ? 'won' : 'lost';
      if (m.includes('45') || m.includes('4_5')) return actualCards > 4.5 ? 'won' : 'lost';
    }
    // Fallback to overall status if cards data missing
    if (overallStatus === 'void') return 'void';
    return overallStatus === 'won' ? 'won' : 'lost';
  }
  
  // Unknown market - use overall status
  if (overallStatus === 'void') return 'void';
  return overallStatus === 'won' ? 'won' : 'lost';
}

export function PLBetBuilderRow({ 
  homeTeam,
  awayTeam,
  league,
  markets,
  odds,
  result,
  status,
  profitLoss,
  actualCorners,
  actualCards,
  bttsResult,
  defaultOpen = true,
  proofScreenshotUrl,
  proofCapturedAt,
}: PLBetBuilderRowProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isWon = status === 'won';
  const isVoid = status === 'void';
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-lg border overflow-hidden",
        isWon && "bg-success/5 border-success/30",
        status === 'lost' && "bg-destructive/5 border-destructive/30",
        isVoid && "bg-muted/20 border-border/50"
      )}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                isWon && "bg-success/20",
                status === 'lost' && "bg-destructive/20",
                isVoid && "bg-muted/40"
              )}>
                {isWon ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : status === 'lost' ? (
                  <X className="w-3.5 h-3.5 text-destructive" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">
                  {formatTeamName(homeTeam)} vs {formatTeamName(awayTeam)}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span>{league}</span>
                  <span>•</span>
                  <span>{markets.length} legs</span>
                  <span>•</span>
                  <span>@{odds.toFixed(2)}</span>
                  {proofScreenshotUrl && (
                    <>
                      <span>•</span>
                      <BetProofDialog
                        proofUrl={proofScreenshotUrl}
                        proofCapturedAt={proofCapturedAt}
                        betType="bet_builder"
                        homeTeam={homeTeam}
                        awayTeam={awayTeam}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">{isVoid ? 'VOID' : result}</div>
                <div
                  className={cn(
                    'font-bold text-sm tabular-nums',
                    isWon && 'text-success',
                    status === 'lost' && 'text-destructive',
                    isVoid && 'text-muted-foreground'
                  )}
                >
                  {profitLoss > 0 ? '+' : ''}£{profitLoss.toFixed(2)}
                </div>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Individual Legs:</p>
            <div className="space-y-2">
            {markets.map((market, idx) => {
                const marketOutcome = isVoid
                  ? 'void'
                  : getMarketResult(market, result, actualCorners, actualCards, bttsResult, status);
                const label = marketLabels[market] || market.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                
                return (
                  <div 
                    key={idx}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm",
                      marketOutcome === 'won' && "bg-success/10 border border-success/30",
                      marketOutcome === 'lost' && "bg-destructive/10 border border-destructive/30",
                      marketOutcome === 'void' && "bg-muted/20 border border-border/50"
                    )}
                  >
                    <span className="font-medium">{label}</span>
                    <div className="flex items-center gap-2">
                      {marketOutcome === 'won' ? (
                        <span className="text-xs text-success font-bold">✓ WON</span>
                      ) : marketOutcome === 'lost' ? (
                        <span className="text-xs text-destructive font-bold">✗ LOST</span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-bold">– VOID</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

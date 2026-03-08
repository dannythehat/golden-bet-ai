import { cn } from '@/lib/utils';
import { Check, X, ChevronDown, ChevronUp, Camera, Minus } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { formatTeamName } from '@/lib/teamNames';
import { BetProofDialog } from './BetProofDialog';
import { getMarketLabel } from '@/lib/marketDisplay';
import type { SettlementStatus } from '@/hooks/usePLHistory';

interface AccaSelection {
  teamName: string;
  opposition?: string;
  market: string;
  marketLabel?: string;
  successPercent?: number;
  odds?: number;
  isHome?: boolean;
  league?: string;
}

interface AccaResult {
  teamName: string;
  opposition?: string;
  league?: string;
  market: string;
  marketLabel?: string;
  isHome?: boolean;
  hit: boolean;
  void?: boolean;
  score?: string;
  odds?: number;
  fixtureId?: string;
}

interface PLAccaRowProps {
  selections: AccaSelection[];
  results: AccaResult[];
  combinedOdds: number;
  legsWon: number;
  legsLost: number;
  status: SettlementStatus;
  profitLoss: number;
  proofScreenshotUrl?: string | null;
  proofCapturedAt?: string | null;
}

export function PLAccaRow({ 
  selections, 
  results, 
  combinedOdds, 
  legsWon, 
  legsLost, 
  status, 
  profitLoss,
  proofScreenshotUrl,
  proofCapturedAt,
}: PLAccaRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProofOpen, setIsProofOpen] = useState(false);
  const isWon = status === 'won';
  const isVoid = status === 'void';
  const isLost = status === 'lost';
  const voidLegs = results?.filter((r) => (r as any)?.void).length || 0;
  
  return (
    <div className={cn(
      "rounded-xl border-2 overflow-hidden",
      isWon && "bg-card border-success/40",
      isLost && "bg-card border-destructive/40",
      isVoid && "bg-card border-border/60"
    )}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-4 h-auto rounded-none hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                isWon && "bg-success/20",
                isLost && "bg-destructive/20",
                isVoid && "bg-muted/40"
              )}>
                {isWon ? (
                  <Check className="w-4 h-4 text-success" />
                ) : isLost ? (
                  <X className="w-4 h-4 text-destructive" />
                ) : (
                  <Minus className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm text-foreground">
                  {selections.length}-Fold ACCA
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                  <span className="text-success font-medium">{legsWon} won</span>
                  <span>•</span>
                  <span className="text-destructive font-medium">{legsLost} lost</span>
                  {voidLegs > 0 && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-muted-foreground">{voidLegs} void</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="font-medium text-foreground">@{combinedOdds.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={cn(
                "font-bold text-base tabular-nums px-2 py-0.5 rounded-md",
                isWon && "text-success bg-success/10",
                isLost && "text-destructive bg-destructive/10",
                isVoid && "text-muted-foreground bg-muted/20"
              )}>
                {profitLoss > 0 ? '+' : ''}£{profitLoss.toFixed(2)}
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="border-t border-border/50 bg-muted/10">
            {/* Selections */}
            <div className="p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Selections
              </p>
              {results.map((result, idx) => {
                const selection = selections[idx];
                const legOdds = result.odds || selection?.odds;
                const isVoidLeg = (result as any)?.void === true;
                
                // CRITICAL: Prefer data from result (persisted at settlement time) over selection
                // This ensures that we always show the correct teams that were actually bet on
                const teamName = formatTeamName(result.teamName || selection?.teamName || '');
                const opposition = formatTeamName(result.opposition || selection?.opposition || '');
                const isHome = result.isHome ?? selection?.isHome ?? true;
                const matchDisplay = opposition 
                  ? (isHome ? `${teamName} vs ${opposition}` : `${opposition} vs ${teamName}`)
                  : teamName;
                
                const displayMarketLabel = result.marketLabel || selection?.marketLabel || getMarketLabel(result.market || selection?.market);
                const leagueInfo = result.league || selection?.league;
                
                return (
                  <div 
                    key={idx}
                    className={cn(
                      "flex flex-col px-3 py-2 rounded-lg text-sm gap-1",
                      isVoidLeg
                        ? "bg-muted/20 border border-border/50"
                        : result.hit
                          ? "bg-success/10 border border-success/20"
                          : "bg-destructive/10 border border-destructive/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {isVoidLeg ? (
                          <Minus className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : result.hit ? (
                          <Check className="w-4 h-4 text-success shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-destructive shrink-0" />
                        )}
                        <span className="font-medium text-foreground truncate">
                          {matchDisplay}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted-foreground text-xs bg-muted/30 px-2 py-0.5 rounded">
                          {displayMarketLabel}
                        </span>
                        {legOdds && (
                          <span className="font-semibold text-foreground text-xs">@{legOdds.toFixed(2)}</span>
                        )}
                        {isVoidLeg && (
                          <span className="text-xs font-bold text-muted-foreground">VOID</span>
                        )}
                      </div>
                    </div>
                    {leagueInfo && (
                      <div className="text-xs text-muted-foreground ml-6 truncate">
                        {leagueInfo}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Proof Section - Nested Collapsible */}
            {proofScreenshotUrl && (
              <div className="border-t border-border/50">
                <Collapsible open={isProofOpen} onOpenChange={setIsProofOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between px-3 py-2 h-auto rounded-none hover:bg-muted/20"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Camera className="w-4 h-4" />
                        <span className="text-xs font-medium">Bet Proof</span>
                        {proofCapturedAt && (
                          <span className="text-xs opacity-70">
                            • Captured {new Date(proofCapturedAt).toLocaleTimeString('en-GB', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        )}
                      </div>
                      {isProofOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="p-3 pt-0">
                      <div className="rounded-lg overflow-hidden border border-border/50 bg-muted/20">
                        <img 
                          src={proofScreenshotUrl} 
                          alt="Bet proof screenshot" 
                          className="w-full h-auto"
                          loading="lazy"
                        />
                      </div>
                      <div className="mt-2 flex justify-end">
                        <BetProofDialog
                          proofUrl={proofScreenshotUrl}
                          proofCapturedAt={proofCapturedAt}
                          betType="acca"
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

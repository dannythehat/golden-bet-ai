/**
 * P&L Stats Header - Clean Premium Design
 * High-contrast, readable, professional betting tracker
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Star, Layers, Zap, Trophy, ChevronUp, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLStats } from '@/hooks/usePLHistory';
import theGafferImage from '@/assets/the-gaffer.webp';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface BetTypeStats {
  wins: number;
  losses: number;
  profit: number;
  roi: number;
  staked: number;
}

interface PLStatsHeaderProps {
  stats: {
    weekly: PLStats;
    monthly: PLStats;
    yearly: PLStats;
    allTime: PLStats;
  };
  trebleStats: {
    weekly: BetTypeStats;
    monthly: BetTypeStats;
    yearly: BetTypeStats;
    allTime: BetTypeStats;
  };
  betBuilderStats?: {
    weekly: BetTypeStats;
    monthly: BetTypeStats;
    yearly: BetTypeStats;
    allTime: BetTypeStats;
  };
  accaStats?: {
    weekly: BetTypeStats;
    monthly: BetTypeStats;
    yearly: BetTypeStats;
    allTime: BetTypeStats;
  };
  isLoading?: boolean;
}

type Period = 'weekly' | 'monthly' | 'yearly' | 'allTime';

const periodLabels: Record<Period, string> = {
  weekly: 'Week',
  monthly: 'Month',
  yearly: 'Year',
  allTime: 'All Time',
};

export function PLStatsHeader({ stats, trebleStats, betBuilderStats, accaStats, isLoading }: PLStatsHeaderProps) {
  const [period, setPeriod] = useState<Period>('monthly');
  const navigate = useNavigate();
  
  const currentStats = stats[period];
  const currentTreble = trebleStats[period];
  const currentBetBuilder = betBuilderStats?.[period];
  const currentAcca = accaStats?.[period];
  
  const totalProfit = (currentStats.netProfit || 0) + 
    (currentTreble?.profit || 0) +
    (currentBetBuilder?.profit || 0) + 
    (currentAcca?.profit || 0);
  const totalStaked = (currentStats.totalStaked || 0) + 
    (currentTreble?.staked || 0) +
    (currentBetBuilder?.staked || 0) + 
    (currentAcca?.staked || 0);
  const overallROI = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;
  const isOverallProfit = totalProfit >= 0;

  if (isLoading) {
    return (
      <div className="mb-8 rounded-2xl bg-card border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-2/3 mx-auto" />
          <div className="h-16 bg-muted rounded w-1/2 mx-auto" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Main Card */}
      <div className="rounded-2xl bg-card border border-primary/20 overflow-hidden">
        {/* Accent bar at top */}
        <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        
        <div className="p-5 md:p-8">
          {/* Header with Gaffer */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 mb-3">
              <img 
                src={theGafferImage} 
                alt="The Gaffer" 
                className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-primary/50 object-cover"
              />
              <div className="text-left">
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  The Gaffer's <span className="text-primary">Track Record</span>
                </h2>
                <p className="text-xs text-muted-foreground">Verified betting performance</p>
              </div>
            </div>
            
            {/* Main Profit Display - Bold & Bright */}
            <div className={cn(
              "inline-flex items-center gap-4 px-8 py-5 rounded-2xl mt-3 ring-1 ring-white/10",
              // Use crisp depth shadows (no glow blur)
              isOverallProfit
                ? "bg-gradient-to-b from-success/30 to-success/10 border-2 border-success/80 shadow-[0_14px_28px_-20px_rgba(0,0,0,0.95)]"
                : "bg-gradient-to-b from-destructive/30 to-destructive/10 border-2 border-destructive/80 shadow-[0_14px_28px_-20px_rgba(0,0,0,0.95)]"
            )}>
              <div className={cn(
                "p-3 rounded-xl",
                isOverallProfit ? "bg-success text-white" : "bg-destructive text-white"
              )}>
                {isOverallProfit ? (
                  <TrendingUp className="w-6 h-6" />
                ) : (
                  <TrendingDown className="w-6 h-6" />
                )}
              </div>
              <div className="text-left">
                <p className={cn(
                  "text-3xl md:text-4xl font-black",
                  isOverallProfit ? "text-success" : "text-destructive"
                )}>
                  {isOverallProfit ? '+' : ''}£{totalProfit.toFixed(2)}
                </p>
                <p className={cn(
                  "text-sm font-bold",
                  isOverallProfit ? "text-success" : "text-destructive"
                )}>
                  {isOverallProfit ? '+' : ''}{overallROI.toFixed(1)}% ROI • {periodLabels[period]}
                </p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="monthly" value={period} onValueChange={(v) => setPeriod(v as Period)} className="mb-6">
            <TabsList className="grid w-full grid-cols-4 max-w-md mx-auto bg-muted/50 p-1 rounded-lg">
              {(['weekly', 'monthly', 'yearly', 'allTime'] as const).map((p) => (
                <TabsTrigger 
                  key={p} 
                  value={p} 
                  className="text-xs font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {periodLabels[p]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Link to P&L Hub */}
          <div className="flex justify-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/#pnl')}
              className="text-primary hover:text-primary/80 gap-2"
            >
              View Full P&L History <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Strategy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <StrategyCard
              name="Golden Bets"
              description="3 daily picks @ £10 each"
              icon={Star}
              accentColor="gold"
              wins={currentStats.wins}
              losses={currentStats.losses}
              profit={currentStats.netProfit}
              staked={currentStats.totalStaked}
              onClick={() => navigate('/#pnl')}
            />
            <StrategyCard
              name="Bet Builder"
              description="Multi-leg single game @ £10"
              icon={Layers}
              accentColor="primary"
              wins={currentBetBuilder?.wins || 0}
              losses={currentBetBuilder?.losses || 0}
              profit={currentBetBuilder?.profit || 0}
              staked={currentBetBuilder?.staked || 0}
              onClick={() => navigate('/#pnl')}
            />
            <StrategyCard
              name="Accas Delight"
              description="Form table accumulator @ £10"
              icon={Zap}
              accentColor="emerald"
              wins={currentAcca?.wins || 0}
              losses={currentAcca?.losses || 0}
              profit={currentAcca?.profit || 0}
              staked={currentAcca?.staked || 0}
              onClick={() => navigate('/#pnl')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StrategyCardProps {
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: 'gold' | 'primary' | 'emerald';
  wins: number;
  losses: number;
  profit: number;
  staked: number;
  onClick?: () => void;
}

function StrategyCard({ name, description, icon: Icon, accentColor, wins, losses, profit, staked, onClick }: StrategyCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isProfit = profit >= 0;
  const hasData = wins > 0 || losses > 0;

  const accentStyles = {
    gold: {
      icon: 'bg-gold/20 text-gold',
      border: 'border-gold/20',
      bar: 'bg-gold',
    },
    primary: {
      icon: 'bg-primary/20 text-primary',
      border: 'border-primary/20',
      bar: 'bg-primary',
    },
    emerald: {
      icon: 'bg-success/20 text-success',
      border: 'border-success/20',
      bar: 'bg-success',
    },
  };

  const styles = accentStyles[accentColor];

  return (
    <div 
      className={cn(
      "rounded-xl bg-muted/30 border overflow-hidden cursor-pointer hover:border-primary/50 transition-colors",
      styles.border
      )}
    >
      {/* Accent bar */}
      <div className={cn("h-0.5", styles.bar)} />
      
      <div className="p-4">
        {/* Header - clicking this navigates */}
        <div className="flex items-center gap-3 mb-3" onClick={onClick}>
          <div className={cn("p-2 rounded-lg", styles.icon)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground">{name}</h3>
            <p className="text-[11px] text-muted-foreground truncate">{description}</p>
          </div>
        </div>

        {!hasData ? (
          <div className="text-center py-4" onClick={onClick}>
            <Trophy className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No results yet</p>
          </div>
        ) : (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            {/* Profit Display - clicking navigates */}
            <div className={cn(
              "text-center py-4 px-4 rounded-xl mb-3 ring-1 ring-white/10",
              isProfit
                ? "bg-gradient-to-b from-success/30 to-success/10 border-2 border-success/80 shadow-[0_14px_28px_-20px_rgba(0,0,0,0.95)]"
                : "bg-gradient-to-b from-destructive/30 to-destructive/10 border-2 border-destructive/80 shadow-[0_14px_28px_-20px_rgba(0,0,0,0.95)]"
            )} onClick={onClick}>
              <div className="flex items-center justify-center gap-2 mb-1">
                {isProfit ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <span className="text-xs text-foreground/70 uppercase tracking-wide font-medium">Profit / Loss</span>
              </div>
              <p className={cn(
                "text-3xl font-black",
                isProfit ? "text-success" : "text-destructive"
              )}>
                {isProfit ? '+' : ''}£{profit.toFixed(2)}
              </p>
            </div>

            {/* Expandable Details - does NOT navigate */}
            <CollapsibleTrigger asChild>
              <button 
                className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <span>Details ({wins + losses} bets)</span>
                <ChevronUp className={cn(
                  "w-3.5 h-3.5 transition-transform",
                  isOpen ? "rotate-0" : "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="text-center p-3 rounded-xl ring-1 ring-white/10 bg-gradient-to-b from-success/25 to-success/10 border-2 border-success/80 shadow-[0_10px_18px_-14px_rgba(0,0,0,0.9)]">
                  <p className="text-xl font-black text-success">{wins}</p>
                  <p className="text-[10px] uppercase text-foreground/60 font-semibold">Won</p>
                </div>
                <div className="text-center p-3 rounded-xl ring-1 ring-white/10 bg-gradient-to-b from-destructive/25 to-destructive/10 border-2 border-destructive/80 shadow-[0_10px_18px_-14px_rgba(0,0,0,0.9)]">
                  <p className="text-xl font-black text-destructive">{losses}</p>
                  <p className="text-[10px] uppercase text-foreground/60 font-semibold">Lost</p>
                </div>
                <div className="text-center p-3 rounded-xl ring-1 ring-white/10 bg-gradient-to-b from-muted/70 to-muted/30 border-2 border-border shadow-[0_10px_18px_-14px_rgba(0,0,0,0.9)]">
                  <p className="text-xl font-black text-foreground">£{staked.toFixed(0)}</p>
                  <p className="text-[10px] uppercase text-foreground/60 font-semibold">Staked</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

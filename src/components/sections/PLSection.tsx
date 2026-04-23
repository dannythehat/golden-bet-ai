import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePLHistory, type DailyGroup, type SettlementStatus, marketCategory } from '@/hooks/usePLHistory';
import { useBetBuilderPL } from '@/hooks/useBetBuilderPL';
import { useAccaPL } from '@/hooks/useAccaPL';
import { PLDateCollapsible } from '@/components/pl/PLDateCollapsible';
import { PLHistoryTable } from '@/components/pl/PLHistoryTable';
import { PLAccaHistoryTable } from '@/components/pl/PLAccaHistoryTable';
import { MonthlyProfitBanner } from '@/components/pl/MonthlyProfitBanner';
import {
  Loader2, Trophy, RefreshCw, AlertCircle,
  Calendar, TrendingUp, TrendingDown, History, ChartLine, Layers,
  Target, Flag, CreditCard, Zap, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import theGafferImage from '@/assets/the-gaffer.webp';
import { COMBO_BET_STAKE, MARKET_DAILY_STAKE, SINGLE_BET_STAKE } from '@/lib/plModel';

type TimePeriod = 'yesterday' | 'weekly' | 'monthly' | 'yearly' | 'allTime';

const periodLabels: Record<TimePeriod, string> = {
  yesterday: 'Yesterday',
  weekly: 'This Week',
  monthly: 'This Month',
  yearly: 'This Year',
  allTime: 'All Time',
};

const MARKET_META = {
  goals: { label: 'Over 2.5 Goals', icon: <Target className="w-4 h-4" />, colorClass: 'bg-bet-goals text-foreground', borderClass: 'border-bet-goals/40' },
  corners: { label: 'Over 8.5 Corners', icon: <Flag className="w-4 h-4" />, colorClass: 'bg-bet-corners text-foreground', borderClass: 'border-bet-corners/40' },
  cards: { label: 'Over 3.5 Cards', icon: <CreditCard className="w-4 h-4" />, colorClass: 'bg-bet-cards text-foreground', borderClass: 'border-bet-cards/40' },
} as const;

function evalCombo(legs: { status: SettlementStatus; bookmaker_odds: number }[], stake = COMBO_BET_STAKE) {
  const nonVoid = legs.filter(b => b.status !== 'void');
  if (nonVoid.length === 0) return { outcome: 'void' as const, combinedOdds: 1, profit: 0 };
  if (nonVoid.some(b => b.status === 'lost')) {
    const odds = nonVoid.reduce((a, b) => a * b.bookmaker_odds, 1);
    return { outcome: 'lost' as const, combinedOdds: odds, profit: -stake };
  }
  const combinedOdds = nonVoid.reduce((a, b) => a * b.bookmaker_odds, 1);
  return { outcome: 'won' as const, combinedOdds, profit: stake * combinedOdds - stake };
}

/** Build doubles + treble combos for a market's 3 picks on a given day */
function buildMarketCombos(picks: { id: string; home_team: string; away_team: string; status: SettlementStatus; bookmaker_odds: number; market: string }[]) {
  const valid = picks.slice(0, 3);
  const combos: Array<{ label: string; legs: typeof valid; result: ReturnType<typeof evalCombo> }> = [];

  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      combos.push({
        label: `Double: ${valid[i].home_team} vs ${valid[i].away_team} + ${valid[j].home_team} vs ${valid[j].away_team}`,
        legs: [valid[i], valid[j]],
        result: evalCombo([valid[i], valid[j]]),
      });
    }
  }
  if (valid.length >= 3) {
    combos.push({
      label: 'Treble (all 3)',
      legs: valid,
      result: evalCombo(valid),
    });
  }
  return combos;
}

export function PLSection() {
  const [period, setPeriod] = useState<TimePeriod>('monthly');
  const {
    settledBets, byDate, stats, marketStats, lastMonthStats,
    isLoading, isError, refetch,
  } = usePLHistory();

  const { bets: bbBets, stats: bbStats, isLoading: bbLoading } = useBetBuilderPL();
  const { bets: accaBets, stats: accaStats, isLoading: accaLoading } = useAccaPL();

  const currentStats = stats[period];
  const currentBB = bbStats[period];
  const currentAcca = accaStats[period];

  // Combined P&L across all 5 bet types
  const totalProfit = currentStats.netProfit + currentBB.netProfit + currentAcca.netProfit;
  const totalStaked = currentStats.totalStaked + currentBB.totalStaked + currentAcca.totalStaked;
  const overallROI = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

  const hasData = settledBets.length > 0 || bbBets.length > 0 || accaBets.length > 0;
  const allLoading = isLoading || bbLoading || accaLoading;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  const dow = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (dow === 0 ? 6 : dow - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const filterDates: Record<TimePeriod, Date> = {
    yesterday,
    weekly: startOfWeek,
    monthly: startOfMonth,
    yearly: startOfYear,
    allTime: new Date(0),
  };

  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const filterDays = (p: TimePeriod, days: DailyGroup[]) => {
    if (p === 'yesterday') return days.filter(d => d.date === yesterdayStr);
    return days.filter(d => new Date(d.date + 'T00:00:00') >= filterDates[p]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-xl shadow-primary/10 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={theGafferImage} alt="The Gaffer" className="w-14 h-14 rounded-full object-cover border-2 border-primary/50 shadow-lg" />
              <div>
                <CardTitle className="text-2xl md:text-3xl">
                  <span className="text-primary">P&L Hub</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">Fixed model: £{COMBO_BET_STAKE.toFixed(2)} per double/treble, £{MARKET_DAILY_STAKE.toFixed(0)} per daily market, £{SINGLE_BET_STAKE.toFixed(0)} Bet Builder, £{SINGLE_BET_STAKE.toFixed(0)} ACCA.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={allLoading}
              className="border-primary/30 text-primary hover:bg-primary/10 self-start md:self-center">
              {allLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {hasData && (
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-4 px-8 py-5 rounded-2xl premium-3d">
                <div className="p-3 rounded-xl premium-3d-inset">
                  {totalProfit >= 0
                    ? <TrendingUp className="w-6 h-6 text-success" />
                    : <TrendingDown className="w-6 h-6 text-destructive" />}
                </div>
                <div className="text-left">
                  <p className={cn('text-3xl md:text-4xl font-black tabular-nums',
                    totalProfit >= 0 ? 'text-success' : 'text-destructive')}>
                    {totalProfit >= 0 ? '+' : ''}£{totalProfit.toFixed(2)}
                  </p>
                  <p className={cn('text-sm font-bold tabular-nums',
                    totalProfit >= 0 ? 'text-success' : 'text-destructive')}>
                    {totalProfit >= 0 ? '+' : ''}{overallROI.toFixed(1)}% ROI • £{totalStaked.toFixed(2)} staked • {periodLabels[period]}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Month Banner */}
      {lastMonthStats.totalBets > 0 && (
        <MonthlyProfitBanner
          monthName={lastMonthStats.monthName}
          totalProfit={lastMonthStats.totalProfit}
          totalBets={lastMonthStats.totalBets}
          wins={lastMonthStats.wins}
          losses={lastMonthStats.losses}
          roi={lastMonthStats.roi}
        />
      )}

      {/* Period Tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
        <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1 rounded-xl">
          {(Object.keys(periodLabels) as TimePeriod[]).map((p) => (
            <TabsTrigger key={p} value={p}
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">
              <span className="hidden sm:inline">{periodLabels[p]}</span>
              <span className="sm:hidden">
                {p === 'yesterday' ? 'Yest' : p === 'weekly' ? 'Week' : p === 'monthly' ? 'Month' : p === 'yearly' ? 'Year' : 'All'}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {allLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {isError && !allLoading && (
          <Card className="mt-6 border-destructive/30">
            <CardContent className="py-8 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <p className="text-muted-foreground">Unable to load P&L data. Try again later.</p>
            </CardContent>
          </Card>
        )}

        {!allLoading && !isError && !hasData && (
          <Card className="mt-6 border-primary/20 bg-gradient-to-br from-primary/5 to-card">
            <CardContent className="py-12 text-center">
              <Trophy className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Building Track Record</h3>
              <p className="text-muted-foreground">Bets are generated daily and settled after matches finish.</p>
            </CardContent>
          </Card>
        )}

        {!allLoading && !isError && hasData && (
          <>
            {(Object.keys(periodLabels) as TimePeriod[]).map((p) => {
              const filteredDays = filterDays(p, byDate);
              const ms = marketStats[p];
              const bb = bbStats[p];
              const ac = accaStats[p];
              const combinedProfit = ms.goals.netProfit + ms.corners.netProfit + ms.cards.netProfit + bb.netProfit + ac.netProfit;
              const combinedStaked = ms.goals.totalStaked + ms.corners.totalStaked + ms.cards.totalStaked + bb.totalStaked + ac.totalStaked;

              return (
                <TabsContent key={p} value={p} className="space-y-6 mt-6">
                  {/* Summary cards for each bet type */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {([
                      { label: 'Goals', s: ms.goals, icon: <Target className="w-4 h-4" />, colorClass: 'bg-bet-goals text-foreground' },
                      { label: 'Corners', s: ms.corners, icon: <Flag className="w-4 h-4" />, colorClass: 'bg-bet-corners text-foreground' },
                      { label: 'Cards', s: ms.cards, icon: <CreditCard className="w-4 h-4" />, colorClass: 'bg-bet-cards text-foreground' },
                      { label: 'Bet Builder', s: bb, icon: <Layers className="w-4 h-4" />, colorClass: 'bg-bet-builder text-foreground' },
                      { label: 'Accas', s: ac, icon: <Sparkles className="w-4 h-4" />, colorClass: 'bg-bet-acca text-foreground' },
                    ] as const).map(item => (
                      <div key={item.label} className="rounded-xl border border-border/50 bg-card/80 p-3 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', item.colorClass)}>
                            {item.icon}
                          </div>
                          <span className="text-xs font-semibold text-foreground">{item.label}</span>
                        </div>
                        <div className={cn('text-lg font-black tabular-nums',
                          item.s.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                          {item.s.netProfit >= 0 ? '+' : ''}£{item.s.netProfit.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="text-success font-semibold">{item.s.wins}W</span>
                          <span className="mx-0.5">·</span>
                          <span className="text-destructive font-semibold">{item.s.losses}L</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">£{item.s.totalStaked.toFixed(2)} staked</div>
                      </div>
                    ))}
                  </div>

                  {/* Per-market day-by-day detail for Golden Bets */}
                  {(['goals', 'corners', 'cards'] as const).map(cat => {
                    const meta = MARKET_META[cat];
                    const catStats = ms[cat];

                    return (
                      <Card key={cat} className={cn("border-2 overflow-hidden", meta.borderClass, "bg-gradient-to-br from-card to-card")}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", meta.colorClass)}>
                                {meta.icon}
                              </div>
                              <div>
                                <CardTitle className="text-base">{meta.label}</CardTitle>
                                 <p className="text-xs text-muted-foreground">3 picks · 3 doubles + 1 treble · £{COMBO_BET_STAKE.toFixed(2)} each · £{MARKET_DAILY_STAKE.toFixed(0)} total</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">
                                <span className="text-success font-bold">{catStats.wins}W</span>
                                <span className="mx-1">-</span>
                                <span className="text-destructive font-bold">{catStats.losses}L</span>
                              </div>
                              <div className={cn('text-lg font-black tabular-nums', catStats.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                                {catStats.netProfit >= 0 ? '+' : ''}£{catStats.netProfit.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {filteredDays.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No settled bets in this period</p>
                          ) : (
                            filteredDays.map(day => {
                              // Get this market's picks for the day
                              const marketPicks = day.bets.filter(b => marketCategory(b.market) === cat);
                              if (marketPicks.length === 0) return null;

                              const combos = buildMarketCombos(marketPicks);
                              const dayProfit = combos.reduce((sum, c) => sum + c.result.profit, 0);
                              const dayWins = combos.filter(c => c.result.outcome === 'won').length;
                              const dayLosses = combos.filter(c => c.result.outcome === 'lost').length;

                              return (
                                <PLDateCollapsible
                                  key={day.date}
                                  date={day.date}
                                  wins={dayWins}
                                  losses={dayLosses}
                                  voids={0}
                                  profit={dayProfit}
                                  count={combos.length}
                                  defaultOpen={false}
                                >
                                  <div className="space-y-2">
                                    {/* Show the 3 individual picks */}
                                    <div className="space-y-1 mb-3">
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Selections</p>
                                      {marketPicks.slice(0, 3).map(bet => (
                                        <div key={bet.id} className={cn(
                                          "flex items-center justify-between text-sm px-3 py-1.5 rounded-lg border",
                                          bet.status === 'won' ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'
                                        )}>
                                          <span className={cn(bet.status === 'won' ? 'text-success' : 'text-destructive')}>
                                            {bet.status === 'won' ? '✓' : '✗'} {bet.home_team} vs {bet.away_team}
                                          </span>
                                          <span className="text-muted-foreground">@{bet.bookmaker_odds.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Show combo results */}
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Combo Bets (£{COMBO_BET_STAKE.toFixed(2)} each)</p>
                                    {combos.map((combo, i) => (
                                      <div key={i} className={cn(
                                        'p-3 rounded-lg border text-sm',
                                        combo.result.outcome === 'won' && 'bg-success/5 border-success/30',
                                        combo.result.outcome === 'lost' && 'bg-destructive/5 border-destructive/30',
                                        combo.result.outcome === 'void' && 'bg-muted/20 border-border/50',
                                      )}>
                                        <div className="flex justify-between items-center">
                                          <span className="font-medium">
                                            {combo.legs.length === 3 ? '🏆 Treble' : `Double ${i + 1}`}
                                            <span className="text-muted-foreground ml-1">@ {combo.result.combinedOdds.toFixed(2)}</span>
                                          </span>
                                          <span className={cn('font-bold',
                                            combo.result.outcome === 'won' && 'text-success',
                                            combo.result.outcome === 'lost' && 'text-destructive',
                                          )}>
                                            {combo.result.profit >= 0 ? '+' : ''}£{combo.result.profit.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </PLDateCollapsible>
                              );
                            })
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* ====== BET BUILDER P&L ====== */}
                  <Card className="border-2 border-bet-builder/40 bg-gradient-to-br from-bet-builder/10 via-card to-card overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-bet-builder flex items-center justify-center text-foreground">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <CardTitle className="text-base">Bet Builder of the Day</CardTitle>
                            <p className="text-xs text-muted-foreground">Multi-market combo · £10 stake</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            <span className="text-success font-bold">{bb.wins}W</span>
                            <span className="mx-1">-</span>
                            <span className="text-destructive font-bold">{bb.losses}L</span>
                          </div>
                          <div className={cn('text-lg font-black tabular-nums', bb.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                            {bb.netProfit >= 0 ? '+' : ''}£{bb.netProfit.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {bbBets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No settled Bet Builder bets yet</p>
                      ) : (
                        <PLHistoryTable
                          bets={bbBets
                            .filter(b => new Date(b.prediction_date + 'T00:00:00') >= filterDates[p])
                            .map(b => ({
                              id: b.id,
                              home_team: b.home_team,
                              away_team: b.away_team,
                              league: b.league,
                              market: b.markets?.join(' + ') || 'Bet Builder',
                              bookmaker_odds: b.combined_odds,
                              result: b.result || '',
                              status: b.status as SettlementStatus,
                              stake: b.stake || 10,
                              profit_loss: b.profit_loss || 0,
                              gaffer_reasoning: b.gaffer_reasoning,
                              kickoff: b.kickoff,
                              prediction_date: b.prediction_date,
                            }))}
                          title="Bet Builder History"
                          icon={<Layers className="w-5 h-5 text-primary" />}
                          accentColor="primary"
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* ====== ACCA P&L ====== */}
                  <Card className="border-2 border-bet-acca/40 bg-gradient-to-br from-bet-acca/10 via-card to-card overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-bet-acca flex items-center justify-center text-foreground">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <CardTitle className="text-base">Accas Delight</CardTitle>
                            <p className="text-xs text-muted-foreground">3-leg treble · £10 stake</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            <span className="text-success font-bold">{ac.wins}W</span>
                            <span className="mx-1">-</span>
                            <span className="text-destructive font-bold">{ac.losses}L</span>
                          </div>
                          <div className={cn('text-lg font-black tabular-nums', ac.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                            {ac.netProfit >= 0 ? '+' : ''}£{ac.netProfit.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {accaBets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No settled ACCAs yet</p>
                      ) : (
                        <PLAccaHistoryTable
                          accas={accaBets
                            .filter(b => new Date(b.prediction_date + 'T00:00:00') >= filterDates[p])
                            .map(a => ({
                              id: a.id,
                              status: a.status as 'won' | 'lost',
                              profit_loss: a.profit_loss || 0,
                              combined_odds: a.combined_odds,
                              selection_count: a.selection_count,
                              selections: Array.isArray(a.selections) ? a.selections as any[] : [],
                              prediction_date: a.prediction_date,
                              stake: a.stake || 10,
                              legs_won: a.legs_won,
                              legs_lost: a.legs_lost,
                            }))}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </>
        )}
      </Tabs>
    </div>
  );
}

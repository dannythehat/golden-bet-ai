import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePLHistory, type DailyGroup, type SettlementStatus } from '@/hooks/usePLHistory';
import { useBetBuilderPL } from '@/hooks/useBetBuilderPL';
import { useAccaPL } from '@/hooks/useAccaPL';
import { PLSummaryCard } from '@/components/pl/PLSummaryCard';
import { PLDateCollapsible } from '@/components/pl/PLDateCollapsible';
import { PLBetRow } from '@/components/pl/PLBetRow';
import { PLHistoryTable } from '@/components/pl/PLHistoryTable';
import { PLAccaHistoryTable } from '@/components/pl/PLAccaHistoryTable';
import { MonthlyProfitBanner } from '@/components/pl/MonthlyProfitBanner';
import {
  Loader2, Trophy, RefreshCw, AlertCircle,
  Calendar, TrendingUp, TrendingDown, History, ChartLine, Layers, Star,
  Target, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTeamName } from '@/lib/teamNames';
import theGafferImage from '@/assets/the-gaffer.webp';

type TimePeriod = 'weekly' | 'monthly' | 'yearly' | 'allTime';

const periodLabels: Record<TimePeriod, string> = {
  weekly: 'This Week',
  monthly: 'This Month',
  yearly: 'This Year',
  allTime: 'All Time',
};

// Market labels for the 3 Golden Bet types
const MARKET_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  over_9_5_corners: { label: 'Corners', icon: '📐', color: 'text-blue-400' },
  'over_9.5_corners': { label: 'Corners', icon: '📐', color: 'text-blue-400' },
  over_2_5_goals:   { label: 'Goals',   icon: '⚽', color: 'text-emerald-400' },
  'over_2.5_goals':   { label: 'Goals',   icon: '⚽', color: 'text-emerald-400' },
  over_3_5_cards:   { label: 'Cards',   icon: '🟨', color: 'text-amber-400' },
  'over_3.5_cards':   { label: 'Cards',   icon: '🟨', color: 'text-amber-400' },
  over_4_5_cards:   { label: 'Cards',   icon: '🟨', color: 'text-amber-400' },
  btts:             { label: 'BTTS',    icon: '⚽', color: 'text-emerald-400' },
};

function getBetLabel(market: string) {
  const m = MARKET_LABELS[market];
  return m ? `${m.icon} ${m.label}` : market.replace(/_/g, ' ');
}

function evalCombo(legs: { status: SettlementStatus; bookmaker_odds: number }[], stake = 2) {
  const nonVoid = legs.filter(b => b.status !== 'void');
  if (nonVoid.length === 0) return { outcome: 'void' as const, combinedOdds: 1, profit: 0 };
  if (nonVoid.some(b => b.status === 'lost')) {
    const odds = nonVoid.reduce((a, b) => a * b.bookmaker_odds, 1);
    return { outcome: 'lost' as const, combinedOdds: odds, profit: -stake };
  }
  const combinedOdds = nonVoid.reduce((a, b) => a * b.bookmaker_odds, 1);
  return { outcome: 'won' as const, combinedOdds, profit: stake * combinedOdds - stake };
}

export function PLSection() {
  const [period, setPeriod] = useState<TimePeriod>('monthly');
  const {
    settledBets,
    byDate,
    stats,
    lastMonthStats,
    isLoading, isError, refetch,
  } = usePLHistory();

  const { bets: bbBets, stats: bbStats, isLoading: bbLoading } = useBetBuilderPL();
  const { bets: accaBets, stats: accaStats, isLoading: accaLoading } = useAccaPL();

  const currentStats = stats[period];
  const currentBB = bbStats[period];
  const currentAcca = accaStats[period];

  // Combined P&L
  const totalProfit = currentStats.netProfit + currentBB.netProfit + currentAcca.netProfit;
  const totalStaked = currentStats.totalStaked + currentBB.totalStaked + currentAcca.totalStaked;
  const overallROI = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

  const hasData = settledBets.length > 0 || bbBets.length > 0 || accaBets.length > 0;
  const allLoading = isLoading || bbLoading || accaLoading;

  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const filterDates: Record<TimePeriod, Date> = {
    weekly: startOfWeek,
    monthly: startOfMonth,
    yearly: startOfYear,
    allTime: new Date(0),
  };

  const filterDays = (p: TimePeriod, days: DailyGroup[]) =>
    days.filter(d => new Date(d.date + 'T00:00:00') >= filterDates[p]);

  // Build doubles + treble summary from a day's 3 picks
  const calcCombos = (day: DailyGroup) => {
    const picks = day.bets.slice(0, 3);
    const stake = 2;
    const combos: Array<{ label: string; legs: typeof picks; result: ReturnType<typeof evalCombo> }> = [];

    for (let i = 0; i < picks.length; i++) {
      for (let j = i + 1; j < picks.length; j++) {
        combos.push({
          label: `${getBetLabel(picks[i].market)} + ${getBetLabel(picks[j].market)}`,
          legs: [picks[i], picks[j]],
          result: evalCombo([picks[i], picks[j]], stake),
        });
      }
    }
    if (picks.length >= 3) {
      combos.push({
        label: 'Treble',
        legs: picks,
        result: evalCombo(picks, stake),
      });
    }
    return combos;
  };

  return (
    <div className="space-y-6">
      {/* Golden Bets only notice */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gold/10 border border-gold/30">
        <span className="text-lg">🏆</span>
        <div>
          <p className="text-sm font-semibold text-gold">Full P&L — All Strategies Combined</p>
          <p className="text-xs text-muted-foreground">Golden Bets (doubles &amp; trebles), Bet Builder, and Accas Delight — every bet tracked and verified.</p>
        </div>
      </div>

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
                <p className="text-sm text-muted-foreground">The Gaffer's verified track record</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={allLoading}
              className="border-primary/30 text-primary hover:bg-primary/10 self-start md:self-center"
            >
              {allLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
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
                    {totalProfit >= 0 ? '+' : ''}{overallROI.toFixed(1)}% ROI • {periodLabels[period]}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Strategy explainer */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex items-start gap-4">
              <img src={theGafferImage} alt="The Gaffer" className="w-10 h-10 rounded-full object-cover border-2 border-primary/40 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-primary">How The Gaffer Bets</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every day The Gaffer selects <span className="text-foreground font-semibold">3 Golden Bets</span> — one from each specialist ML model.
                  Each selection is the single best pick of the day for that market.
                </p>
                <div className="flex flex-wrap gap-3 text-sm pt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <span className="text-xs">📐</span>
                    </div>
                    <span><span className="font-semibold text-foreground">Corners ML:</span> Over 9.5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-xs">⚽</span>
                    </div>
                    <span><span className="font-semibold text-foreground">Goals ML:</span> Over 2.5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <span className="text-xs">🟨</span>
                    </div>
                    <span><span className="font-semibold text-foreground">Cards ML:</span> Over 3.5/4.5 (Bet365)</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm pt-1 border-t border-border/30 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span><span className="font-semibold text-foreground">3 Doubles:</span> £2 each</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gold/20 flex items-center justify-center">
                      <Star className="w-3.5 h-3.5 text-gold" />
                    </div>
                    <span><span className="font-semibold text-foreground">1 Treble:</span> £2</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <span className="text-muted-foreground"><span className="font-semibold">Daily stake:</span> £8</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl">
          {(Object.keys(periodLabels) as TimePeriod[]).map((p) => (
            <TabsTrigger
              key={p}
              value={p}
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium"
            >
              {p === 'weekly' && <Calendar className="w-4 h-4 mr-2 hidden sm:block" />}
              {p === 'monthly' && <TrendingUp className="w-4 h-4 mr-2 hidden sm:block" />}
              {p === 'yearly' && <ChartLine className="w-4 h-4 mr-2 hidden sm:block" />}
              {p === 'allTime' && <History className="w-4 h-4 mr-2 hidden sm:block" />}
              <span className="hidden sm:inline">{periodLabels[p]}</span>
              <span className="sm:hidden">
                {p === 'weekly' ? 'Week' : p === 'monthly' ? 'Month' : p === 'yearly' ? 'Year' : 'All'}
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
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-foreground">Building Track Record</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                The Gaffer's 3 Golden Bets are generated daily at 6am. Results are settled after matches finish.
              </p>
            </CardContent>
          </Card>
        )}

        {!allLoading && !isError && hasData && (
          <>
            {(Object.keys(periodLabels) as TimePeriod[]).map((p) => {
              const filteredDays = filterDays(p, byDate);
              const s = stats[p];

              // Aggregate doubles/treble counts from filtered days
              let totalDoubleWins = 0, totalDoubleLosses = 0;
              let totalTrebleWins = 0, totalTrebleLosses = 0;

              filteredDays.forEach(day => {
                const combos = calcCombos(day);
                combos.forEach(c => {
                  const isDouble = c.legs.length === 2;
                  if (isDouble) {
                    if (c.result.outcome === 'won') totalDoubleWins++;
                    else if (c.result.outcome === 'lost') totalDoubleLosses++;
                  } else {
                    if (c.result.outcome === 'won') totalTrebleWins++;
                    else if (c.result.outcome === 'lost') totalTrebleLosses++;
                  }
                });
              });

              return (
                <TabsContent key={p} value={p} className="space-y-6 mt-6">
                  <PLSummaryCard
                    period={periodLabels[p]}
                    totalBets={s.totalBets}
                    wins={s.wins}
                    losses={s.losses}
                    winRate={s.winRate}
                    totalStaked={s.totalStaked}
                    netProfit={s.netProfit}
                    roi={s.roi}
                  />

                  {/* ====== GOLDEN BETS: Individual Selections ====== */}
                  <Card className="border-2 border-gold/40 bg-gradient-to-br from-gold/10 via-card to-card overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-gold/60 via-gold to-gold/60" />
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gold/25 flex items-center justify-center border border-gold/30">
                            <Target className="w-5 h-5 text-gold" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Individual Selections</CardTitle>
                            <p className="text-xs text-muted-foreground">Corners ML · Goals ML · Cards ML</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            <span className="text-success font-bold">{s.wins}W</span>
                            <span className="mx-1">-</span>
                            <span className="text-destructive font-bold">{s.losses}L</span>
                            {s.voids > 0 && <><span className="mx-2">•</span><span className="font-bold text-muted-foreground">{s.voids}V</span></>}
                          </div>
                          <div className={cn('text-lg font-black tabular-nums', s.netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                            {s.netProfit >= 0 ? '+' : ''}£{s.netProfit.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {filteredDays.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No settled bets in this period</p>
                      ) : (
                        filteredDays.map(day => (
                          <PLDateCollapsible
                            key={day.date}
                            date={day.date}
                            wins={day.wins}
                            losses={day.losses}
                            voids={day.voids}
                            profit={day.netProfit}
                            count={day.bets.length}
                            defaultOpen={false}
                          >
                            {day.bets.map(bet => (
                              <PLBetRow
                                key={bet.id}
                                homeTeam={bet.home_team}
                                awayTeam={bet.away_team}
                                league={bet.league}
                                market={bet.market}
                                odds={bet.bookmaker_odds}
                                result={bet.result}
                                status={bet.status}
                                profitLoss={bet.profit_loss}
                                proofScreenshotUrl={bet.proof_screenshot_url}
                                proofCapturedAt={bet.proof_captured_at}
                              />
                            ))}
                          </PLDateCollapsible>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* ====== DOUBLES + TREBLE ====== */}
                  <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/25 flex items-center justify-center border border-primary/30">
                            <Layers className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Doubles &amp; Treble</CardTitle>
                            <p className="text-xs text-muted-foreground">3 doubles + 1 treble · £2 each · £8/day</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            <span className="text-success font-bold">{totalDoubleWins + totalTrebleWins}W</span>
                            <span className="mx-1">-</span>
                            <span className="text-destructive font-bold">{totalDoubleLosses + totalTrebleLosses}L</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {filteredDays.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No results in this period</p>
                      ) : (
                        filteredDays.map(day => {
                          const combos = calcCombos(day);
                          const dayDoublesProfit = combos
                            .filter(c => c.legs.length === 2)
                            .reduce((sum, c) => sum + c.result.profit, 0);
                          const trebleCombo = combos.find(c => c.legs.length === 3);
                          const dayTotal = combos.reduce((sum, c) => sum + c.result.profit, 0);
                          const dayWins = combos.filter(c => c.result.outcome === 'won').length;
                          const dayLosses = combos.filter(c => c.result.outcome === 'lost').length;

                          return (
                            <PLDateCollapsible
                              key={day.date}
                              date={day.date}
                              wins={dayWins}
                              losses={dayLosses}
                              voids={0}
                              profit={dayTotal}
                              count={combos.length}
                              defaultOpen={false}
                            >
                              <div className="space-y-2">
                                {combos.map((combo, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      'p-3 rounded-lg border text-sm',
                                      combo.result.outcome === 'won' && 'bg-success/5 border-success/30',
                                      combo.result.outcome === 'lost' && 'bg-destructive/5 border-destructive/30',
                                      combo.result.outcome === 'void' && 'bg-muted/20 border-border/50',
                                    )}
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium">
                                        {combo.label}
                                        {combo.result.outcome !== 'void' && (
                                          <span className="text-muted-foreground ml-1">@ {combo.result.combinedOdds.toFixed(2)}</span>
                                        )}
                                      </span>
                                      <span className={cn(
                                        'font-bold',
                                        combo.result.outcome === 'won' && 'text-success',
                                        combo.result.outcome === 'lost' && 'text-destructive',
                                        combo.result.outcome === 'void' && 'text-muted-foreground',
                                      )}>
                                        {combo.result.profit >= 0 ? '+' : ''}£{combo.result.profit.toFixed(2)}
                                      </span>
                                    </div>
                                    {/* Legs */}
                                    <div className="mt-1 space-y-0.5">
                                      {combo.legs.map(leg => (
                                        <div key={leg.id} className="flex items-center justify-between text-xs text-muted-foreground">
                                          <span className={cn(
                                            leg.status === 'won' && 'text-success',
                                            leg.status === 'lost' && 'text-destructive',
                                          )}>
                                            {leg.status === 'won' ? '✓' : leg.status === 'lost' ? '✗' : '–'}{' '}
                                            {leg.home_team} vs {leg.away_team}
                                          </span>
                                          <span>@{leg.bookmaker_odds.toFixed(2)}</span>
                                        </div>
                                      ))}
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

                  {/* ====== BET BUILDER P&L ====== */}
                  <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/25 flex items-center justify-center border border-primary/30">
                            <Layers className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Bet Builder</CardTitle>
                            <p className="text-xs text-muted-foreground">Multi-leg single game · £10 each</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            <span className="text-success font-bold">{bbStats[p].wins}W</span>
                            <span className="mx-1">-</span>
                            <span className="text-destructive font-bold">{bbStats[p].losses}L</span>
                          </div>
                          <div className={cn('text-lg font-black tabular-nums', bbStats[p].netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                            {bbStats[p].netProfit >= 0 ? '+' : ''}£{bbStats[p].netProfit.toFixed(2)}
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
                  <Card className="border-2 border-success/40 bg-gradient-to-br from-success/10 via-card to-card overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-success/60 via-success to-success/60" />
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-success/25 flex items-center justify-center border border-success/30">
                            <Zap className="w-5 h-5 text-success" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Accas Delight</CardTitle>
                            <p className="text-xs text-muted-foreground">Form table accumulator · £10 each</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            <span className="text-success font-bold">{accaStats[p].wins}W</span>
                            <span className="mx-1">-</span>
                            <span className="text-destructive font-bold">{accaStats[p].losses}L</span>
                          </div>
                          <div className={cn('text-lg font-black tabular-nums', accaStats[p].netProfit >= 0 ? 'text-success' : 'text-destructive')}>
                            {accaStats[p].netProfit >= 0 ? '+' : ''}£{accaStats[p].netProfit.toFixed(2)}
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

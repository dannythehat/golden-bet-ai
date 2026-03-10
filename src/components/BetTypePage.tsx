/**
 * Shared Bet Type Page Component
 * Used by /over-goals, /over-corners, /over-cards
 * Shows Gold/Silver/Bronze picks, P&L, form tables, methodology description
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Award, Target, Flag, CreditCard, ArrowLeft, ArrowRight, Loader2, Calendar, TrendingUp, TrendingDown, Brain, BarChart3, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { formatTeamName } from '@/lib/teamNames';
import { getMarketLabel, getMarketIcon, normalizeMarketKey } from '@/lib/marketDisplay';
import { getLeagueFlag } from '@/lib/countryFlags';
import { parseReasoning } from '@/lib/parseReasoning';
import { getEffectiveBetDate } from '@/lib/betDate';
import theGafferImage from '@/assets/the-gaffer.webp';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { isAllowedTeam, EXCLUDED_LEAGUE_PATTERNS } from '@/lib/teamFilters';

/* ------------------------------------------------------------------ */
/*  Types & Config                                                     */
/* ------------------------------------------------------------------ */
export type BetTypeKey = 'goals' | 'corners' | 'cards';

interface BetTypeConfig {
  key: BetTypeKey;
  title: string;
  subtitle: string;
  marketFilter: string[];       // market keys to match from golden_bet_history
  formStatKey: string;          // column in team_rolling_stats for %
  formAvgKey: string;           // column for average stat per game
  formLabel: string;            // e.g. "Over 2.5 Goals %"
  avgLabel: string;             // e.g. "Avg Goals"
  colorVar: string;             // CSS variable name e.g. '--bet-goals'
  colorClass: string;           // Tailwind class e.g. 'bet-goals'
  icon: React.ReactNode;
  description: string;
  methodology: string;
}

export const BET_TYPE_CONFIGS: Record<BetTypeKey, BetTypeConfig> = {
  goals: {
    key: 'goals',
    title: 'Over Goals',
    subtitle: 'Over 2.5 Goals Specialist Picks',
    marketFilter: ['over_2_5_goals', 'over_2.5_goals'],
    formStatKey: 'over_25_goals_pct',
    formAvgKey: 'avg_total_goals',
    formLabel: 'O2.5 Goals %',
    avgLabel: 'Avg Goals',
    colorVar: '--bet-goals',
    colorClass: 'bet-goals',
    icon: <Target className="w-5 h-5" />,
    description: "The Gaffer's Over 2.5 Goals picks target matches where both teams' attacking stats, xG data, and league averages point to high-scoring encounters. We analyse rolling 10-match averages, head-to-head records, and Poisson distributions to find the fixtures most likely to deliver 3+ goals.",
    methodology: "Each fixture is scored using: 35% ML Probability (trained on 15+ years of data), 25% Poisson Distribution (λ from combined goals-per-game), 20% Bayesian Updating (league priors refined with team evidence), 10% Kelly Criterion (value edge vs bookmaker odds), and 10% Z-Score (deviation from league baseline). The top 3 are ranked Gold, Silver, Bronze.",
  },
  corners: {
    key: 'corners',
    title: 'Over Corners',
    subtitle: 'Over 9.5 Corners Specialist Picks',
    marketFilter: ['over_9_5_corners', 'over_9.5_corners', 'over_8_5_corners', 'over_8.5_corners'],
    formStatKey: 'over_95_corners_pct',
    formAvgKey: 'avg_total_corners',
    formLabel: 'O9.5 Corners %',
    avgLabel: 'Avg Corners',
    colorVar: '--bet-corners',
    colorClass: 'bet-corners',
    icon: <Flag className="w-5 h-5" />,
    description: "Corner picks focus on matches where both sides generate high pressing intensity, lots of shots, and attacking width. We look at corners won and conceded per game, shots-per-possession ratios, and cross-referencing with league corner averages to find fixtures primed for 10+ corners.",
    methodology: "Each fixture is scored using: 35% ML Probability (corner-specific model), 25% Poisson Distribution (λ from combined corners-per-game), 20% Bayesian Updating (league corner priors refined with team evidence), 10% Kelly Criterion (value edge vs bookmaker), and 10% Z-Score (corner deviation from league mean). Top 3 ranked Gold, Silver, Bronze.",
  },
  cards: {
    key: 'cards',
    title: 'Over Cards',
    subtitle: 'Over 3.5 Cards Specialist Picks',
    marketFilter: ['over_3_5_cards', 'over_3.5_cards', 'over_4_5_cards', 'over_4.5_cards', 'over_2_5_cards', 'over_2.5_cards'],
    formStatKey: 'over_35_cards_pct',
    formAvgKey: 'avg_total_cards',
    formLabel: 'O3.5 Cards %',
    avgLabel: 'Avg Cards',
    colorVar: '--bet-cards',
    colorClass: 'bet-cards',
    icon: <CreditCard className="w-5 h-5" />,
    description: "Card picks identify fixtures with high-discipline risk — aggressive teams, strict referees, and derby intensity. We crunch referee card-per-match averages, team foul rates, discipline momentum, and cards-per-foul ratios to find the games most likely to see 4+ bookings.",
    methodology: "Each fixture is scored using: 35% ML Probability (card-specific model with referee features), 25% Poisson Distribution (λ from combined cards-per-game + referee avg), 20% Bayesian Updating (league card priors refined with team + referee evidence), 10% Kelly Criterion, and 10% Z-Score (card deviation from league mean). Top 3 ranked Gold, Silver, Bronze.",
  },
};

/* ------------------------------------------------------------------ */
/*  Tier config                                                        */
/* ------------------------------------------------------------------ */
const TIERS = [
  { label: 'Gold', icon: <Trophy className="w-5 h-5" />, badgeClass: 'bg-gold/20 text-gold border-gold/40', ringClass: 'ring-gold/40' },
  { label: 'Silver', icon: <Medal className="w-5 h-5" />, badgeClass: 'bg-platinum/20 text-platinum border-platinum/40', ringClass: 'ring-platinum/40' },
  { label: 'Bronze', icon: <Award className="w-5 h-5" />, badgeClass: 'bg-amber-700/20 text-amber-600 border-amber-700/40', ringClass: 'ring-amber-700/40' },
];

/* ------------------------------------------------------------------ */
/*  Helper: normalizeTeam for form table matching                      */
/* ------------------------------------------------------------------ */
function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bfc\b|\bcf\b|\bsc\b|\bac\b|\bas\b|\bafc\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function strictTeamNameMatch(aRaw: string, bRaw: string): boolean {
  const a = normalizeTeam(aRaw);
  const b = normalizeTeam(bRaw);
  if (!a || !b || a.length < 4 || b.length < 4) return false;
  if (a === b) return true;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (shorter.length < 6) return false;
  if (shorter.length / longer.length < 0.75) return false;
  return longer.includes(shorter);
}

function hasKnownFormTeam(fixtureTeam: string, normalizedFormTeams: string[]): boolean {
  const normalizedFixtureTeam = normalizeTeam(fixtureTeam);
  if (normalizedFixtureTeam.length < 4) return false;

  return normalizedFormTeams.some((formTeam) =>
    strictTeamNameMatch(normalizedFixtureTeam, formTeam)
  );
}

function teamMatchesFixture(teamName: string, fixture: any): 'home' | 'away' | null {
  if (strictTeamNameMatch(teamName, fixture.home_team)) return 'home';
  if (strictTeamNameMatch(teamName, fixture.away_team)) return 'away';
  return null;
}

/* ------------------------------------------------------------------ */
/*  DB pick type                                                       */
/* ------------------------------------------------------------------ */
interface DBPick {
  id: string;
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string;
  market: string;
  ml_confidence: number;
  value_edge: number;
  gaffer_reasoning: string;
  bookmaker_odds: number;
  stake: number | null;
  status: string;
  result: string | null;
  profit_loss: number | null;
  prediction_date: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
interface BetTypePageProps {
  betType: BetTypeKey;
}

export function BetTypePage({ betType }: BetTypePageProps) {
  const config = BET_TYPE_CONFIGS[betType];
  const today = getEffectiveBetDate();

  // Picks from golden_bet_history (top 3 for this market)
  const [picks, setPicks] = useState<DBPick[]>([]);
  const [picksLoading, setPicksLoading] = useState(true);

  // P&L for this market — using doubles + treble calculation (same as Golden Bets)
  const [plData, setPLData] = useState<{ wins: number; losses: number; voids: number; profit: number; staked: number }>({ wins: 0, losses: 0, voids: 0, profit: 0, staked: 0 });

  // Form tables
  const [formTeams, setFormTeams] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(true);

  // Fetch today's picks for this market
  useEffect(() => {
    (async () => {
      setPicksLoading(true);
      try {
        // Get ALL picks for this market type today (we want top 3)
        const { data } = await supabase
          .from('golden_bet_history')
          .select('*')
          .eq('prediction_date', today)
          .order('ml_confidence', { ascending: false });

        if (data) {
          const filtered = (data as DBPick[]).filter(b => {
            const norm = normalizeMarketKey(b.market);
            return config.marketFilter.some(f => norm.includes(normalizeMarketKey(f)));
          });
          setPicks(filtered.slice(0, 3));
        }
      } catch (err) { console.error(err); }
      setPicksLoading(false);
    })();
  }, [today, betType]);

  /**
   * Doubles + Treble P&L calculation (mirrors Golden Bets approach)
   * For each day's 3 picks (Gold/Silver/Bronze):
   * - 3 doubles (Gold+Silver, Gold+Bronze, Silver+Bronze) — £10 each
   * - 1 treble (all three) — £10
   * Total daily stake: £40
   */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('golden_bet_history')
        .select('*')
        .in('status', ['won', 'lost', 'void'])
        .not('result', 'is', null)
        .order('prediction_date', { ascending: false });

      if (data) {
        const marketBets = (data as any[]).filter(b => {
          const norm = normalizeMarketKey(b.market ?? '');
          return config.marketFilter.some(f => norm.includes(normalizeMarketKey(f)));
        });

        // Group by date and calculate doubles+treble P&L
        const dateMap = new Map<string, any[]>();
        for (const bet of marketBets) {
          const date = bet.prediction_date;
          if (!dateMap.has(date)) dateMap.set(date, []);
          dateMap.get(date)!.push(bet);
        }

        let totalWins = 0, totalLosses = 0, totalVoids = 0, totalStaked = 0, netProfit = 0;
        const stake = 10;

        for (const [, dayBets] of dateMap) {
          const picks = dayBets.slice(0, 3);
          const voidCount = picks.filter((b: any) => b.status === 'void').length;
          totalVoids += voidCount;

          if (picks.length < 2) {
            // Fallback to singles
            for (const b of picks) {
              totalStaked += stake;
              if (b.status === 'won') { totalWins++; netProfit += (stake * (b.bookmaker_odds || 1)) - stake; }
              else if (b.status === 'lost') { totalLosses++; netProfit -= stake; }
            }
            continue;
          }

          // Build doubles + treble combos
          const combos: any[][] = [];
          for (let i = 0; i < picks.length; i++)
            for (let j = i + 1; j < picks.length; j++)
              combos.push([picks[i], picks[j]]);
          if (picks.length >= 3) combos.push(picks.slice(0, 3));

          for (const legs of combos) {
            const nonVoid = legs.filter((b: any) => b.status !== 'void');
            totalStaked += stake;
            if (nonVoid.length === 0) {
              // all void — stake returned
            } else if (nonVoid.every((b: any) => b.status === 'won')) {
              const combinedOdds = nonVoid.reduce((acc: number, b: any) => acc * (b.bookmaker_odds || 1), 1);
              totalWins++;
              netProfit += (stake * combinedOdds) - stake;
            } else {
              totalLosses++;
              netProfit -= stake;
            }
          }
        }

        setPLData({ wins: totalWins, losses: totalLosses, voids: totalVoids, profit: netProfit, staked: totalStaked });
      }
    })();
  }, [betType]);

  // Fetch form tables
  useEffect(() => {
    (async () => {
      setFormLoading(true);
      try {
        const [teamsRes, fixturesRes] = await Promise.all([
          supabase
            .from('team_rolling_stats')
            .select(`id, team_name, team_id, league, region, matches_used, ${config.formStatKey}, ${config.formAvgKey}, form_string`)
            .gte('matches_used', 6)
            .neq('league', 'Friendlies Clubs')
            .neq('region', 'other')
            .limit(1000),
          supabase.functions.invoke('ml-fixtures', { method: 'GET' }).catch(() => ({ data: null, error: new Error('timeout') })),
        ]);

        if (teamsRes.data) {
          const filtered = (teamsRes.data as any[]).filter(t => !EXCLUDED_LEAGUE_PATTERNS.some(p => p.test(t.league || '')) && isAllowedTeam(t.team_name));
          setFormTeams(filtered);
        }

        if (fixturesRes.data?.success && Array.isArray(fixturesRes.data.fixtures)) {
          const clean = fixturesRes.data.fixtures
            .filter((f: any) => !EXCLUDED_LEAGUE_PATTERNS.some(p => p.test(f.league || '')) && isAllowedTeam(f.home_team || '') && isAllowedTeam(f.away_team || ''))
            .map((f: any) => ({ fixture_id: String(f.fixture_id), home_team: f.home_team, away_team: f.away_team, league: f.league || '', kickoff: f.kickoff }));
          setFixtures(clean);
        }
      } catch (err) { console.error(err); }
      setFormLoading(false);
    })();
  }, [betType]);

  // Cross-reference form teams with fixtures
  const playingTeams = useMemo(() => {
    if (!fixtures.length || !formTeams.length) return [];

    const normalizedFormTeams = formTeams
      .map((team) => normalizeTeam(team.team_name || ''))
      .filter((name) => name.length >= 4);

    const validFixtures = fixtures.filter((fixture) =>
      hasKnownFormTeam(fixture.home_team || '', normalizedFormTeams) &&
      hasKnownFormTeam(fixture.away_team || '', normalizedFormTeams)
    );

    const result: any[] = [];
    const seen = new Set<string>();

    for (const team of formTeams) {
      for (const fixture of validFixtures) {
        const side = teamMatchesFixture(team.team_name, fixture);
        if (side && !seen.has(team.team_name)) {
          seen.add(team.team_name);
          result.push({
            ...team,
            fixture,
            isHome: side === 'home',
            opponent: side === 'home' ? fixture.away_team : fixture.home_team,
            kickoff: fixture.kickoff,
          });
          break;
        }
      }
    }

    return result
      .sort((a, b) => Number(b[config.formStatKey] ?? 0) - Number(a[config.formStatKey] ?? 0))
      .slice(0, 30);
  }, [formTeams, fixtures, config.formStatKey]);

  const isProfit = plData.profit >= 0;
  const roi = plData.staked > 0 ? (plData.profit / plData.staked) * 100 : 0;
  

  const getPercentColor = (v: number) => {
    if (v >= 80) return 'text-success font-black';
    if (v >= 60) return 'text-ice font-bold';
    if (v >= 40) return 'text-amber-400 font-semibold';
    return 'text-destructive';
  };

  return (
    <div className="min-h-screen bg-background sparkle-bg relative overflow-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse`} style={{ background: `hsl(var(${config.colorVar}) / 0.08)` }} />
        <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl animate-pulse`} style={{ background: `hsl(var(${config.colorVar}) / 0.05)` }} />
      </div>

      <Navigation activeSection="home" onSectionChange={() => {}} />

      <main className="relative container mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-24 flex-1">
        <div className="space-y-8">
          {/* Back link */}
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>

          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl border-2 p-6 md:p-10" style={{ borderColor: `hsl(var(${config.colorVar}) / 0.4)`, background: `linear-gradient(135deg, hsl(var(${config.colorVar}) / 0.12), hsl(var(--card)), hsl(var(--card)))` }}>
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl" style={{ background: `hsl(var(${config.colorVar}) / 0.15)` }} />
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: `hsl(var(${config.colorVar}) / 0.2)` }} />
                <img src={theGafferImage} alt="The Gaffer" className="relative w-32 h-32 md:w-44 md:h-44 rounded-2xl object-cover border-2 shadow-2xl" style={{ borderColor: `hsl(var(${config.colorVar}) / 0.5)` }} />
                <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-white text-xs font-bold shadow-lg" style={{ background: `hsl(var(${config.colorVar}))` }}>
                  {config.icon}
                </div>
              </div>
              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border" style={{ background: `hsl(var(${config.colorVar}) / 0.15)`, borderColor: `hsl(var(${config.colorVar}) / 0.3)` }}>
                  <Brain className="w-4 h-4 animate-pulse" style={{ color: `hsl(var(${config.colorVar}))` }} />
                  <span className="text-sm font-medium" style={{ color: `hsl(var(${config.colorVar}))` }}>{config.subtitle}</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">{config.title}</h1>
                <p className="text-base text-foreground/80 max-w-xl">{config.description}</p>
              </div>
            </div>
          </div>

          {/* Monthly P&L for this market */}
          <div className="rounded-2xl border-2 overflow-hidden shadow-xl" style={{ borderColor: `hsl(var(${config.colorVar}) / 0.3)` }}>
            <div className="h-1.5" style={{ background: `linear-gradient(to right, hsl(var(${config.colorVar}) / 0.4), hsl(var(${config.colorVar})), hsl(var(${config.colorVar}) / 0.4))` }} />
            <div className="p-5 md:p-6 bg-card/95">
              {/* Header row */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md text-white" style={{ background: `hsl(var(${config.colorVar}))` }}>
                  <BarChart3 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{config.title} <span style={{ color: `hsl(var(${config.colorVar}))` }}>Performance</span></h2>
                  <p className="text-xs text-muted-foreground">3 doubles + 1 treble daily · £10 per bet · £40/day</p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {/* Net Profit */}
                <div className={cn("rounded-xl p-3 border text-center", isProfit ? "bg-success/8 border-success/30" : "bg-destructive/8 border-destructive/30")}>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Net Profit</div>
                  <div className={cn("text-2xl font-black flex items-center justify-center gap-1", isProfit ? "text-success" : "text-destructive")}>
                    {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {isProfit ? '+' : ''}£{plData.profit.toFixed(2)}
                  </div>
                </div>

                {/* ROI */}
                <div className={cn("rounded-xl p-3 border text-center", isProfit ? "bg-success/8 border-success/30" : "bg-destructive/8 border-destructive/30")}>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">ROI</div>
                  <div className={cn("text-2xl font-black", isProfit ? "text-success" : "text-destructive")}>
                    {isProfit ? '+' : ''}{roi.toFixed(1)}%
                  </div>
                </div>

                {/* Win/Loss */}
                <div className="rounded-xl p-3 border border-border/60 bg-muted/30 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Bets W / L</div>
                  <div className="text-2xl font-black text-foreground">
                    <span className="text-success">{plData.wins}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-destructive">{plData.losses}</span>
                  </div>
                </div>

                {/* Total Staked */}
                <div className="rounded-xl p-3 border border-border/60 bg-muted/30 text-center">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Staked</div>
                  <div className="text-2xl font-black text-foreground">£{plData.staked.toFixed(0)}</div>
                </div>
              </div>

              {/* Footer link */}
              <div className="flex items-center justify-end">
                <Link to="/#pnl" className="text-xs font-semibold px-4 py-1.5 rounded-full border transition-colors" style={{ borderColor: `hsl(var(${config.colorVar}) / 0.3)`, color: `hsl(var(${config.colorVar}))`, background: `hsl(var(${config.colorVar}) / 0.08)` }}>
                  View Full P&L Hub →
                </Link>
              </div>
            </div>
          </div>

          {/* Today's Picks: Gold / Silver / Bronze */}
          <Card className="border-2 shadow-xl" style={{ borderColor: `hsl(var(${config.colorVar}) / 0.3)`, background: `linear-gradient(135deg, hsl(var(${config.colorVar}) / 0.08), hsl(var(--card)), hsl(var(--card)))` }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white" style={{ background: `hsl(var(${config.colorVar}))` }}>
                  {config.icon}
                </div>
                <div>
                  <CardTitle className="text-xl">Today's <span style={{ color: `hsl(var(${config.colorVar}))` }}>{config.title}</span> Picks</CardTitle>
                  <p className="text-sm text-muted-foreground">Gold • Silver • Bronze — the best 3 fixtures</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {picksLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: `hsl(var(${config.colorVar}))` }} />
                  <span className="ml-2 text-muted-foreground">Loading picks...</span>
                </div>
              ) : picks.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No {config.title.toLowerCase()} picks available for today yet. Check back after 6 AM UTC.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {picks.map((pick, idx) => {
                    const tier = TIERS[idx] || TIERS[2];
                    const isSettled = pick.status === 'won' || pick.status === 'lost';
                    const isWin = pick.status === 'won';
                    const { statsFacts, gafferTake } = parseReasoning(pick.gaffer_reasoning || '');
                    const flag = getLeagueFlag(pick.league);

                    return (
                      <div key={pick.id} className={cn("rounded-xl p-4 border-2 shadow-lg relative overflow-hidden transition-all", isSettled && isWin && "border-success/50 bg-success/5", isSettled && !isWin && "border-destructive/50 bg-destructive/5")} style={!isSettled ? { borderColor: `hsl(var(${config.colorVar}) / 0.3)` } : undefined}>
                        {/* Tier badge */}
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className={cn("gap-1", tier.badgeClass)}>
                            {tier.icon} {tier.label}
                          </Badge>
                          <span className="text-lg" title={pick.league}>{flag}</span>
                        </div>

                        {/* Teams */}
                        <div className="mb-3">
                          <div className="text-base font-semibold text-foreground">{formatTeamName(pick.home_team)}</div>
                          <div className="text-muted-foreground text-sm">vs</div>
                          <div className="text-base font-semibold text-foreground">{formatTeamName(pick.away_team)}</div>
                        </div>

                        <Badge variant="outline" className="mb-3" style={{ borderColor: `hsl(var(${config.colorVar}) / 0.4)`, color: `hsl(var(${config.colorVar}))`, background: `hsl(var(${config.colorVar}) / 0.1)` }}>
                          {getMarketIcon(normalizeMarketKey(pick.market))} {getMarketLabel(normalizeMarketKey(pick.market))}
                        </Badge>

                        {/* Reasoning */}
                        {gafferTake && (
                          <div className="mb-3 p-3 rounded-lg border text-sm text-foreground/80" style={{ borderColor: `hsl(var(${config.colorVar}) / 0.2)`, background: `hsl(var(${config.colorVar}) / 0.05)` }}>
                            <span className="font-bold text-xs uppercase tracking-wider block mb-1" style={{ color: `hsl(var(${config.colorVar}))` }}>The Gaffer Says</span>
                            "{gafferTake}"
                          </div>
                        )}

                        {/* Stats */}
                        {isSettled ? (
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className={cn("p-2 rounded-lg text-center border", isWin ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30")}>
                              <div className="text-xs text-muted-foreground">Result</div>
                              <div className={cn("text-lg font-bold", isWin ? "text-success" : "text-destructive")}>{isWin ? 'WON ✓' : 'LOST ✗'}</div>
                            </div>
                            <div className={cn("p-2 rounded-lg text-center border", isWin ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30")}>
                              <div className="text-xs text-muted-foreground">P&L</div>
                              <div className={cn("text-lg font-bold", isWin ? "text-success" : "text-destructive")}>{isWin ? '+' : ''}£{(pick.profit_loss || 0).toFixed(2)}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="p-2 rounded-lg text-center border" style={{ borderColor: `hsl(var(${config.colorVar}) / 0.3)`, background: `hsl(var(${config.colorVar}) / 0.1)` }}>
                              <div className="text-xs text-muted-foreground">Confidence</div>
                              <div className="text-xl font-black" style={{ color: `hsl(var(${config.colorVar}))` }}>{(pick.ml_confidence * 100).toFixed(0)}%</div>
                            </div>
                            <div className="p-2 rounded-lg text-center border border-success/30 bg-success/10">
                              <div className="text-xs text-muted-foreground">Value Edge</div>
                              <div className="text-xl font-black text-success">+{(pick.value_edge * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                        )}

                        {/* Kickoff */}
                        <div className="mt-3 text-xs text-muted-foreground text-center">
                          KO: {new Date(pick.kickoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} • {pick.league}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Methodology */}
          <div className="p-5 rounded-2xl border" style={{ borderColor: `hsl(var(${config.colorVar}) / 0.2)`, background: `hsl(var(${config.colorVar}) / 0.05)` }}>
            <div className="flex items-start gap-4">
              <img src={theGafferImage} alt="The Gaffer" className="w-12 h-12 rounded-full object-cover border-2 shrink-0" style={{ borderColor: `hsl(var(${config.colorVar}) / 0.4)` }} />
              <div>
                <h3 className="font-bold text-base mb-1" style={{ color: `hsl(var(${config.colorVar}))` }}>How {config.title} Picks are Calculated</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{config.methodology}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  P&L is calculated using <strong>3 doubles + 1 treble</strong> from the day's Gold, Silver &amp; Bronze picks (£10 each = £40 daily stake) — the same method used on the{' '}
                  <Link to="/#pnl" className="font-semibold text-primary hover:underline">main P&L Hub</Link>.
                </p>
              </div>
            </div>
          </div>

          {/* Form Tables for this market */}
          <Card className="border-2 shadow-xl" style={{ borderColor: `hsl(var(${config.colorVar}) / 0.3)` }}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg text-white" style={{ background: `hsl(var(${config.colorVar}))` }}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Playing <span style={{ color: `hsl(var(${config.colorVar}))` }}>Today</span> — {config.title} Form</CardTitle>
                  <p className="text-sm text-muted-foreground">Top 20 in-form teams for {config.formLabel}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {formLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: `hsl(var(${config.colorVar}))` }} />
                  <span className="ml-2 text-muted-foreground">Loading form data...</span>
                </div>
              ) : playingTeams.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No fixtures found for today</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-[2rem_1fr_1fr_auto] gap-2 px-3 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>#</span>
                    <span>Team</span>
                    <span>Fixture</span>
                    <span className="text-right">{config.formLabel}</span>
                  </div>
                  <div className="divide-y divide-border/30">
                    {playingTeams.map((team: any, idx: number) => {
                      const rank = idx + 1;
                      const pct = Number(team[config.formStatKey] ?? 0);
                      return (
                        <div key={team.id} className={cn("grid grid-cols-[2rem_1fr_1fr_auto] gap-2 px-3 py-2.5 items-center transition-colors hover:bg-primary/5", rank <= 5 ? 'bg-success/12 border-l-2 border-l-success/60' : rank <= 10 ? 'bg-primary/10 border-l-2 border-l-primary/60' : rank <= 15 ? 'bg-amber-500/8 border-l-2 border-l-amber-500/50' : 'bg-muted/5 border-l-2 border-l-muted-foreground/20')}>
                          <div className="w-7 h-7 rounded-md flex items-center justify-center border" style={{ background: `hsl(var(${config.colorVar}) / 0.2)`, borderColor: `hsl(var(${config.colorVar}) / 0.3)` }}>
                            <span className="text-xs font-bold text-ice">{rank}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{team.team_name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{team.fixture?.league || team.league}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm truncate">
                              <span className="text-muted-foreground">{team.isHome ? 'vs' : '@'}</span>{' '}
                              <span className="font-medium text-foreground/90">{team.opponent}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span className="text-[11px]">{new Date(team.kickoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <span className={cn('text-lg text-right tabular-nums', getPercentColor(pct))}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cross-links to other bet type pages */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground">Explore Other Markets</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.values(BET_TYPE_CONFIGS)
                .filter(c => c.key !== betType)
                .map(c => (
                  <Link
                    key={c.key}
                    to={`/over-${c.key}`}
                    className="group flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:scale-[1.02] hover:shadow-lg no-underline"
                    style={{ borderColor: `hsl(var(${c.colorVar}) / 0.3)`, background: `linear-gradient(135deg, hsl(var(${c.colorVar}) / 0.1), hsl(var(--card)))` }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: `hsl(var(${c.colorVar}))` }}>
                      {c.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{c.subtitle}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 ml-auto shrink-0 group-hover:translate-x-1 transition-transform" style={{ color: `hsl(var(${c.colorVar}))` }} />
                  </Link>
                ))}

              {/* Links to other key pages */}
              <Link to="/#predictions" className="group flex items-center gap-3 p-4 rounded-xl border-2 border-gold/30 bg-gradient-to-r from-gold/10 to-card transition-all hover:scale-[1.02] hover:shadow-lg no-underline">
                <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-foreground">Golden Bets</div>
                  <div className="text-xs text-muted-foreground">All 3 combined daily picks</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto shrink-0 text-gold group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link to="/#pnl" className="group flex items-center gap-3 p-4 rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-card transition-all hover:scale-[1.02] hover:shadow-lg no-underline">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-foreground">P&L Hub</div>
                  <div className="text-xs text-muted-foreground">Full profit/loss breakdown</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto shrink-0 text-primary group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link to="/blog" className="group flex items-center gap-3 p-4 rounded-xl border-2 border-border/50 bg-gradient-to-r from-muted/30 to-card transition-all hover:scale-[1.02] hover:shadow-lg no-underline">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-foreground">Blog</div>
                  <div className="text-xs text-muted-foreground">Match previews &amp; analysis</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto shrink-0 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

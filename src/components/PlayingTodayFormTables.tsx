/**
 * Playing Today Form Tables
 * Shows teams playing today with clickable bet-type tabs
 * Cross-references team_rolling_stats with today's fixtures
 */

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Flag, CreditCard, Swords, Loader2, ArrowRight, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getLeagueFlag } from '@/lib/countryFlags';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type BetType = 'over_25_goals' | 'btts' | 'over_95_corners' | 'over_35_cards';

interface RollingTeamStat {
  id: string;
  team_name: string;
  team_id: number;
  league: string;
  region: string;
  matches_used: number;
  over_25_goals_pct: number;
  btts_pct: number;
  over_95_corners_pct: number;
  over_35_cards_pct: number;
  avg_total_goals: number;
  avg_total_corners: number;
  avg_total_cards: number;
  form_string: string;
}

interface TodaysFixture {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string;
}

interface PlayingTeam extends RollingTeamStat {
  fixture: TodaysFixture;
  isHome: boolean;
  opponent: string;
  kickoff: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const BET_TABS: { id: BetType; label: string; shortLabel: string; icon: React.ReactNode }[] = [
  { id: 'over_25_goals', label: 'Over 2.5 Goals', shortLabel: 'O2.5 Goals', icon: <Target className="w-3.5 h-3.5" /> },
  { id: 'over_95_corners', label: 'Over 8.5 Corners', shortLabel: 'O8.5 Corners', icon: <Flag className="w-3.5 h-3.5" /> },
  { id: 'over_35_cards', label: 'Over 3.5 Cards', shortLabel: 'O3.5 Cards', icon: <CreditCard className="w-3.5 h-3.5" /> },
];

import { EXCLUDED_LEAGUE_PATTERNS, isAllowedTeam } from '@/lib/teamFilters';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getStatValue(team: RollingTeamStat, bt: BetType): number {
  const map: Record<BetType, keyof RollingTeamStat> = {
    over_25_goals: 'over_25_goals_pct',
    btts: 'btts_pct',
    over_95_corners: 'over_95_corners_pct',
    over_35_cards: 'over_35_cards_pct',
  };
  return Number(team[map[bt]] ?? 0);
}

function getAvgValue(team: RollingTeamStat, bt: BetType): string {
  if (bt === 'over_25_goals' || bt === 'btts') return Number(team.avg_total_goals).toFixed(1);
  if (bt === 'over_95_corners') return Number(team.avg_total_corners).toFixed(1);
  if (bt === 'over_35_cards') return Number(team.avg_total_cards).toFixed(1);
  return '';
}

function getAvgLabel(bt: BetType): string {
  if (bt === 'over_25_goals' || bt === 'btts') return 'Avg Goals';
  if (bt === 'over_95_corners') return 'Avg Corners';
  if (bt === 'over_35_cards') return 'Avg Cards';
  return '';
}

const getPercentColor = (v: number) => {
  if (v >= 80) return 'text-success font-black';
  if (v >= 60) return 'text-ice font-bold';
  if (v >= 40) return 'text-amber-400 font-semibold';
  return 'text-destructive';
};

function getRowBandClass(rank: number): string {
  if (rank <= 5) return 'bg-success/12 border-l-2 border-l-success/60';
  if (rank <= 10) return 'bg-primary/10 border-l-2 border-l-primary/60';
  if (rank <= 15) return 'bg-amber-500/8 border-l-2 border-l-amber-500/50';
  return 'bg-muted/5 border-l-2 border-l-muted-foreground/20';
}

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

function teamMatchesFixture(teamName: string, fixture: TodaysFixture): 'home' | 'away' | null {
  if (strictTeamNameMatch(teamName, fixture.home_team)) return 'home';
  if (strictTeamNameMatch(teamName, fixture.away_team)) return 'away';
  return null;
}

function formatKickoff(kickoff: string): string {
  try {
    return new Date(kickoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

const getFormBadge = (char: string) => {
  switch (char) {
    case 'W': return <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center bg-success/20 text-success border border-success/40">W</span>;
    case 'D': return <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center bg-amber-500/20 text-amber-500 border border-amber-500/40">D</span>;
    case 'L': return <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center bg-destructive/20 text-destructive border border-destructive/40">L</span>;
    default: return null;
  }
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
interface PlayingTodayFormTablesProps {
  onNavigate: (section: string) => void;
}

export function PlayingTodayFormTables({ onNavigate }: PlayingTodayFormTablesProps) {
  const [selectedBetType, setSelectedBetType] = useState<BetType>('over_25_goals');
  const [allTeams, setAllTeams] = useState<RollingTeamStat[]>([]);
  const [fixtures, setFixtures] = useState<TodaysFixture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    Promise.all([fetchTeams(), fetchFixtures()])
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('team_rolling_stats')
        .select('id, team_name, team_id, league, region, matches_used, over_25_goals_pct, btts_pct, over_95_corners_pct, over_35_cards_pct, avg_total_goals, avg_total_corners, avg_total_cards, form_string')
        .gte('matches_used', 6)
        .neq('league', 'Friendlies Clubs')
        .neq('league', 'Club Friendly')
        .neq('league', 'Friendlies')
        .neq('region', 'other')
        .limit(1000);
      if (error) { console.error('Error fetching teams:', error); return; }
      if (data) {
        const filtered = (data as RollingTeamStat[]).filter(t =>
          !EXCLUDED_LEAGUE_PATTERNS.some(p => p.test(t.league || '')) && isAllowedTeam(t.team_name)
        );
        setAllTeams(filtered);
      }
    } catch (err) { console.error('Error fetching teams:', err); }
  };

  const fetchFixtures = async () => {
    try {
      const fetchPromise = supabase.functions.invoke('ml-fixtures', { method: 'GET' });
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 12000)
      );
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      if (error) {
        // Fallback
        const today = new Date().toISOString().split('T')[0];
        const { data: alertData } = await supabase
          .from('gaffer_alerts')
          .select('fixture_id, home_team, away_team, league, kickoff')
          .eq('fixture_date', today);
        if (alertData) setFixtures(alertData as TodaysFixture[]);
        return;
      }
      if (data?.success && Array.isArray(data.fixtures)) {
        const clean = data.fixtures
          .filter((f: any) => {
            if (EXCLUDED_LEAGUE_PATTERNS.some(p => p.test(f.league || ''))) return false;
            if (!isAllowedTeam(f.home_team || '') || !isAllowedTeam(f.away_team || '')) return false;
            return true;
          })
          .map((f: any) => ({
            fixture_id: String(f.fixture_id),
            home_team: f.home_team,
            away_team: f.away_team,
            league: f.league || '',
            kickoff: f.kickoff,
          }));
        setFixtures(clean);
      }
    } catch (err) { console.error('Error fetching fixtures:', err); }
  };

  // Cross-reference teams with today's fixtures
  const playingTeams = useMemo((): PlayingTeam[] => {
    if (!fixtures.length || !allTeams.length) return [];

    const normalizedFormTeams = allTeams
      .map((team) => normalizeTeam(team.team_name || ''))
      .filter((name) => name.length >= 4);

    const validFixtures = fixtures.filter((fixture) =>
      hasKnownFormTeam(fixture.home_team || '', normalizedFormTeams) &&
      hasKnownFormTeam(fixture.away_team || '', normalizedFormTeams)
    );

    const result: PlayingTeam[] = [];
    const seen = new Set<string>();

    for (const team of allTeams) {
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

    return result.sort((a, b) => getStatValue(b, selectedBetType) - getStatValue(a, selectedBetType));
  }, [allTeams, fixtures, selectedBetType]);

  const displayTeams = playingTeams.slice(0, 20);

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/8 via-card to-card shadow-xl shadow-primary/8">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-navy flex items-center justify-center shadow-lg shadow-primary/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Playing <span className="text-primary">Today</span></CardTitle>
              <p className="text-sm text-muted-foreground">
                Form stats for today's fixtures • Top 20
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('form-tables')} className="gap-2 hover:bg-primary/10">
            Full Tables <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Explainer Box */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Target className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Pick your market. See who's red hot.</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Fancy <span className="text-primary font-medium">Both Teams to Score</span>? Chasing <span className="text-primary font-medium">Corner Overs</span>? Or backing <span className="text-primary font-medium">goal-heavy thrillers</span>? Simply tap a market below and we'll show you the <span className="text-foreground font-semibold">Top 20 most in-form teams playing today</span> — ranked by real stats from the last 10+ matches. Want the full breakdown? <span className="text-foreground font-medium">Click on any team</span> and I'll work my magic — stats, form, and exactly why they're worth a punt. <span className="italic text-foreground/80">— The Gaffer</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bet Type Tabs */}
        <div className="flex flex-wrap gap-2">
          {BET_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedBetType(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                selectedBetType === tab.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                  : 'bg-card border-border hover:border-primary/40 hover:bg-primary/10 text-muted-foreground'
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Teams Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading today's fixtures...</span>
          </div>
        ) : hasError || displayTeams.length === 0 ? (
          <div className="py-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{hasError ? 'Temporarily unavailable — try again later' : 'No fixtures found for today'}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2rem_1fr_1fr_auto] gap-2 px-3 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>#</span>
              <span>Team</span>
              <span>Fixture</span>
              <span className="text-right">{BET_TABS.find(t => t.id === selectedBetType)?.shortLabel} %</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/30">
              {displayTeams.map((team, idx) => {
                const rank = idx + 1;
                const pct = getStatValue(team, selectedBetType);
                const avg = getAvgValue(team, selectedBetType);
                const form = (team.form_string || '').slice(-5).split('');

                return (
                  <div
                    key={team.id}
                    className={cn(
                      'grid grid-cols-[2rem_1fr_1fr_auto] gap-2 px-3 py-2.5 items-center transition-colors hover:bg-primary/5',
                      getRowBandClass(rank)
                    )}
                  >
                    {/* Rank */}
                    <div className="w-7 h-7 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-ice">{rank}</span>
                    </div>

                    {/* Team */}
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{team.team_name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px]">{getLeagueFlag(team.fixture?.league || team.league)}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{team.fixture?.league || team.league}</span>
                      </div>
                    </div>

                    {/* Fixture */}
                    <div className="min-w-0">
                      <div className="text-sm truncate">
                        <span className="text-muted-foreground">{team.isHome ? 'vs' : '@'}</span>{' '}
                        <span className="font-medium text-foreground/90">{team.opponent}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[11px]">{formatKickoff(team.kickoff)}</span>
                      </div>
                    </div>

                    {/* Hit % */}
                    <span className={cn('text-lg text-right tabular-nums', getPercentColor(pct))}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

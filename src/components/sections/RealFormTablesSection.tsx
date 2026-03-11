/**
 * Form Tables Section – Regional Rankings
 * Flat ranked table of teams by region, with clickable bet-type tabs,
 * Excel-style color-banded rows, and "Playing Today" filter
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Target, Loader2, RefreshCw, Brain, Sparkles, Zap, BarChart3, ChevronUp, ChevronDown, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getLeagueFlag } from '@/lib/countryFlags';
import theGafferImage from '@/assets/the-gaffer.webp';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type Region = 'all' | 'uk' | 'european' | 'asia' | 'americas';

type BetType =
  | 'over_15_goals' | 'over_25_goals' | 'over_35_goals'
  | 'btts'
  | 'over_85_corners' | 'over_95_corners' | 'over_105_corners'
  | 'over_25_cards' | 'over_35_cards' | 'over_45_cards';

interface RollingTeamStat {
  id: string;
  team_name: string;
  team_id: number;
  league: string;
  region: string;
  matches_used: number;
  avg_goals_scored: number;
  avg_goals_conceded: number;
  avg_total_goals: number;
  over_15_goals_pct: number;
  over_25_goals_pct: number;
  over_35_goals_pct: number;
  btts_pct: number;
  clean_sheet_pct: number;
  failed_to_score_pct: number;
  form_string: string;
  wins: number;
  draws: number;
  losses: number;
  avg_xg_for: number;
  avg_xg_against: number;
  avg_shots_for: number;
  avg_shots_on_target: number;
  avg_corners_for: number;
  avg_corners_against: number;
  avg_total_corners: number;
  avg_total_cards: number;
  avg_cards_for: number;
  avg_cards_against: number;
  over_85_corners_pct: number;
  over_95_corners_pct: number;
  over_105_corners_pct: number;
  over_25_cards_pct: number;
  over_35_cards_pct: number;
  over_45_cards_pct: number;
}

interface TodaysPick {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  market: string;
  ml_confidence: number;
  kickoff: string;
  gaffer_reasoning: string;
}

interface TodaysFixture {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const REGIONS: { id: Region; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🌍' },
  { id: 'uk', label: 'UK', icon: '🇬🇧' },
  { id: 'european', label: 'Europe', icon: '🇪🇺' },
  { id: 'asia', label: 'Asia', icon: '🌏' },
  { id: 'americas', label: 'Americas', icon: '🌎' },
];

const BET_TYPES: { id: BetType; label: string; shortLabel: string; category: string }[] = [
  { id: 'over_15_goals', label: 'Over 1.5 Goals', shortLabel: 'O1.5', category: 'Goals' },
  { id: 'over_25_goals', label: 'Over 2.5 Goals', shortLabel: 'O2.5', category: 'Goals' },
  { id: 'over_35_goals', label: 'Over 3.5 Goals', shortLabel: 'O3.5', category: 'Goals' },
  { id: 'over_85_corners', label: 'Over 8.5 Corners', shortLabel: 'O8.5 Crn', category: 'Corners' },
  { id: 'over_95_corners', label: 'Over 9.5 Corners', shortLabel: 'O9.5 Crn', category: 'Corners' },
  { id: 'over_105_corners', label: 'Over 10.5 Corners', shortLabel: 'O10.5 Crn', category: 'Corners' },
  { id: 'over_25_cards', label: 'Over 2.5 Cards', shortLabel: 'O2.5 Crd', category: 'Cards' },
  { id: 'over_35_cards', label: 'Over 3.5 Cards', shortLabel: 'O3.5 Crd', category: 'Cards' },
  { id: 'over_45_cards', label: 'Over 4.5 Cards', shortLabel: 'O4.5 Crd', category: 'Cards' },
];

const DISPLAY_LIMIT = 30;

import {
  UK_ALLOWED_LEAGUES, EUROPEAN_ALLOWED_LEAGUES,
  EXCLUDED_LEAGUE_PATTERNS as EXCLUDED_PATTERNS,
  EXCLUDED_TEAM_PATTERNS,
  isAllowedTeam, isAllowedLeague,
} from '@/lib/teamFilters';

/** Cup competition patterns – used to flag fixtures (not filter teams) */
const CUP_PATTERNS = [/cup/i, /trophy/i, /shield/i, /supercup/i, /super cup/i];
function isCupFixture(leagueName: string): boolean {
  return CUP_PATTERNS.some(p => p.test(leagueName));
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getStatValue(team: RollingTeamStat, bt: BetType): number {
  const map: Record<BetType, keyof RollingTeamStat> = {
    over_15_goals: 'over_15_goals_pct',
    over_25_goals: 'over_25_goals_pct',
    over_35_goals: 'over_35_goals_pct',
    over_85_corners: 'over_85_corners_pct',
    over_85_corners: 'over_85_corners_pct',
    over_95_corners: 'over_95_corners_pct',
    over_105_corners: 'over_105_corners_pct',
    over_25_cards: 'over_25_cards_pct',
    over_35_cards: 'over_35_cards_pct',
    over_45_cards: 'over_45_cards_pct',
  };
  return Number(team[map[bt]] ?? 0);
}

function getSecondaryValue(team: RollingTeamStat, bt: BetType): string {
  if (bt.includes('goals') || bt === 'btts') return Number(team.avg_total_goals).toFixed(1);
  if (bt.includes('corners')) return Number(team.avg_total_corners).toFixed(1);
  if (bt.includes('cards')) return Number(team.avg_total_cards).toFixed(1);
  return '';
}

function getSecondaryLabel(bt: BetType): string {
  if (bt.includes('goals') || bt === 'btts') return 'Avg Goals';
  if (bt.includes('corners')) return 'Avg Corners';
  if (bt.includes('cards')) return 'Avg Cards';
  return '';
}

function getRowBandClass(rank: number): string {
  if (rank <= 10) return 'bg-success/12 border-l-2 border-l-success/60';
  if (rank <= 20) return 'bg-primary/10 border-l-2 border-l-primary/60';
  if (rank <= 30) return 'bg-amber-500/8 border-l-2 border-l-amber-500/50';
  if (rank <= 40) return 'bg-orange-500/6 border-l-2 border-l-orange-500/40';
  return 'bg-muted/5 border-l-2 border-l-muted-foreground/20';
}

function getRankBadge(rank: number): string {
  if (rank <= 10) return 'bg-success/20 text-success border-success/40';
  if (rank <= 20) return 'bg-primary/20 text-primary border-primary/40';
  if (rank <= 30) return 'bg-amber-500/20 text-amber-500 border-amber-500/40';
  return 'bg-muted/30 text-muted-foreground border-border';
}

const getFormBadge = (char: string) => {
  switch (char) {
    case 'W': return <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center bg-success/20 text-success border border-success/40">W</span>;
    case 'D': return <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center bg-amber-500/20 text-amber-500 border border-amber-500/40">D</span>;
    case 'L': return <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center bg-destructive/20 text-destructive border border-destructive/40">L</span>;
    default: return <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center bg-muted text-muted-foreground">-</span>;
  }
};

const getPercentColor = (v: number) => {
  if (v >= 80) return 'text-success font-black';
  if (v >= 60) return 'text-primary font-bold';
  if (v >= 40) return 'text-amber-400 font-semibold';
  return 'text-destructive';
};

/** Match team name against fixture — strict matching to prevent false positives */
function teamMatchesFixture(teamName: string, fixture: TodaysFixture): 'home' | 'away' | null {
  const tn = teamName.toLowerCase().trim();
  const ht = fixture.home_team.toLowerCase().trim();
  const at = fixture.away_team.toLowerCase().trim();

  // Require minimum 4 chars to prevent short substrings matching (e.g. "pau" in "pauli")
  if (tn.length < 4) return null;

  // Exact match first
  if (tn === ht || ht === tn) return 'home';
  if (tn === at || at === tn) return 'away';

  // For substring matching, require the match to be a significant portion
  // and use word-boundary-aware matching to prevent "pau" matching "st. pauli"
  const isSignificantMatch = (needle: string, haystack: string): boolean => {
    if (needle.length < 4) return false;
    // Must match at least 70% of the shorter string's length
    const shorter = Math.min(needle.length, haystack.length);
    if (shorter < 4) return false;
    
    // Check if one fully contains the other AND the contained string is
    // a significant root word (not just a random substring)
    if (haystack.includes(needle)) {
      // The needle must be at least 60% the length of the haystack
      // This prevents "pau" (3) matching "st. pauli" (9) = 33%
      // But allows "leverkusen" (10) matching "bayer leverkusen" (16) = 62%
      return needle.length >= haystack.length * 0.5;
    }
    if (needle.includes(haystack)) {
      return haystack.length >= needle.length * 0.5;
    }
    return false;
  };

  if (isSignificantMatch(tn, ht)) return 'home';
  if (isSignificantMatch(tn, at)) return 'away';

  return null;
}

function formatKickoff(kickoff: string): string {
  try {
    const d = new Date(kickoff);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function RealFormTablesSection() {
  const [selectedRegion, setSelectedRegion] = useState<Region>('uk');
  const [selectedBetType, setSelectedBetType] = useState<BetType>('over_25_goals');
  const [teams, setTeams] = useState<RollingTeamStat[]>([]);
  const [allTeams, setAllTeams] = useState<RollingTeamStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [todaysPicks, setTodaysPicks] = useState<TodaysPick[]>([]);
  const [todaysFixtures, setTodaysFixtures] = useState<TodaysFixture[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<RollingTeamStat | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [playingTodayOnly, setPlayingTodayOnly] = useState(false);

  useEffect(() => { fetchRollingStats(); }, [selectedRegion]);
  useEffect(() => { fetchTodaysPicks(); fetchTodaysFixtures(); fetchAllTeams(); }, []);

  const fetchAllTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('team_rolling_stats')
        .select('*')
        .gte('matches_used', 6)
        .neq('league', 'Friendlies Clubs')
        .neq('league', 'Club Friendly')
        .neq('league', 'Friendlies')
        .neq('region', 'other')
        .order('over_25_goals_pct', { ascending: false })
        .limit(1000);
      if (error) { console.error('Error fetching all teams:', error); return; }
      const filtered = ((data as RollingTeamStat[]) || []).filter(t => isAllowedLeague(t.league, t.region) && isAllowedTeam(t.team_name));
      setAllTeams(filtered);
    } catch (err) { console.error('Error:', err); }
  };

  const fetchRollingStats = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('team_rolling_stats')
        .select('*')
        .gte('matches_used', 6)
        .neq('league', 'Friendlies Clubs')
        .neq('league', 'Club Friendly')
        .neq('league', 'Friendlies')
        .neq('region', 'other')
        .order('over_25_goals_pct', { ascending: false })
        .limit(500);

      if (selectedRegion === 'european') {
        query = query.in('region', ['european', 'uk']);
      } else if (selectedRegion !== 'all') {
        query = query.eq('region', selectedRegion);
      }

      const { data, error } = await query;
      if (error) { console.error('Error fetching rolling stats:', error); setTeams([]); return; }
      const filtered = ((data as RollingTeamStat[]) || []).filter(t => isAllowedLeague(t.league, t.region) && isAllowedTeam(t.team_name));
      setTeams(filtered);
    } catch (err) { console.error('Error:', err); setTeams([]); }
    finally { setIsLoading(false); }
  };

  const fetchTodaysPicks = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('golden_bet_history')
        .select('fixture_id, home_team, away_team, league, market, ml_confidence, kickoff, gaffer_reasoning')
        .eq('prediction_date', today);
      if (data) setTodaysPicks(data as TodaysPick[]);
    } catch (err) { console.error('Error fetching picks:', err); }
  };

  const fetchTodaysFixtures = async () => {
    try {
      // Fetch ALL today's fixtures from ml-fixtures edge function (API-Football)
      const { data, error } = await supabase.functions.invoke('ml-fixtures', {
        method: 'GET',
      });

      if (error) {
        console.error('Error fetching fixtures from ml-fixtures:', error);
        // Fallback to gaffer_alerts if edge function fails
        const today = new Date().toISOString().split('T')[0];
        const { data: alertFixtures } = await supabase
          .from('gaffer_alerts')
          .select('fixture_id, home_team, away_team, league, kickoff')
          .eq('fixture_date', today);
        if (alertFixtures) setTodaysFixtures(alertFixtures as TodaysFixture[]);
        return;
      }

      if (data?.success && Array.isArray(data.fixtures)) {
        const fixtures: TodaysFixture[] = data.fixtures
          .filter((f: any) => {
            // Exclude youth, women, reserve, academy fixtures
            const league = f.league || '';
            const home = f.home_team || '';
            const away = f.away_team || '';
            if (EXCLUDED_PATTERNS.some(p => p.test(league))) return false;
            if (!isAllowedTeam(home) || !isAllowedTeam(away)) return false;
            return true;
          })
          .map((f: any) => ({
            fixture_id: String(f.fixture_id),
            home_team: f.home_team,
            away_team: f.away_team,
            league: f.league || '',
            kickoff: f.kickoff,
          }));
        console.log(`📅 Loaded ${fixtures.length} clean fixtures for today (filtered from ${data.fixtures.length})`);
        setTodaysFixtures(fixtures);
      }
    } catch (err) { console.error('Error fetching fixtures:', err); }
  };

  const getTeamPick = useCallback((teamName: string) => {
    return todaysPicks.find(p =>
      p.home_team.toLowerCase().includes(teamName.toLowerCase()) ||
      p.away_team.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(p.home_team.toLowerCase()) ||
      teamName.toLowerCase().includes(p.away_team.toLowerCase())
    );
  }, [todaysPicks]);

  /** Find fixture for a team playing today */
  const getTeamFixture = useCallback((teamName: string): { fixture: TodaysFixture; side: 'home' | 'away' } | null => {
    for (const f of todaysFixtures) {
      const side = teamMatchesFixture(teamName, f);
      if (side) return { fixture: f, side };
    }
    return null;
  }, [todaysFixtures]);

  /* Sort & filter teams by selected bet type */
  const rankedTeams = useMemo(() => {
    // When "Playing Today" is active, use ALL teams globally (ignore region)
    let source = playingTodayOnly ? [...allTeams] : [...teams];

    // If "Playing Today" is active, only keep teams with a fixture today
    if (playingTodayOnly) {
      source = source.filter(t => {
        for (const f of todaysFixtures) {
          if (teamMatchesFixture(t.team_name, f)) return true;
        }
        return false;
      });
    }

    source.sort((a, b) => {
      const diff = getStatValue(b, selectedBetType) - getStatValue(a, selectedBetType);
      return sortAsc ? -diff : diff;
    });

    // Playing Today: show all that match (up to 20), no minimum required
    return playingTodayOnly ? source.slice(0, 30) : source.slice(0, DISPLAY_LIMIT);
  }, [teams, allTeams, selectedBetType, sortAsc, playingTodayOnly, todaysFixtures]);

  const analyzeTeam = async (team: RollingTeamStat) => {
    setSelectedTeam(team);
    setAiAnalysis(null);
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('form-table-ai', {
        body: {
          teamName: team.team_name, league: team.league,
          stats: {
            matches: team.matches_used, avgGoalsScored: team.avg_goals_scored,
            avgGoalsConceded: team.avg_goals_conceded, avgTotalGoals: team.avg_total_goals,
            over15: team.over_15_goals_pct, over25: team.over_25_goals_pct,
            over35: team.over_35_goals_pct, btts: team.btts_pct,
            cleanSheet: team.clean_sheet_pct, failedToScore: team.failed_to_score_pct,
            form: team.form_string, xgFor: team.avg_xg_for, xgAgainst: team.avg_xg_against,
            avgShots: team.avg_shots_for, avgShotsOnTarget: team.avg_shots_on_target,
          },
        },
      });
      if (error) throw error;
      setAiAnalysis(data?.analysis || 'No analysis available.');
    } catch (err) { console.error('AI analysis error:', err); setAiAnalysis('Unable to generate analysis. Please try again.'); }
    finally { setIsAnalyzing(false); }
  };

  const activeBetType = BET_TYPES.find(b => b.id === selectedBetType)!;
  const regionLabel = REGIONS.find(r => r.id === selectedRegion)?.label ?? 'All';
  const playingTodayCount = useMemo(() => {
    return allTeams.filter(t => todaysFixtures.some(f => teamMatchesFixture(t.team_name, f))).length;
  }, [allTeams, todaysFixtures]);

  return (
    <div className="space-y-4">
      {/* ── Header Card ─────────────────────────────────────────── */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-lg shadow-primary/10">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-navy flex items-center justify-center shadow-lg shadow-primary/20">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  Form Tables <span className="text-primary">L10</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {playingTodayOnly
                    ? `${rankedTeams.length} teams playing today`
                    : `Top ${DISPLAY_LIMIT} ${regionLabel} teams • Rolling 10-game stats`
                  }
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRollingStats} disabled={isLoading} className="border-primary/30 hover:bg-primary/10">
              <RefreshCw className={cn("w-4 h-4 mr-1", isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Region Pills */}
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelectedRegion(r.id); }}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                  selectedRegion === r.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-card border border-border hover:border-primary/40 hover:bg-primary/8"
                )}
              >
                <span className="mr-1.5">{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>

          {/* Bet Type Tabs */}
          <div className="space-y-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Bet Type</span>
            <div className="flex flex-wrap gap-1.5">
              {BET_TYPES.map(bt => (
                <button
                  key={bt.id}
                  onClick={() => setSelectedBetType(bt.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                    selectedBetType === bt.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted/40 border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {bt.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Playing Today Toggle + Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Playing Today */}
            <button
              onClick={() => setPlayingTodayOnly(prev => !prev)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                playingTodayOnly
                  ? "bg-success text-success-foreground shadow-lg shadow-success/25"
                  : "bg-card border border-border hover:border-success/40 hover:bg-success/8 text-muted-foreground"
              )}
            >
              <Calendar className="w-4 h-4" />
              Playing Today
              {playingTodayCount > 0 && (
                <Badge variant="outline" className={cn(
                  "text-[10px] px-1.5 py-0",
                  playingTodayOnly ? "border-success-foreground/40 text-success-foreground" : "border-success/40 text-success"
                )}>
                  {playingTodayCount}
                </Badge>
              )}
            </button>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
              <span className="uppercase tracking-wider font-semibold">Key:</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success/30 border border-success/50" /> Top 10</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary/25 border border-primary/50" /> 11–20</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500/40" /> 21–30</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-500/15 border border-orange-500/30" /> 31–40</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-muted/20 border border-border" /> 41+</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Today's Gaffer Picks ────────────────────────────────── */}
      {todaysPicks.length > 0 && (
        <Card className="border-2 border-gold/30 bg-gradient-to-r from-gold/10 via-card to-card">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <img src={theGafferImage} alt="The Gaffer" className="w-9 h-9 rounded-full border-2 border-gold/50" />
              <div>
                <p className="text-sm font-bold text-gold">The Gaffer's Picks Today</p>
                <p className="text-xs text-muted-foreground">{todaysPicks.length} selections active</p>
              </div>
              <Sparkles className="w-5 h-5 text-gold ml-auto" />
            </div>
            <div className="flex flex-wrap gap-2">
              {todaysPicks.slice(0, 4).map(pick => {
                const marketLabel = pick.market
                  ?.replace(/_/g, ' ')
                  .replace(/over (\d+) (\d+)/i, 'O$1.$2')
                  .replace(/btts/i, 'BTTS');
                return (
                  <Badge key={pick.fixture_id} variant="outline" className="border-gold/40 text-gold bg-gold/5 text-xs py-1">
                    <Target className="w-3 h-3 mr-1" />
                    {pick.home_team} vs {pick.away_team}
                    <span className="ml-1.5 text-gold/60 font-normal">{marketLabel}</span>
                    <span className="ml-1 text-gold/70">({Math.round(pick.ml_confidence * 100)}%)</span>
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Ranking Table ───────────────────────────────────────── */}
      <Card className="border border-border/60 bg-card overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold">
              {playingTodayOnly ? `Playing Today — ${activeBetType.label}` : `${regionLabel} — ${activeBetType.label}`}
            </CardTitle>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              {rankedTeams.length} teams
            </Badge>
          </div>
        </CardHeader>

        {isLoading ? (
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading L10 rolling stats...</p>
          </CardContent>
        ) : rankedTeams.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {playingTodayOnly
                ? 'No teams playing today with available stats. It\'s a quiet day! 🎄'
                : 'No teams found for this region. Rolling stats refresh daily at 5 AM UTC.'
              }
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-12 text-center text-[10px] uppercase">#</TableHead>
                  <TableHead className="text-[10px] uppercase">Team</TableHead>
                  {playingTodayOnly && (
                    <TableHead className="text-[10px] uppercase">Fixture</TableHead>
                  )}
                  {!playingTodayOnly && (
                    <TableHead className="text-[10px] uppercase hidden md:table-cell">Form</TableHead>
                  )}
                  <TableHead className="text-[10px] uppercase hidden sm:table-cell">P</TableHead>
                  <TableHead className="text-center">
                    <button
                      onClick={() => setSortAsc(prev => !prev)}
                      className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-primary hover:text-primary/80"
                    >
                      {activeBetType.shortLabel} %
                      {sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </TableHead>
                  <TableHead className="text-center text-[10px] uppercase hidden sm:table-cell">{getSecondaryLabel(selectedBetType)}</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedTeams.map((team, idx) => {
                  const rank = idx + 1;
                  const statVal = getStatValue(team, selectedBetType);
                  const secVal = getSecondaryValue(team, selectedBetType);
                  const pick = getTeamPick(team.team_name);
                  const fixtureMatch = getTeamFixture(team.team_name);
                  const formChars = (team.form_string || '').split('').slice(0, 5);

                  return (
                    <TableRow
                      key={team.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-primary/8",
                        getRowBandClass(rank),
                        pick && "ring-1 ring-inset ring-gold/30"
                      )}
                      onClick={() => analyzeTeam(team)}
                    >
                      {/* Rank */}
                      <TableCell className="text-center p-2">
                        <span className={cn("inline-flex w-7 h-7 items-center justify-center rounded-md text-xs font-bold border", getRankBadge(rank))}>
                          {rank}
                        </span>
                      </TableCell>

                      {/* Team Name + League */}
                      <TableCell className="p-2 font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[120px] sm:max-w-[180px]">{team.team_name}</span>
                              {pick && (
                                <Badge variant="outline" className="border-gold/40 bg-gold/10 text-gold text-[9px] px-1.5 py-0 shrink-0 whitespace-nowrap">
                                  <Zap className="w-2.5 h-2.5 mr-0.5" />
                                  Gaffer Pick
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[11px]">{getLeagueFlag(fixtureMatch?.fixture?.league || team.league)}</span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[100px] sm:max-w-[140px]">
                                {fixtureMatch?.fixture?.league || team.league}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Fixture (Playing Today mode only) */}
                      {playingTodayOnly && (
                        <TableCell className="p-2 text-xs">
                          {fixtureMatch ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-foreground font-medium whitespace-nowrap">
                                {fixtureMatch.side === 'home'
                                  ? `vs ${fixtureMatch.fixture.away_team}`
                                  : `@ ${fixtureMatch.fixture.home_team}`
                                }
                              </span>
                              <span className="flex items-center gap-1 text-muted-foreground text-[10px]">
                                <Clock className="w-3 h-3" />
                                {formatKickoff(fixtureMatch.fixture.kickoff)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}

                      {/* Form (not shown in Playing Today to save space) */}
                      {!playingTodayOnly && (
                        <TableCell className="p-2 hidden md:table-cell">
                          <div className="flex gap-0.5">
                            {formChars.map((c, i) => <span key={i}>{getFormBadge(c)}</span>)}
                          </div>
                        </TableCell>
                      )}

                      {/* Played */}
                      <TableCell className="p-2 text-xs text-muted-foreground text-center hidden sm:table-cell">
                        {team.matches_used}
                      </TableCell>

                      {/* Main Stat */}
                      <TableCell className="p-2 text-center">
                        <span className={cn("text-sm tabular-nums", getPercentColor(statVal))}>
                          {statVal}%
                        </span>
                      </TableCell>

                      {/* Secondary Stat */}
                      <TableCell className="p-2 text-center text-xs text-muted-foreground tabular-nums hidden sm:table-cell">
                        {secVal}
                      </TableCell>

                      {/* Action hint */}
                      <TableCell className="p-2">
                        <Brain className="w-3.5 h-3.5 text-muted-foreground/40" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ── AI Team Analysis Dialog ─────────────────────────────── */}
      <Dialog open={!!selectedTeam} onOpenChange={(open) => !open && setSelectedTeam(null)}>
        <DialogContent className="max-w-lg border-2 border-primary/30 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-navy flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-primary">{selectedTeam?.team_name}</span>
                <p className="text-xs text-muted-foreground font-normal">{selectedTeam?.league} • L10 Analysis</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedTeam && (
            <div className="space-y-4 mt-2">
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'O2.5', value: `${selectedTeam.over_25_goals_pct}%`, color: getPercentColor(selectedTeam.over_25_goals_pct) },
                  { label: 'BTTS', value: `${selectedTeam.btts_pct}%`, color: getPercentColor(selectedTeam.btts_pct) },
                  { label: 'Avg Goals', value: Number(selectedTeam.avg_total_goals).toFixed(1), color: 'text-primary font-bold' },
                  { label: 'CS %', value: `${selectedTeam.clean_sheet_pct}%`, color: 'text-foreground' },
                ].map((stat, i) => (
                  <div key={i} className="text-center p-2.5 rounded-xl bg-muted/30 border border-border/50">
                    <div className={cn("text-lg", stat.color)}>{stat.value}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Today's Fixture in Dialog */}
              {(() => {
                const fx = getTeamFixture(selectedTeam.team_name);
                if (!fx) return null;
                return (
                  <div className="p-3 rounded-xl bg-success/8 border border-success/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-success" />
                      <span className="text-xs font-bold text-success uppercase">Playing Today</span>
                    </div>
                    <p className="text-sm text-foreground font-medium">
                      {fx.fixture.home_team} vs {fx.fixture.away_team}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatKickoff(fx.fixture.kickoff)} • {fx.fixture.league}
                    </p>
                  </div>
                );
              })()}

              {/* Form */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Form:</span>
                <div className="flex gap-1">
                  {(selectedTeam.form_string || '').split('').slice(0, 10).map((c, i) => (
                    <span key={i}>{getFormBadge(c)}</span>
                  ))}
                </div>
              </div>

              {/* xG Stats - only show when data exists */}
              {(Number(selectedTeam.avg_xg_for) > 0 || Number(selectedTeam.avg_xg_against) > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-primary/8 border border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">xG For (avg)</div>
                    <div className="text-xl font-black text-primary">{Number(selectedTeam.avg_xg_for).toFixed(2)}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-destructive/8 border border-destructive/20">
                    <div className="text-xs text-muted-foreground mb-1">xG Against (avg)</div>
                    <div className="text-xl font-black text-destructive">{Number(selectedTeam.avg_xg_against).toFixed(2)}</div>
                  </div>
                </div>
              )}

              {/* AI Analysis */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[hsl(var(--neon-yellow)/.12)] to-[hsl(var(--neon-yellow)/.04)] border-2 border-[hsl(var(--neon-yellow)/.50)]">
                <div className="flex items-center gap-2 mb-3">
                  <img src={theGafferImage} alt="The Gaffer" className="w-8 h-8 rounded-full border-2 border-[hsl(var(--neon-yellow)/.60)]" />
                  <span className="text-xs font-bold text-neon-yellow uppercase tracking-wider">The Gaffer's AI Analysis</span>
                </div>
                {isAnalyzing ? (
                  <div className="flex items-center gap-2 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-neon-yellow" />
                    <span className="text-sm text-muted-foreground">Analyzing form data...</span>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{aiAnalysis}</p>
                )}
              </div>

              {/* Gaffer Pick Callout */}
              {(() => {
                const pick = getTeamPick(selectedTeam.team_name);
                if (!pick) return null;
                return (
                  <div className="p-3 rounded-xl bg-gold/10 border-2 border-gold/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-gold" />
                      <span className="text-xs font-bold text-gold uppercase">Gaffer's Recommended Bet</span>
                    </div>
                    <p className="text-sm text-foreground">{pick.home_team} vs {pick.away_team} • {pick.market}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Confidence: <span className="text-gold font-bold">{Math.round(pick.ml_confidence * 100)}%</span>
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

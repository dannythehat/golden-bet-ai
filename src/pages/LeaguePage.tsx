import { useEffect, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MAJOR_LEAGUES } from '@/config/majorLeagues';
import { getLeagueFlag } from '@/lib/countryFlags';
import { formatTeamName } from '@/lib/teamNames';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Target, Flag, Square, Trophy, TrendingUp } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const leagueSlug = (l: { name: string; country: string }) =>
  `${slugify(l.country)}-${slugify(l.name)}`;

interface TeamRow {
  team_name: string;
  avg_total_goals: number | null;
  over_25_goals_pct: number | null;
  btts_pct: number | null;
  avg_total_corners: number | null;
  over_95_corners_pct: number | null;
  avg_total_cards: number | null;
  over_35_cards_pct: number | null;
  form_string: string | null;
}

function setMeta(title: string, description: string, canonical: string) {
  document.title = title;
  const ensure = (selector: string, create: () => HTMLElement) => {
    let el = document.head.querySelector(selector) as HTMLElement | null;
    if (!el) { el = create(); document.head.appendChild(el); }
    return el;
  };
  const desc = ensure('meta[name="description"]', () => {
    const m = document.createElement('meta'); m.setAttribute('name', 'description'); return m;
  });
  desc.setAttribute('content', description);
  const can = ensure('link[rel="canonical"]', () => {
    const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l;
  });
  can.setAttribute('href', canonical);
  const og = (prop: string, content: string) => {
    const el = ensure(`meta[property="${prop}"]`, () => {
      const m = document.createElement('meta'); m.setAttribute('property', prop); return m;
    });
    el.setAttribute('content', content);
  };
  og('og:title', title);
  og('og:description', description);
  og('og:url', canonical);
  og('og:type', 'website');
}

function StatRow({ icon, label, leader, value, suffix }: { icon: React.ReactNode; label: string; leader?: string; value?: string; suffix?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card/60 border border-border/40">
      <div className="flex items-center gap-2 min-w-0">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-sm font-semibold text-foreground truncate">{leader || '—'}</div>
        </div>
      </div>
      {value && <div className="text-base font-black text-foreground tabular-nums">{value}{suffix}</div>}
    </div>
  );
}

export default function LeaguePage() {
  const { slug } = useParams<{ slug: string }>();
  const league = useMemo(() => MAJOR_LEAGUES.find(l => leagueSlug(l) === slug), [slug]);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['league-rolling', league?.id],
    enabled: !!league,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data } = await supabase
        .from('team_rolling_stats')
        .select('team_name,avg_total_goals,over_25_goals_pct,btts_pct,avg_total_corners,over_95_corners_pct,avg_total_cards,over_35_cards_pct,form_string')
        .or(`league_id.eq.${league!.id},league.eq.${league!.name}`)
        .gte('matches_used', 5)
        .limit(60);
      return (data || []) as TeamRow[];
    },
  });

  const flag = league ? getLeagueFlag(league.name) : '';
  const canonical = league ? `https://thefootyoracle.com/league/${leagueSlug(league)}` : '';

  const insights = useMemo(() => {
    if (!teams?.length) return null;
    const by = <K extends keyof TeamRow>(k: K) => [...teams].filter(t => t[k] != null).sort((a, b) => (Number(b[k]) - Number(a[k])));
    const topGoals = by('avg_total_goals')[0];
    const topBTTS = by('btts_pct')[0];
    const topCorners = by('avg_total_corners')[0];
    const topCards = by('avg_total_cards')[0];
    const topOver25 = by('over_25_goals_pct')[0];
    const avgGoals = teams.reduce((s, t) => s + (t.avg_total_goals || 0), 0) / teams.length;
    const avgCorners = teams.reduce((s, t) => s + (t.avg_total_corners || 0), 0) / teams.length;
    const avgCards = teams.reduce((s, t) => s + (t.avg_total_cards || 0), 0) / teams.length;
    return { topGoals, topBTTS, topCorners, topCards, topOver25, avgGoals, avgCorners, avgCards };
  }, [teams]);

  useEffect(() => {
    if (!league) return;
    const title = `${league.name} Betting Tips & Stats | ${league.country} | The Footy Oracle`;
    const desc = insights
      ? `${league.name} betting stats: ${insights.topGoals?.team_name && formatTeamName(insights.topGoals.team_name)} lead for goals (${insights.topGoals?.avg_total_goals?.toFixed(2)}/game). League avg ${insights.avgGoals.toFixed(2)} goals, ${insights.avgCorners.toFixed(1)} corners, ${insights.avgCards.toFixed(1)} cards. AI-picked combos daily.`
      : `${league.name} (${league.country}) betting tips, form tables, goals, corners, cards & BTTS stats. AI-picked combos daily from The Gaffer.`;
    setMeta(title, desc, canonical);
  }, [league, insights, canonical]);

  if (!slug) return <Navigate to="/" replace />;
  if (!league) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">League not found</h1>
          <Link to="/" className="text-primary underline">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation activeSection={'home' as any} onSectionChange={() => { window.location.href = '/'; }} />
      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="space-y-3">
          <Badge variant="outline" className="text-xs">{league.country}</Badge>
          <h1 className="text-3xl md:text-4xl font-black text-foreground flex items-center gap-3">
            <span className="text-3xl" aria-hidden>{flag}</span>
            {league.name} Betting Tips & Stats
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Live form tables, rolling team stats and AI-picked combos for the {league.name} ({league.country}). 
            Updated daily by The Gaffer — built from the last 10 matches per team across goals, corners, cards and BTTS markets.
          </p>
        </header>

        {isLoading && <div className="text-muted-foreground text-sm">Loading {league.name} stats...</div>}

        {insights && (
          <section className="grid gap-3 md:grid-cols-2">
            <Card className="p-4 space-y-3 bg-gradient-to-br from-bet-goals/10 to-card border-bet-goals/30">
              <h2 className="text-sm font-bold uppercase tracking-wider text-bet-goals flex items-center gap-2"><Target className="w-4 h-4" />Goals Market</h2>
              <StatRow icon={<Trophy className="w-5 h-5 text-bet-goals" />} label="Most goals per game" leader={insights.topGoals && formatTeamName(insights.topGoals.team_name)} value={insights.topGoals?.avg_total_goals?.toFixed(2)} />
              <StatRow icon={<TrendingUp className="w-5 h-5 text-bet-goals" />} label="Highest Over 2.5 rate" leader={insights.topOver25 && formatTeamName(insights.topOver25.team_name)} value={insights.topOver25?.over_25_goals_pct?.toFixed(0)} suffix="%" />
              <StatRow icon={<Target className="w-5 h-5 text-bet-goals" />} label="Top BTTS team" leader={insights.topBTTS && formatTeamName(insights.topBTTS.team_name)} value={insights.topBTTS?.btts_pct?.toFixed(0)} suffix="%" />
              <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">League avg: <span className="text-foreground font-semibold">{insights.avgGoals.toFixed(2)}</span> goals/game</p>
            </Card>

            <Card className="p-4 space-y-3 bg-gradient-to-br from-bet-corners/10 to-card border-bet-corners/30">
              <h2 className="text-sm font-bold uppercase tracking-wider text-bet-corners flex items-center gap-2"><Flag className="w-4 h-4" />Corners Market</h2>
              <StatRow icon={<Trophy className="w-5 h-5 text-bet-corners" />} label="Most corners per game" leader={insights.topCorners && formatTeamName(insights.topCorners.team_name)} value={insights.topCorners?.avg_total_corners?.toFixed(1)} />
              <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">League avg: <span className="text-foreground font-semibold">{insights.avgCorners.toFixed(1)}</span> corners/game</p>
            </Card>

            <Card className="p-4 space-y-3 bg-gradient-to-br from-bet-cards/10 to-card border-bet-cards/30 md:col-span-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-bet-cards flex items-center gap-2"><Square className="w-4 h-4" />Cards Market</h2>
              <StatRow icon={<Trophy className="w-5 h-5 text-bet-cards" />} label="Most cards per game" leader={insights.topCards && formatTeamName(insights.topCards.team_name)} value={insights.topCards?.avg_total_cards?.toFixed(1)} />
              <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">League avg: <span className="text-foreground font-semibold">{insights.avgCards.toFixed(1)}</span> cards/game</p>
            </Card>
          </section>
        )}

        {teams && teams.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">All teams — last 10 form</h2>
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">Team</th>
                    <th className="text-right p-2">Goals</th>
                    <th className="text-right p-2">O2.5</th>
                    <th className="text-right p-2">BTTS</th>
                    <th className="text-right p-2">Corners</th>
                    <th className="text-right p-2">Cards</th>
                  </tr>
                </thead>
                <tbody>
                  {teams
                    .slice()
                    .sort((a, b) => (b.avg_total_goals || 0) - (a.avg_total_goals || 0))
                    .map((t) => (
                    <tr key={t.team_name} className="border-t border-border/30">
                      <td className="p-2 font-semibold text-foreground">{formatTeamName(t.team_name)}</td>
                      <td className="p-2 text-right tabular-nums">{t.avg_total_goals?.toFixed(2) || '—'}</td>
                      <td className="p-2 text-right tabular-nums">{t.over_25_goals_pct ? `${t.over_25_goals_pct.toFixed(0)}%` : '—'}</td>
                      <td className="p-2 text-right tabular-nums">{t.btts_pct ? `${t.btts_pct.toFixed(0)}%` : '—'}</td>
                      <td className="p-2 text-right tabular-nums">{t.avg_total_corners?.toFixed(1) || '—'}</td>
                      <td className="p-2 text-right tabular-nums">{t.avg_total_cards?.toFixed(1) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="space-y-2 pt-4 border-t border-border/40">
          <h2 className="text-lg font-bold text-foreground">Explore more leagues</h2>
          <div className="flex flex-wrap gap-2">
            {MAJOR_LEAGUES.filter(l => l.priority === 1 && l.id !== league.id).slice(0, 12).map(l => (
              <Link key={l.id} to={`/league/${leagueSlug(l)}`} className="text-xs px-3 py-1.5 rounded-full bg-card border border-border/40 hover:border-primary/50 hover:bg-primary/10 transition-colors text-foreground">
                {getLeagueFlag(l.name)} {l.name}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Flag, CreditCard, Trophy, ArrowRight, Sparkles, Loader2, Layers, Radio, RefreshCw, BookOpen, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
const GoldenBetCard = lazy(() => import('@/components/GoldenBetCard').then(m => ({ default: m.GoldenBetCard })));
const MonthlyPLTable = lazy(() => import('@/components/MonthlyPLTable').then(m => ({ default: m.MonthlyPLTable })));
import { useGoldenBets } from '@/hooks/useGoldenBets';
import { usePLHistory } from '@/hooks/usePLHistory';
import { useInPlayStats, LiveFixtureStats } from '@/hooks/useInPlayStats';
import { cn } from '@/lib/utils';
const theGafferImage = '/images/the-gaffer.webp';
import { formatTeamName } from '@/lib/teamNames';
import { getMarketLabel, getMarketIcon, normalizeMarketKey } from '@/lib/marketDisplay';

interface HomeSectionProps {
  onNavigate: (section: string) => void;
}

function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/fc|cf|sc|ac|as|us|ss|afc|rfc$/gi, '').replace(/^fc|^cf|^sc|^ac|^as|^us|^ss|^afc|^rfc/gi, '').replace(/[^a-z0-9]/g, '').trim();
}

function findLiveStatsForMatch(homeTeam: string, awayTeam: string, liveFixtures: LiveFixtureStats[], fixtureId?: string | number): LiveFixtureStats | undefined {
  if (fixtureId !== undefined && fixtureId !== null) {
    const idNum = typeof fixtureId === 'number' ? fixtureId : Number(fixtureId);
    if (Number.isFinite(idNum)) {
      const byId = liveFixtures.find(live => live.fixture_id === idNum);
      if (byId) return byId;
    }
  }
  const homeNorm = normalizeTeam(homeTeam);
  const awayNorm = normalizeTeam(awayTeam);
  const includesMatch = (a: string, b: string) => a.includes(b) || b.includes(a);
  return liveFixtures.find(live => {
    const liveHome = normalizeTeam(live.home_team);
    const liveAway = normalizeTeam(live.away_team);
    const direct = includesMatch(homeNorm, liveHome) && includesMatch(awayNorm, liveAway);
    const swapped = includesMatch(homeNorm, liveAway) && includesMatch(awayNorm, liveHome);
    return direct || swapped;
  });
}

// Map bet to its page
function getPageForMarket(market: string): string {
  const norm = normalizeMarketKey(market);
  if (norm.includes('corner')) return '/over-corners';
  if (norm.includes('card')) return '/over-cards';
  return '/over-goals';
}

// Market color CSS var
function getColorForMarket(market: string): string {
  const norm = normalizeMarketKey(market);
  if (norm.includes('corner')) return '--bet-corners';
  if (norm.includes('card')) return '--bet-cards';
  return '--bet-goals';
}

export function HomeSection({ onNavigate }: HomeSectionProps) {
  const { bets: goldenBets, isLoading: betsLoading } = useGoldenBets();
  const { stats, isLoading: plLoading } = usePLHistory();
  const { liveFixtures, isLoading: liveLoading, lastUpdated, fetchLiveStats } = useInPlayStats();

  const { data: latestPost } = useQuery({
    queryKey: ['latest-blog-post'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('slug, title, category, reading_time_minutes, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  const categoryLabels: Record<string, string> = {
    'match-preview': '⚽ Match Preview',
    'weekly-roundup': '📊 Weekly Roundup',
    'guide': '📚 Guide',
    'analysis': '🔬 Analysis',
    'ai-ml-insight': '🤖 AI Insight',
    'morning-briefing': '🌅 Morning Briefing',
    'challenge': '🏆 Challenge',
    'betting-news': '📰 Betting News',
  };

  // Bet type page cards config
  const betTypePages = [
    { path: '/over-goals', label: 'Over Goals', icon: <Target className="w-5 h-5" />, colorVar: '--bet-goals', desc: 'Over 2.5 Goals specialist picks' },
    { path: '/over-corners', label: 'Over Corners', icon: <Flag className="w-5 h-5" />, colorVar: '--bet-corners', desc: 'Over 9.5 Corners specialist picks' },
    { path: '/over-cards', label: 'Over Cards', icon: <CreditCard className="w-5 h-5" />, colorVar: '--bet-cards', desc: 'Over 3.5 Cards specialist picks' },
  ];

  return (
    <div className="space-y-10">
      {/* Latest Blog Post Teaser */}
      {latestPost && (
        <a
          href={`/blog/${latestPost.slug}`}
          className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all duration-200 no-underline"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 shrink-0">
            <BookOpen className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Latest from The Gaffer</span>
              {latestPost.category && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary/80 bg-transparent hidden sm:inline-flex">
                  {categoryLabels[latestPost.category] ?? latestPost.category}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
              {latestPost.title}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
            {latestPost.reading_time_minutes && (
              <span className="hidden sm:flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                {latestPost.reading_time_minutes}m
              </span>
            )}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </a>
      )}

      {/* Monthly P&L Summary Table — Golden Bets only */}
      <Suspense fallback={<div className="rounded-2xl border border-border/50 bg-card/60 p-6 animate-pulse h-40" />}>
        {plLoading ? (
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-muted rounded w-1/2 mx-auto" />
              <div className="h-40 bg-muted rounded" />
            </div>
          </div>
        ) : (
          <MonthlyPLTable
            goldenBets={{
              name: 'Golden Bets',
              wins: stats.monthly.wins,
              losses: stats.monthly.losses,
              profit: stats.monthly.netProfit,
              staked: stats.monthly.totalStaked,
            }}
            monthName={new Date().toLocaleString('en-GB', { month: 'long' })}
            isLoading={false}
            onViewFullPL={() => onNavigate('pnl')}
          />
        )}
      </Suspense>

      {/* The Gaffer Hero Section */}
      <div className="relative overflow-hidden rounded-3xl oracle-card shadow-xl shadow-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-dark/30 via-transparent to-primary/8" />
        <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 md:p-10">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <img src={theGafferImage} alt="The Gaffer - AI Betting Intelligence" className="relative w-40 h-40 md:w-52 md:h-52 rounded-2xl object-cover border-2 border-primary/40 shadow-2xl" fetchPriority="high" width={208} height={208} />
            <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-primary text-white text-xs font-bold shadow-lg">
              <Sparkles className="w-3 h-3 inline mr-1" />AI CORE
            </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
              <Sparkles className="w-4 h-4 text-ice animate-pulse" />
              <span className="text-sm font-medium text-ice">AI-Powered Betting Intelligence</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground drop-shadow-sm">The Gaffer</h1>
            <p className="text-lg text-foreground/90 max-w-xl">
              Your AI betting analyst with the tactical brain of a seasoned football manager. 
              I crunch the numbers, spot the value, and deliver picks like a true gaffer — 
              <span className="text-primary font-semibold"> straight-talking, data-driven, one of the lads.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Today's 3 Golden Bets — 1 per market type */}
      <Card className="border-2 border-gold/30 bg-gradient-to-br from-gold/8 via-card to-card shadow-xl shadow-gold/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shadow-lg shadow-gold/20">
                <Trophy className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">The Gaffer's <span className="text-gold">Golden Picks</span></CardTitle>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  Today's #1 pick from each market
                  {liveFixtures.length > 0 && (
                    <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-500 border-green-500/30 text-xs">
                      <Radio className="w-3 h-3 animate-pulse" />
                      {liveFixtures.length} LIVE
                    </Badge>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground hidden md:block">
                  Updated: {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Button variant="ghost" size="icon" onClick={fetchLiveStats} disabled={liveLoading} className="h-8 w-8" title="Refresh live stats">
                <RefreshCw className={cn("w-4 h-4", liveLoading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {betsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">The Gaffer is analyzing fixtures...</span>
            </div>
          ) : goldenBets.length > 0 ? (
            <Suspense fallback={<div className="grid md:grid-cols-3 gap-4">{[0,1,2].map(i => <div key={i} className="h-48 rounded-xl bg-muted/40 animate-pulse" />)}</div>}>
              <div className="grid md:grid-cols-3 gap-4">
                {goldenBets.slice(0, 3).map((bet, index) => {
                  const liveStats = findLiveStatsForMatch(bet.homeTeam, bet.awayTeam, liveFixtures, bet.fixtureId);
                  const pagePath = getPageForMarket(bet.market);
                  const colorVar = getColorForMarket(bet.market);
                  return (
                    <div key={bet.id} className="relative">
                      <GoldenBetCard bet={bet} index={index} liveStats={liveStats} />
                      {/* Link to dedicated page */}
                      <a href={pagePath} className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg border transition-all hover:opacity-80" style={{ color: `hsl(var(${colorVar}))`, borderColor: `hsl(var(${colorVar}) / 0.3)`, background: `hsl(var(${colorVar}) / 0.1)` }}>
                        See all picks <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </Suspense>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No picks available yet today — check back after 6 AM UTC.</div>
          )}
        </CardContent>
      </Card>

      {/* Bet Type Pages — 3 colour-coded cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {betTypePages.map(page => (
          <a key={page.path} href={page.path} className="group rounded-2xl border-2 p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl no-underline" style={{ borderColor: `hsl(var(${page.colorVar}) / 0.3)`, background: `linear-gradient(135deg, hsl(var(${page.colorVar}) / 0.1), hsl(var(--card)))` }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: `hsl(var(${page.colorVar}))` }}>
                {page.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">{page.label}</h3>
                <p className="text-xs text-muted-foreground">{page.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all" style={{ color: `hsl(var(${page.colorVar}))` }}>
              Gold • Silver • Bronze Picks <ArrowRight className="w-4 h-4" />
            </div>
          </a>
        ))}
      </div>

      {/* Also from The Gaffer — compact buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild variant="outline" size="lg" className="gap-2 border-primary/40 hover:border-primary hover:bg-primary/10">
          <a href="/bet-builder">
            <Layers className="w-4 h-4" />
            Bet Builder of the Day
            <ArrowRight className="w-4 h-4" />
          </a>
        </Button>
        <Button asChild variant="outline" size="lg" className="gap-2 border-primary/40 hover:border-primary hover:bg-primary/10">
          <a href="/acca-delight">
            <Sparkles className="w-4 h-4" />
            Accas Delight
            <ArrowRight className="w-4 h-4" />
          </a>
        </Button>
        <Button asChild variant="outline" size="lg" className="gap-2 border-primary/40 hover:border-primary hover:bg-primary/10">
          <a href="/blog">
            <BookOpen className="w-4 h-4" />
            Blog &amp; Analysis
            <ArrowRight className="w-4 h-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

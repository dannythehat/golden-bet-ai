import { lazy, Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Flag, CreditCard, ArrowRight, Sparkles, Layers, BookOpen, Clock, TrendingUp, Brain, BarChart3, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
const MonthlyPLTable = lazy(() => import('@/components/MonthlyPLTable').then(m => ({ default: m.MonthlyPLTable })));
import { usePLHistory } from '@/hooks/usePLHistory';
import { useBetBuilderPL } from '@/hooks/useBetBuilderPL';
import { useAccaPL } from '@/hooks/useAccaPL';
import { cn } from '@/lib/utils';
import { COMBO_BET_STAKE, MARKET_DAILY_STAKE, SINGLE_BET_STAKE } from '@/lib/plModel';
const theGafferImage = '/images/the-gaffer.webp';

interface HomeSectionProps {
  onNavigate: (section: string) => void;
}

export function HomeSection({ onNavigate }: HomeSectionProps) {
  const { marketStats, yesterdayStats, isLoading: plLoading } = usePLHistory();
  const { stats: bbStats, isLoading: bbLoading } = useBetBuilderPL();
  const { stats: accaStats, isLoading: accaLoading } = useAccaPL();
  const anyLoading = plLoading || bbLoading || accaLoading;

  // Fetch latest 3 blog posts
  const { data: latestPosts } = useQuery({
    queryKey: ['latest-blog-posts-3'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('slug, title, category, reading_time_minutes, published_at, excerpt, hero_image_url')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(3);
      return data || [];
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

  const monthlyRows = [
    {
      path: '/over-goals',
      label: 'Over 2.5 Goals',
      icon: <Target className="w-5 h-5" />,
      iconClass: 'bg-bet-goals/20 text-foreground border border-bet-goals/40',
      panelClass: 'border-bet-goals/35 bg-gradient-to-br from-bet-goals/10 to-card',
      desc: `3 picks · 3 doubles + 1 treble · £${COMBO_BET_STAKE.toFixed(2)} each · £${MARKET_DAILY_STAKE.toFixed(0)} total`,
      stats: marketStats.monthly.goals,
    },
    {
      path: '/over-corners',
      label: 'Over 8.5 Corners',
      icon: <Flag className="w-5 h-5" />,
      iconClass: 'bg-bet-corners/20 text-foreground border border-bet-corners/40',
      panelClass: 'border-bet-corners/35 bg-gradient-to-br from-bet-corners/10 to-card',
      desc: `3 picks · 3 doubles + 1 treble · £${COMBO_BET_STAKE.toFixed(2)} each · £${MARKET_DAILY_STAKE.toFixed(0)} total`,
      stats: marketStats.monthly.corners,
    },
    {
      path: '/over-cards',
      label: 'Over 3.5 Cards',
      icon: <CreditCard className="w-5 h-5" />,
      iconClass: 'bg-bet-cards/20 text-foreground border border-bet-cards/40',
      panelClass: 'border-bet-cards/35 bg-gradient-to-br from-bet-cards/10 to-card',
      desc: `3 picks · 3 doubles + 1 treble · £${COMBO_BET_STAKE.toFixed(2)} each · £${MARKET_DAILY_STAKE.toFixed(0)} total`,
      stats: marketStats.monthly.cards,
    },
    {
      path: '/bet-builder',
      label: 'Bet Builder',
      icon: <Layers className="w-5 h-5" />,
      iconClass: 'bg-bet-builder/20 text-foreground border border-bet-builder/40',
      panelClass: 'border-bet-builder/35 bg-gradient-to-br from-bet-builder/10 to-card',
      desc: `Same-game combo · fixed £${SINGLE_BET_STAKE.toFixed(0)} stake`,
      stats: bbStats.monthly,
    },
    {
      path: '/acca-delight',
      label: 'Accas Delight',
      icon: <Sparkles className="w-5 h-5" />,
      iconClass: 'bg-bet-acca/20 text-foreground border border-bet-acca/40',
      panelClass: 'border-bet-acca/35 bg-gradient-to-br from-bet-acca/10 to-card',
      desc: `3-leg ACCA · fixed £${SINGLE_BET_STAKE.toFixed(0)} stake`,
      stats: accaStats.monthly,
    },
  ];

  const combinedMonthlyProfit = monthlyRows.reduce((sum, row) => sum + row.stats.netProfit, 0);
  const combinedMonthlyStaked = monthlyRows.reduce((sum, row) => sum + row.stats.totalStaked, 0);
  const combinedMonthlyROI = combinedMonthlyStaked > 0 ? (combinedMonthlyProfit / combinedMonthlyStaked) * 100 : 0;
  const combinedMonthlyWins = monthlyRows.reduce((sum, row) => sum + row.stats.wins, 0);
  const combinedMonthlyLosses = monthlyRows.reduce((sum, row) => sum + row.stats.losses, 0);

  // Yesterday's combined P&L
  const yGoals = yesterdayStats.marketBreakdown.goals;
  const yCorners = yesterdayStats.marketBreakdown.corners;
  const yCards = yesterdayStats.marketBreakdown.cards;
  const yBB = bbStats.yesterday;
  const yAcca = accaStats.yesterday;
  const yesterdayProfit = yGoals.netProfit + yCorners.netProfit + yCards.netProfit + yBB.netProfit + yAcca.netProfit;
  const yesterdayHasData = yesterdayStats.totalBets > 0 || yBB.totalBets > 0 || yAcca.totalBets > 0;

  return (
    <div className="space-y-10">
      {/* The Gaffer Hero */}
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
              3 specialist markets. 9 daily picks. Full transparency.
              <span className="text-primary font-semibold"> Data-driven, straight-talking, one of the lads.</span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6 shadow-lg shadow-primary/5 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Month to date</p>
            <h2 className="text-2xl md:text-3xl font-black text-foreground">Simple P&amp;L at a glance</h2>
            <p className="text-sm text-muted-foreground">All five bet types use one fixed model: £2.50 combo legs for the daily markets, £10 for Bet Builder and £10 for ACCA.</p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/80 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Combined month-to-date</div>
            <div className={cn('text-3xl font-black tabular-nums', combinedMonthlyProfit >= 0 ? 'text-success' : 'text-destructive')}>
              {combinedMonthlyProfit >= 0 ? '+' : ''}£{combinedMonthlyProfit.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="text-success font-semibold">{combinedMonthlyWins}W</span>
              <span className="mx-1">·</span>
              <span className="text-destructive font-semibold">{combinedMonthlyLosses}L</span>
              <span className="mx-1">·</span>
              <span className={cn('font-semibold', combinedMonthlyProfit >= 0 ? 'text-success' : 'text-destructive')}>
                {combinedMonthlyProfit >= 0 ? '+' : ''}{combinedMonthlyROI.toFixed(1)}% ROI
              </span>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {monthlyRows.map(card => {
          const isProfit = card.stats.netProfit >= 0;
          const hasBets = card.stats.totalBets > 0;

          return (
            <a
              key={card.path}
              href={card.path}
              className={cn('group rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl no-underline flex flex-col', card.panelClass)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-lg', card.iconClass)}>
                  {card.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{card.label}</h3>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </div>
              </div>

              {/* P&L stats */}
              {hasBets ? (
                <div className="mt-auto pt-3 border-t border-border/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Month to date</span>
                    <span className={cn(
                      "text-lg font-black tabular-nums",
                      isProfit ? "text-success" : "text-destructive"
                    )}>
                      {isProfit ? '+' : ''}£{card.stats.netProfit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      <span className="text-success font-semibold">{card.stats.wins}W</span>
                      <span className="mx-1">·</span>
                      <span className="text-destructive font-semibold">{card.stats.losses}L</span>
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">£{card.stats.totalStaked.toFixed(2)} staked</span>
                  </div>
                </div>
              ) : (
                <div className="mt-auto pt-3 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">No settled bets month to date</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all mt-3">
                View picks & full P&L <ArrowRight className="w-4 h-4" />
              </div>
            </a>
          );
        })}
      </div>
      </div>

      <Suspense fallback={<div className="rounded-2xl border border-border/50 bg-card/60 p-6 animate-pulse h-40" />}>
        <MonthlyPLTable
          goals={{ wins: marketStats.monthly.goals.wins, losses: marketStats.monthly.goals.losses, profit: marketStats.monthly.goals.netProfit, staked: marketStats.monthly.goals.totalStaked }}
          corners={{ wins: marketStats.monthly.corners.wins, losses: marketStats.monthly.corners.losses, profit: marketStats.monthly.corners.netProfit, staked: marketStats.monthly.corners.totalStaked }}
          cards={{ wins: marketStats.monthly.cards.wins, losses: marketStats.monthly.cards.losses, profit: marketStats.monthly.cards.netProfit, staked: marketStats.monthly.cards.totalStaked }}
          betBuilder={{ wins: bbStats.monthly.wins, losses: bbStats.monthly.losses, profit: bbStats.monthly.netProfit, staked: bbStats.monthly.totalStaked }}
          acca={{ wins: accaStats.monthly.wins, losses: accaStats.monthly.losses, profit: accaStats.monthly.netProfit, staked: accaStats.monthly.totalStaked }}
          monthName={new Date().toLocaleString('en-GB', { month: 'long' })}
          isLoading={anyLoading}
          onViewFullPL={() => onNavigate('pnl')}
        />
      </Suspense>

      {/* How It Works */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground text-center">How It <span className="text-primary">Works</span></h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground">AI Scans 200+ Leagues</h3>
            <p className="text-sm text-muted-foreground">Machine learning models trained on 15+ years of data analyse form, xG, referee tendencies, and market odds every morning.</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground">9 Picks Daily</h3>
            <p className="text-sm text-muted-foreground">3 picks per market — Goals, Corners, Cards — ranked Gold, Silver, Bronze by confidence. Each market plays 3 doubles + 1 treble.</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground">Full Transparency</h3>
            <p className="text-sm text-muted-foreground">Every bet tracked with real results, bet proofs, and detailed P&L. No hidden losses — everything is on the record.</p>
          </div>
        </div>
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
      </div>

      {/* Latest from the Blog */}
      {latestPosts && latestPosts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Latest from <span className="text-primary">The Gaffer</span></h2>
            <a href="/blog" className="text-sm text-primary hover:text-primary/80 font-semibold flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {latestPosts.map(post => (
              <a
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group rounded-2xl border border-border/50 bg-card/60 overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all no-underline"
              >
                {post.hero_image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.hero_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {post.category && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary/80 bg-transparent">
                        {categoryLabels[post.category] ?? post.category}
                      </Badge>
                    )}
                    {post.reading_time_minutes && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {post.reading_time_minutes}m
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

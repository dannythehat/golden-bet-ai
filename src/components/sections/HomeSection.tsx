import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Clock, Trophy, Newspaper, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorldCupTeaser } from '@/components/WorldCupTeaser';
import { FantasyLeagueBanner } from '@/components/FantasyLeagueBanner';
import { LivePickTracker } from '@/components/LivePickTracker';
import { cleanTitle, cleanExcerpt } from '@/lib/cleanAiText';

const theGafferImage = '/images/the-gaffer.png';

interface HomeSectionProps {
  onNavigate: (section: string) => void;
}

export function HomeSection({ onNavigate }: HomeSectionProps) {
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

  return (
    <div className="space-y-10">
      <LivePickTracker />
      <FantasyLeagueBanner />
      <WorldCupTeaser />

      {/* The Gaffer Hero */}
      <div className="relative overflow-hidden rounded-3xl oracle-card shadow-xl shadow-primary/5">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-dark/30 via-transparent to-primary/8" />
        <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 md:p-10">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
            <img src={theGafferImage} alt="The Gaffer" className="relative w-40 h-40 md:w-52 md:h-52 rounded-2xl object-cover border-2 border-primary/40 shadow-2xl" style={{ objectPosition: '58% 20%' }} fetchPriority="high" width={208} height={208} />
            <div className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full bg-primary text-white text-xs font-bold shadow-lg">
              <Sparkles className="w-3 h-3 inline mr-1" />The Boss
            </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
              <Sparkles className="w-4 h-4 text-ice animate-pulse" />
              <span className="text-sm font-medium text-ice">The Footy Oracle Club</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground drop-shadow-sm">The Gaffer</h1>
            <p className="text-lg text-foreground/90 max-w-xl">
              The fictional manager who runs the Club. Daily articles, weekly winners,
              proper banter and a Fantasy League where you can take him on.
              <span className="text-primary font-semibold"> Straight-talking, one of the lads.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start pt-1">
              <Button asChild variant="gold" size="lg" className="gap-2">
                <a href="/fantasy-league"><Trophy className="w-4 h-4" /> Reserve your place</a>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-2">
                <a href="/blog"><Newspaper className="w-4 h-4" /> Read The Gaffer</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* What the Club is */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground text-center">The <span className="text-primary">Club</span></h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground">Fantasy League</h3>
            <p className="text-sm text-muted-foreground">Build your team, climb the table, and try to finish above The Gaffer over the season.</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto">
              <Newspaper className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground">Daily Gaffer Articles</h3>
            <p className="text-sm text-muted-foreground">Wake up to The Gaffer's take — winners celebrated, howlers roasted, every single day.</p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-card/60 p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground">Awards & Community</h3>
            <p className="text-sm text-muted-foreground">Weekly awards, prizes, running jokes and proper football banter. Nobody's anonymous.</p>
          </div>
        </div>
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
                    {cleanTitle(post.title)}
                  </h3>
                  {post.excerpt && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{cleanExcerpt(post.excerpt)}</p>
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

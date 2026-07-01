import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OracleCrest } from '@/components/homepage/primitives';
import { cleanTitle, cleanExcerpt } from '@/lib/cleanAiText';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  hero_image_url: string | null;
  category: string;
  tags: string[];
  author: string;
  post_type: string;
  reading_time_minutes: number;
  published_at: string;
  seo_title: string | null;
  seo_description: string | null;
}

const categoryLabels: Record<string, string> = {
  'match-preview': '⚽ Match Preview',
  'weekly-roundup': '📊 Weekly Roundup',
  'guide': '📚 Guide',
  'analysis': '🔬 Analysis',
  'funny-story': '😂 Funny Story',
  'betting-news': '📰 Betting News',
  'ai-ml-insight': '🤖 AI Insight',
  'morning-briefing': '🌅 Morning Briefing',
  'challenge': '🏆 €100→€1K Challenge',
};

const categoryColors: Record<string, string> = {
  'match-preview': 'bg-primary/20 text-primary border-primary/30',
  'weekly-roundup': 'bg-success/20 text-success border-success/30',
  'guide': 'bg-gold/20 text-gold border-gold/30',
  'analysis': 'bg-accent/20 text-accent border-accent/30',
  'funny-story': 'bg-gold/20 text-gold border-gold/30',
  'betting-news': 'bg-primary/20 text-primary border-primary/30',
  'ai-ml-insight': 'bg-accent/20 text-accent border-accent/30',
  'morning-briefing': 'bg-[hsl(var(--neon-yellow)/.20)] text-[hsl(var(--neon-yellow))] border-[hsl(var(--neon-yellow)/.30)]',
  'challenge': 'bg-gold/20 text-gold border-gold/30',
};

export default function Blog() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, excerpt, hero_image_url, category, tags, author, post_type, reading_time_minutes, published_at, seo_title, seo_description')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-gradient-to-r from-background via-card/95 to-background">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <span className="grid w-10 h-10 shrink-0 place-items-center rounded-full border-2 border-[#f5c542] bg-[#07000f] p-0.5"><OracleCrest className="h-full w-full" /></span>
              <span className="font-bold text-primary">The Footy Oracle</span>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" /> Back to Predictions
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold">
            <span className="gold-text">The Gaffer's</span>{' '}
            <span className="text-foreground">Blog</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hilarious match previews, real betting stories, AI insights, and weekly P&L roundups — powered by data and The Gaffer's legendary wit.
          </p>
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse">
                <div className="h-48 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group glass-card-hover rounded-xl overflow-hidden flex flex-col"
              >
                <div className="relative h-48 bg-muted overflow-hidden">
                  {post.hero_image_url ? (
                    <img
                      src={post.hero_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-gold/10 flex items-center justify-center">
                      <span className="text-4xl">⚽</span>
                    </div>
                  )}
                  <Badge className={`absolute top-3 left-3 ${categoryColors[post.category] || categoryColors[post.post_type] || 'bg-muted text-foreground'}`}>
                    {categoryLabels[post.category] || categoryLabels[post.post_type] || post.category}
                  </Badge>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h2 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                    {cleanTitle(post.title)}
                  </h2>
                  <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                    {cleanExcerpt(post.excerpt)}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.reading_time_minutes} min read
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-12 text-center space-y-4">
            <span className="text-5xl">📝</span>
            <h2 className="text-2xl font-bold text-foreground">Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              The Gaffer is preparing his first articles. Check back soon for match previews, betting guides, and weekly roundups.
            </p>
            <Link to="/">
              <Button className="gap-2 mt-2">
                <ArrowLeft className="w-4 h-4" /> View Today's Predictions
              </Button>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} The Footy Oracle — AI-Powered Football Predictions</p>
      </footer>
    </div>
  );
}

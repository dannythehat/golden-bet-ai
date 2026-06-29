import { ArrowRight, Clock, Newspaper } from 'lucide-react';
import { SectionShell } from './primitives';
import { useLatestArticles } from './useHomepageData';
import { cleanTitle, cleanExcerpt } from '@/lib/cleanAiText';

const categoryLabels: Record<string, string> = {
  'match-preview': 'Match Preview',
  'weekly-roundup': 'Weekly Roundup',
  'guide': 'Guide',
  'analysis': 'Analysis',
  'ai-ml-insight': 'AI Insight',
  'morning-briefing': 'Morning Briefing',
  'challenge': 'Challenge',
  'betting-news': 'Betting News',
};

/** Latest Articles — pulls the 3 newest published posts from blog_posts. */
export function LatestArticlesSection() {
  const { data: articles = [], isLoading } = useLatestArticles(3);

  return (
    <SectionShell
      id="latest-articles"
      glow={{ border: 'rgba(168,85,247,0.35)', glow: 'rgba(147,51,234,0.4)' }}
      className="bg-gradient-to-br from-[#140a26] to-[#0c0618] p-5 md:p-7"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide text-white md:text-3xl">LATEST ARTICLES</h2>
        <a href="/blog" className="inline-flex items-center gap-1 text-sm font-bold uppercase tracking-wide text-violet-300 hover:text-violet-200">
          View All <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {isLoading && articles.length === 0 ? (
        <div className="space-y-3 py-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-4 py-4">
              <div className="h-20 w-28 shrink-0 animate-pulse rounded-xl bg-white/5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
                <div className="h-3 w-full animate-pulse rounded bg-white/5" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/50">No articles published yet — The Gaffer's warming up.</p>
      ) : (
        <div className="divide-y divide-white/10">
          {articles.map((a) => (
            <a key={a.slug} href={`/blog/${a.slug}`} className="group flex gap-4 py-4 first:pt-0 last:pb-0">
              <span className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-700/40 to-purple-900/40">
                {a.hero_image_url ? (
                  <img src={a.hero_image_url} alt={a.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                ) : (
                  <Newspaper className="h-7 w-7 text-violet-300/70" />
                )}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-bold leading-tight text-white group-hover:text-violet-200">{cleanTitle(a.title)}</span>
                  {a.category && categoryLabels[a.category] && (
                    <span className="hidden rounded bg-violet-600/80 px-1.5 py-0.5 text-[10px] font-black uppercase text-white sm:inline">{categoryLabels[a.category]}</span>
                  )}
                </span>
                {a.excerpt && <span className="mt-1 line-clamp-2 block text-sm text-white/60">{cleanExcerpt(a.excerpt)}</span>}
                {a.reading_time_minutes != null && (
                  <span className="mt-1 flex items-center gap-1 text-xs text-white/45">
                    <Clock className="h-3 w-3" /> {a.reading_time_minutes} min read
                  </span>
                )}
              </span>
            </a>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

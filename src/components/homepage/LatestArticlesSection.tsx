import { ArrowRight, Clock, Newspaper } from 'lucide-react';
import { SectionShell } from './primitives';
import { LATEST_ARTICLES, type Article } from './content';

/** Latest Articles — dynamic list (updates daily). Pass `articles` to override. */
export function LatestArticlesSection({ articles = LATEST_ARTICLES }: { articles?: Article[] }) {
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

      <div className="divide-y divide-white/10">
        {articles.map((a) => (
          <a key={a.title} href={a.href} className="group flex gap-4 py-4 first:pt-0 last:pb-0">
            {/* Thumbnail placeholder until real hero images land */}
            <span className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-700/40 to-purple-900/40">
              <Newspaper className="h-7 w-7 text-violet-300/70" />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="font-bold leading-tight text-white group-hover:text-violet-200">{a.title}</span>
                {a.isNew && <span className="rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">New</span>}
              </span>
              <span className="mt-1 line-clamp-2 block text-sm text-white/60">{a.excerpt}</span>
              <span className="mt-1 flex items-center gap-1 text-xs text-white/45">
                <Clock className="h-3 w-3" /> {a.readMins} min read
              </span>
            </span>
          </a>
        ))}
      </div>
    </SectionShell>
  );
}

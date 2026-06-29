import { Link } from 'react-router-dom';
import { ArrowRight, Quote } from 'lucide-react';
import { useGafferStory } from './useHomepageData';
import { OracleCrest } from './primitives';

export function GafferStoryCard() {
  const { data: story } = useGafferStory();
  const ctaHref = story?.cta_href ?? '/blog';
  const headline = story?.headline ?? 'Meet The Gaffer.';
  const intro =
    story?.intro ??
    'Decades on the touchline. Thousands of matches watched. One mission: deliver witty, sharp football tips you can actually trust.';

  return (
    <Link
      id="gaffer-story"
      to={ctaHref}
      className="group block overflow-hidden rounded-2xl border border-pink-500/45 bg-gradient-to-br from-[#1a0511] via-[#11040d] to-[#0a0207] p-5 shadow-[0_0_60px_-18px_rgba(236,72,153,0.55)] md:rounded-3xl md:p-7"
    >
      <div className="flex items-center gap-3">
        {story?.image ? (
          <img
            src={story.image}
            alt=""
            className="h-14 w-14 rounded-full border-2 border-pink-400/50 object-cover"
          />
        ) : (
          <OracleCrest className="h-14 w-14" />
        )}
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-pink-300">
            About The Gaffer
          </div>
          <h2 className="font-display text-2xl leading-tight text-white sm:text-3xl">
            {headline}
          </h2>
        </div>
      </div>

      <div className="relative mt-4 rounded-xl border border-pink-400/20 bg-pink-500/5 p-4">
        <Quote className="absolute left-2 top-2 h-4 w-4 text-pink-400/50" />
        <p className="pl-5 text-sm leading-relaxed text-white/80">{intro}</p>
      </div>

      <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-pink-300 transition-transform group-hover:translate-x-0.5">
        {story?.cta_label ?? 'Read The Gaffer'} <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

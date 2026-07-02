import { Link } from 'react-router-dom';
import { BarChart3, Trophy, ChevronRight } from 'lucide-react';
import { FEATURE_STRIP } from './content';
import { Icon } from './icons';

/**
 * Hero — a real section (not a baked image): the cinematic Gaffer scene is the
 * backdrop, and the headline, buttons and feature strip are live HTML overlaid
 * on top with a gradient for legibility.
 */
export function HeroBanner() {
  return (
    <section id="top" className="relative mx-auto w-full max-w-[1536px] scroll-mt-28">
      <div className="relative overflow-hidden rounded-2xl border border-white/10">
        {/* backdrop scene */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-[position:70%_center] md:bg-center"
          style={{ backgroundImage: 'url(/images/the-gaffer-2.png)' }}
        />
        {/* legibility gradients — dark on the left where the copy sits */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0a0414] via-[#0a0414]/85 to-transparent md:via-[#0a0414]/70" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0a0414] via-transparent to-[#0a0414]/40" />

        {/* copy */}
        <div className="relative flex min-h-[440px] items-end px-5 pb-8 pt-40 sm:min-h-[520px] sm:px-8 md:min-h-[560px] md:items-center md:py-16">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              The Gaffer is live
            </span>

            <h1 className="mt-4 font-display text-4xl uppercase italic leading-[0.92] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Witty. Fun.<br />Football.
              <span className="mt-1 block bg-gradient-to-r from-violet-300 via-fuchsia-400 to-violet-400 bg-clip-text not-italic text-transparent">
                Tips that hit.
              </span>
            </h1>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
              Daily articles. Sharp tips. In-depth stats. Fantasy league, weekly prizes and top
              banter — all powered by <span className="font-bold text-[#f8e7a1]">The Gaffer</span>.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_16px_40px_-16px_rgba(245,197,66,1)] transition-all hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-400"
              >
                <Trophy className="h-4 w-4 fill-current" /> Join the Club
              </Link>
              <Link
                to="/form-tables"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/[0.06] px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white backdrop-blur transition-all hover:border-[#f5c542]/50 hover:text-[#f8e7a1]"
              >
                <BarChart3 className="h-4 w-4" /> Explore Today's Tips
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Feature strip — real chips, one row that scrolls on mobile */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {FEATURE_STRIP.map((f) => (
          <a
            key={f.label}
            href={f.href}
            className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all ${
              f.highlight
                ? 'border-[#f5c542]/40 bg-[#f5c542]/[0.08] hover:bg-[#f5c542]/15'
                : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
            }`}
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${f.highlight ? 'bg-[#f5c542]/15 text-[#f8e7a1]' : 'bg-white/[0.06] text-violet-300'}`}>
              <Icon name={f.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[12px] font-black uppercase tracking-wide text-white">{f.label}</span>
              <span className="block truncate text-[10px] text-white/50">{f.sub}</span>
            </span>
            <ChevronRight className="ml-auto hidden h-3.5 w-3.5 shrink-0 text-white/30 lg:block" />
          </a>
        ))}
      </div>
    </section>
  );
}

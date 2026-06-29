import { ArrowRight, Sparkles } from 'lucide-react';
import gafferPortrait from '@/assets/homepage/gaffer-hero-portrait.png.asset.json';
import stadiumBg from '@/assets/homepage/stadium-bg.jpg.asset.json';

/**
 * Hero block — real header composition (not a full-site screenshot).
 * Stadium plate + Gaffer cut-out + headline + CTAs, all responsive.
 */
export function HeroSection() {
  return (
    <section
      id="top"
      className="relative overflow-hidden rounded-[1.4rem] border border-white/10 shadow-[0_0_90px_-35px_rgba(139,92,246,0.9)] md:rounded-[1.9rem]"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={stadiumBg.url}
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_60%,rgba(139,92,246,0.45),transparent_55%),linear-gradient(180deg,rgba(5,2,11,0.55)_0%,rgba(5,2,11,0.85)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,2,11,0.95)_0%,rgba(5,2,11,0.55)_45%,rgba(5,2,11,0.1)_100%)]" />
      </div>

      {/* Content grid */}
      <div className="relative grid grid-cols-1 gap-4 px-5 pt-7 pb-6 md:grid-cols-[1.15fr_0.85fr] md:gap-6 md:px-10 md:pt-12 md:pb-10 lg:px-14 lg:pt-16 lg:pb-12">
        {/* Copy */}
        <div className="relative z-10 flex flex-col items-start gap-5 md:gap-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200 backdrop-blur-sm md:text-xs">
            <Sparkles className="h-3.5 w-3.5" /> The Gaffer Knows
          </span>

          <h1 className="font-display text-[2.1rem] font-black uppercase leading-[0.95] tracking-tight text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.6)] sm:text-5xl md:text-6xl lg:text-7xl">
            Witty. Fun.<br />Football.<br />
            <span className="bg-gradient-to-r from-fuchsia-400 via-violet-300 to-amber-300 bg-clip-text text-transparent">
              Tips that hit.
            </span>
          </h1>

          <p className="max-w-md text-sm leading-relaxed text-white/75 md:text-base">
            Daily articles. Sharp tips. In-depth stats. Fantasy league.
            Weekly prizes. Top banter — all powered by <em className="text-amber-300 not-italic">The Gaffer.</em>
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/pricing"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-5 py-3 text-sm font-black uppercase tracking-wide text-[#1a0a26] shadow-[0_15px_40px_-15px_rgba(250,204,21,0.9)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-15px_rgba(250,204,21,1)] md:text-[15px]"
            >
              Join the Club
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#tip-of-the-day"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white backdrop-blur-md transition-all hover:border-violet-300/60 hover:bg-white/10 md:text-[15px]"
            >
              Explore Today's Tips
            </a>
          </div>
        </div>

        {/* Gaffer portrait */}
        <div className="pointer-events-none relative hidden md:block">
          <div className="absolute -inset-6 rounded-full bg-violet-500/30 blur-3xl" />
          <img
            src={gafferPortrait.url}
            alt="The Gaffer pointing at you, ready with today's football tips"
            className="relative z-10 mx-auto h-full max-h-[480px] w-auto object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.6)]"
            width={1024}
            height={1024}
          />
        </div>
      </div>

      {/* Mobile Gaffer — sits as background right side */}
      <div className="pointer-events-none absolute -right-10 bottom-0 z-0 block w-56 opacity-30 md:hidden">
        <img src={gafferPortrait.url} alt="" aria-hidden className="w-full" />
      </div>
    </section>
  );
}

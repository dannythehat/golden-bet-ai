import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import gafferPortrait from '@/assets/homepage/gaffer-hero-portrait.png.asset.json';
import { HomepageNav } from './HomepageNav';

/**
 * Fully responsive hero. Stacks on mobile, two columns on md+.
 * No baked-in text — every word/button is real HTML so it scales.
 */
export function HeroBanner() {
  return (
    <>
      <HomepageNav />
      <section
        id="top"
        className="relative isolate overflow-hidden border-b border-white/10 bg-[#08020f]"
      >
        {/* Atmospheric stadium glow */}
        <div className="pointer-events-none absolute inset-0 opacity-90 [background:radial-gradient(ellipse_at_70%_30%,rgba(124,58,237,0.45),transparent_55%),radial-gradient(ellipse_at_15%_85%,rgba(245,197,66,0.18),transparent_55%),linear-gradient(180deg,#0a0118_0%,#1a0a2e_60%,#08020f_100%)]" />
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_60%)]" />

        <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:gap-8 md:py-14 lg:py-20">
          {/* Copy */}
          <div className="relative z-10 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              The Gaffer Knows
            </span>

            <h1 className="mt-4 font-display text-[40px] leading-[0.95] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block text-white">Witty. Fun.</span>
              <span className="block text-white">Football.</span>
              <span className="mt-1 block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-200 bg-clip-text text-transparent">
                Tips That Hit.
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/75 sm:text-base md:mx-0 md:max-w-lg">
              Daily articles. Sharp tips. In-depth stats. Fantasy league. Weekly
              prizes. Top banter. All powered by{' '}
              <span className="font-bold text-gold">The Gaffer</span>.
            </p>

            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center md:justify-start">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5c542] px-6 py-3.5 text-sm font-black uppercase tracking-wider text-[#16051f] shadow-[0_15px_40px_-15px_rgba(245,197,66,1)] transition-all hover:-translate-y-0.5 hover:bg-[#ffe487]"
              >
                Join the Club
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/predictions"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/25 bg-white/[0.03] px-6 py-3.5 text-sm font-black uppercase tracking-wider text-white transition-all hover:border-white/50 hover:bg-white/[0.08]"
              >
                Explore Today's Tips
              </Link>
            </div>
          </div>

          {/* Portrait */}
          <div className="relative z-0 mx-auto w-full max-w-sm md:max-w-none">
            <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(circle_at_50%_55%,rgba(124,58,237,0.55),transparent_60%)] blur-2xl" />
            <img
              src={gafferPortrait.url}
              alt="The Gaffer"
              className="block h-auto w-full select-none drop-shadow-[0_25px_45px_rgba(0,0,0,0.7)]"
              draggable={false}
            />
          </div>
        </div>
      </section>
    </>
  );
}

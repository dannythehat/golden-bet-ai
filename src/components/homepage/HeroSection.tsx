import { ArrowRight } from 'lucide-react';
import { ASSETS } from './content';

/**
 * Header hero — this is the approved Footy Oracle look.
 * Image-led, dark stadium, Gaffer on the right, punchy copy on the left.
 * The feature strip is rendered separately underneath so it stays editable.
 */
export function HeroSection() {
  return (
    <section
      id="top"
      className="relative overflow-hidden rounded-[1.6rem] border border-violet-500/25 bg-[#05020b] shadow-[0_0_95px_-35px_rgba(139,92,246,0.95)] md:rounded-[2rem]"
    >
      <img
        src={ASSETS.heroGaffer}
        alt="The Gaffer pointing inside the Footy Oracle stadium studio"
        className="absolute inset-0 h-full w-full object-cover object-[68%_center] sm:object-[70%_center] lg:object-center"
        fetchPriority="high"
        width={1672}
        height={941}
      />

      {/* Approved mock-up overlays: readable left, cinematic right. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/72 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05020b] via-transparent to-black/25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(168,85,247,0.22),transparent_34%),radial-gradient(circle_at_30%_55%,rgba(245,158,11,0.08),transparent_34%)]" />

      <div className="relative flex min-h-[560px] items-center px-4 py-10 sm:min-h-[620px] sm:px-8 md:min-h-[680px] md:px-12 lg:min-h-[720px] xl:px-16">
        <div className="max-w-[620px]">
          <h1 className="font-hand text-[3.25rem] font-black uppercase leading-[0.92] tracking-wide text-white drop-shadow-[0_6px_22px_rgba(0,0,0,0.85)] sm:text-7xl md:text-8xl lg:text-[6.8rem]">
            WITTY. FUN.<br />
            FOOTBALL.<br />
            <span className="bg-gradient-to-r from-violet-300 via-purple-500 to-violet-700 bg-clip-text text-transparent">
              TIPS THAT HIT.
            </span>
          </h1>

          <p className="mt-6 max-w-[520px] text-lg font-medium leading-relaxed text-white/90 drop-shadow-[0_3px_12px_rgba(0,0,0,0.8)] sm:text-xl md:text-2xl">
            Daily articles. Sharp tips. In-depth stats.<br className="hidden sm:block" />
            Fantasy league. Weekly prizes. Top banter.<br className="hidden sm:block" />
            All powered by <span className="font-black italic text-gold">The Gaffer.</span>
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href="/pricing"
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-gold-dark via-gold to-gold-glow px-7 py-3.5 text-base font-black uppercase tracking-wide text-[#130818] shadow-[0_14px_38px_-14px_rgba(250,204,21,0.95)] transition-transform hover:scale-[1.03]"
            >
              Join The Club <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="#tip-of-the-day"
              className="inline-flex items-center justify-center rounded-xl border border-violet-400/55 bg-black/35 px-7 py-3.5 text-base font-black uppercase tracking-wide text-white shadow-[0_0_28px_-18px_rgba(168,85,247,0.9)] backdrop-blur-sm transition-colors hover:bg-violet-500/15"
            >
              Explore Today's Tips
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

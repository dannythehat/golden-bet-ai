import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { ASSETS } from './content';

const HERO_CHECKS = [
  'Daily Gaffer reports',
  'Weekly specials & prizes',
  'Beat the Gaffer',
  'Christmas Challenge',
  'Luxury holiday prize',
  'An epic community',
];

/**
 * Top hero — locked to the approved Footy Oracle homepage direction.
 * Desktop: big cinematic Gaffer image with copy over a dark left panel.
 * Mobile: stronger overlays and safer spacing so text never fights the image.
 */
export function HeroSection() {
  return (
    <section
      id="top"
      className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/30 bg-[#070310] shadow-[0_0_90px_-32px_rgba(139,92,246,0.85)]"
    >
      <img
        src={ASSETS.heroGaffer}
        alt="The Gaffer in the Footy Oracle stadium studio"
        className="absolute inset-0 h-full w-full object-cover object-[73%_center] sm:object-[70%_center]"
        fetchPriority="high"
        width={1672}
        height={941}
      />

      <div className="absolute inset-0 bg-gradient-to-r from-[#05020b] via-[#05020b]/88 to-[#05020b]/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05020b] via-transparent to-[#05020b]/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_35%,rgba(168,85,247,0.22),transparent_36%)]" />

      <div className="relative flex min-h-[620px] items-end p-4 sm:min-h-[560px] sm:p-6 md:min-h-[590px] md:p-10 lg:min-h-[640px] lg:p-12">
        <div className="w-full max-w-2xl rounded-[1.5rem] border border-white/10 bg-black/38 p-5 shadow-2xl shadow-black/45 backdrop-blur-[3px] sm:bg-black/25 sm:p-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-black/35 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-gold shadow-lg shadow-black/30 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5" /> Coming soon · 2025/26
          </span>

          <h1 className="mt-5 font-display text-[3.05rem] leading-[0.88] tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.75)] sm:text-6xl md:text-7xl lg:text-8xl">
            WITTY. FUN.<br />FOOTBALL.<br />
            <span className="bg-gradient-to-r from-violet-200 via-purple-400 to-gold bg-clip-text text-transparent">
              TIPS THAT HIT.
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-[1.03rem] leading-relaxed text-white/86 sm:text-lg md:text-xl">
            Daily articles. Sharp tips. In-depth stats. Fantasy league. Weekly specials. Top banter.
            All powered by <span className="font-black text-gold">The Gaffer.</span>
          </p>

          <ul className="mt-5 grid max-w-xl grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {HERO_CHECKS.map((c) => (
              <li key={c} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white/88 backdrop-blur-sm">
                <Check className="h-4 w-4 shrink-0 text-gold" /> {c}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-dark via-gold to-gold-glow px-6 py-3.5 font-black text-[#160a2b] shadow-lg shadow-gold/25 transition-transform hover:scale-[1.03]">
              Join the Club <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#tip-of-the-day" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-black/20 px-6 py-3.5 font-bold text-white backdrop-blur-sm hover:bg-white/8">
              Explore Today's Tips
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

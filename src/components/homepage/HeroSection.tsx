import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { ASSETS } from './content';

const HERO_CHECKS = [
  'Daily Gaffer reports', 'Weekly prizes & awards', 'Beat the Gaffer',
  'Christmas Challenge', 'Luxury holiday prize', 'An epic community',
];

/** Top hero — uses the stadium/clubhouse Gaffer image with copy over a dark left overlay. */
export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden rounded-[1.75rem] border border-violet-500/25 shadow-[0_0_80px_-30px_rgba(139,92,246,0.6)]">
      {/* Background image (right/centre weighted) */}
      <img
        src={ASSETS.heroGaffer}
        alt="The Gaffer"
        className="absolute inset-0 h-full w-full object-cover object-[70%_center]"
        fetchPriority="high"
        width={1672}
        height={941}
      />
      {/* Dark gradient so headline copy on the left stays readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0513] via-[#0a0513]/85 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0513] via-transparent to-transparent" />

      <div className="relative grid min-h-[460px] items-center gap-8 p-6 md:min-h-[540px] md:p-12 lg:grid-cols-2">
        <div className="max-w-xl space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-gold">
            <Sparkles className="h-3.5 w-3.5" /> Coming soon · 2025/26
          </span>

          <h1 className="font-display text-5xl leading-[0.95] tracking-tight text-white md:text-7xl">
            WITTY. FUN.<br />FOOTBALL.<br />
            <span className="bg-gradient-to-r from-violet-300 via-purple-400 to-gold bg-clip-text text-transparent">TIPS THAT HIT.</span>
          </h1>

          <p className="max-w-md text-base text-white/80 md:text-lg">
            Daily articles. Sharp tips. In-depth stats. Fantasy league. Weekly prizes. Top banter.
            All powered by <span className="font-bold text-gold">The Gaffer.</span>
          </p>

          <ul className="grid max-w-md grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {HERO_CHECKS.map((c) => (
              <li key={c} className="flex items-center gap-2 text-white/85">
                <Check className="h-4 w-4 shrink-0 text-gold" /> {c}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row">
            <a href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-dark via-gold to-gold-glow px-6 py-3 font-black text-[#160a2b] shadow-lg shadow-gold/20 transition-transform hover:scale-[1.03]">
              Join the Club <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#tip-of-the-day" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-6 py-3 font-bold text-white hover:bg-white/5">
              Explore Today's Tips
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

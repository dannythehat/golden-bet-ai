import { ArrowRight } from 'lucide-react';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

/** Approved homepage hero — uses the production artwork exactly. */
export function HeroSection() {
  return (
    <section
      id="top"
      className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#05020b] shadow-[0_0_90px_-35px_rgba(139,92,246,0.9)] md:rounded-[1.9rem]"
    >
      <img
        src={HOMEPAGE_APPROVED_ASSETS.hero}
        alt="Footy Oracle homepage hero featuring The Gaffer in the stadium studio"
        className="block w-full"
        fetchPriority="high"
        width={1024}
        height={1536}
      />

      <div className="absolute left-[3.4%] top-[61.5%] flex w-[14.5%] flex-col gap-[1.1vw] md:hidden">
        <a
          href="/pricing"
          className="inline-flex items-center justify-center gap-1 rounded-[0.7rem] bg-gradient-to-r from-gold-dark via-gold to-gold-glow px-2 py-2 text-[0.62rem] font-black uppercase leading-none text-[#130818] shadow-[0_10px_24px_-12px_rgba(250,204,21,0.95)]"
        >
          Join <ArrowRight className="h-3 w-3" />
        </a>
        <a
          href="#tip-of-the-day"
          className="inline-flex items-center justify-center rounded-[0.7rem] border border-violet-400/55 bg-black/45 px-2 py-2 text-[0.56rem] font-black uppercase leading-none text-white backdrop-blur-sm"
        >
          Tips
        </a>
      </div>
    </section>
  );
}

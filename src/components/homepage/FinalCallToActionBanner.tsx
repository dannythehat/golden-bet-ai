import { Link } from 'react-router-dom';
import { ArrowRight, Trophy } from 'lucide-react';
import { Icon } from './icons';
import { FINAL_CTA_FEATURES } from './content';

export function FinalCallToActionBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-purple-500/45 bg-gradient-to-br from-[#1a0a2e] via-[#10051a] to-[#0a0218] p-6 shadow-[0_0_80px_-22px_rgba(168,85,247,0.55)] md:rounded-3xl md:p-10">
      <div className="pointer-events-none absolute -top-16 -right-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-gold">
          <Trophy className="h-3.5 w-3.5" />
          Final Call
        </span>
        <h2 className="mt-3 font-display text-4xl leading-tight text-white sm:text-5xl">
          Join the <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Footy Oracle Club</span>.
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-white/75 sm:text-base">
          Everything The Gaffer ships, in one place — tips, articles, the
          fantasy league, prizes and the community.
        </p>

        <ul className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-2 text-left sm:grid-cols-3">
          {FINAL_CTA_FEATURES.map((f) => (
            <li
              key={f.title}
              className="flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/5 px-3 py-2 text-[12px] text-white/85"
            >
              <Icon name={f.icon} className="h-4 w-4 shrink-0 text-violet-300" />
              {f.title}
            </li>
          ))}
        </ul>

        <Link
          to="/pricing"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#f5c542] px-7 py-4 text-sm font-black uppercase tracking-wider text-[#16051f] shadow-[0_15px_45px_-15px_rgba(245,197,66,1)] transition-transform hover:-translate-y-0.5"
        >
          <Trophy className="h-4 w-4 fill-current" />
          Join the Club
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight, Crown, Trophy } from 'lucide-react';
import { Icon } from './icons';
import { FANTASY_HIGHLIGHTS } from './content';

export function FantasyLeagueFeatureCard() {
  return (
    <Link
      id="fantasy-league"
      to="/fantasy-league"
      className="group relative block overflow-hidden rounded-2xl border border-violet-400/45 bg-gradient-to-br from-[#1a0935] via-[#10051f] to-[#0a0218] p-5 shadow-[0_0_65px_-22px_rgba(139,92,246,0.6)] md:rounded-3xl md:p-7"
    >
      <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="relative flex items-center gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-200">
          Fantasy Premier League
        </span>
        <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
          New
        </span>
      </div>

      <h2 className="relative mt-2 font-display text-4xl leading-[0.95] text-white sm:text-5xl">
        <span className="block">Join the</span>
        <span className="block bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
          League
        </span>
      </h2>

      <p className="relative mt-3 text-sm text-white/75">
        Compete. Climb the table.{' '}
        <span className="font-bold text-gold">Win amazing prizes.</span> Become
        legendary.
      </p>

      <div className="relative mt-5 grid grid-cols-3 gap-2">
        {FANTASY_HIGHLIGHTS.map((h) => (
          <div
            key={h.title}
            className="rounded-xl border border-violet-400/30 bg-violet-500/5 p-2.5 text-center"
          >
            <Icon name={h.icon} className="mx-auto h-5 w-5 text-violet-300" />
            <div className="mt-1.5 text-[11px] font-black uppercase leading-tight text-white">
              {h.title}
            </div>
            <div className="mt-0.5 text-[10px] leading-tight text-white/60">
              {h.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-[#f5c542] px-5 py-3 text-xs font-black uppercase tracking-wider text-[#16051f] shadow-[0_12px_30px_-12px_rgba(245,197,66,0.9)] transition-transform group-hover:-translate-y-0.5">
        <Trophy className="h-4 w-4 fill-current" />
        Join the League
        <ArrowRight className="h-4 w-4" />
      </div>

      <Crown className="pointer-events-none absolute -bottom-4 right-4 h-32 w-32 text-violet-400/20" />
    </Link>
  );
}

import { ArrowRight, Trophy } from 'lucide-react';
import { SectionShell } from './primitives';
import { Icon } from './icons';
import { FANTASY_BENEFITS, FANTASY_HIGHLIGHTS } from './content';

/** Fantasy Premier League — the headline membership sell. Blue/purple + gold CTA. */
export function FantasyLeagueFeatureCard() {
  return (
    <SectionShell
      id="fantasy-league"
      glow={{ border: 'rgba(96,165,250,0.45)', glow: 'rgba(59,130,246,0.5)' }}
      className="bg-gradient-to-br from-[#0a0e2e] via-[#120a33] to-[#0a0620]"
    >
      <div className="relative grid gap-6 p-6 md:p-10 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Decorative trophy glow on the right */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-60 [background:radial-gradient(circle_at_75%_40%,rgba(168,85,247,0.35),transparent_60%)]" />

        {/* Left — copy */}
        <div className="relative space-y-5">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg tracking-wide">
              <span className="text-white">FANTASY </span><span className="text-violet-400">PREMIER LEAGUE</span>
            </span>
            <span className="rounded-md bg-violet-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white">New</span>
          </div>

          <h2 className="font-display text-6xl leading-[0.9] tracking-tight md:text-7xl">
            <span className="text-white">JOIN THE</span><br />
            <span className="bg-gradient-to-r from-violet-300 to-purple-500 bg-clip-text text-transparent">LEAGUE</span>
          </h2>

          <p className="text-lg font-bold text-white">
            Compete. Climb the table.<br />
            Win <span className="text-gold">amazing prizes.</span> Become legendary.
          </p>

          <ul className="space-y-3 border-t border-white/10 pt-4">
            {FANTASY_BENEFITS.map((b) => (
              <li key={b.title} className="flex gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-violet-400/40 text-violet-300">
                  <Icon name={b.icon} className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-bold text-white">{b.title}</span>
                  <span className="block text-sm text-white/65">{b.body}</span>
                </span>
              </li>
            ))}
          </ul>

          <a href="/fantasy-league" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-dark via-gold to-gold-glow px-6 py-4 font-display text-2xl tracking-wide text-[#160a2b] shadow-[0_12px_30px_-12px_hsl(var(--gold))] transition-transform hover:scale-[1.01]">
            SUBSCRIBE &amp; PLAY NOW <ArrowRight className="h-6 w-6" />
          </a>
        </div>

        {/* Right — trophy visual (placeholder built from CSS until the trophy art lands) */}
        <div className="relative hidden items-center justify-center lg:flex">
          <div className="relative grid h-72 w-72 place-items-center">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.25),transparent_65%)]" />
            <Trophy className="h-56 w-56 text-gold drop-shadow-[0_0_40px_rgba(250,204,21,0.5)]" strokeWidth={1.2} />
            <span className="absolute bottom-16 font-display text-sm tracking-wider text-[#160a2b]/0" aria-hidden>FOOTY ORACLE</span>
          </div>
        </div>
      </div>

      {/* Bottom highlight strip */}
      <div className="relative grid gap-px border-t border-white/10 bg-white/[0.03] sm:grid-cols-3">
        {FANTASY_HIGHLIGHTS.map((h) => (
          <div key={h.title} className="flex items-center gap-3 px-5 py-4">
            <Icon name={h.icon} className="h-6 w-6 text-violet-300" />
            <span>
              <span className="block text-sm font-bold uppercase tracking-wide text-white">{h.title}</span>
              <span className="block text-xs text-white/55">{h.sub}</span>
            </span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

import { ArrowRight, Trophy } from 'lucide-react';
import { SectionShell } from './primitives';
import { Icon } from './icons';
import { DONKEY_PRIZES } from './content';

/** Donkey of the Week — funny, community feature. Anyone can win, any week. */
export function DonkeyOfTheWeekFeatureCard() {
  return (
    <SectionShell
      id="donkey-of-the-week"
      glow={{ border: 'rgba(217,70,239,0.45)', glow: 'rgba(192,38,211,0.45)' }}
      className="bg-gradient-to-br from-[#180626] via-[#13041f] to-[#0b0312] p-5 md:p-8"
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <span
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-fuchsia-400/60 text-4xl"
          style={{ boxShadow: '0 0 25px -6px rgba(217,70,239,0.9)' }}
          aria-hidden
        >
          🫏
        </span>
        <div>
          <h2 className="font-display text-4xl tracking-wide text-white md:text-5xl">DONKEY OF THE WEEK?</h2>
          <p className="font-display text-lg tracking-wide text-fuchsia-400">ANYONE CAN WIN. ANY WEEK.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chalkboard of howlers */}
        <div className="rounded-2xl border border-fuchsia-400/20 bg-black/40 p-6">
          <div className="space-y-1 font-hand text-3xl font-bold leading-tight text-white/90">
            <p>Own goal?</p>
            <p>Terrible transfer?</p>
            <p>Epic fail?</p>
            <p className="pt-2 text-pink-400" style={{ textShadow: '0 0 16px rgba(244,114,182,0.8)' }}>You might win!</p>
          </div>
        </div>

        {/* Explainer */}
        <div className="space-y-4 rounded-2xl border border-fuchsia-400/20 bg-white/[0.03] p-6">
          <p className="text-lg text-white/85">
            From moments of genius to absolute football disasters… if you make The Gaffer laugh, you might just win something brilliant.
          </p>
          <p className="font-display tracking-wide text-fuchsia-400">AMAZING PRIZES. RANDOM FEATS. 100% GAFFER'S CHOICE.</p>
          <div className="flex gap-3">
            <Trophy className="h-6 w-6 shrink-0 text-fuchsia-300" />
            <p className="text-white/70">You don't need to top the league table to walk away with something awesome.</p>
          </div>
          <p className="font-display tracking-wide text-pink-400">ANYONE. ANY POSITION. ANY WEEK.</p>
          <a href="/fantasy-league" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-3.5 font-display text-xl tracking-wide text-[#160a02] shadow-[0_10px_30px_-12px_rgba(250,204,21,0.9)] transition-transform hover:scale-[1.01]">
            COULD IT BE YOU? <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </div>

      {/* Prize strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {DONKEY_PRIZES.map((p) => (
          <div key={p.label} className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
            <Icon name={p.icon} className="h-7 w-7 text-fuchsia-300" />
            <span className="text-xs font-semibold uppercase leading-tight tracking-wide text-white/75">{p.label}</span>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

import { ArrowRight, Clock, Flame } from 'lucide-react';
import { SectionShell } from './primitives';
import { Icon } from './icons';
import { TIP_OF_THE_DAY as T } from './content';

function TeamCrest({ short }: { short: string }) {
  return (
    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-sky-400/40 bg-sky-950/60 font-display text-lg tracking-wide text-sky-200 shadow-[0_0_25px_-8px_rgba(56,189,248,0.8)]">
      {short}
    </span>
  );
}

/** Tip of the Day — daily expert pick, electric-blue treatment. */
export function TipOfTheDayCard() {
  return (
    <SectionShell
      id="tip-of-the-day"
      glow={{ border: 'rgba(56,189,248,0.45)', glow: 'rgba(14,165,233,0.5)' }}
      className="bg-gradient-to-br from-[#04111f] via-[#06182b] to-[#040d18] p-5 md:p-8"
    >
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Flame className="h-9 w-9 text-sky-400" />
          <div>
            <h2 className="font-display text-3xl tracking-wide md:text-4xl">
              <span className="text-sky-400">TIP</span> <span className="text-white">OF THE DAY</span>
            </h2>
            <p className="text-white/60">Expert pick. Back it with confidence.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-sky-400/30 px-4 py-2">
          <Clock className="h-5 w-5 text-sky-400" />
          <span>
            <span className="block text-sm font-bold text-white">Daily Tip</span>
            <span className="block text-xs text-white/55">Updated {T.updated}</span>
          </span>
        </div>
      </div>

      {/* Match */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-sky-400/15 bg-sky-950/20 p-5 md:flex-row md:justify-center md:gap-8">
        <div className="flex items-center gap-3">
          <TeamCrest short={T.home.short} />
          <div className="text-left">
            <div className="font-display text-2xl tracking-wide text-white">{T.home.name}</div>
            <div className="text-xs uppercase tracking-widest text-white/50">Home</div>
          </div>
        </div>

        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-sky-400/40 font-display text-lg text-white">VS</div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-display text-2xl tracking-wide text-white">{T.away.name}</div>
            <div className="text-xs uppercase tracking-widest text-white/50">Away</div>
          </div>
          <TeamCrest short={T.away.short} />
        </div>
      </div>

      {/* Our tip */}
      <div className="mx-auto -mt-3 w-fit rounded-2xl border border-sky-400/40 bg-[#06182b] px-8 py-3 text-center shadow-[0_0_30px_-10px_rgba(56,189,248,0.8)]">
        <div className="text-xs font-black uppercase tracking-widest text-sky-400">Our Tip</div>
        <div className="font-display text-2xl tracking-wide text-white">{T.tip}</div>
        <div className="font-display text-3xl text-sky-400">{T.odds}</div>
      </div>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-sky-400/15 bg-sky-950/20 p-4 md:grid-cols-4">
        {T.stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <Icon name={s.icon} className="h-7 w-7 shrink-0 text-sky-400" />
            <span>
              <span className="block font-display text-xl text-white">{s.value}</span>
              <span className="block text-[11px] uppercase leading-tight tracking-wide text-white/55">{s.label}</span>
            </span>
          </div>
        ))}
      </div>

      <a href="/fixtures" className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-4 font-display text-xl tracking-wide text-white shadow-[0_10px_30px_-12px_rgba(56,189,248,0.8)] transition-transform hover:scale-[1.01]">
        VIEW ALL TODAY'S TIPS <ArrowRight className="h-5 w-5" />
      </a>
    </SectionShell>
  );
}

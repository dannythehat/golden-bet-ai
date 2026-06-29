import { ArrowRight, Gift, Palmtree, Sparkles, PartyPopper } from 'lucide-react';
import { SectionShell, Eyebrow } from './primitives';
import { RANDOM_PRIZES, THEMED_EVENTS } from './content';

/** Weekly Prizes — premium orange/gold, three featured prize cards. */
export function WeeklyPrizesFeatureCard() {
  return (
    <SectionShell
      id="weekly-prizes"
      glow={{ border: 'rgba(249,115,22,0.4)', glow: 'rgba(234,88,12,0.45)' }}
      className="bg-gradient-to-br from-[#1a0f02] via-[#160c04] to-[#0d0703] p-5 md:p-8"
    >
      <div className="mb-6 flex items-center gap-3">
        <Gift className="h-9 w-9 text-orange-400" />
        <div>
          <h2 className="font-display text-3xl tracking-wide text-white md:text-4xl">WEEKLY PRIZES</h2>
          <p className="text-white/60">Something exciting to win every week.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Grand prize — dream holiday */}
        <article className="relative overflow-hidden rounded-2xl border border-orange-400/40 bg-gradient-to-b from-orange-500/15 to-[#0d0703] p-5">
          <span className="inline-block rounded-md bg-gradient-to-r from-rose-600 to-orange-600 px-3 py-1 text-xs font-black uppercase tracking-wider text-white">1st Prize</span>
          <div className="my-6 grid h-28 place-items-center rounded-xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20">
            <Palmtree className="h-14 w-14 text-orange-300" />
          </div>
          <h3 className="font-display text-3xl tracking-wide text-white">A DREAM <span className="text-orange-400">HOLIDAY</span></h3>
          <p className="mt-1 text-sm text-white/65">Luxury overseas holiday for this season's overall Fantasy League Champion. Your next adventure could be on us!</p>
        </article>

        {/* Random prizes for unique feats */}
        <article className="rounded-2xl border border-purple-400/30 bg-gradient-to-b from-purple-600/15 to-[#0d0703] p-5">
          <Eyebrow className="text-purple-300">Random prizes for unique feats!</Eyebrow>
          <p className="mt-1 text-sm text-white/60">Awarded for unique achievements through the season — not every week.</p>
          <ul className="mt-4 space-y-2">
            {RANDOM_PRIZES.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-white/85">
                <Sparkles className="h-4 w-4 shrink-0 text-orange-300" /> {p}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-bold text-orange-300">Awesome prizes up for grabs!</p>
        </article>

        {/* Themed prize events */}
        <article className="rounded-2xl border border-orange-400/30 bg-gradient-to-b from-amber-600/15 to-[#0d0703] p-5">
          <Eyebrow className="text-orange-300">Themed prize events</Eyebrow>
          <p className="mt-1 text-sm text-white/60">Amazing prizes all year round.</p>
          <ul className="mt-4 space-y-2">
            {THEMED_EVENTS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-white/85">
                <PartyPopper className="h-4 w-4 shrink-0 text-amber-300" /> {p}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm font-bold text-amber-300">And many more themed events!</p>
        </article>
      </div>

      <a href="/fantasy-league" className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 px-6 py-4 font-display text-xl tracking-wide text-[#160a02] shadow-[0_10px_30px_-12px_rgba(249,115,22,0.9)] transition-transform hover:scale-[1.01]">
        CLICK FOR MORE! <ArrowRight className="h-5 w-5" />
      </a>
    </SectionShell>
  );
}

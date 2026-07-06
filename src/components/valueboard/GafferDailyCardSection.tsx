import { Star, Layers, Bell, Clock, ShieldAlert } from 'lucide-react';
import type { GafferDailyCardData, DailyCardSelection } from '@/lib/valueBoard';

/** One selection row inside the daily card — solid panel, gold accent bar. */
function SelectionRow({ s }: { s: DailyCardSelection }) {
  return (
    <div className="relative overflow-hidden rounded-[13px] border border-white/[0.1] bg-gradient-to-b from-[#1c1338] to-[#110a26]">
      <div aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#ffe487] to-[#b8860b]" />
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] py-2 pl-4 pr-3">
        <span className="min-w-0 truncate text-[13px] font-semibold text-white">{s.fixture}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black text-[#f8e7a1] [font-variant-numeric:tabular-nums]">
          <Clock className="h-3 w-3 text-[#f5c542]/80" /> {s.kickoffLabel}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 pl-4 pr-3 text-[11px] text-white/60">
        <span className="font-display text-[14px] uppercase tracking-tight text-white">{s.marketLabel}</span>
        {s.oddsSnapshot != null && <span className="font-display text-[15px] text-[#f5c542] [font-variant-numeric:tabular-nums]">{s.oddsSnapshot.toFixed(2)}</span>}
        <span className="[font-variant-numeric:tabular-nums]">model <b className="text-white/90">{Math.round(s.modelProbability)}%</b></span>
        <span className="[font-variant-numeric:tabular-nums]">implied <b className="text-white/90">{Math.round(s.impliedProbability)}%</b></span>
        <span className="ml-auto inline-flex items-center rounded-[6px] bg-emerald-500/15 px-1.5 py-[3px] text-[9.5px] font-black uppercase tracking-wide text-emerald-300 ring-1 ring-inset ring-emerald-400/30 [font-variant-numeric:tabular-nums]">+{s.valueGap.toFixed(1)} gap</span>
        <span className={`inline-flex items-center rounded-[6px] px-1.5 py-[3px] text-[9.5px] font-black uppercase tracking-wide ring-1 ring-inset ${s.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/25' : s.confidence === 'medium' ? 'bg-amber-500/10 text-amber-300 ring-amber-400/25' : 'bg-white/[0.06] text-white/55 ring-white/15'}`}>{s.confidence}</span>
      </div>
      <p className="border-t border-white/[0.08] py-2 pl-4 pr-3 text-[12px] italic leading-relaxed text-white/70">
        <span aria-hidden className="mr-1 font-display text-base leading-none text-violet-300/70">“</span>
        {s.gafferVerdict}
        <span aria-hidden className="ml-0.5 font-display text-base leading-none text-violet-300/70">”</span>
      </p>
    </div>
  );
}

/** The Gaffer's Daily Card — surfaces the tipping engine's locked double and
 *  treble (this page never re-picks). Honest quiet-day state when thin. */
export function GafferDailyCardSection({ card, onEmailCard }: { card: GafferDailyCardData; onEmailCard: () => void }) {
  return (
    <section id="gaffer-daily-card" className="relative overflow-hidden rounded-[1.6rem] border border-[#f5c542]/25 bg-[#130321]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div className="p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/50 bg-[#f5c542]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
              <Star className="h-3.5 w-3.5 fill-current" /> Today's Gaffer Card
            </span>
            <h2 className="mt-2.5 font-display text-2xl uppercase tracking-tight text-white md:text-3xl">The double is mine. The rest is yours to explore.</h2>
            <p className="mt-1 text-xs text-white/55">Curated by the tipping engine every morning — the board below is where you browse the rest.</p>
          </div>
          <button
            onClick={onEmailCard}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-violet-200 transition-colors hover:bg-violet-500/20"
          >
            <Bell className="h-3.5 w-3.5" /> Email me the Gaffer card
          </button>
        </div>

        {card.quietDay ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-6 text-center">
            <h3 className="font-display text-2xl uppercase text-white">{card.quietDayMessage.split('—')[0].trim()}</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-white/60">No forced picks today. Discipline is part of the game — the board below still shows anything the scan did find.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
                <Star className="h-3.5 w-3.5" /> Daily Double
              </div>
              <div className="space-y-2.5">
                {card.double.selections.map((s) => <SelectionRow key={s.fixtureId} s={s} />)}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">
                <Layers className="h-3.5 w-3.5" /> Daily Treble
              </div>
              {card.treble.available ? (
                <div className="space-y-2.5">
                  {card.treble.selections.map((s) => <SelectionRow key={s.fixtureId} s={s} />)}
                </div>
              ) : (
                <div className="rounded-[13px] border border-white/10 bg-black/25 p-5 text-sm text-white/55">
                  Not enough qualifying selections for a treble today — the Gaffer doesn't pad a card to make it look busy.
                </div>
              )}
            </div>
          </div>
        )}

        <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f5c542]/70" /> {card.riskNote}
        </p>
      </div>
    </section>
  );
}

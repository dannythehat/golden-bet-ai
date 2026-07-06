import { Star, Layers, Bell, Clock, Trophy, ShieldAlert } from 'lucide-react';
import { TeamAvatar } from '@/components/TeamAvatar';
import type { GafferDailyCardData, DailyCardSelection } from '@/lib/valueBoard';

/** One selection — the homepage leg-card language: crests, gold odds,
 *  confidence bar, emerald edge chip, one short line from the Gaffer. */
function SelectionCard({ s }: { s: DailyCardSelection }) {
  return (
    <div
      className="relative rounded-[15px] p-px shadow-[0_2px_4px_-1px_rgba(0,0,0,0.7),0_24px_44px_-20px_rgba(0,0,0,0.95)]"
      style={{ background: 'linear-gradient(160deg,#f5c542 0%,#8b5cf6 48%,#22d3ee 100%)' }}
    >
      <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-b from-[#1c1338] to-[#110a26]">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

        {/* teams */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3.5 pb-2.5 pt-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <TeamAvatar name={s.homeTeam} logoUrl={s.homeLogo} size={36} className="shrink-0 rounded-[10px] bg-black/45 p-1 ring-1 ring-white/12" />
            <div className="line-clamp-2 min-w-0 text-[13px] font-semibold leading-[1.15] text-white">{s.homeTeam}</div>
          </div>
          <span className="shrink-0 font-display text-[11px] uppercase text-white/25">vs</span>
          <div className="flex min-w-0 flex-row-reverse items-center gap-2.5 text-right">
            <TeamAvatar name={s.awayTeam} logoUrl={s.awayLogo} size={36} className="shrink-0 rounded-[10px] bg-black/45 p-1 ring-1 ring-white/12" />
            <div className="line-clamp-2 min-w-0 text-[13px] font-semibold leading-[1.15] text-white">{s.awayTeam}</div>
          </div>
        </div>

        {/* league + kickoff */}
        <div className="flex items-center justify-between gap-2 border-y border-white/[0.1] bg-black/20 px-3.5 py-1.5">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Trophy className="h-2.5 w-2.5 shrink-0 text-[#f5c542]/70" />
            <span className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]/70">{s.league}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-black text-[#f8e7a1] [font-variant-numeric:tabular-nums]">
            <Clock className="h-3 w-3 text-[#f5c542]/80" /> {s.kickoffLabel} <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">KO</span>
          </span>
        </div>

        {/* the pick */}
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/[0.14] via-emerald-500/[0.05] to-transparent px-3.5 py-2.5">
          <div className="min-w-0">
            <div className="text-[8.5px] font-black uppercase tracking-[0.22em] text-emerald-300/80">The pick</div>
            <div className="mt-0.5 truncate font-display text-[17px] uppercase leading-none tracking-tight text-white">{s.marketLabel}</div>
          </div>
          {s.oddsSnapshot != null && (
            <div className="flex shrink-0 items-baseline gap-1.5">
              <span className="font-display text-[26px] leading-none text-[#f5c542] [font-variant-numeric:tabular-nums] drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">{s.oddsSnapshot.toFixed(2)}</span>
              <span className="text-[8.5px] font-black uppercase tracking-[0.18em] text-white/35">odds</span>
            </div>
          )}
        </div>

        {/* form bar + edge — homepage vocabulary, no jargon */}
        <div className="border-t border-white/[0.1] px-3.5 pb-3 pt-2.5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[8.5px] font-black uppercase tracking-[0.22em] text-white/40">Form says</span>
            <span className="font-display text-[15px] leading-none text-white [font-variant-numeric:tabular-nums]">{Math.round(s.modelProbability)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-inset ring-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-[#f5c542] shadow-[0_0_10px_rgba(245,197,66,0.55)]" style={{ width: `${Math.max(4, Math.min(100, s.modelProbability))}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] text-white/55">
            <span className="[font-variant-numeric:tabular-nums]">Bookies' price says {Math.round(s.impliedProbability)}%</span>
            <span className="inline-flex items-center rounded-[6px] bg-emerald-500/15 px-1.5 py-[3px] text-[9.5px] font-black uppercase tracking-wide text-emerald-300 ring-1 ring-inset ring-emerald-400/30 [font-variant-numeric:tabular-nums]">+{s.valueGap.toFixed(1)}% edge</span>
          </div>
        </div>

        {/* one short line from the Gaffer — the full read lives in the breakdown */}
        <p className="border-t border-white/[0.1] px-3.5 py-2.5 text-[12px] italic leading-snug text-white/70">
          <span aria-hidden className="mr-1 font-display text-base leading-none text-violet-300/70">“</span>
          {s.gafferShortVerdict}
          <span aria-hidden className="ml-0.5 font-display text-base leading-none text-violet-300/70">”</span>
        </p>
      </div>
    </div>
  );
}

/** The Gaffer's Daily Card — surfaces the tipping engine's locked double and
 *  treble (this page never re-picks). Honest quiet-day state when thin. */
export function GafferDailyCardSection({ card, onEmailCard }: { card: GafferDailyCardData; onEmailCard: () => void }) {
  return (
    <section id="gaffer-daily-card" className="relative overflow-hidden rounded-[1.6rem] border border-[#f5c542]/25 bg-[#130321]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      {/* the Gaffer keeps an eye on his card */}
      <img
        src="/images/gaffer/opt/gaffer-pointing-you.webp"
        alt=""
        loading="lazy"
        draggable={false}
        className="pointer-events-none absolute -right-3 top-1 z-0 h-28 w-auto select-none opacity-80 md:right-4 md:h-36"
      />
      <div className="relative z-[1] p-5 md:p-7">
        <div className="max-w-[72%] md:max-w-none">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/50 bg-[#f5c542]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
            <Star className="h-3.5 w-3.5 fill-current" /> Today's Gaffer Card
          </span>
          <h2 className="mt-2.5 font-display text-2xl uppercase tracking-tight text-white md:text-3xl">The double is mine.<br className="md:hidden" /> The rest is yours.</h2>
        </div>

        {card.quietDay ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-6 text-center">
            <h3 className="font-display text-2xl uppercase text-white">Powder dry today.</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-white/60">No forced picks — discipline is part of the game. Anything the scan did find is on the board below.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
                <Star className="h-3.5 w-3.5" /> Daily Double
              </div>
              <div className="space-y-3">
                {card.double.selections.map((s) => <SelectionCard key={s.fixtureId} s={s} />)}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">
                <Layers className="h-3.5 w-3.5" /> Daily Treble
              </div>
              {card.treble.available ? (
                <div className="space-y-3">
                  {card.treble.selections.map((s) => <SelectionCard key={s.fixtureId} s={s} />)}
                </div>
              ) : (
                <div className="rounded-[13px] border border-white/10 bg-black/25 p-5 text-sm text-white/55">
                  Not enough qualifying games for a treble today — I don't pad a card to make it look busy. Back at full strength when the fixtures allow.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f5c542]/70" /> {card.riskNote}
          </p>
          <button
            onClick={onEmailCard}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-wide text-violet-200 transition-colors hover:bg-violet-500/20"
          >
            <Bell className="h-3.5 w-3.5" /> Email me the Gaffer card
          </button>
        </div>
      </div>
    </section>
  );
}

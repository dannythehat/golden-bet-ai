import { Flame, Target, Trophy } from 'lucide-react';
import { TeamAvatar } from '@/components/TeamAvatar';
import { getDailyBet, getGafferPicks, type Leg } from '@/lib/gafferSelection';
import { useLiveDailyPicks } from './useLiveDailyPicks';

// ─── UI ─────────────────────────────────────────────────────────────────────
function PickCard({ leg, index }: { leg: Leg; index: number }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#07000f]/70 p-4">
      {/* meta row */}
      <div className="mb-3 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        <span className="truncate">{leg.region} · {leg.league} · {leg.time} KO</span>
        <span className="shrink-0 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/10 px-2 py-0.5 text-[#f8e7a1]">Pick {index + 1}</span>
      </div>

      {/* teams + odds */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex shrink-0 -space-x-1.5">
            <TeamAvatar name={leg.home.name} logoUrl={leg.home.logo} size={34} />
            <TeamAvatar name={leg.away.name} logoUrl={leg.away.logo} size={34} />
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold text-white">
              {leg.home.name} <span className="text-white/35">v</span> {leg.away.name}
            </div>
            <div className="mt-0.5 inline-flex rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
              {leg.selection}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-xl leading-none text-[#f5c542]">{leg.odds.toFixed(2)}</div>
          <div className="text-[10px] uppercase tracking-wide text-white/45">odds</div>
        </div>
      </div>

      {/* confidence + edge */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-white/10 bg-black/40 px-3 py-2">
          <div className="flex items-center justify-between text-white/45"><span>Confidence</span><span className="font-bold text-white">{leg.prob}%</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-[#f5c542]" style={{ width: `${leg.prob}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white/45">
          <span>Edge</span>
          <span className="font-display text-lg leading-none text-emerald-300">+{leg.edge.toFixed(1)}%</span>
        </div>
      </div>

      {/* gaffer line */}
      <p className="mt-3 text-[13px] italic leading-relaxed text-white/70">“{leg.placeholderReason}”</p>
    </article>
  );
}

export function GafferPicksBox() {
  const { data: live } = useLiveDailyPicks();
  const fallbackBet = getDailyBet(getGafferPicks());
  const bet = live?.bet ?? fallbackBet;
  const intro = live?.gafferIntro ?? "The Gaffer's pointing at the value — form beats price by a mile.";

  return (
    <section
      id="daily-picks"
      data-endpoint="gaffer_picks"
      data-lovable-hook="homepage_daily_picks_showcase"
      className="relative overflow-hidden rounded-[1.4rem] border-2 border-emerald-400/55 bg-[#130321] shadow-[0_0_46px_-14px_rgba(16,185,129,0.6)] md:rounded-[1.9rem]"
    >
      {/* gold accent bar (matches TodaysDouble / PnLSection) */}
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />

      <div className="relative p-5 md:p-8">
        {/* Header */}
        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
            <Flame className="h-3.5 w-3.5" /> The Gaffer's Picks
          </span>
          <h2 className="mt-2 font-display text-2xl uppercase leading-[1.05] tracking-tight text-white sm:text-3xl md:text-4xl">
            Today's Value Board
          </h2>
          <p className="mt-2 text-sm text-white/55">{intro}</p>
        </div>

        {/* Picks */}
        {bet.type === 'none' ? (
          <div className="relative flex min-h-[210px] items-center overflow-hidden rounded-2xl border border-white/10 bg-[#07000f]/70 p-6">
            <div className="pointer-events-none absolute right-4 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-[#f5c542]/12 blur-3xl" />
            <img
              src="/images/gaffer/gaffer-shocked.png"
              alt="The Gaffer, no value today"
              loading="lazy"
              draggable={false}
              className="pointer-events-none absolute -right-2 top-0 z-0 hidden h-full w-auto select-none object-contain object-top opacity-95 sm:block"
            />
            <div className="relative z-[1] max-w-[70%]">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5c542]/30 bg-[#f5c542]/10">
                <Target className="h-5 w-5 text-[#f5c542]" />
              </div>
              <h3 className="font-display text-2xl uppercase leading-none tracking-tight text-white">No bet today.</h3>
              <p className="mt-1.5 text-sm text-white/55">Nowt on the card worth your money — no value, no bet. The Gaffer's keeping his hands in his pockets. Back tomorrow.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {bet.legs.map((leg, i) => <PickCard key={leg.fixtureId} leg={leg} index={i} />)}

            {/* Slip */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#f5c542]/30 bg-[#f5c542]/[0.07] p-5">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/35 bg-black/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#f8e7a1]">
                  <Trophy className="h-3 w-3" /> The Gaffer's Slip
                </div>
                <div className="mt-1.5 font-display text-2xl uppercase tracking-wide text-[#f5c542] sm:text-3xl">
                  £{bet.stake} {bet.type === 'double' ? 'Double' : 'Single'}
                </div>
                <div className="text-xs text-white/55">combined odds {bet.combinedOdds.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Returns</div>
                <div className="font-display text-2xl leading-none text-emerald-300 sm:text-3xl">£{bet.returns.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

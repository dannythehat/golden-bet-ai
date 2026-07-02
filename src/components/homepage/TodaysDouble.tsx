import { ArrowRight, Flame } from 'lucide-react';
import { TeamAvatar } from '@/components/TeamAvatar';
import { getDailyBet, STAKE } from '@/lib/gafferSelection';

/**
 * Homepage section — the Gaffer's bet of the day (£10 single/double), styled to
 * the club design language (deep purple + #f5c542 gold, rounded-full pills,
 * gold accent bar) so it sits natively next to the homepage cards.
 */
export function TodaysDouble() {
  const bet = getDailyBet();
  if (bet.type === 'none') return null;

  return (
    <section
      id="todays-double"
      className="relative overflow-hidden rounded-[1.4rem] border-2 border-emerald-400/55 bg-[#130321] shadow-[0_0_46px_-14px_rgba(16,185,129,0.6)] md:rounded-[1.9rem]"
    >
      {/* gold accent bar (matches the header) */}
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#f5c542]/10 blur-3xl" />

      <div className="relative p-5 md:p-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
              <Flame className="h-3.5 w-3.5" /> Today's {bet.type === 'double' ? 'Double' : 'Single'}
            </span>
            <h2 className="mt-2 font-display text-3xl uppercase leading-none tracking-tight text-white md:text-4xl">
              The Gaffer's £{STAKE} {bet.type === 'double' ? 'Double' : 'Single'}
            </h2>
            <p className="mt-1 text-sm text-white/55">His sharpest value of the day{bet.type === 'double' ? ' — two legs, one slip.' : '.'}</p>
          </div>
          <a
            href="/form-tables"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 px-4 py-2 text-[12px] font-black uppercase tracking-wide text-[#f8e7a1] transition-all hover:bg-[#f5c542] hover:text-[#16051f]"
          >
            See the tables <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {bet.legs.map((leg) => (
            <div key={leg.fixtureId} className="rounded-2xl border border-white/10 bg-[#07000f]/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex shrink-0 -space-x-1.5">
                    <TeamAvatar name={leg.home.name} logoUrl={leg.home.logo} size={34} />
                    <TeamAvatar name={leg.away.name} logoUrl={leg.away.logo} size={34} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-bold text-white">{leg.home.name} <span className="text-white/35">v</span> {leg.away.name}</div>
                    <div className="truncate text-xs text-white/45">{leg.region} · {leg.time} KO</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-xl leading-none text-[#f5c542]">{leg.odds.toFixed(2)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-white/45">odds</div>
                </div>
              </div>
              <div className="mt-3 inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">{leg.selection}</div>
            </div>
          ))}
        </div>

        {/* Bet slip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#f5c542]/30 bg-[#f5c542]/[0.07] p-5">
          <div>
            <div className="font-display text-2xl uppercase tracking-wide text-[#f5c542]">£{STAKE} {bet.type === 'double' ? 'Double' : 'Single'}</div>
            <div className="text-xs text-white/55">combined odds {bet.combinedOdds.toFixed(2)}</div>
          </div>
          <a
            href="/form-tables"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_12px_32px_-14px_rgba(245,197,66,1)] transition-all hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-400"
          >
            Returns £{bet.returns.toFixed(2)}
          </a>
        </div>
      </div>
    </section>
  );
}

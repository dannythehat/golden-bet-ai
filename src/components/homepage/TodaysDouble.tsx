import { ArrowRight, Flame } from 'lucide-react';
import { TeamAvatar } from '@/components/TeamAvatar';
import { getDailyBet, STAKE } from '@/lib/gafferSelection';

/** Homepage hero: the Gaffer's bet of the day — £10 single or double, with
 *  team logos, kick-off times and odds. */
export function TodaysDouble() {
  const bet = getDailyBet();
  if (bet.type === 'none') return null;

  return (
    <section id="todays-double" className="relative overflow-hidden rounded-[1.75rem] border border-gold/40 bg-gradient-to-br from-[#1a1003] via-[#180c24] to-[#0c0518] p-6 shadow-[0_0_70px_-24px_hsl(var(--gold))] md:p-8">
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 font-display text-sm tracking-wide text-gold">
              <Flame className="h-4 w-4" /> TODAY'S {bet.type === 'double' ? 'DOUBLE' : 'SINGLE'}
            </span>
            <h2 className="font-display text-3xl tracking-tight text-white md:text-4xl">The Gaffer's £{STAKE} {bet.type === 'double' ? 'Double' : 'Single'}</h2>
            <p className="text-sm text-white/55">His sharpest value of the day. {bet.type === 'double' ? 'Two legs, one slip.' : 'One to follow.'}</p>
          </div>
          <a href="/form-tables" className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 px-4 py-2 text-sm font-bold text-gold hover:bg-gold/10">
            See the tables <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {bet.legs.map((leg) => (
            <div key={leg.fixtureId} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex shrink-0 -space-x-1.5">
                    <TeamAvatar name={leg.home.name} logoUrl={leg.home.logo} size={34} />
                    <TeamAvatar name={leg.away.name} logoUrl={leg.away.logo} size={34} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-bold text-white">{leg.home.name} <span className="text-white/40">v</span> {leg.away.name}</div>
                    <div className="truncate text-xs text-white/45">{leg.region} · {leg.time} KO</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-xl leading-none text-gold">{leg.odds.toFixed(2)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-white/45">odds</div>
                </div>
              </div>
              <div className="mt-3 inline-flex rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">{leg.selection}</div>
            </div>
          ))}
        </div>

        {/* Bet slip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-gold/[0.07] p-5">
          <div className="flex items-center gap-5">
            <div>
              <div className="font-display text-2xl tracking-wide text-gold">£{STAKE} {bet.type === 'double' ? 'DOUBLE' : 'SINGLE'}</div>
              <div className="text-xs text-white/55">combined odds {bet.combinedOdds.toFixed(2)}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl text-white">£{bet.returns.toFixed(2)}</div>
            <div className="text-[10px] uppercase tracking-wide text-white/45">potential return</div>
          </div>
        </div>
      </div>
    </section>
  );
}

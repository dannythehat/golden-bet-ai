import { Flame, Quote } from 'lucide-react';
import { TeamAvatar } from '@/components/TeamAvatar';
import { ASSETS } from './content';
import { getGafferPicks, getDailyBet, type Leg, STAKE } from '@/lib/gafferSelection';

function LegRow({ leg }: { leg: Leg }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex shrink-0 -space-x-1.5">
            <TeamAvatar name={leg.home.name} logoUrl={leg.home.logo} size={28} />
            <TeamAvatar name={leg.away.name} logoUrl={leg.away.logo} size={28} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">{leg.home.name} <span className="text-white/40">v</span> {leg.away.name}</div>
            <div className="truncate text-[11px] text-white/45">{leg.region} · {leg.league} · {leg.time} KO</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-lg leading-none text-gold">{leg.odds.toFixed(2)}</div>
          <div className="text-[10px] uppercase tracking-wide text-white/45">odds</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${leg.flag === 'strong' ? 'bg-gold/20 text-gold' : 'bg-emerald-500/20 text-emerald-300'}`}>
          {leg.selection}
        </span>
        <span className="text-[11px] text-white/45">form {leg.prob}%</span>
      </div>
      {/* Placeholder reasoning — replaced by the Gaffer Engine's voice at launch */}
      <p className="mt-2 flex gap-1.5 text-sm italic text-white/70">
        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/60" />{leg.placeholderReason}
      </p>
    </div>
  );
}

/** The Gaffer's picks for the day + the £10 single/double. */
export function GafferPicksBox() {
  const picks = getGafferPicks();
  const bet = getDailyBet(picks);

  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-gold/40 bg-gradient-to-br from-[#1a1003] via-[#160c20] to-[#0c0518] p-5 shadow-[0_0_60px_-22px_hsl(var(--gold))] md:p-7">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-3">
          <img src={ASSETS.gaffer} alt="The Gaffer" className="h-12 w-12 rounded-xl border-2 border-gold/40 object-cover" style={{ objectPosition: '58% 20%' }} />
          <div>
            <div className="flex items-center gap-2 font-display text-2xl tracking-wide text-white">
              <Flame className="h-5 w-5 text-gold" /> THE GAFFER'S PICKS
            </div>
            <p className="text-xs text-white/55">His value calls for the day — {bet.type === 'double' ? 'a £10 double' : bet.type === 'single' ? 'a £10 single' : 'sitting on his hands'}.</p>
          </div>
        </div>

        {bet.type === 'none' ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-5 text-white/60">
            No value worth backing today, lads. No bet — that's a winning move some days.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {bet.legs.map((leg) => <LegRow key={leg.fixtureId} leg={leg} />)}
            </div>

            {/* The bet slip */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/[0.06] p-4">
              <div>
                <div className="font-display text-lg tracking-wide text-gold">
                  £{STAKE} {bet.type === 'double' ? 'DOUBLE' : 'SINGLE'}
                </div>
                <div className="text-xs text-white/55">
                  {bet.type === 'double' ? `${bet.legs.length} legs combined` : 'one to follow'} @ {bet.combinedOdds.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl text-white">£{bet.returns.toFixed(2)}</div>
                <div className="text-[10px] uppercase tracking-wide text-white/45">returns from £{STAKE}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

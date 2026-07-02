import { Link } from 'react-router-dom';
import { Crown, TrendingUp, TrendingDown, Minus, Trophy, ChevronRight } from 'lucide-react';
import { useFantasyStandings, type FantasyStandingRow } from '@/hooks/useFantasyLeague';

const GAFFER = '/images/gaffer/gaffer-arms-crossed.png';

function Movement({ m }: { m: FantasyStandingRow['movement'] }) {
  if (m === 'up') return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (m === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-white/25" />;
}

const RANK_TONE = (rank: number) =>
  rank === 1 ? 'bg-[#f5c542] text-[#16051f]' : rank === 2 ? 'bg-slate-300 text-[#16051f]' : rank === 3 ? 'bg-amber-700 text-white' : 'bg-white/8 text-white/60';

/**
 * LeagueStandings — the live "Beat the Gaffer" leaderboard. Rank movement,
 * GW + total points, the Gaffer's row highlighted, and the cash prize rail.
 * All rows come from the standings contract (never a baked table).
 */
export function LeagueStandings() {
  const { data, isLoading } = useFantasyStandings();

  if (isLoading && !data) {
    return <div className="h-[520px] animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.03]" />;
  }

  const rows = data?.rows ?? [];
  const tiers = data?.tiers ?? [];

  return (
    <section id="standings" className="relative overflow-hidden rounded-[1.6rem] border border-[#f5c542]/25 bg-[#070312] shadow-[0_0_60px_-24px_rgba(245,197,66,0.6)] md:rounded-[2rem]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(245,197,66,0.14),transparent_42%),radial-gradient(circle_at_0%_100%,rgba(124,58,237,0.18),transparent_45%)]" />

      {/* Gaffer, decorative, top-right */}
      <img src={GAFFER} alt="" aria-hidden loading="lazy" draggable={false} className="pointer-events-none absolute -right-4 bottom-0 z-0 hidden h-[300px] w-auto select-none object-contain opacity-90 xl:block" />

      <div className="relative z-[1] p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8e7a1]">
              {data?.gameweek ?? 'League'}
            </span>
            <h2 className="mt-3 font-display text-4xl uppercase leading-none text-white md:text-5xl">
              League <span className="text-[#f5c542]">Standings</span>
            </h2>
            <p className="mt-2 text-sm text-white/55">Climb the table. Chase the prizes.</p>
          </div>

          {/* champion prize */}
          <div className="flex items-center gap-3 rounded-2xl border border-[#f5c542]/30 bg-[#f5c542]/10 px-4 py-3">
            <Trophy className="h-8 w-8 fill-[#f5c542] text-[#f5c542]" />
            <div className="leading-tight">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#f8e7a1]">Champion’s Prize</div>
              <div className="font-display text-2xl text-white">{data?.champion ?? '£10,000'}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_240px]">
          {/* table */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0518]/60">
            {/* head */}
            <div className="grid grid-cols-[44px_1fr_60px_72px] items-center gap-2 border-b border-white/10 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/40 sm:grid-cols-[52px_1fr_72px_88px]">
              <span className="text-center">#</span>
              <span>Team</span>
              <span className="text-right">GW</span>
              <span className="text-right">Total</span>
            </div>
            <ul>
              {rows.map((r) => (
                <li
                  key={r.rank}
                  className={`grid grid-cols-[44px_1fr_60px_72px] items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 transition-colors sm:grid-cols-[52px_1fr_72px_88px] ${
                    r.isGaffer ? 'bg-[#f5c542]/12 ring-1 ring-inset ring-[#f5c542]/30' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    <span className={`grid h-6 w-6 place-items-center rounded-md text-[11px] font-black ${RANK_TONE(r.rank)}`}>{r.rank}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <Movement m={r.movement} />
                    <span className="min-w-0">
                      <span className={`flex items-center gap-1.5 truncate text-[13px] font-black ${r.isGaffer ? 'text-[#f8e7a1]' : 'text-white'}`}>
                        {r.isGaffer && <Crown className="h-3.5 w-3.5 shrink-0 fill-[#f5c542] text-[#f5c542]" />}
                        {r.team}
                      </span>
                      <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-white/40">{r.manager}</span>
                    </span>
                  </span>
                  <span className="text-right text-[13px] font-bold tabular-nums text-white/70">{r.gwPoints}</span>
                  <span className="text-right font-display text-lg tabular-nums text-[#f5c542]">{r.total.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* prize rail */}
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#0b0518]/60 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/45">Top 3 Prizes</div>
              <ul className="mt-2 space-y-2">
                {tiers.map((t) => (
                  <li key={t.rank} className="flex items-center gap-3">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg text-[12px] font-black ${RANK_TONE(t.rank)}`}>{t.rank}</span>
                    <span className="flex-1 text-[12px] font-bold uppercase tracking-wide text-white/60">{t.label}</span>
                    <span className="font-display text-lg text-white">{t.value}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/pricing"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-5 py-3.5 text-sm font-black uppercase tracking-wide text-[#16051f] transition-transform hover:-translate-y-0.5"
            >
              Join &amp; Climb <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

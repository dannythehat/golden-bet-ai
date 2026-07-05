import { Link } from 'react-router-dom';
import { Crown, TrendingUp, TrendingDown, Minus, Trophy, ChevronRight, Award, Gift, Plane, Ticket, Sparkles } from 'lucide-react';
import { useFantasyStandings, useFantasyRealtimeStandings, useFantasyPrizes } from '@/hooks/useFantasyLeague';
import type { FantasyStandingRow, FantasyPrize, FantasyPrizeTrigger, FantasyRewardType } from '@/types/footy';

const GAFFER = '/images/gaffer/gaffer-arms-crossed.png';

// How each trigger reads on the leaderboard (admin-driven — never a cash value).
const TRIGGER_LABEL: Partial<Record<FantasyPrizeTrigger, string>> = {
  season_top: 'Season winner',
  monthly_top: 'Monthly winner',
  gameweek_top: 'Weekly top scorer',
  rank_climber: 'Biggest climber',
  best_bench: 'Best bench',
  worst_captain: 'Worst captain',
  wooden_spoon: 'Donkey of the week',
};
const REWARD_ICON = (t?: FantasyRewardType) =>
  t === 'trip' ? Plane : t === 'experience' ? Ticket : t === 'voucher' ? Gift : Sparkles;
// Leaderboard rewards shown on the standings rail, in priority order.
const RAIL_TRIGGERS: FantasyPrizeTrigger[] = ['season_top', 'monthly_top', 'gameweek_top', 'rank_climber', 'best_bench'];

const isGaffer = (r: FantasyStandingRow) => /gaffer/i.test(r.manager_name) || /gaffer/i.test(r.team_name);
const isYou = (r: FantasyStandingRow) => /^you$/i.test(r.manager_name);

function Movement({ m }: { m: number }) {
  if (m > 0) return <span className="inline-flex items-center text-emerald-400"><TrendingUp className="h-3.5 w-3.5" /><span className="text-[10px] font-black">{m}</span></span>;
  if (m < 0) return <span className="inline-flex items-center text-red-400"><TrendingDown className="h-3.5 w-3.5" /><span className="text-[10px] font-black">{Math.abs(m)}</span></span>;
  return <Minus className="h-3.5 w-3.5 text-white/25" />;
}

const RANK_TONE = (rank: number) => rank === 1 ? 'bg-[#f5c542] text-[#16051f]' : rank === 2 ? 'bg-slate-300 text-[#16051f]' : rank === 3 ? 'bg-amber-700 text-white' : 'bg-white/8 text-white/60';

/**
 * LeagueStandings — the live "Beat the Gaffer" leaderboard from the standings
 * contract. Rank movement, GW + total points, the Gaffer and your own row
 * highlighted, plus the admin-driven (non-cash) reward rail.
 */
export function LeagueStandings() {
  const { data, isLoading } = useFantasyStandings();
  const { data: prizeData } = useFantasyPrizes();
  useFantasyRealtimeStandings(); // live re-rank on the standings channel
  if (isLoading && !data) return <div className="h-[520px] animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.03]" />;

  const rows = data?.rows ?? [];
  const prizes = prizeData?.prizes.filter((p) => p.enabled) ?? [];
  const seasonPrize = prizes.find((p) => p.trigger === 'season_top') ?? prizes.find((p) => p.category === 'seasonal');
  const railPrizes = RAIL_TRIGGERS.map((t) => prizes.find((p) => p.trigger === t)).filter(Boolean) as FantasyPrize[];
  const funPrizes = prizes.filter((p) => p.tone === 'fun');

  return (
    <section id="standings" className="relative overflow-hidden rounded-[1.6rem] border border-[#f5c542]/25 bg-[#070312] shadow-[0_0_60px_-24px_rgba(245,197,66,0.6)] md:rounded-[2rem]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(245,197,66,0.14),transparent_42%),radial-gradient(circle_at_0%_100%,rgba(124,58,237,0.18),transparent_45%)]" />
      <img src={GAFFER} alt="" aria-hidden loading="lazy" draggable={false} className="pointer-events-none absolute -right-4 bottom-0 z-0 hidden h-[300px] w-auto select-none object-contain opacity-90 xl:block" />

      <div className="relative z-[1] p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8e7a1]">Gameweek {data?.gameweek ?? ''}</span>
            <h2 className="mt-3 font-display text-4xl uppercase leading-none text-white md:text-5xl">League <span className="text-[#f5c542]">Standings</span></h2>
            <p className="mt-2 text-sm text-white/55">The table doesn’t lie. Climb it, hold it, or get bragged at.</p>
          </div>
          {seasonPrize && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#f5c542]/30 bg-[#f5c542]/10 px-4 py-3">
              <Trophy className="h-8 w-8 fill-[#f5c542] text-[#f5c542]" />
              <div className="leading-tight">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#f8e7a1]">Season Winner’s Reward</div>
                <div className="font-display text-2xl text-white">{seasonPrize.title}</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_240px]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0518]/60">
            <div className="grid grid-cols-[44px_1fr_60px_72px] items-center gap-2 border-b border-white/10 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/40 sm:grid-cols-[52px_1fr_72px_88px]">
              <span className="text-center">#</span><span>Team</span><span className="text-right">GW</span><span className="text-right">Total</span>
            </div>
            <ul>
              {rows.map((r) => {
                const you = isYou(r); const gaffer = isGaffer(r);
                return (
                  <li key={r.team_id} className={`grid grid-cols-[44px_1fr_60px_72px] items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 transition-colors sm:grid-cols-[52px_1fr_72px_88px] ${gaffer ? 'bg-[#f5c542]/12 ring-1 ring-inset ring-[#f5c542]/30' : you ? 'bg-violet-500/12 ring-1 ring-inset ring-violet-400/30' : 'hover:bg-white/[0.03]'}`}>
                    <span className="flex items-center justify-center gap-1"><span className={`grid h-6 w-6 place-items-center rounded-md text-[11px] font-black ${RANK_TONE(r.rank)}`}>{r.rank}</span></span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Movement m={r.movement} />
                      <span className="min-w-0">
                        <span className={`flex items-center gap-1.5 truncate text-[13px] font-black ${gaffer ? 'text-[#f8e7a1]' : you ? 'text-violet-100' : 'text-white'}`}>
                          {gaffer && <Crown className="h-3.5 w-3.5 shrink-0 fill-[#f5c542] text-[#f5c542]" />}
                          {r.team_name}
                          {you && <span className="rounded bg-violet-500/25 px-1.5 py-px text-[9px] font-black uppercase text-violet-100">You</span>}
                          {!!r.awards_count && <span className="inline-flex items-center gap-0.5 text-[10px] text-[#f8e7a1]"><Award className="h-3 w-3" />{r.awards_count}</span>}
                        </span>
                        <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-white/40">{r.manager_name}{r.transfer_hits > 0 && <span className="text-red-400"> · −{r.transfer_hits}</span>}</span>
                      </span>
                    </span>
                    <span className="text-right text-[13px] font-bold tabular-nums text-white/70">{r.gameweek_points}</span>
                    <span className="text-right font-display text-lg tabular-nums text-[#f5c542]">{r.total_points.toLocaleString()}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#0b0518]/60 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/45">Rewards on offer</div>
              <ul className="mt-2 space-y-2">
                {railPrizes.map((p) => {
                  const Icon = REWARD_ICON(p.reward_type);
                  return (
                    <li key={p.id} className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#f5c542]/25 bg-[#f5c542]/10 text-[#f5c542]"><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-[12px] font-bold text-white">{p.title}</span>
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-white/40">{p.trigger ? TRIGGER_LABEL[p.trigger] : 'Reward'}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {funPrizes.length > 0 && (
                <p className="mt-3 border-t border-white/10 pt-2.5 text-[11px] leading-snug text-white/45">
                  Having a nightmare? There’s something in it even for the strugglers — {funPrizes.map((p) => p.title).join(' & ')}.
                </p>
              )}
            </div>
            <Link to="/fantasy-waitlist" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-5 py-3.5 text-sm font-black uppercase tracking-wide text-[#16051f] transition-transform hover:-translate-y-0.5">Join &amp; Climb <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

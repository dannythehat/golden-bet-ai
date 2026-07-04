import { ListOrdered, Star, Sparkles, Activity } from 'lucide-react';
import { useFantasyGameweekResults, useFantasyRealtimeScores } from '@/hooks/useFantasyLeague';
import type { FantasyTeamSlot } from '@/types/footy';

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  upcoming: { label: 'Not started', tone: 'text-white/50' },
  open: { label: 'Not started', tone: 'text-white/50' },
  locked: { label: 'Locked', tone: 'text-amber-300' },
  live: { label: 'Live', tone: 'text-emerald-300' },
  settled: { label: 'Final', tone: 'text-violet-300' },
};

function PointsRow({ s, bench }: { s: FantasyTeamSlot; bench?: boolean }) {
  const base = s.player.gameweek_points ?? 0;
  const mult = s.is_captain ? 2 : 1;
  const eff = base * mult;
  return (
    <li className={`flex items-center gap-2.5 px-3 py-2.5 ${bench ? 'opacity-55' : ''}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-black ${s.is_captain ? 'bg-[#f5c542] text-[#16051f]' : 'bg-black/40 text-[#f8e7a1]'}`}>{s.player.position}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-[13px] font-bold text-white">
          {s.player.name}
          {s.is_captain && <span className="inline-flex items-center gap-0.5 rounded bg-[#f5c542]/20 px-1 text-[9px] font-black text-[#f8e7a1]"><Star className="h-2.5 w-2.5 fill-current" />×2</span>}
          {s.is_vice_captain && <span className="rounded bg-white/15 px-1 text-[9px] font-black text-white/70">V</span>}
        </span>
        <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-white/40">{s.player.club.short_name}{bench ? ' · bench' : ''}</span>
      </span>
      {s.is_captain && <span className="text-[11px] font-semibold text-white/35 tabular-nums">{base}×2</span>}
      <span className={`w-10 text-right font-display text-lg tabular-nums ${eff > 0 ? 'text-[#f5c542]' : 'text-white/40'}`}>{eff}</span>
    </li>
  );
}

/**
 * GameweekResultsView — per-player points for a gameweek, captain double and
 * the running total. Derived client-side from get-fantasy-team + get-fantasy-
 * gameweek (no dedicated results endpoint), live via the fantasy-scores channel.
 */
export function GameweekResultsView() {
  const { isLoading, gameweek, starters, bench, total, status } = useFantasyGameweekResults();
  useFantasyRealtimeScores();

  if (isLoading) return <div className="h-[520px] animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.03]" />;
  const st = STATUS_LABEL[status] ?? STATUS_LABEL.open;
  const notStarted = status === 'open' || status === 'upcoming';

  return (
    <section className="relative overflow-hidden rounded-[1.6rem] border border-[#f5c542]/25 bg-[#070312] shadow-[0_0_60px_-24px_rgba(245,197,66,0.6)] md:rounded-[2rem]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div className="relative p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8e7a1]"><ListOrdered className="h-3.5 w-3.5" /> Gameweek {gameweek?.gameweek ?? ''} Results</span>
            <h2 className="mt-3 font-display text-4xl uppercase leading-none text-white md:text-5xl">How’d your lot get on?</h2>
            <p className="mt-2 text-sm text-white/55">Goals, assists, bonus and the captain’s double — every point accounted for.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#f5c542]/30 bg-[#f5c542]/10 px-5 py-3">
            <Activity className="h-7 w-7 text-[#f5c542]" />
            <div className="leading-tight">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"><span className={st.tone}>{st.label}</span></div>
              <div className="font-display text-3xl text-white">{total} <span className="text-base text-white/50">pts</span></div>
            </div>
          </div>
        </div>

        {notStarted ? (
          <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-white/15 py-14 text-center">
            <Sparkles className="h-7 w-7 text-white/30" />
            <p className="mt-3 text-sm text-white/50">Kick-off’s not here yet. Points light up live once the whistle blows.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0518]/60">
              <div className="border-b border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/45">Starting XI</div>
              <ul className="divide-y divide-white/[0.06]">{starters.map((s) => <PointsRow key={s.player.id} s={s} />)}</ul>
            </div>
            <div className="self-start overflow-hidden rounded-2xl border border-white/10 bg-[#0b0518]/60">
              <div className="border-b border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/45">Bench <span className="text-white/30">— not counted</span></div>
              <ul className="divide-y divide-white/[0.06]">{bench.map((s) => <PointsRow key={s.player.id} s={s} bench />)}</ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Zap, ArrowLeftRight, ShieldQuestion, Activity } from 'lucide-react';
import { useFantasyTeam, useFantasyGameweek, useSetCaptain, useSetVice, useFantasyRealtimeScores } from '@/hooks/useFantasyLeague';
import type { FantasyChip } from '@/types/footy';
import { PitchView } from './PitchView';
import { Countdown } from './Countdown';

const CHIPS: { key: FantasyChip; label: string }[] = [
  { key: 'wildcard', label: 'Wildcard' },
  { key: 'bench_boost', label: 'Bench Boost' },
  { key: 'triple_captain', label: 'Triple Captain' },
  { key: 'free_hit', label: 'Free Hit' },
];

/**
 * MyTeamView — the manager's saved XI. Pitch + bench, captain/vice selection,
 * the (reserved) chip tray and a live gameweek total via the fantasy-scores
 * channel. Bound to useFantasyTeam; captain/vice call the mutations (optimistic).
 */
export function MyTeamView() {
  const { data: team, isLoading } = useFantasyTeam();
  const { data: gw } = useFantasyGameweek();
  const setCaptain = useSetCaptain();
  const setVice = useSetVice();
  useFantasyRealtimeScores();

  const [capOverride, setCap] = useState<string | null>(null);
  const [viceOverride, setViceState] = useState<string | null>(null);

  if (isLoading && !team) return <div className="h-[560px] animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.03]" />;
  if (!team) return null;

  const currentCaptain = team.slots.find((s) => s.is_captain)?.player.id ?? null;
  const currentVice = team.slots.find((s) => s.is_vice_captain)?.player.id ?? null;
  const captainId = capOverride ?? currentCaptain;
  const viceId = viceOverride ?? currentVice;

  const renderTeam = { ...team, slots: team.slots.map((s) => ({ ...s, is_captain: s.player.id === captainId, is_vice_captain: s.player.id === viceId })) };
  const starters = team.slots.filter((s) => s.is_starter);
  const liveTotal = renderTeam.slots.filter((s) => s.is_starter).reduce((sum, s) => sum + (s.player.gameweek_points ?? 0) * (s.is_captain ? 2 : 1), 0);
  const live = gw?.status === 'live';

  const chooseCaptain = (id: string) => { setCap(id); if (id === viceId) setViceState(''); setCaptain.mutate({ teamId: team.id, playerId: id }); };
  const chooseVice = (id: string) => { setViceState(id); if (id === captainId) setCap(''); setVice.mutate({ teamId: team.id, playerId: id }); };

  return (
    <section className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#070312] shadow-[0_0_60px_-24px_rgba(124,58,237,0.7)] md:rounded-[2rem]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div className="relative grid gap-4 p-5 md:p-7 lg:grid-cols-[1fr_300px]">
        {/* pitch */}
        <div className="order-2 lg:order-1">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8e7a1]">My Team</span>
              <h2 className="mt-3 font-display text-4xl uppercase leading-none text-white md:text-5xl">{team.name}</h2>
            </div>
            <Link to="/fantasy-league/transfers" className="inline-flex items-center gap-2 rounded-xl border border-violet-400/45 bg-violet-500/[0.08] px-5 py-3 text-sm font-black uppercase tracking-wide text-violet-100 transition-all hover:-translate-y-0.5 hover:bg-violet-500/15"><ArrowLeftRight className="h-4 w-4" /> Transfers</Link>
          </div>
          <PitchView team={renderTeam} metric={live ? 'gameweek' : 'total'} />
        </div>

        {/* controls */}
        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <div className="rounded-2xl border border-[#f5c542]/25 bg-[#f5c542]/[0.06] p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50"><Activity className="h-3.5 w-3.5" /> Gameweek total</span>
              {live && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live</span>}
            </div>
            <div className="mt-1 font-display text-4xl text-[#f5c542]">{liveTotal} <span className="text-lg text-white/50">pts</span></div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b0518]/60 p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/45">Deadline</div>
            <div className="mt-2"><Countdown deadline={gw?.deadline_at ?? null} /></div>
          </div>

          <div className="grid gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-[#f5c542]/25 bg-[#f5c542]/[0.06] px-3 py-2.5">
              <Star className="h-4 w-4 shrink-0 fill-[#f5c542] text-[#f5c542]" />
              <span className="text-[11px] font-black uppercase tracking-wide text-[#f8e7a1]">Captain</span>
              <select value={captainId ?? ''} onChange={(e) => chooseCaptain(e.target.value)} className="ml-auto min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0b0518] px-2 py-1.5 text-[12px] font-semibold text-white">
                {starters.map((s) => <option key={s.player.id} value={s.player.id}>{s.player.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/[0.06] px-3 py-2.5">
              <Star className="h-4 w-4 shrink-0 text-violet-300" />
              <span className="text-[11px] font-black uppercase tracking-wide text-violet-200">Vice</span>
              <select value={viceId ?? ''} onChange={(e) => chooseVice(e.target.value)} className="ml-auto min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0b0518] px-2 py-1.5 text-[12px] font-semibold text-white">
                {starters.map((s) => <option key={s.player.id} value={s.player.id}>{s.player.name}</option>)}
              </select>
            </label>
            <p className="text-[11px] leading-snug text-white/45">Your captain scores double. Vice steps in if the captain doesn’t start.</p>
          </div>

          <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.05] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-violet-200"><Zap className="h-3.5 w-3.5" /> Chips</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {CHIPS.map((c) => (
                <button key={c.key} type="button" disabled className="cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-[11px] font-black uppercase tracking-wide text-white/40">{c.label}</button>
              ))}
            </div>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/45"><ShieldQuestion className="h-3.5 w-3.5" /> Locked in the armoury — coming soon.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

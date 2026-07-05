import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Wand2, RotateCcw, Lock, Users2, Coins, ChevronRight, Star } from 'lucide-react';
import { useFantasyPlayers, FANTASY_RULES } from '@/hooks/useFantasyLeague';
import type { FantasyPlayer, FantasyPosition } from '@/types/footy';
import { PlayerCard, EmptySlot } from './PlayerCard';

const POSITIONS: FantasyPosition[] = ['GK', 'DEF', 'MID', 'FWD'];
const FILTERS: ('ALL' | FantasyPosition)[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];
// Squad-sheet rows, front to back (matches the 2·5·5·3 locked structure).
const ROWS: FantasyPosition[] = ['FWD', 'MID', 'DEF', 'GK'];

/**
 * SquadBuilder — the interactive Pick Squad tool, bound to the locked rules:
 * 15 players (2 GK / 5 DEF / 5 MID / 3 FWD), £100m budget, max 3 per club,
 * captain + vice. Pool comes from get-fantasy-players (with typed fallback);
 * everything is React state over the FantasyPlayer contract — nothing baked.
 */
export function SquadBuilder() {
  const { data, isLoading } = useFantasyPlayers();
  const players = data?.players ?? [];

  const [selected, setSelected] = useState<FantasyPlayer[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceId, setViceId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | FantasyPosition>('ALL');

  const caps = FANTASY_RULES.perPosition;
  const budget = FANTASY_RULES.budget;
  const maxPerClub = FANTASY_RULES.maxPerClub;

  const spent = selected.reduce((s, p) => s + p.price, 0);
  const remaining = budget - spent;
  const spentPct = Math.min(100, (spent / budget) * 100);

  const byPos = (pos: FantasyPosition) => selected.filter((p) => p.position === pos);
  const clubCount = (clubId: string) => selected.filter((p) => p.club.id === clubId).length;
  const isPicked = (id: string) => selected.some((p) => p.id === id);
  const posFull = (pos: FantasyPosition) => byPos(pos).length >= caps[pos];
  const canAdd = (p: FantasyPlayer) =>
    !isPicked(p.id) && !posFull(p.position) && p.price <= remaining + 1e-9 && clubCount(p.club.id) < maxPerClub;

  const addPlayer = (p: FantasyPlayer) => { if (canAdd(p)) setSelected((s) => [...s, p]); };
  const removePlayer = (id: string) => {
    setSelected((s) => s.filter((p) => p.id !== id));
    if (captainId === id) setCaptainId(null);
    if (viceId === id) setViceId(null);
  };
  const clearAll = () => { setSelected([]); setCaptainId(null); setViceId(null); };

  /** Guarded-greedy autofill: strongest legal 15 that always completes in budget. */
  const autofill = () => {
    const cheapest: Record<string, number> = {};
    POSITIONS.forEach((pos) => {
      const ps = players.filter((p) => p.position === pos).map((p) => p.price).sort((a, b) => a - b);
      cheapest[pos] = ps[0] ?? 0;
    });
    const chosen: FantasyPlayer[] = [];
    const clubs: Record<string, number> = {};
    let left = budget;
    const order: FantasyPosition[] = ['GK', 'FWD', 'DEF', 'MID'];
    const need = { ...caps };
    for (const pos of order) {
      for (let i = 0; i < caps[pos]; i++) {
        need[pos]--;
        let reserve = 0;
        POSITIONS.forEach((pp) => { reserve += Math.max(0, need[pp]) * cheapest[pp]; });
        const cand = players
          .filter((p) => p.position === pos && !chosen.some((c) => c.id === p.id) && (clubs[p.club.id] ?? 0) < maxPerClub && p.price <= left - reserve + 1e-9)
          .sort((a, b) => b.total_points - a.total_points)[0];
        if (cand) { chosen.push(cand); clubs[cand.club.id] = (clubs[cand.club.id] ?? 0) + 1; left -= cand.price; }
      }
    }
    setSelected(chosen);
    const outfield = chosen.filter((p) => p.position !== 'GK').sort((a, b) => b.total_points - a.total_points);
    setCaptainId(outfield[0]?.id ?? null);
    setViceId(outfield[1]?.id ?? null);
  };

  const list = useMemo(() => {
    const l = filter === 'ALL' ? players : players.filter((p) => p.position === filter);
    return l.slice().sort((a, b) => b.total_points - a.total_points);
  }, [players, filter]);

  const complete = selected.length === FANTASY_RULES.squadSize;
  const ready = complete && !!captainId && !!viceId;

  if (isLoading && !data) return <div className="h-[520px] animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.03]" />;

  return (
    <section id="pick-squad" className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#070312] shadow-[0_0_60px_-24px_rgba(124,58,237,0.7)] md:rounded-[2rem]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(124,58,237,0.22),transparent_45%)]" />

      <div className="relative flex flex-wrap items-end justify-between gap-3 p-5 md:p-7">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8e7a1]">Pick Your Squad</span>
          <h2 className="mt-3 font-display text-4xl uppercase leading-none text-white md:text-5xl">Fifteen players. <span className="text-[#f5c542]">£100m</span>. No excuses.</h2>
          <p className="mt-2 text-sm text-white/55">2 GK · 5 DEF · 5 MID · 3 FWD — max three from any one club.</p>
        </div>
      </div>

      <div className="relative grid gap-4 px-4 pb-5 md:px-7 md:pb-7 lg:grid-cols-[300px_1fr]">
        {/* ── left rail: budget + filter + player list ── */}
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          <div className="rounded-2xl border border-white/10 bg-[#0b0518]/70 p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50"><Coins className="h-3.5 w-3.5" /> Budget Remaining</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50"><Users2 className="h-3.5 w-3.5" /> {selected.length}/{FANTASY_RULES.squadSize}</span>
            </div>
            <div className={`mt-1 font-display text-3xl ${remaining < 0 ? 'text-red-400' : 'text-[#f5c542]'}`}>£{remaining.toFixed(1)}m</div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-[#f5c542] transition-all" style={{ width: `${spentPct}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-white/40"><span>£{spent.toFixed(1)}m spent</span><span>£{budget.toFixed(0)}m cap</span></div>
            {/* per-position progress */}
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {POSITIONS.map((pos) => (
                <div key={pos} className="rounded-lg border border-white/8 bg-white/[0.03] py-1 text-center">
                  <div className="text-[9px] font-black uppercase tracking-wide text-white/40">{pos}</div>
                  <div className={`text-[12px] font-black ${byPos(pos).length === caps[pos] ? 'text-emerald-300' : 'text-white/80'}`}>{byPos(pos).length}/{caps[pos]}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={autofill} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-500/20 px-2 py-2 text-[11px] font-black uppercase tracking-wide text-violet-100 transition-colors hover:bg-violet-500/30"><Wand2 className="h-3.5 w-3.5" /> Autofill</button>
              <button type="button" onClick={clearAll} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-white/60 transition-colors hover:border-white/25 hover:text-white/90"><RotateCcw className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors ${filter === f ? 'bg-white text-[#16051f]' : 'border border-white/12 bg-white/[0.04] text-white/65 hover:border-white/25'}`}>{f === 'ALL' ? 'All' : f}</button>
            ))}
          </div>

          <div className="max-h-[380px] space-y-1.5 overflow-y-auto pr-1 lg:max-h-[460px]">
            {list.map((p) => {
              const picked = isPicked(p.id);
              const disabled = !picked && !canAdd(p);
              return (
                <button key={p.id} type="button" onClick={() => (picked ? removePlayer(p.id) : addPlayer(p))} disabled={disabled} className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all ${picked ? 'border-[#f5c542]/50 bg-[#f5c542]/10' : disabled ? 'cursor-not-allowed border-white/8 bg-white/[0.02] opacity-45' : 'border-white/10 bg-white/[0.03] hover:border-violet-400/40 hover:bg-violet-500/10'}`}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/40 font-display text-sm text-[#f8e7a1]">{p.total_points}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-white">{p.name}</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-white/40">{p.position} · {p.club.short_name} {p.status !== 'available' && <span className="text-amber-400">· {p.status}</span>}</span>
                  </span>
                  <span className="text-[12px] font-black text-emerald-300">£{p.price.toFixed(1)}m</span>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${picked ? 'bg-[#f5c542] text-[#16051f]' : 'bg-white/10 text-white/60'}`}>{picked ? <Check className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── squad sheet (2·5·5·3) ── */}
        <div className="order-1 lg:order-2">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20">
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,#0a3d24,#072a19)]" />
            <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.05)_0_44px,transparent_44px_88px)]" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />

            <div className="relative flex flex-col gap-3 px-2 py-5 sm:gap-4 sm:px-4 sm:py-7">
              {ROWS.map((pos) => {
                const row = byPos(pos);
                return (
                  <div key={pos} className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {Array.from({ length: caps[pos] }).map((_, i) => {
                      const p = row[i];
                      return p ? (
                        <PlayerCard key={p.id} player={p} size="sm" captain={captainId === p.id} vice={viceId === p.id} onRemove={() => removePlayer(p.id)} />
                      ) : (
                        <EmptySlot key={`${pos}-${i}`} position={pos} size="sm" onClick={() => setFilter(pos)} />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* captain / vice + save */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-[#f5c542]/25 bg-[#f5c542]/[0.06] px-3 py-2.5">
              <Star className="h-4 w-4 shrink-0 fill-[#f5c542] text-[#f5c542]" />
              <span className="text-[11px] font-black uppercase tracking-wide text-[#f8e7a1]">Captain</span>
              <select value={captainId ?? ''} onChange={(e) => { setCaptainId(e.target.value || null); if (e.target.value === viceId) setViceId(null); }} className="ml-auto min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0b0518] px-2 py-1.5 text-[12px] font-semibold text-white">
                <option value="">— pick —</option>
                {selected.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/[0.06] px-3 py-2.5">
              <Star className="h-4 w-4 shrink-0 text-violet-300" />
              <span className="text-[11px] font-black uppercase tracking-wide text-violet-200">Vice</span>
              <select value={viceId ?? ''} onChange={(e) => { setViceId(e.target.value || null); if (e.target.value === captainId) setCaptainId(null); }} className="ml-auto min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0b0518] px-2 py-1.5 text-[12px] font-semibold text-white">
                <option value="">— pick —</option>
                {selected.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[12px] font-semibold text-white/55">
              {ready ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300"><Check className="h-4 w-4" /> Squad locked. Now we’ll see what you’re made of.</span>
              ) : complete ? (
                <span className="text-[#f8e7a1]">Name a captain &amp; vice to finish.</span>
              ) : (
                <span>Pick <span className="font-black text-white">{FANTASY_RULES.squadSize - selected.length}</span> more to complete your 15.</span>
              )}
            </div>
            <Link to="/fantasy-waitlist" className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-black uppercase tracking-wide transition-transform hover:-translate-y-0.5 ${ready ? 'bg-gradient-to-r from-amber-300 to-amber-500 text-[#16051f]' : 'bg-gradient-to-r from-amber-300/60 to-amber-500/60 text-[#16051f]/80'}`}>
              <Lock className="h-4 w-4" /> Save Squad &amp; Join
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

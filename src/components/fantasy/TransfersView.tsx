import { useMemo, useState } from 'react';
import { ArrowLeftRight, Coins, Check, X, AlertTriangle, Minus } from 'lucide-react';
import { useFantasyTeam, useFantasyPlayers, useFantasyGameweek, useSubmitTransfers } from '@/hooks/useFantasyLeague';
import type { FantasyPosition } from '@/types/footy';

const HIT = 4;
const POS_ORDER: FantasyPosition[] = ['GK', 'DEF', 'MID', 'FWD'];

/**
 * TransfersView — swap players out and in with free-transfer + points-hit
 * accounting and a deadline gate. Bound to useFantasyTeam + useFantasyPlayers;
 * confirm calls submit-transfers. Budget/position/club are re-validated live.
 */
export function TransfersView() {
  const { data: team, isLoading } = useFantasyTeam();
  const { data: playersData } = useFantasyPlayers();
  const { data: gw } = useFantasyGameweek();
  const submit = useSubmitTransfers();

  const [outIds, setOutIds] = useState<Set<string>>(new Set());
  const [reps, setReps] = useState<Record<string, string>>({});

  const pool = playersData?.players ?? [];
  const poolById = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);

  if (isLoading && !team) return <div className="h-[560px] animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.03]" />;
  if (!team) return null;

  const squadIds = new Set(team.slots.map((s) => s.player.id));
  const outList = team.slots.filter((s) => outIds.has(s.player.id)).map((s) => s.player);
  const chosenIns = Object.entries(reps).filter(([outId]) => outIds.has(outId)).map(([, inId]) => inId).filter(Boolean);
  const freed = outList.reduce((a, p) => a + p.price, 0);
  const incoming = chosenIns.reduce((a, id) => a + (poolById.get(id)?.price ?? 0), 0);
  const remainingAfter = team.budget_remaining + freed - incoming;
  const count = outIds.size;
  const free = team.free_transfers;
  const hits = Math.max(0, count - free) * HIT;
  const allPaired = outList.every((p) => reps[p.id]);
  const deadlinePassed = gw?.deadline_at ? Date.now() > new Date(gw.deadline_at).getTime() : false;
  const canConfirm = count > 0 && allPaired && remainingAfter >= -1e-9 && !deadlinePassed && !submit.isPending;

  const toggleOut = (id: string) => {
    setOutIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); setReps((r) => { const c = { ...r }; delete c[id]; return c; }); }
      else next.add(id);
      return next;
    });
  };
  const eligibleFor = (pos: FantasyPosition) => pool.filter((p) => p.position === pos && !squadIds.has(p.id) && !chosenIns.includes(p.id)).sort((a, b) => b.total_points - a.total_points);

  const confirm = () => {
    if (!canConfirm || !gw) return;
    submit.mutate({ teamId: team.id, gameweek: gw.gameweek, outPlayerIds: [...outIds], inPlayerIds: outList.map((p) => reps[p.id]) });
  };

  return (
    <section className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#070312] shadow-[0_0_60px_-24px_rgba(124,58,237,0.7)] md:rounded-[2rem]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div className="relative p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8e7a1]"><ArrowLeftRight className="h-3.5 w-3.5" /> Transfers</span>
            <h2 className="mt-3 font-display text-4xl uppercase leading-none text-white md:text-5xl">Wheel and deal.</h2>
            <p className="mt-2 text-sm text-white/55">One free transfer a week. Each extra costs −{HIT} points. Gamble responsibly.</p>
          </div>
          {/* summary */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/10 bg-[#0b0518]/60 px-3 py-2"><div className="text-[9px] font-black uppercase tracking-widest text-white/40">Free</div><div className="font-display text-xl text-white">{free}</div></div>
            <div className="rounded-xl border border-white/10 bg-[#0b0518]/60 px-3 py-2"><div className="text-[9px] font-black uppercase tracking-widest text-white/40">Hit</div><div className={`font-display text-xl ${hits > 0 ? 'text-red-400' : 'text-white'}`}>{hits ? `−${hits}` : '0'}</div></div>
            <div className="rounded-xl border border-white/10 bg-[#0b0518]/60 px-3 py-2"><div className="text-[9px] font-black uppercase tracking-widest text-white/40">Budget</div><div className={`font-display text-xl ${remainingAfter < 0 ? 'text-red-400' : 'text-[#f5c542]'}`}>£{remainingAfter.toFixed(1)}m</div></div>
          </div>
        </div>

        {deadlinePassed && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] font-bold text-red-300"><AlertTriangle className="h-4 w-4" /> Deadline’s gone — doors are shut till next week.</div>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* your squad */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/50"><Minus className="h-3.5 w-3.5 text-red-400" /> Ship out — tap to select</div>
            <div className="space-y-3">
              {POS_ORDER.map((pos) => {
                const rows = team.slots.filter((s) => s.player.position === pos);
                return (
                  <div key={pos}>
                    <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">{pos}</div>
                    <div className="grid gap-1.5">
                      {rows.map((s) => {
                        const out = outIds.has(s.player.id);
                        return (
                          <button key={s.player.id} type="button" onClick={() => toggleOut(s.player.id)} className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all ${out ? 'border-red-400/50 bg-red-500/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'}`}>
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/40 font-display text-sm text-[#f8e7a1]">{s.player.total_points}</span>
                            <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-bold text-white">{s.player.name}</span><span className="block text-[10px] font-semibold uppercase tracking-wide text-white/40">{s.player.position} · {s.player.club.short_name}</span></span>
                            <span className="text-[12px] font-black text-emerald-300">£{s.player.price.toFixed(1)}m</span>
                            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${out ? 'bg-red-500 text-white' : 'bg-white/10 text-white/50'}`}>{out ? <X className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* replacements */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/50"><ArrowLeftRight className="h-3.5 w-3.5 text-[#f5c542]" /> Bring in</div>
            {outList.length === 0 ? (
              <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-white/15 text-center text-sm text-white/40">Select players to ship out, then pick their replacements here.</div>
            ) : (
              <div className="space-y-2.5">
                {outList.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-[#0b0518]/60 p-3">
                    <div className="mb-2 flex items-center gap-2 text-[12px] text-white/60"><span className="font-bold text-red-300">OUT</span> {p.name} <span className="text-white/30">·</span> £{p.price.toFixed(1)}m</div>
                    <select value={reps[p.id] ?? ''} onChange={(e) => setReps((r) => ({ ...r, [p.id]: e.target.value }))} className="w-full rounded-lg border border-white/12 bg-[#120726] px-2.5 py-2 text-[13px] font-semibold text-white">
                      <option value="">Choose a {p.position} to bring in…</option>
                      {eligibleFor(p.position).slice(0, 30).map((c) => <option key={c.id} value={c.id}>{c.name} — {c.club.short_name} — £{c.price.toFixed(1)}m — {c.total_points}pts</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={confirm} disabled={!canConfirm} className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-black uppercase tracking-wide transition-transform ${canConfirm ? 'bg-gradient-to-r from-amber-300 to-amber-500 text-[#16051f] hover:-translate-y-0.5' : 'cursor-not-allowed bg-white/10 text-white/40'}`}>
              {submit.isPending ? 'Confirming…' : hits > 0 ? `Confirm — take the −${hits} hit` : 'Confirm Transfers'}
            </button>
            {submit.isSuccess && <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-300"><Check className="h-4 w-4" /> Done and dusted. Fresh legs incoming.</p>}
            {submit.isError && <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-white/50"><Coins className="h-4 w-4" /> Transfers will lock in once your squad’s saved to the league.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Wand2, RotateCcw, Lock, Users2, Coins, ChevronRight } from 'lucide-react';
import {
  useFantasyPlayers,
  type FantasyPlayer,
  type FantasyPosition,
} from '@/hooks/useFantasyLeague';
import { PlayerCard, EmptySlot } from './PlayerCard';

const POSITIONS: FantasyPosition[] = ['GK', 'DEF', 'MID', 'FWD'];
const FILTERS: ('ALL' | FantasyPosition)[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];

type Group = { pos: FantasyPosition; count: number };

/** Parse "4-2-3-1" → position capacities + display groups (first=DEF, last=FWD). */
function parseFormation(formation: string): { caps: Record<FantasyPosition, number>; groups: Group[] } {
  const nums = formation.split('-').map(Number);
  const groups: Group[] = nums.map((count, i) => ({
    pos: i === 0 ? 'DEF' : i === nums.length - 1 ? 'FWD' : 'MID',
    count,
  }));
  const caps: Record<FantasyPosition, number> = { GK: 1, DEF: 0, MID: 0, FWD: 0 };
  groups.forEach((g) => (caps[g.pos] += g.count));
  return { caps, groups };
}

/**
 * SquadBuilder — the interactive "Pick Your Squad" board. Real formation math,
 * a £-budget engine, a max-per-club rule and a filterable player list. Nothing
 * is baked: every card, price and total is React state over the players API.
 */
export function SquadBuilder() {
  const { data, isLoading } = useFantasyPlayers();
  const players = data?.players ?? [];
  const rules = data?.rules;

  const [formation, setFormation] = useState(rules?.defaultFormation ?? '4-3-3');
  const [selected, setSelected] = useState<FantasyPlayer[]>([]);
  const [filter, setFilter] = useState<'ALL' | FantasyPosition>('ALL');

  const { caps, groups } = useMemo(() => parseFormation(formation), [formation]);
  const budget = rules?.budget ?? 95;
  const maxPerClub = rules?.maxPerClub ?? 3;

  const spent = selected.reduce((s, p) => s + p.price, 0);
  const remaining = budget - spent;
  const spentPct = Math.min(100, (spent / budget) * 100);

  const byPos = (pos: FantasyPosition) => selected.filter((p) => p.position === pos);
  const clubCount = (team: string) => selected.filter((p) => p.team === team).length;
  const isPicked = (id: string) => selected.some((p) => p.id === id);

  const posFull = (pos: FantasyPosition) => byPos(pos).length >= caps[pos];
  const canAdd = (p: FantasyPlayer) =>
    !isPicked(p.id) && !posFull(p.position) && p.price <= remaining + 1e-9 && clubCount(p.team) < maxPerClub;

  const addPlayer = (p: FantasyPlayer) => {
    if (!canAdd(p)) return;
    setSelected((s) => [...s, p]);
  };
  const removePlayer = (id: string) => setSelected((s) => s.filter((p) => p.id !== id));

  const changeFormation = (f: string) => {
    const next = parseFormation(f);
    // trim any position that now has fewer slots (drop last-added of that pos)
    setSelected((s) => {
      const keep: FantasyPlayer[] = [];
      const used: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
      for (const p of s) {
        if (used[p.position] < next.caps[p.position]) {
          keep.push(p);
          used[p.position]++;
        }
      }
      return keep;
    });
    setFormation(f);
  };

  const clearAll = () => setSelected([]);

  /** Guarded-greedy autofill: strongest legal XI that always completes within budget. */
  const autofill = () => {
    const need: FantasyPosition[] = [];
    POSITIONS.forEach((pos) => { for (let i = 0; i < caps[pos]; i++) need.push(pos); });
    // cheapest price available per position (for budget reservation)
    const cheapest: Record<string, number> = {};
    POSITIONS.forEach((pos) => {
      const ps = players.filter((p) => p.position === pos).map((p) => p.price).sort((a, b) => a - b);
      cheapest[pos] = ps[0] ?? 0;
    });
    const chosen: FantasyPlayer[] = [];
    const clubs: Record<string, number> = {};
    let left = budget;
    // fill scarcest-first: GK, FWD, then DEF, MID
    const order: FantasyPosition[] = ['GK', 'FWD', 'DEF', 'MID'];
    const remainingNeed = { ...caps };
    for (const pos of order) {
      for (let i = 0; i < caps[pos]; i++) {
        remainingNeed[pos]--;
        // reserve cheapest for every still-unfilled slot (excluding this one)
        let reserve = 0;
        POSITIONS.forEach((pp) => { reserve += Math.max(0, remainingNeed[pp]) * cheapest[pp]; });
        const cand = players
          .filter((p) => p.position === pos && !chosen.some((c) => c.id === p.id) && (clubs[p.team] ?? 0) < maxPerClub && p.price <= left - reserve + 1e-9)
          .sort((a, b) => b.rating - a.rating)[0];
        if (cand) {
          chosen.push(cand);
          clubs[cand.team] = (clubs[cand.team] ?? 0) + 1;
          left -= cand.price;
        }
      }
    }
    setSelected(chosen);
  };

  const list = useMemo(() => {
    const l = filter === 'ALL' ? players : players.filter((p) => p.position === filter);
    return l.slice().sort((a, b) => b.rating - a.rating);
  }, [players, filter]);

  const displayGroups = useMemo(() => [...groups].reverse(), [groups]); // FWD on top → DEF above GK

  // per-position running index while rendering rows
  const cursor: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

  if (isLoading && !data) {
    return <div className="h-[520px] animate-pulse rounded-[1.6rem] border border-white/10 bg-white/[0.03]" />;
  }

  return (
    <section id="pick-squad" className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#070312] shadow-[0_0_60px_-24px_rgba(124,58,237,0.7)] md:rounded-[2rem]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(124,58,237,0.22),transparent_45%)]" />

      {/* header */}
      <div className="relative flex flex-wrap items-end justify-between gap-3 p-5 md:p-7">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8e7a1]">
            Pick Your Squad
          </span>
          <h2 className="mt-3 font-display text-4xl uppercase leading-none text-white md:text-5xl">
            Build Your <span className="text-[#f5c542]">XI</span>. Beat The Gaffer.
          </h2>
        </div>
        {/* formation selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-black uppercase tracking-widest text-white/40">Formation</span>
          {(rules?.formations ?? ['4-3-3']).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => changeFormation(f)}
              className={`rounded-lg px-2.5 py-1.5 text-[12px] font-black tabular-nums transition-colors ${
                formation === f ? 'bg-[#f5c542] text-[#16051f]' : 'border border-white/12 bg-white/[0.04] text-white/70 hover:border-white/25'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="relative grid gap-4 px-4 pb-5 md:px-7 md:pb-7 lg:grid-cols-[300px_1fr]">
        {/* ── left rail: budget + filter + player list ── */}
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          {/* budget */}
          <div className="rounded-2xl border border-white/10 bg-[#0b0518]/70 p-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50"><Coins className="h-3.5 w-3.5" /> Budget Remaining</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50"><Users2 className="h-3.5 w-3.5" /> {selected.length}/{rules?.squadSize ?? 11}</span>
            </div>
            <div className={`mt-1 font-display text-3xl ${remaining < 0 ? 'text-red-400' : 'text-[#f5c542]'}`}>£{remaining.toFixed(1)}m</div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-[#f5c542] transition-all" style={{ width: `${spentPct}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-white/40">
              <span>£{spent.toFixed(1)}m spent</span>
              <span>£{budget.toFixed(0)}m cap</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={autofill} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-500/20 px-2 py-2 text-[11px] font-black uppercase tracking-wide text-violet-100 transition-colors hover:bg-violet-500/30">
                <Wand2 className="h-3.5 w-3.5" /> Autofill
              </button>
              <button type="button" onClick={clearAll} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-2 text-[11px] font-black uppercase tracking-wide text-white/60 transition-colors hover:border-white/25 hover:text-white/90">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* position filter */}
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors ${
                  filter === f ? 'bg-white text-[#16051f]' : 'border border-white/12 bg-white/[0.04] text-white/65 hover:border-white/25'
                }`}
              >
                {f === 'ALL' ? 'All' : f}
              </button>
            ))}
          </div>

          {/* player list */}
          <div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1 lg:max-h-[440px]">
            {list.map((p) => {
              const picked = isPicked(p.id);
              const disabled = !picked && !canAdd(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => (picked ? removePlayer(p.id) : addPlayer(p))}
                  disabled={disabled}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all ${
                    picked
                      ? 'border-[#f5c542]/50 bg-[#f5c542]/10'
                      : disabled
                        ? 'cursor-not-allowed border-white/8 bg-white/[0.02] opacity-45'
                        : 'border-white/10 bg-white/[0.03] hover:border-violet-400/40 hover:bg-violet-500/10'
                  }`}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/40 font-display text-sm text-[#f8e7a1]">{p.rating}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-white">{p.name}</span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-white/40">{p.position} · {p.teamShort}</span>
                  </span>
                  <span className="text-[12px] font-black text-emerald-300">£{p.price.toFixed(1)}m</span>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${picked ? 'bg-[#f5c542] text-[#16051f]' : 'bg-white/10 text-white/60'}`}>
                    {picked ? <Check className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── pitch ── */}
        <div className="order-1 lg:order-2">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20">
            {/* pitch turf */}
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,#0a3d24,#072a19)]" />
            <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.05)_0_44px,transparent_44px_88px)]" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-24 w-40 -translate-x-1/2 border-x border-b border-white/15" />
            <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 h-24 w-40 -translate-x-1/2 border-x border-t border-white/15" />

            <div className="relative flex flex-col gap-3 px-2 py-5 sm:gap-4 sm:px-4 sm:py-7">
              {displayGroups.map((g, gi) => {
                const start = cursor[g.pos];
                const rowPlayers = byPos(g.pos).slice(start, start + g.count);
                cursor[g.pos] = start + g.count;
                return (
                  <div key={`${g.pos}-${gi}`} className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {Array.from({ length: g.count }).map((_, i) => {
                      const p = rowPlayers[i];
                      return p ? (
                        <PlayerCard key={p.id} player={p} size="sm" onRemove={() => removePlayer(p.id)} />
                      ) : (
                        <EmptySlot key={`${g.pos}-${gi}-${i}`} position={g.pos} size="sm" onClick={() => setFilter(g.pos)} />
                      );
                    })}
                  </div>
                );
              })}
              {/* GK row */}
              <div className="flex items-center justify-center">
                {byPos('GK')[0] ? (
                  <PlayerCard player={byPos('GK')[0]} size="sm" onRemove={() => removePlayer(byPos('GK')[0].id)} />
                ) : (
                  <EmptySlot position="GK" size="sm" onClick={() => setFilter('GK')} />
                )}
              </div>
            </div>
          </div>

          {/* squad status + save */}
          <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[12px] font-semibold text-white/55">
              {selected.length === (rules?.squadSize ?? 11) ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300"><Check className="h-4 w-4" /> Full squad — you’re ready to take on The Gaffer.</span>
              ) : (
                <span>Pick <span className="font-black text-white">{(rules?.squadSize ?? 11) - selected.length}</span> more to complete your XI.</span>
              )}
            </div>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-[#16051f] transition-transform hover:-translate-y-0.5"
            >
              <Lock className="h-4 w-4" /> Save Squad &amp; Join
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

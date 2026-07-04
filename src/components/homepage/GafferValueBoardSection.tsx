import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trophy, Star, Coins, ArrowRight, Telescope, Ticket, Activity, BarChart3, Swords, Check, Layers, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TeamAvatar } from '@/components/TeamAvatar';
import { getDailyBet, getGafferPicks, getValueFixtures, type Leg, type DailyBet } from '@/lib/gafferSelection';
import { useLiveDailyPicks } from './useLiveDailyPicks';
import { useInPlay, type InPlayState } from './useInPlay';
import { useLiveScores, matchLive, type LiveScore } from './useLiveScores';
import rawSnapshot from '@/data/formTablesData.json';
import type { FormFixtureRow } from '@/types/footy';

// ── in-play (time-based v1; live counts land once the FootyStats poller ships) ──
// Re-render on a timer so the in-play state advances without a manual refresh.
function useClock(ms = 30000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}
// Rough phase from kick-off time (today, UK): pre → live (≤130 min) → ended.
function matchPhase(timeStr: string): 'pre' | 'live' | 'ended' {
  const m = /^(\d{1,2}):(\d{2})/.exec(timeStr || '');
  if (!m) return 'pre';
  const uk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
  const nowMin = uk.getHours() * 60 + uk.getMinutes();
  const koMin = Number(m[1]) * 60 + Number(m[2]);
  if (nowMin < koMin) return 'pre';
  if (nowMin < koMin + 130) return 'live';
  return 'ended';
}
// A selection's live/finished status. FootyStats has no live scores on this
// plan, so 'live' is time-based (badge only). Once a match is complete it
// carries the FINAL numbers, so 'ft' shows the score + a settled Won/Lost.
type StatusInfo = { state: 'live' | 'ft'; result?: 'won' | 'lost'; landed?: boolean; text: string };

function selectionLine(sel: string): number | null {
  const lm = /(\d+(?:\.\d+)?)/.exec(sel);
  return lm ? Number(lm[1]) : null;
}

function settleLeg(leg: Leg, ip: InPlayState): 'won' | 'lost' | null {
  const line = selectionLine(leg.selection);
  if (leg.market === 'BTTS') return ip.homeGoals > 0 && ip.awayGoals > 0 ? 'won' : 'lost';
  const metric = leg.market === 'Corners' ? ip.corners : ip.goals;
  if (metric == null || line == null) return null;
  return metric > line ? 'won' : 'lost';
}

function statusInfo(leg: Leg, ip?: InPlayState, live?: LiveScore): StatusInfo | null {
  // Finished — FootyStats carries the final numbers → settle Won/Lost.
  if (ip?.ended) return { state: 'ft', result: settleLeg(leg, ip) ?? undefined, text: `FT ${ip.homeGoals}–${ip.awayGoals}` };
  // Live score from API-Football (real in-play).
  if (live) {
    const score = `${live.gh}–${live.ga}`;
    const clock = live.status === 'HT' ? 'HT' : live.elapsed != null ? `${live.elapsed}'` : 'LIVE';
    const line = selectionLine(leg.selection);
    const total = live.gh + live.ga;
    const landed = leg.market === 'Goals' && line != null ? total > line
      : leg.market === 'BTTS' ? live.gh > 0 && live.ga > 0
      : false;
    return { state: 'live', landed, text: `${clock} · ${score}` };
  }
  // No live data (e.g. corners-only markets, or match not on the live feed) —
  // fall back to the time-based badge so it still reads as in-play.
  if (matchPhase(leg.time) === 'live') return { state: 'live', text: 'In Play' };
  return null;
}

function StatusChip({ st }: { st: StatusInfo }) {
  if (st.state === 'ft') {
    const tone = st.result === 'won'
      ? 'border-emerald-400/55 bg-emerald-500/15 text-emerald-200'
      : st.result === 'lost'
        ? 'border-rose-400/55 bg-rose-500/15 text-rose-200'
        : 'border-white/20 bg-white/[0.06] text-white/70';
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${tone}`}>
        {st.text}{st.result === 'won' ? ' · Won ✓' : st.result === 'lost' ? ' · Lost' : ''}
      </span>
    );
  }
  const tone = st.landed
    ? 'border-emerald-400/55 bg-emerald-500/15 text-emerald-200'
    : 'border-rose-400/55 bg-rose-500/15 text-rose-200';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide shadow-[0_0_16px_-4px_rgba(244,63,94,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${st.landed ? 'bg-emerald-400' : 'bg-rose-400'} [animation:pulse_1.4s_ease-in-out_infinite]`} />
      {st.text}
    </span>
  );
}

const GAFFER_IMG = '/images/gaffer/gaffer-pointing-board.jpg';
const CTA_URL = '/form-tables';
const SNAP = (rawSnapshot as unknown as { fixtures: FormFixtureRow[] }).fixtures ?? [];

// ── snapshot enrichment: form %, league average, head-to-head hit rate ──────
const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const lineOf = (selection: string) => { const m = selection.match(/(\d+(?:\.\d+)?)/); return m ? Number(m[1]) : 0; };

function findFixture(leg: Leg): FormFixtureRow | undefined {
  const h = norm(leg.home.name), a = norm(leg.away.name);
  return SNAP.find((f) => {
    const fh = norm(f.home.name), fa = norm(f.away.name);
    return (fh === h && fa === a) || (fh === a && fa === h);
  });
}
/** Backfill missing crest URLs from the matching slate fixture. */
function withLogos(leg: Leg): Leg {
  if (leg.home.logo && leg.away.logo) return leg;
  const f = findFixture(leg);
  if (!f) return leg;
  return {
    ...leg,
    home: { ...leg.home, logo: leg.home.logo ?? f.home.logo ?? null },
    away: { ...leg.away, logo: leg.away.logo ?? f.away.logo ?? null },
  };
}

type Enriched = { formScore: number | null; leagueAverage: number | null; headToHead: string | null };
function enrich(leg: Leg): Enriched {
  const f = findFixture(leg);
  if (!f) return { formScore: leg.prob ?? null, leagueAverage: null, headToHead: null };
  const line = lineOf(leg.selection);
  const key = String(line);
  const formScore =
    leg.market === 'Corners' ? f.corners_over?.[key] ?? null
    : leg.market === 'Goals' ? f.goals_over?.[key] ?? null
    : leg.market === 'BTTS' ? f.btts_pct ?? null
    : (f.cards_over as Record<string, number> | undefined)?.[key] ?? null;
  const leagueAverage =
    leg.market === 'Corners' ? f.corners_avg
    : leg.market === 'Goals' ? f.goals_avg
    : leg.market === 'BTTS' ? f.btts_pct
    : f.cards_avg;
  let headToHead: string | null = null;
  if (Array.isArray(f.h2h) && f.h2h.length) {
    const total = f.h2h.length;
    let hits = 0;
    for (const m of f.h2h) {
      if (leg.market === 'Corners') { if ((m.corners ?? 0) > line) hits++; }
      else if (leg.market === 'Goals') { if (((m.hg ?? 0) + (m.ag ?? 0)) > line) hits++; }
      else if (leg.market === 'BTTS') { if ((m.hg ?? 0) > 0 && (m.ag ?? 0) > 0) hits++; }
      else if ((m.cards ?? 0) > line) hits++;
    }
    headToHead = `${hits}/${total}`;
  }
  return { formScore: formScore ?? leg.prob ?? null, leagueAverage: leagueAverage ?? null, headToHead };
}

// ── month-to-date profit from settled picks ─────────────────────────────────
function useMonthProfit() {
  return useQuery({
    queryKey: ['homepage_month_profit'],
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<number | null> => {
      const now = new Date();
      const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('gaffer_picks')
        .select('profit_loss, status, pick_date')
        .in('status', ['won', 'lost'])
        .gte('pick_date', first);
      if (error || !Array.isArray(data) || data.length === 0) return null;
      let p = 0;
      for (const r of data) p += Number((r as { profit_loss?: number }).profit_loss ?? 0);
      return Math.round(p * 10) / 10;
    },
  });
}

const money = (n: number) => (Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`);
const ago = (iso: string | null) => {
  if (!iso) return 'today';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'today';
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} hr${h > 1 ? 's' : ''} ago` : `${Math.round(h / 24)}d ago`;
};

// ── crest pair ──────────────────────────────────────────────────────────────
function CrestPair({ leg, size = 64 }: { leg: Leg; size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamAvatar name={leg.home.name} logoUrl={leg.home.logo} size={size} className="rounded-xl bg-black/30 p-1" />
      <span className="grid h-6 w-6 place-items-center rounded-md border border-white/15 bg-white/[0.04] text-[10px] font-black text-white/50">VS</span>
      <TeamAvatar name={leg.away.name} logoUrl={leg.away.logo} size={size} className="rounded-xl bg-black/30 p-1" />
    </div>
  );
}

function ConfidenceBar({ pct }: { pct: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-inset ring-white/5">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-[#f5c542] shadow-[0_0_10px_rgba(245,197,66,0.55)]"
        style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

// ── a compact leg block used inside the multi-leg featured card ─────────────
function LegBlock({ leg, index, total, ip, liveList }: { leg: Leg; index: number; total: number; ip?: InPlayState; liveList?: LiveScore[] }) {
  const e = enrich(leg);
  const st = statusInfo(leg, ip, matchLive(leg.home.name, leg.away.name, liveList));
  return (
    <div className="card-3d relative overflow-hidden rounded-2xl p-4">
      {/* premium top sheen line */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />

      {/* header: leg number + prominent kickoff pill */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/65">
          <span className="grid h-5 w-5 place-items-center rounded-full border border-[#f5c542]/50 bg-[#f5c542]/12 text-[10px] font-black text-[#f8e7a1]">{index + 1}</span>
          Leg {index + 1} of {total}
        </span>
        {st ? <StatusChip st={st} /> : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/12 px-2.5 py-1 text-[13px] font-black tracking-wide text-[#f8e7a1] shadow-[0_0_16px_-6px_rgba(245,197,66,0.65)]">
            <Clock className="h-3.5 w-3.5" /> {leg.time}
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]/65">KO</span>
          </span>
        )}
      </div>

      {/* teams — crest on top, name centred underneath, VS between (no cramped single row) */}
      <div className="inset-3d mt-3 grid grid-cols-[1fr_auto_1fr] items-start gap-2 rounded-xl p-3">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <TeamAvatar name={leg.home.name} logoUrl={leg.home.logo} size={44} className="rounded-xl bg-black/50 p-1.5 ring-1 ring-white/15 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.15)]" />
          <div className="text-[13px] font-bold leading-tight text-white text-emboss">{leg.home.name}</div>
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/45">Home</div>
        </div>
        <span className="mt-3 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/[0.06] text-[10px] font-black text-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">VS</span>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <TeamAvatar name={leg.away.name} logoUrl={leg.away.logo} size={44} className="rounded-xl bg-black/50 p-1.5 ring-1 ring-white/15 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.15)]" />
          <div className="text-[13px] font-bold leading-tight text-white text-emboss">{leg.away.name}</div>
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-white/45">Away</div>
        </div>
      </div>

      {/* the pick + odds */}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-400/35 bg-gradient-to-r from-emerald-500/[0.16] to-emerald-500/[0.02] px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_26px_-16px_rgba(16,185,129,0.55)]">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300/90 text-emboss">The pick</div>
          <div className="truncate font-display text-lg uppercase tracking-tight text-white text-extrude">{leg.selection}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-[27px] leading-none text-[#f5c542] text-extrude">{leg.odds.toFixed(2)}</div>
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/60">Odds</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-white/70 text-emboss">
          <span>Confidence</span>
          <span className="text-white">{leg.prob}%</span>
        </div>
        <ConfidenceBar pct={leg.prob} />
      </div>
      <div className="inset-3d mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2.5 py-1.5 text-[11px] text-white/70">
        <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3 text-violet-300" /> Form <b className="text-white">{e.formScore != null ? `${e.formScore}%` : '—'}</b></span>
        <span className="inline-flex items-center gap-1"><BarChart3 className="h-3 w-3 text-violet-300" /> Avg <b className="text-white">{e.leagueAverage != null ? e.leagueAverage.toFixed(1) : '—'}</b></span>
        <span className="ml-auto inline-flex items-center gap-1 rounded bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-black uppercase text-emerald-300 ring-1 ring-inset ring-emerald-400/20">+{leg.edge.toFixed(1)}%</span>
      </div>
    </div>
  );
}

// ── the featured "Gaffer's Top Pick" card — single leg OR full multi-leg ─────
function FeaturedCard({ legs, isTip, bet, inplay, liveList }: { legs: Leg[]; isTip: boolean; bet: DailyBet; inplay?: Record<string, InPlayState>; liveList?: LiveScore[] }) {
  const single = legs.length <= 1;
  const primary = legs[0];
  const e = enrich(primary);
  const primaryStatus = statusInfo(primary, inplay?.[primary.fixtureId], matchLive(primary.home.name, primary.away.name, liveList));
  const stake = bet.type === 'none' ? 10 : bet.stake;
  const singleReturn = primary.odds * stake;
  const combined = bet.type === 'none' ? primary.odds : bet.combinedOdds;
  const returns = bet.type === 'none' ? singleReturn : bet.returns;
  const label =
    !isTip ? 'Top Value · not a tip'
    : bet.type === 'double' ? "Today's Double · Gaffer's Slip"
    : legs.length > 2 ? `Today's ${legs.length}-fold · Gaffer's Slip`
    : "Gaffer's Top Pick";


  return (
    <div className="relative rounded-[1.4rem] p-[1.5px] [background:linear-gradient(130deg,#f5c542_0%,#7c3aed_38%,#22d3ee_66%,#f5c542_100%)] shadow-[0_30px_80px_-30px_rgba(124,58,237,0.8)]">
      <div className="frost-panel frost-sheen relative overflow-hidden rounded-[1.33rem] p-4 md:p-6">
        {/* eyebrow chip */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/50 bg-[#f5c542]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#f8e7a1] text-emboss shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_-8px_rgba(245,197,66,0.5)]">
            <Star className="h-3.5 w-3.5 fill-current" /> {label}
          </span>
          {!single && (
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200 sm:inline-flex">
              <Ticket className="h-3.5 w-3.5" /> {legs.length} legs
            </span>
          )}
        </div>

        {single ? (
          // ── single-leg featured (original layout, tightened for mobile) ──
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col items-center gap-2 text-center">
                  <TeamAvatar name={primary.home.name} logoUrl={primary.home.logo} size={56} className="rounded-xl bg-black/30 p-1" />
                  <span className="max-w-[7rem] text-sm font-bold leading-tight text-white">{primary.home.name}</span>
                </div>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/[0.04] text-[10px] font-black text-white/50">VS</span>
                <div className="flex flex-col items-center gap-2 text-center">
                  <TeamAvatar name={primary.away.name} logoUrl={primary.away.logo} size={56} className="rounded-xl bg-black/30 p-1" />
                  <span className="max-w-[7rem] text-sm font-bold leading-tight text-white">{primary.away.name}</span>
                </div>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {primaryStatus ? <StatusChip st={primaryStatus} /> : <div className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-300">Today · {primary.time} KO</div>}
                  <div className="mt-1 truncate font-display text-2xl uppercase tracking-tight text-white md:text-3xl">{primary.selection}</div>
                  <div className="text-xs text-white/50">{primary.region} · {primary.league}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-4xl leading-none text-[#f5c542] md:text-5xl">{primary.odds.toFixed(2)}</div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/65">Odds</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="frost-tile relative overflow-hidden rounded-xl border border-white/12 px-3 py-2.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-white/65">
                    <span>Confidence</span><span className="font-display text-base text-white">{primary.prob}%</span>
                  </div>
                  <div className="mt-2"><ConfidenceBar pct={primary.prob} /></div>
                </div>
                <div className="flex flex-col justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-3 py-2.5">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/80">Edge / Value</div>
                  <div className="font-display text-2xl leading-none text-emerald-300">+{primary.edge.toFixed(1)}%</div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[12px]">
                <span className="inline-flex items-center gap-1 text-white/70"><Activity className="h-3.5 w-3.5 text-violet-300" /> Form <b className="text-white">{e.formScore != null ? `${e.formScore}%` : '—'}</b></span>
                <span className="inline-flex items-center gap-1 text-white/70"><BarChart3 className="h-3.5 w-3.5 text-violet-300" /> Avg <b className="text-white">{e.leagueAverage != null ? e.leagueAverage.toFixed(1) : '—'}</b></span>
                {e.headToHead && <span className="inline-flex items-center gap-1 text-white/70"><Swords className="h-3.5 w-3.5 text-violet-300" /> H2H <b className="text-white">{e.headToHead}</b></span>}
              </div>
            </div>
          </div>
        ) : (
          // ── multi-leg featured: every leg visible in the big box ──
          <div className="mt-3 grid gap-2.5 md:grid-cols-2">
            {legs.map((l, i) => <LegBlock key={l.fixtureId} leg={l} index={i} total={legs.length} ip={inplay?.[l.fixtureId]} liveList={liveList} />)}
          </div>
        )}

        {/* combined slip strip — visible for singles AND multis */}
        {isTip && (
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-[#f5c542]/30 bg-gradient-to-r from-[#1a1003]/80 to-[#0b0518]/70 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_16px_32px_-18px_rgba(0,0,0,0.9)]">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60 text-emboss">{single ? 'Odds' : 'Combined odds'}</div>
              <div className="font-display text-xl leading-none text-[#f5c542] text-extrude">{combined.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60 text-emboss">Stake</div>
              <div className="font-display text-xl leading-none text-white text-extrude">{money(stake)}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60 text-emboss">Returns</div>
              <div className="font-display text-xl leading-none text-emerald-300 text-extrude">{money(returns)}</div>
            </div>
          </div>
        )}

        {/* verdict — the Gaffer speaks on every leg, each in its own box */}
        <div className="mt-3">
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="relative shrink-0">
              <img
                src="/images/the-gaffer.png"
                alt="The Gaffer"
                loading="lazy"
                draggable={false}
                className="h-10 w-10 select-none rounded-full object-cover object-top ring-2 ring-violet-400/50 shadow-[0_6px_16px_-6px_rgba(0,0,0,0.9)]"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0b0518] bg-emerald-400 [animation:pulse_1.6s_ease-in-out_infinite]" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-300">The Gaffer's Verdict</div>
              <div className="text-[10px] text-white/45">{legs.length > 1 ? 'His read on both legs' : 'His read on the pick'}</div>
            </div>
          </div>

          <div className="space-y-2.5">
            {legs.map((l, i) => (
              <div key={l.fixtureId} className="relative overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.1] to-violet-500/[0.015] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_-20px_rgba(0,0,0,0.9)]">
                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/35 bg-[#f5c542]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#f8e7a1]">
                    {legs.length > 1 ? `Leg ${i + 1} · ` : ''}{l.selection}
                  </span>
                  <span className="text-[11px] font-semibold text-white/55">{l.home.name} v {l.away.name}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-display text-2xl leading-[0.7] text-violet-300/70">“</span>
                  <p className="text-[13px] italic leading-relaxed text-white/85">{l.placeholderReason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── secondary pick row — full-width, list-style, no horizontal scroll ────────
function SecondaryRow({ leg, ip, liveList }: { leg: Leg; ip?: InPlayState; liveList?: LiveScore[] }) {
  const st = statusInfo(leg, ip, matchLive(leg.home.name, leg.away.name, liveList));
  const ftTone = st?.result === 'won' ? 'text-emerald-300' : st?.result === 'lost' ? 'text-rose-400' : 'text-white/65';
  return (
    <div className="inset-3d grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5">
      {/* crests */}
      <div className="flex shrink-0 items-center gap-1">
        <TeamAvatar name={leg.home.name} logoUrl={leg.home.logo} size={30} className="rounded-lg bg-black/50 p-0.5 ring-1 ring-white/15" />
        <span className="text-[8px] font-black uppercase text-white/40">v</span>
        <TeamAvatar name={leg.away.name} logoUrl={leg.away.logo} size={30} className="rounded-lg bg-black/50 p-0.5 ring-1 ring-white/15" />
      </div>
      {/* selection + meta */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] font-bold leading-tight text-white text-emboss">{leg.selection}</span>
          {st
            ? (st.state === 'ft'
                ? <span className={`ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-wide ${ftTone}`}>{st.text}{st.result === 'won' ? ' ✓' : st.result === 'lost' ? ' ✗' : ''}</span>
                : <span className={`ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-wide ${st.landed ? 'text-emerald-300' : 'text-rose-300'}`}><span className={`h-1.5 w-1.5 rounded-full ${st.landed ? 'bg-emerald-400' : 'bg-rose-400'} [animation:pulse_1.4s_ease-in-out_infinite]`} />{st.text}</span>)
            : <span className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-[10px] font-black text-[#f8e7a1]"><Clock className="h-3 w-3" />{leg.time}</span>}
        </div>
        <div className="mt-0.5 text-[11px] leading-snug text-white/55">{leg.home.name} <span className="text-white/30">v</span> {leg.away.name}</div>
      </div>
      {/* odds + edge */}
      <div className="shrink-0 text-right">
        <div className="font-display text-xl leading-none text-[#f5c542] text-extrude">{leg.odds.toFixed(2)}</div>
        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-300">+{leg.edge.toFixed(1)}%</div>
      </div>
    </div>
  );
}


// ── the Treble — next 3 value games rolled into one £10 punt ─────────────────
function TrebleCard({ legs, inplay, liveList }: { legs: Leg[]; inplay?: Record<string, InPlayState>; liveList?: LiveScore[] }) {
  const odds = legs.reduce((a, l) => a * l.odds, 1);
  const returns = odds * 10;
  return (
    <div className="relative rounded-[1.4rem] p-[1.5px] [background:linear-gradient(130deg,#22d3ee_0%,#7c3aed_52%,#f5c542_100%)] shadow-[0_24px_60px_-30px_rgba(34,211,238,0.55)]">
      <div className="frost-panel relative overflow-hidden rounded-[1.33rem] p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200 text-emboss shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_-8px_rgba(34,211,238,0.5)]">
            <Layers className="h-3.5 w-3.5" /> Today's Treble
          </span>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200 sm:inline-flex">
            <Ticket className="h-3.5 w-3.5" /> 3 legs · bigger swing
          </span>
        </div>
        <p className="mt-2 text-xs text-white/55">The next three value games in one £10 punt — longer odds, bigger pay-off if it lands.</p>
        <div className="mt-3 space-y-2">
          {legs.map((l) => <SecondaryRow key={l.fixtureId} leg={l} ip={inplay?.[l.fixtureId]} liveList={liveList} />)}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-cyan-300/30 bg-gradient-to-r from-[#06202a]/80 to-[#0b0518]/70 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_16px_32px_-18px_rgba(0,0,0,0.9)]">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60 text-emboss">Combined odds</div>
            <div className="font-display text-xl leading-none text-cyan-200 text-extrude">{odds.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60 text-emboss">Stake</div>
            <div className="font-display text-xl leading-none text-white text-extrude">£10</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/60 text-emboss">Returns</div>
            <div className="font-display text-xl leading-none text-emerald-300 text-extrude">£{returns.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── the Gaffer's Slip ────────────────────────────────────────────────────────
function SlipCard({ bet }: { bet: DailyBet }) {
  const count = bet.type === 'none' ? 0 : bet.legs.length;
  const conf = bet.type === 'none' ? '—' : count >= 2 ? 'High' : bet.legs[0].prob >= 75 ? 'High' : 'Solid';
  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[#f5c542]/25 bg-gradient-to-br from-[#1a1003]/80 to-[#0b0518]/90 p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]">
        <Ticket className="h-4 w-4" /> The Gaffer's Slip
      </div>
      {bet.type === 'none' ? (
        <p className="text-sm text-white/60">No official slip today — value only. Check the full board.</p>
      ) : (
        <>
          <div className="text-lg font-black text-violet-200">{count} Selection{count === 1 ? '' : 's'} · {bet.type === 'double' ? 'Double' : 'Single'}</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65">Combined odds</div>
              <div className="font-display text-2xl leading-none text-[#f5c542]">{bet.combinedOdds.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/65">Confidence</div>
              <div className="font-display text-xl leading-none text-emerald-300">{conf}</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-white/55">{money(bet.stake)} returns <b className="text-[#f8e7a1]">{money(bet.returns)}</b></div>
        </>
      )}
      <Link
        to={CTA_URL}
        className="mt-auto inline-flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-[12px] font-black uppercase tracking-wide text-white shadow-[0_14px_34px_-14px_rgba(139,92,246,1)] transition-all hover:-translate-y-0.5"
      >
        Open today's slip <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

/**
 * GafferValueBoardSection — the homepage live tips/value board. The Gaffer's
 * one pick of the day (single or double) fills the featured + slip; the rail
 * fills with any second leg, then the best-value fixtures as non-tip "value
 * watch" fallbacks. Reads live gaffer_picks, falls back to the bundled slate.
 */
export function GafferValueBoardSection() {
  useClock(); // advance in-play state every 30s
  const { data: live } = useLiveDailyPicks();
  const { data: monthProfit } = useMonthProfit();

  // Official tips: live pick first, else the flagged snapshot bet.
  const liveBet = live?.bet;
  const bet: DailyBet = liveBet && liveBet.type !== 'none' ? liveBet : getDailyBet(getGafferPicks());
  const updatedAt = live?.updatedAt ?? null;

  const tips: Leg[] = bet.type === 'none' ? [] : (bet.legs as Leg[]);
  const tipIds = new Set(tips.map((l) => l.fixtureId));
  // The treble must NEVER repeat a game from the double. Exclude by fixture id
  // AND by team matchup — the live double can carry a different id scheme, so
  // id-only matching could let a duplicate slip through.
  const matchupKey = (h: string, a: string) => [norm(h), norm(a)].sort().join('|');
  const tipMatchups = new Set(tips.map((l) => matchupKey(l.home.name, l.away.name)));
  const valueWatch = getValueFixtures().filter(
    (p) => !tipIds.has(p.fixtureId) && !tipMatchups.has(matchupKey(p.home.name, p.away.name)),
  );

  // Featured card takes the full slip — all tip legs if we have tips, otherwise
  // the single best value pick as a "top value" callout.
  const featuredLegs: Leg[] = tips.length > 0
    ? tips.map((l) => withLogos(l))
    : (valueWatch[0] ? [withLogos(valueWatch[0])] : []);
  const featuredIsTip = tips.length > 0;

  // The Treble — the next 3 value games after the double, one £10 punt that gives
  // the P&L a bigger swing. Only when we actually have an official double + 3 more.
  // Treble = the next 3 best value games (already excludes the double's games).
  const trebleLegs: Leg[] = featuredIsTip ? valueWatch.slice(0, 3).map((l) => withLogos(l)) : [];
  const hasTreble = trebleLegs.length === 3;

  // Live in-play state for every selection on the board (double + treble).
  const boardLegs = [...featuredLegs, ...trebleLegs];
  const inplayIds = boardLegs.map((l) => l.fixtureId);
  const { data: inplay } = useInPlay(inplayIds);
  // Real live scores (API-Football) — only poll while a pick is in its window.
  const anyLive = boardLegs.some((l) => matchPhase(l.time) === 'live');
  const { data: liveList } = useLiveScores(anyLive);

  const activeCount = featuredIsTip ? tips.length + trebleLegs.length : valueWatch.length;

  const profit = monthProfit ?? 48; // sample until first settlements

  return (
    <section
      id="daily-picks"
      data-endpoint="gaffer_picks"
      className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#070312] shadow-[0_0_60px_-22px_rgba(124,58,237,0.7)]"
    >
      {/* stadium atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(124,58,237,0.28),transparent_42%),radial-gradient(circle_at_10%_10%,rgba(245,197,66,0.10),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.10),transparent_45%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:34px_34px] opacity-40" />
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />

      {/* Gaffer image — desktop only, kept off mobile to preserve header contrast */}
      <img
        src={GAFFER_IMG}
        alt="The Gaffer"
        loading="lazy"
        draggable={false}
        className="pointer-events-none absolute right-0 top-0 z-0 hidden select-none md:block md:w-[380px] md:opacity-100"
      />
      {/* scrim — desktop only, keeps copy legible over the Gaffer */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden md:block md:bg-gradient-to-r md:from-[#070312] md:via-[#070312]/45 md:to-transparent" />
      <span aria-hidden className="pointer-events-none absolute right-[7%] top-[11%] z-[1] hidden -rotate-6 text-right font-['Caveat'] text-xl font-bold leading-tight text-violet-300/90 [text-shadow:0_2px_10px_rgba(139,92,246,0.6)] lg:block">
        Stats don't lie.<br />Edges do. <span className="text-violet-200">– Gaffer</span>
      </span>

      <div className="relative z-[2] p-5 md:p-8">
        {/* Header */}
        <div className="max-w-xl md:max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/50 bg-[#f5c542]/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#f8e7a1] text-emboss shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_16px_-8px_rgba(245,197,66,0.5)]">
            <Trophy className="h-3.5 w-3.5 fill-current" /> The Gaffer's Picks
          </span>
          <h2 className="mt-3 font-display text-4xl uppercase leading-[0.9] tracking-tight text-white md:text-6xl text-extrude">Today's Value Board</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65 md:text-[15px]">
            I scan the noise. You get the signal. High value, strong data, proper football. No fluff — just edges I'd back with my rep on it.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(16,185,129,0.7)]" /> Updated {ago(updatedAt)}
            </span>
            <span className="hidden h-3 w-px bg-white/15 sm:block" />
            <span className="inline-flex items-center gap-1.5 text-[#f8e7a1]"><Coins className="h-3.5 w-3.5" /> {activeCount} pick{activeCount === 1 ? '' : 's'} active</span>
          </div>
        </div>

        {/* Featured — includes ALL tip legs (single, double, multi) */}
        {featuredLegs.length > 0 ? (
          <div className="mt-6"><FeaturedCard legs={featuredLegs} isTip={featuredIsTip} bet={bet} inplay={inplay} liveList={liveList} /></div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0b0518]/80 p-6 text-center text-white/70">
            <h3 className="font-display text-2xl uppercase text-white">No bet today.</h3>
            <p className="mt-1 text-sm">Nowt on the card worth your money — the Gaffer sits it out. Back tomorrow.</p>
          </div>
        )}

        {/* The Treble — second £10 slip, clearly separated from the double */}
        {hasTreble && <div className="mt-3"><TrebleCard legs={trebleLegs} inplay={inplay} liveList={liveList} /></div>}

        {/* Slip fallback only when there are no tips today */}
        {!featuredIsTip && (
          <div className="mt-4"><SlipCard bet={bet} /></div>
        )}


        {/* Footer bar — month profit + view all */}
        <div className="mt-4 flex flex-col items-stretch gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#f5c542]/25 bg-[#f5c542]/10 text-[#f5c542]"><Telescope className="h-5 w-5" /></span>
            <div>
              <div className="text-sm font-black uppercase tracking-wide text-white">More picks. More edges.</div>
              <div className="text-xs text-white/55">
                See the full board — <span className="font-bold text-emerald-300">{profit >= 0 ? '+' : ''}{money(profit)} this month</span>.
              </div>
            </div>
          </div>
          <Link
            to={CTA_URL}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_16px_40px_-16px_rgba(245,197,66,1)] transition-all hover:-translate-y-0.5"
          >
            View all picks <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

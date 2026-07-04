import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, ArrowRight, ShieldCheck, Info, Trophy, Target, Coins,
  BarChart3, Percent, Check,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TeamAvatar } from '@/components/TeamAvatar';

// ── endpoint contract: GET /api/gaffer/pnl-summary ──────────────────────────
type Settlement = {
  fixture: string; league: string; market: string; odds: number; stake: number;
  return: number; result: 'WIN' | 'LOSS'; legs?: number; homeLogo?: string | null; awayLogo?: string | null;
};
type PnLSummary = {
  status: 'live' | 'sample' | 'empty';
  lastUpdated: string | null;
  summary: { profit: number; roi: number; wins: number; losses: number; strikeRate: number; staked: number; returned: number };
  chart: { date: string; profit: number }[];
  recentSettlements: Settlement[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => `£${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
const splitFix = (f: string) => { const p = f.split(/\s+v\s+/i); return { home: p[0]?.trim() ?? f, away: p[1]?.trim() ?? '' }; };

// Ease a number 0 → target on mount, so the stat band animates into place.
function useCountUp(target: number, decimals = 0, dur = 950) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      setV(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick); else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur, decimals]);
  return v;
}

// ── sample until first settlements ──────────────────────────────────────────
const SAMPLE_VALS = [0, -6, -10, -8, -15, -12, -20, -24, -30, -26, -22, -14, -8, -2, 3, 8, 6, 12, 10, 16, 14, 20, 24, 22, 28, 32, 30, 38, 36, 44, 48];
const SAMPLE: PnLSummary = {
  status: 'sample',
  lastUpdated: null,
  summary: { profit: 48, roi: 8.9, wins: 30, losses: 24, strikeRate: 56, staked: 540, returned: 588 },
  chart: SAMPLE_VALS.map((v, i) => ({ date: new Date(Date.UTC(2026, 5, 2) + i * 86400000).toISOString().slice(0, 10), profit: v })),
  recentSettlements: [
    { fixture: 'Arsenal v Spurs', league: 'Premier League', market: 'Over 2.5 Goals', odds: 1.72, stake: 10, return: 17.2, result: 'WIN' },
    { fixture: 'Chelsea v Brighton', league: 'Premier League', market: 'BTTS', odds: 1.85, stake: 10, return: 18.5, result: 'WIN' },
    { fixture: 'Man Utd v Everton', league: 'Premier League', market: 'Over 1.5 Goals', odds: 1.6, stake: 10, return: 16, result: 'WIN' },
    { fixture: 'Newcastle v Fulham', league: 'Premier League', market: 'Home Win', odds: 1.91, stake: 10, return: 0, result: 'LOSS' },
    { fixture: 'Liverpool v West Ham', league: 'Premier League', market: 'Over 2.5 Goals', odds: 1.7, stake: 10, return: 17, result: 'WIN' },
  ],
};

// ── live summary from settled gaffer_picks (maps to the endpoint shape) ──────
type RawLeg = { home_team?: string; away_team?: string; home_logo?: string | null; away_logo?: string | null; selection?: string; market?: string; label?: string; league?: string; region?: string };
type RawRow = { pick_date: string; stake: number | null; profit_loss: number | null; status: string; combined_odds: number | string | null; potential_returns: number | string | null; legs: RawLeg[] | null; title: string | null; updated_at: string | null };

async function fetchPnLSummary(): Promise<PnLSummary> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('gaffer_picks')
    .select('pick_date, stake, profit_loss, status, combined_odds, potential_returns, legs, title, updated_at')
    .in('status', ['won', 'lost'])
    .order('pick_date', { ascending: true });
  if (error || !Array.isArray(data) || data.length === 0) return SAMPLE;

  let staked = 0, profit = 0, wins = 0, losses = 0, running = 0, lastUpdated: string | null = null;
  const chart: PnLSummary['chart'] = [];
  const settlements: Settlement[] = [];
  for (const row of data as RawRow[]) {
    const s = Number(row.stake ?? 10), pl = Number(row.profit_loss ?? 0);
    staked += s; profit += pl; running += pl;
    if (row.status === 'won') wins += 1; else losses += 1;
    if (row.updated_at) lastUpdated = row.updated_at;
    chart.push({ date: row.pick_date, profit: round2(running) });
    const legsArr = Array.isArray(row.legs) ? row.legs : [];
    const leg = legsArr[0];
    const isDouble = legsArr.length > 1;
    settlements.push({
      fixture: leg ? `${leg.home_team ?? ''} v ${leg.away_team ?? ''}`.trim() : (row.title ?? 'Pick'),
      league: leg?.league ?? leg?.region ?? '',
      market: isDouble ? legsArr.map((l) => l.selection ?? l.market ?? l.label).filter(Boolean).join(' + ') : (leg?.selection ?? leg?.market ?? leg?.label ?? row.title ?? 'Pick'),
      odds: Number(row.combined_odds ?? 0) || 0,
      stake: s, return: row.status === 'won' ? (Number(row.potential_returns ?? s + pl) || s + pl) : 0,
      result: row.status === 'won' ? 'WIN' : 'LOSS',
      legs: legsArr.length || 1,
      homeLogo: leg?.home_logo ?? null, awayLogo: leg?.away_logo ?? null,
    });
  }
  const games = wins + losses;
  return {
    status: 'live', lastUpdated,
    summary: { profit: round2(profit), roi: staked > 0 ? round2((profit / staked) * 100) : 0, wins, losses, strikeRate: games ? Math.round((wins / games) * 100) : 0, staked: round2(staked), returned: round2(staked + profit) },
    chart, recentSettlements: settlements.reverse().slice(0, 6),
  };
}

const RANGES = ['30D', '3M', '6M', 'ALL'] as const;
type Range = typeof RANGES[number];
const RANGE_DAYS: Record<Range, number> = { '30D': 30, '3M': 92, '6M': 183, ALL: 1e6 };

function SkeletonBoard() {
  return (
    <div className="animate-pulse p-5 md:p-8">
      <div className="h-9 w-2/3 rounded-lg bg-white/10" />
      <div className="mt-3 h-4 w-1/2 rounded bg-white/[0.06]" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/[0.05]" />)}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="h-72 rounded-2xl bg-white/[0.05]" />
        <div className="h-72 rounded-2xl bg-white/[0.05]" />
      </div>
    </div>
  );
}

/**
 * GafferPnLTrustSection — the homepage trust engine. Every number, the graph
 * and every settlement come from the pnl-summary source (settled gaffer_picks,
 * shaped to the /api/gaffer/pnl-summary contract). Sample until first settle.
 */
export function GafferPnLTrustSection() {
  const { data, isLoading } = useQuery({ queryKey: ['gaffer_pnl_summary'], staleTime: 1000 * 60 * 5, queryFn: fetchPnLSummary });
  const [range, setRange] = useState<Range>('30D');
  const [hover, setHover] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const p = data ?? SAMPLE;
  const s = p.summary;
  const up = s.profit >= 0;
  const sampleMode = p.status !== 'live';
  const games = s.wins + s.losses;

  // Animated headline figures (magnitudes; sign applied in the JSX).
  const profitDec = s.profit % 1 === 0 ? 0 : 2;
  const aProfit = useCountUp(Math.abs(s.profit), profitDec);
  const aRoi = useCountUp(Math.abs(s.roi), 1);
  const aStrike = useCountUp(s.strikeRate, 0);

  const chart = useMemo(() => {
    if (p.chart.length === 0) return p.chart;
    const lastMs = new Date(p.chart[p.chart.length - 1].date + 'T12:00:00Z').getTime();
    const cutoff = lastMs - RANGE_DAYS[range] * 86400000;
    const f = p.chart.filter((c) => new Date(c.date + 'T12:00:00Z').getTime() >= cutoff);
    return f.length >= 2 ? f : p.chart;
  }, [p.chart, range]);

  // Chart geometry.
  const W = 560, H = 260, padL = 44, padR = 16, padT = 18, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const vals = chart.map((c) => c.profit);
  const max = Math.ceil(Math.max(...vals, 10) / 20) * 20, min = Math.floor(Math.min(...vals, 0) / 20) * 20, spanV = max - min || 1;
  const x = (i: number) => padL + (chart.length <= 1 ? plotW : (i / (chart.length - 1)) * plotW);
  const y = (v: number) => padT + (1 - (v - min) / spanV) * plotH;
  const linePts = chart.map((c, i) => `${round2(x(i))},${round2(y(c.profit))}`).join(' ');
  const areaPts = `${padL},${y(0)} ${linePts} ${padL + plotW},${y(0)}`;
  const yTicks: number[] = []; for (let v = min; v <= max; v += 20) yTicks.push(v);
  const last = chart[chart.length - 1];
  const dateLbl = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const onMove = (e: React.MouseEvent) => {
    const el = chartRef.current; if (!el || chart.length < 2) return;
    const rect = el.getBoundingClientRect();
    const vbX = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((vbX - padL) / plotW) * (chart.length - 1));
    setHover(Math.max(0, Math.min(chart.length - 1, i)));
  };
  const hv = hover != null ? chart[hover] : null;

  if (isLoading && !data) {
    return (
      <section id="pnl" className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#070312] md:rounded-[2rem]">
        <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
        <SkeletonBoard />
      </section>
    );
  }

  return (
    <section id="pnl" className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#070312] shadow-[0_0_60px_-22px_rgba(124,58,237,0.7)] md:rounded-[2rem]">
      <style>{`@keyframes pnlDraw{to{stroke-dashoffset:0}} .pnl-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:pnlDraw 1.6s ease-out forwards}`}</style>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_-6%,rgba(124,58,237,0.28),transparent_40%),radial-gradient(circle_at_10%_10%,rgba(245,197,66,0.10),transparent_38%),radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.12),transparent_44%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:34px_34px] opacity-40" />
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />

      <div className="relative p-5 md:p-8">
        {/* Header */}
        <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
              <TrendingUp className="h-3.5 w-3.5" /> The Gaffer's P&amp;L
            </span>
            <h2 className="mt-3 font-display text-4xl uppercase leading-[0.88] tracking-tight text-white md:text-6xl">
              Tracked. Honest.
              <span className="mt-1 block bg-gradient-to-r from-violet-400 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">Nothing hidden.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60 md:text-[15px]">
              Every £10 pick I share is tracked in real time.<br className="hidden sm:block" /> Wins, losses and everything in between — logged for all to see.
            </p>
            <span className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] ${sampleMode ? 'border-white/15 bg-white/[0.05] text-white/60' : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'}`}>
              <ShieldCheck className="h-4 w-4" /> {sampleMode ? 'Sample data' : 'Live · settled results'}
              {sampleMode && <span className="font-bold text-white/65">First results appear once our selections settle</span>}
            </span>
          </div>

          {/* Gaffer — cinematic banner, quote along the bottom so his face stays clear */}
          <div className="relative min-h-[230px] overflow-hidden rounded-2xl border border-violet-400/30 shadow-[0_22px_55px_-26px_rgba(0,0,0,0.95)]">
            <img
              src="/images/gaffer/gaffer-pnl.jpg"
              alt="The Gaffer"
              loading="lazy"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover object-[50%_18%]"
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070312] via-[#070312]/75 to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(124,58,237,0.35),transparent_55%)]" />
            <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
              <span className="font-display text-3xl leading-none text-violet-300/80">“</span>
              <p className="-mt-2 max-w-sm text-[14px] font-semibold leading-snug text-white sm:text-[15px]">I don't sell dreams. I track numbers. This is my record. You decide.</p>
              <div className="mt-1 text-right font-['Dancing_Script'] text-2xl font-semibold text-[#f8e7a1]">The Gaffer</div>
            </div>
          </div>
        </div>

        {/* ── Hero metric band — bold, animated, colour-reactive ── */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Profit — the headline number */}
          <div className={`frost-tile frost-sheen relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 ${up ? 'border-emerald-400/35' : 'border-rose-400/35'}`}>
            <div aria-hidden className={`pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full blur-3xl ${up ? 'bg-emerald-400/20' : 'bg-rose-500/20'}`} />
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
              <TrendingUp className={`h-4 w-4 ${up ? 'text-emerald-300' : 'text-rose-300'}`} /> Profit to date
            </div>
            <div className={`mt-3 font-display text-5xl leading-none md:text-6xl ${up ? 'bg-gradient-to-br from-emerald-200 to-emerald-500' : 'bg-gradient-to-br from-rose-200 to-rose-500'} bg-clip-text text-transparent`}>
              {up ? '+' : '−'}£{aProfit.toFixed(profitDec)}
            </div>
            <div className="mt-2.5 text-[11px] font-bold text-white/60">{games} bet{games === 1 ? '' : 's'} settled · {money(s.staked)} staked → <span className="text-[#f8e7a1]">{money(s.returned)}</span> back</div>
          </div>

          {/* ROI */}
          <div className="frost-tile relative overflow-hidden rounded-2xl border border-white/12 p-5">
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#f5c542]/10 blur-2xl" />
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
              <Percent className={`h-4 w-4 ${s.roi >= 0 ? 'text-[#f5c542]' : 'text-rose-300'}`} /> ROI
            </div>
            <div className={`mt-3 font-display text-4xl leading-none md:text-5xl ${s.roi >= 0 ? 'bg-gradient-to-br from-[#ffe487] to-[#f5c542]' : 'bg-gradient-to-br from-rose-200 to-rose-500'} bg-clip-text text-transparent`}>
              {s.roi >= 0 ? '+' : '−'}{aRoi.toFixed(1)}%
            </div>
            <div className="mt-2.5 text-[11px] font-bold text-white/60">Return on every £1 staked</div>
          </div>

          {/* Strike rate */}
          <div className="frost-tile relative overflow-hidden rounded-2xl border border-white/12 p-5">
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-violet-400/12 blur-2xl" />
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">
              <Target className="h-4 w-4 text-violet-300" /> Strike rate
            </div>
            <div className="mt-3 bg-gradient-to-br from-violet-300 to-fuchsia-400 bg-clip-text font-display text-4xl leading-none text-transparent md:text-5xl">
              {Math.round(aStrike)}%
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-[width] duration-700" style={{ width: `${s.strikeRate}%` }} />
            </div>
            <div className="mt-1.5 text-[11px] font-bold text-white/60">{s.wins}W · {s.losses}L settled</div>
          </div>
        </div>

        {/* secondary strip */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="frost-tile flex items-center justify-between gap-2 rounded-2xl border border-white/12 px-4 py-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/60"><Trophy className="h-3.5 w-3.5 text-white/70" /> W-L</span>
            <span className="font-display text-xl text-white">{s.wins}-{s.losses}</span>
          </div>
          <div className="frost-tile flex items-center justify-between gap-2 rounded-2xl border border-white/12 px-4 py-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/60"><Coins className="h-3.5 w-3.5 text-[#f5c542]" /> Staked</span>
            <span className="font-display text-xl text-white">{money(s.staked)}</span>
          </div>
          <div className="frost-tile col-span-2 flex items-center justify-between gap-2 rounded-2xl border border-white/12 px-4 py-3 sm:col-span-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/60"><Coins className="h-3.5 w-3.5 text-emerald-300" /> Returned</span>
            <span className="font-display text-xl text-[#f8e7a1]">{money(s.returned)}</span>
          </div>
        </div>

        {/* Chart + settlements */}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {/* Cumulative profit */}
          <div className="frost-panel relative overflow-hidden rounded-2xl border border-white/12 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/50">Cumulative profit <Info className="h-3.5 w-3.5 text-white/35" /></span>
              <span className="text-xs text-white/55">{money(s.staked)} staked → <b className="text-[#f8e7a1]">{money(s.returned)}</b> returned</span>
            </div>
            <div className="mt-3 inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
              {RANGES.map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-3 py-1 text-xs font-black uppercase tracking-wide transition-all ${range === r ? 'bg-white/15 text-white' : 'text-white/65 hover:text-white'}`}>{r}</button>
              ))}
            </div>
            <div ref={chartRef} className="relative mt-3" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                <defs>
                  <linearGradient id="pnl-area2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.28" />
                    <stop offset="55%" stopColor="#a855f7" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.30" />
                  </linearGradient>
                  <linearGradient id="pnl-line2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a855f7" /><stop offset="55%" stopColor="#818cf8" /><stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                {yTicks.map((v) => (
                  <g key={v}>
                    <line x1={padL} x2={padL + plotW} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)'} strokeWidth="1" strokeDasharray={v === 0 ? '4 4' : undefined} />
                    <text x={padL - 8} y={y(v) + 3.5} textAnchor="end" className="fill-white/40" style={{ fontSize: 11 }}>{v < 0 ? `-£${Math.abs(v)}` : `£${v}`}</text>
                  </g>
                ))}
                <polygon points={areaPts} fill="url(#pnl-area2)" />
                <polyline className="pnl-draw" pathLength={1} points={linePts} fill="none" stroke="url(#pnl-line2)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.5))' }} />
                {hv && (<g><line x1={x(hover!)} x2={x(hover!)} y1={padT} y2={padT + plotH} stroke="rgba(255,255,255,0.25)" strokeWidth="1" /><circle cx={x(hover!)} cy={y(hv.profit)} r="4.5" fill="#fff" stroke="#7c3aed" strokeWidth="2" /></g>)}
                <circle cx={x(chart.length - 1)} cy={y(last.profit)} r="4" fill="#34d399" stroke="#0b0518" strokeWidth="2" />
                {chart.filter((_, i) => i % Math.max(1, Math.floor(chart.length / 5)) === 0 || i === chart.length - 1).map((c) => {
                  const idx = chart.indexOf(c);
                  return <text key={c.date} x={x(idx)} y={H - 10} textAnchor="middle" className="fill-white/40" style={{ fontSize: 11 }}>{dateLbl(c.date)}</text>;
                })}
              </svg>
              {/* hover tooltip / end pill */}
              {hv ? (
                <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-white/15 bg-black/80 px-2.5 py-1 text-center backdrop-blur" style={{ left: `${(x(hover!) / W) * 100}%`, top: `${(y(hv.profit) / H) * 100}%` }}>
                  <span className={`block font-display text-sm leading-none ${hv.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{hv.profit >= 0 ? '+' : ''}{money(hv.profit)}</span>
                  <span className="block text-[9px] uppercase tracking-wide text-white/65">{dateLbl(hv.date)}</span>
                </div>
              ) : (
                <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2 py-1 text-center" style={{ left: `${(x(chart.length - 1) / W) * 100}%`, top: `${(y(last.profit) / H) * 100}%` }}>
                  <span className="whitespace-nowrap font-display text-sm leading-none text-emerald-300">{up ? '+' : ''}{money(s.profit)}<span className="ml-1 text-[9px] uppercase tracking-wide text-emerald-200/70">to date</span></span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/[0.07] px-3 py-2 text-sm text-violet-100">
              <BarChart3 className="h-4 w-4 shrink-0 text-violet-300" /> Consistent edges. Long-term mindset. Real results.
            </div>
          </div>

          {/* Recent settlements */}
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4  md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-white/50">Recent settlements</span>
              <a href="/pnl" className="rounded-full border border-[#f5c542]/40 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#f8e7a1] transition-colors hover:bg-[#f5c542] hover:text-[#16051f]">View all</a>
            </div>
            {p.recentSettlements.length === 0 ? (
              <div className="grid min-h-[220px] place-items-center rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/55">
                First results will appear once our first official selections settle.
              </div>
            ) : (
              <>
                <div className="divide-y divide-white/[0.06]">
                  {p.recentSettlements.map((st, i) => {
                    const { home, away } = splitFix(st.fixture);
                    return (
                      <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <TeamAvatar name={home} logoUrl={st.homeLogo} size={18} />
                            <span className="truncate text-[13px] font-bold text-white">{home}{away ? ` v ${away}` : ''}</span>
                            {away && <TeamAvatar name={away} logoUrl={st.awayLogo} size={18} />}
                            {(st.legs ?? 1) > 1 && <span className="shrink-0 rounded bg-violet-500/25 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-violet-200 ring-1 ring-inset ring-violet-400/30">Double</span>}
                          </div>
                          <div className="truncate text-[11px] text-white/65">{[st.league, st.market, st.odds ? st.odds.toFixed(2) : null, money(st.stake)].filter(Boolean).join(' · ')}</div>
                        </div>
                        <span className="text-right text-[13px] font-bold sm:min-w-[3.5rem]">{st.result === 'WIN' ? <span className="text-[#f8e7a1]">{money(st.return)}</span> : <span className="text-white/60">£0.00</span>}</span>
                        <span className={`text-right font-display text-sm sm:min-w-[3rem] ${st.result === 'WIN' ? 'text-emerald-300' : 'text-rose-400'}`}>{st.result}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/60"><Info className="h-3 w-3" /> Settled bets only. Prices may vary from tip time.</p>
              </>
            )}
          </div>
        </div>

        {/* Footer — buttons + trust badges */}
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <a href="/pnl" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_16px_40px_-16px_rgba(139,92,246,1)] transition-all hover:-translate-y-0.5">
              <BarChart3 className="h-4 w-4" /> Full P&amp;L history <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/pnl" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#f5c542]/50 bg-[#f5c542]/[0.06] px-6 py-3 text-sm font-black uppercase tracking-wide text-[#f8e7a1] transition-all hover:-translate-y-0.5 hover:bg-[#f5c542]/15">
              <ShieldCheck className="h-4 w-4" /> How we track results
            </a>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">
            {['Independently tracked', 'Every result logged', 'No deleted losses', 'Transparent history'].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-300"><Check className="h-3.5 w-3.5" /></span>
                <span className="text-[11px] font-bold text-white/80">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

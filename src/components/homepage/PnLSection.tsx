import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type PnLSeriesPoint = { date: string; cumulative: number };
type PnLSnapshot = {
  as_of: string;
  staked: number;
  returned: number;
  profit: number;
  roi_pct: number;
  record: { w: number; l: number };
  series: PnLSeriesPoint[];
  live: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Sample curve until enough settled picks exist to draw a real one. */
const SAMPLE_PNL: PnLSnapshot = {
  as_of: '2026-06-30', staked: 540, returned: 588, profit: 48, roi_pct: 8.9,
  record: { w: 30, l: 24 }, live: false,
  series: [0, 9, -1, 13, 7, 21, 16, 30, 24, 37, 33, 44, 48].map((c, i) => ({ date: `d${i}`, cumulative: c })),
};

async function fetchLivePnL(): Promise<PnLSnapshot | null> {
  // gaffer_picks isn't in the generated Supabase types yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('gaffer_picks')
    .select('pick_date, stake, profit_loss, status')
    .in('status', ['won', 'lost'])
    .order('pick_date', { ascending: true });
  if (error || !Array.isArray(data) || data.length === 0) return null;

  let staked = 0, profit = 0, w = 0, l = 0, running = 0;
  const series: PnLSeriesPoint[] = [];
  for (const row of data as Array<{ pick_date: string; stake: number | null; profit_loss: number | null; status: string }>) {
    staked += Number(row.stake ?? 0);
    profit += Number(row.profit_loss ?? 0);
    if (row.status === 'won') w += 1; else if (row.status === 'lost') l += 1;
    running += Number(row.profit_loss ?? 0);
    series.push({ date: row.pick_date, cumulative: round1(running) });
  }
  return {
    as_of: series[series.length - 1]?.date ?? new Date().toISOString().slice(0, 10),
    staked: round1(staked), returned: round1(staked + profit), profit: round1(profit),
    roi_pct: staked > 0 ? round1((profit / staked) * 100) : 0,
    record: { w, l }, series, live: true,
  };
}

/** A frosted-glass stat tile with a gradient value. */
function Stat({ label, value, tone }: { label: string; value: string; tone: 'up' | 'down' | 'gold' | 'white' }) {
  const grad =
    tone === 'up' ? 'from-emerald-300 to-emerald-500'
    : tone === 'down' ? 'from-rose-300 to-rose-500'
    : tone === 'gold' ? 'from-[#ffe487] to-[#f5c542]'
    : 'from-white to-white/70';
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl md:p-4">
      <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/5 blur-2xl" />
      <div className={`bg-gradient-to-br ${grad} bg-clip-text font-display text-3xl leading-none text-transparent md:text-4xl`}>{value}</div>
      <div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">{label}</div>
    </div>
  );
}

/**
 * Homepage — the Gaffer's running P&L. Premium frosted-glass panel with a live
 * area chart; reads settled gaffer_picks, falls back to a sample curve.
 */
export function PnLSection() {
  const { data: live } = useQuery({ queryKey: ['homepage_pnl_snapshot'], staleTime: 1000 * 60 * 5, queryFn: fetchLivePnL });
  const p = live ?? SAMPLE_PNL;
  const up = p.profit >= 0;
  const games = p.record.w + p.record.l;
  const strike = games ? Math.round((p.record.w / games) * 100) : 0;

  // Chart geometry (uniform-scaled SVG, so dots + gridlines stay crisp).
  const W = 340, H = 150, padL = 8, padR = 8, padT = 16, padB = 24;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const vals = p.series.map((s) => s.cumulative);
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0), range = max - min || 1;
  const x = (i: number) => padL + (p.series.length <= 1 ? plotW : (i / (p.series.length - 1)) * plotW);
  const y = (v: number) => padT + (1 - (v - min) / range) * plotH;
  const line = p.series.map((s, i) => `${x(i)},${round1(y(s.cumulative))}`).join(' ');
  const area = `${padL},${padT + plotH} ${line} ${padL + plotW},${padT + plotH}`;
  const zeroY = y(0);
  const last = p.series[p.series.length - 1];
  const accent = up ? '52,211,153' : '251,113,133';

  return (
    <section
      id="pnl"
      className="relative overflow-hidden rounded-[1.6rem] border border-[#f5c542]/35 bg-[#080011] p-3 shadow-[0_30px_90px_-40px_rgba(245,197,66,0.55)] md:rounded-[2rem] md:p-4"
    >
      {/* atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(245,197,66,0.16),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(124,58,237,0.20),transparent_36%),radial-gradient(circle_at_50%_120%,rgba(16,185,129,0.14),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative overflow-hidden rounded-[1.3rem] border border-white/10 bg-black/30 p-5 backdrop-blur-xl md:rounded-[1.6rem] md:p-7">
        <div className="h-[3px] w-full rounded-full bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
              <TrendingUp className="h-3.5 w-3.5" /> The Gaffer's P&amp;L
            </span>
            <h2 className="mt-2 font-display text-4xl uppercase leading-[0.9] tracking-tight text-white md:text-5xl">Tracked. Honest.<br className="hidden sm:block" /> Nothing hidden.</h2>
            <p className="mt-2 max-w-md text-sm text-white/55">Every £10 pick settled against the real result and logged — wins, losses and the lot.</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${p.live ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-white/15 bg-white/[0.05] text-white/55'}`}>
            <ShieldCheck className="h-3.5 w-3.5" /> {p.live ? 'Live · settled' : 'Sample until first settlements'}
          </span>
        </div>

        {/* stat tiles */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Profit" value={`${up ? '+' : ''}£${p.profit}`} tone={up ? 'up' : 'down'} />
          <Stat label="ROI" value={`${p.roi_pct}%`} tone="gold" />
          <Stat label="W–L record" value={`${p.record.w}–${p.record.l}`} tone="white" />
          <Stat label="Strike rate" value={`${strike}%`} tone="white" />
        </div>

        {/* the graph */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#f5c542]/20 bg-black/40 p-4 backdrop-blur-xl md:p-5">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">Cumulative profit</span>
            <span className="text-xs text-white/55">£{p.staked} staked → <span className="font-bold text-[#f8e7a1]">£{p.returned}</span> back</span>
          </div>
          <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full md:h-48" preserveAspectRatio="none">
              <defs>
                <linearGradient id="pnl-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={`rgb(${accent})`} stopOpacity="0.32" />
                  <stop offset="100%" stopColor={`rgb(${accent})`} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="pnl-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={`rgb(${accent})`} />
                  <stop offset="100%" stopColor="#f5c542" />
                </linearGradient>
              </defs>
              {/* gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t) => (
                <line key={t} x1={padL} x2={padL + plotW} y1={padT + t * plotH} y2={padT + t * plotH} stroke="rgba(255,255,255,0.06)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
              {/* zero baseline */}
              {min < 0 && max > 0 && (
                <line x1={padL} x2={padL + plotW} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              )}
              <polygon points={area} fill="url(#pnl-area)" />
              <polyline
                points={line} fill="none" stroke="url(#pnl-line)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 4px rgba(${accent},0.75))` }}
              />
            </svg>
            {/* end marker + current value overlay (crisp HTML) */}
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(x(p.series.length - 1) / W) * 100}%`, top: `${(y(last.cumulative) / H) * 100}%` }}
            >
              <span className="block h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.6)] ring-2" style={{ boxShadow: `0 0 10px 3px rgba(${accent},0.9)` }} />
            </div>
            <div className="pointer-events-none absolute right-1 top-1 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 backdrop-blur">
              <span className={`font-display text-lg ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{up ? '+' : ''}£{p.profit}</span>
              <span className="ml-1 text-[10px] uppercase tracking-wide text-white/40">to date</span>
            </div>
          </div>
        </div>

        <a href="/pnl" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/40 bg-[#f5c542]/[0.08] px-5 py-2.5 text-[12px] font-black uppercase tracking-wide text-[#f8e7a1] transition-all hover:bg-[#f5c542] hover:text-[#16051f]">
          Full P&amp;L history <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

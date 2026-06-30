import { TrendingUp, ArrowRight } from 'lucide-react';

/** Sample P&L until the live get-pnl endpoint is wired (shape = PnLSnapshot). */
const SAMPLE_PNL = {
  as_of: '2026-06-30', staked: 540, returned: 588, profit: 48, roi_pct: 8.9,
  record: { w: 27, l: 27 },
  series: [
    { date: '2026-06-23', cumulative: 0 },
    { date: '2026-06-25', cumulative: 18 },
    { date: '2026-06-27', cumulative: 12 },
    { date: '2026-06-29', cumulative: 35 },
    { date: '2026-06-30', cumulative: 48 },
  ],
};

/** Homepage P&L section — the Gaffer's running profit, ROI and record, with a
 *  clean cumulative sparkline. Data: PnLSnapshot (sample until live). */
export function PnLSection() {
  const p = SAMPLE_PNL;
  const max = Math.max(...p.series.map((s) => s.cumulative), 1);
  const min = Math.min(...p.series.map((s) => s.cumulative), 0);
  const range = max - min || 1;
  const W = 100, H = 36;
  const pts = p.series.map((s, i) => {
    const x = (i / (p.series.length - 1)) * W;
    const y = H - ((s.cumulative - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');
  const up = p.profit >= 0;

  return (
    <section id="pnl" className="relative overflow-hidden rounded-[1.75rem] border border-emerald-400/30 bg-gradient-to-br from-[#04140d] via-[#0a0c1e] to-[#070310] p-6 shadow-[0_0_60px_-26px_rgba(16,185,129,0.7)] md:p-8">
      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 font-display text-sm tracking-wide text-emerald-400">
            <TrendingUp className="h-4 w-4" /> THE GAFFER'S P&amp;L
          </span>
          <h2 className="font-display text-3xl tracking-tight text-white md:text-4xl">Tracked. Honest. Nothing hidden.</h2>
          <p className="mt-1 text-sm text-white/55">Every pick settled and logged. This is the running record — wins, losses and the lot.</p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className={`font-display text-3xl ${up ? 'text-emerald-400' : 'text-rose-400'}`}>{up ? '+' : ''}£{p.profit}</div>
              <div className="text-[10px] uppercase tracking-wide text-white/45">profit</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-display text-3xl text-white">{p.roi_pct}%</div>
              <div className="text-[10px] uppercase tracking-wide text-white/45">ROI</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="font-display text-3xl text-white">{p.record.w}-{p.record.l}</div>
              <div className="text-[10px] uppercase tracking-wide text-white/45">W–L</div>
            </div>
          </div>
        </div>

        {/* Sparkline */}
        <div className="rounded-2xl border border-emerald-400/20 bg-white/[0.03] p-5">
          <div className="mb-2 flex items-center justify-between text-xs text-white/45">
            <span>Cumulative profit</span>
            <span>£{p.staked} staked → £{p.returned} back</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-28 w-full">
            <defs>
              <linearGradient id="pnlfill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="rgb(16,185,129)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#pnlfill)" />
            <polyline points={pts} fill="none" stroke="rgb(52,211,153)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
          <a href="/pnl" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300">
            Full P&amp;L history <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

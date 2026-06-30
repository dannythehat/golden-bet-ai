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

/**
 * Homepage section — the Gaffer's running P&L, styled to the club design
 * language (deep purple + #f5c542 gold, rounded-full pills, gold accent bar).
 */
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
    <section
      id="pnl"
      className="relative overflow-hidden rounded-[1.4rem] border border-[#f5c542]/30 bg-[#130321] shadow-[0_22px_70px_-32px_rgba(245,197,66,0.6)] md:rounded-[1.9rem]"
    >
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
      <div className="relative grid gap-6 p-5 md:grid-cols-[1.1fr_1fr] md:items-center md:p-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
            <TrendingUp className="h-3.5 w-3.5" /> The Gaffer's P&amp;L
          </span>
          <h2 className="mt-2 font-display text-3xl uppercase leading-none tracking-tight text-white md:text-4xl">Tracked. Honest. Nothing hidden.</h2>
          <p className="mt-2 text-sm text-white/55">Every pick settled and logged. This is the running record — wins, losses and the lot.</p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#07000f]/70 p-4">
              <div className={`font-display text-3xl ${up ? 'text-emerald-400' : 'text-rose-400'}`}>{up ? '+' : ''}£{p.profit}</div>
              <div className="text-[10px] uppercase tracking-wide text-white/45">profit</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#07000f]/70 p-4">
              <div className="font-display text-3xl text-[#f5c542]">{p.roi_pct}%</div>
              <div className="text-[10px] uppercase tracking-wide text-white/45">ROI</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#07000f]/70 p-4">
              <div className="font-display text-3xl text-white">{p.record.w}-{p.record.l}</div>
              <div className="text-[10px] uppercase tracking-wide text-white/45">W–L</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#f5c542]/20 bg-[#07000f]/60 p-5">
          <div className="mb-2 flex items-center justify-between text-xs text-white/45">
            <span className="uppercase tracking-wide">Cumulative profit</span>
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
          <a href="/pnl" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/40 px-4 py-2 text-[12px] font-black uppercase tracking-wide text-[#f8e7a1] transition-all hover:bg-[#f5c542] hover:text-[#16051f]">
            Full P&amp;L history <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';
import { BetCard } from '@/components/pnl/BetCard';
import { getLedgerBets, filterByRange, summarize, type Range } from '@/lib/pnlLedger';

const money = (n: number) => `£${n % 1 === 0 ? n : n.toFixed(2)}`;

const RANGES: { key: Range; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All time' },
];

function StatCard({ label, value, tone = 'gold' }: { label: string; value: string; tone?: 'gold' | 'up' | 'down' | 'white' }) {
  const colour = tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-rose-400' : tone === 'white' ? 'text-white' : 'text-[#f5c542]';
  return (
    <div className="inset-3d rounded-2xl p-4">
      <div className={`font-display text-2xl md:text-3xl text-extrude ${colour}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">{label}</div>
    </div>
  );
}

function Sparkline({ series }: { series: number[] }) {
  if (series.length < 2) return null;
  const W = 100, H = 36;
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = max - min || 1;
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ');
  const up = series[series.length - 1] >= 0;
  const stroke = up ? 'rgb(52,211,153)' : 'rgb(251,113,133)';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-28 w-full">
      <defs>
        <linearGradient id="pnlpage" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#pnlpage)" />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function Pnl() {
  const [range, setRange] = useState<Range>('all');
  const allBets = useMemo(() => getLedgerBets(), []);
  const bets = useMemo(() => filterByRange(allBets, range, Date.now()), [allBets, range]);
  const s = summarize(bets);
  const up = s.profit >= 0;

  // Cumulative profit series (oldest → newest) for the sparkline.
  const series = useMemo(() => {
    let running = 0;
    return [...bets].reverse().map((b) => (running += b.profit, Math.round(running * 100) / 100));
  }, [bets]);

  return (
    <div className="min-h-screen bg-[#07000f] text-white">
      <HomepageNav />

      <main className="mx-auto max-w-3xl px-3 pb-16 pt-4 md:px-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/55 transition hover:text-[#f5c542]">
          <ArrowLeft className="h-4 w-4" /> Back to the club
        </Link>

        {/* Header + range toggle + stats */}
        <section className="mt-4 overflow-hidden rounded-[1.4rem] border border-[#f5c542]/30 bg-[#130321] shadow-[0_22px_70px_-32px_rgba(245,197,66,0.6)] md:rounded-[1.9rem]">
          <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
          <div className="p-5 md:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
              <TrendingUp className="h-3.5 w-3.5" /> The Gaffer's P&amp;L
            </span>
            <h1 className="mt-2 font-display text-4xl uppercase leading-none tracking-tight text-white md:text-5xl">Tracked. Honest. Nothing hidden.</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              Every daily pick settled against the real result — wins and losses, every leg shown. £10 a bet, no hidden slips.
            </p>

            {/* range toggle */}
            <div className="mt-5 inline-flex rounded-full border border-white/12 bg-[#07000f]/70 p-1">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors ${range === r.key ? 'bg-[#f5c542] text-[#16051f]' : 'text-white/55 hover:text-white'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="profit / loss" value={`${up ? '+' : '−'}${money(Math.abs(s.profit))}`} tone={up ? 'up' : 'down'} />
              <StatCard label="ROI" value={`${s.roi >= 0 ? '+' : ''}${s.roi}%`} />
              <StatCard label="W–L record" value={`${s.wins}–${s.losses}`} tone="white" />
              <StatCard label="staked → back" value={`${money(s.staked)} → ${money(s.returned)}`} tone="white" />
            </div>

            {series.length >= 2 && (
              <div className="mt-5 inset-3d rounded-2xl p-5">
                <div className="mb-1 flex items-center justify-between text-xs text-white/45">
                  <span className="uppercase tracking-wide">Cumulative profit</span>
                  <span>{bets.length} settled bet{bets.length === 1 ? '' : 's'}</span>
                </div>
                <Sparkline series={series} />
              </div>
            )}
          </div>
        </section>

        {/* Full detailed history */}
        <section className="mt-6">
          <h2 className="mb-3 font-display text-xl uppercase tracking-tight text-white md:text-2xl">Selection history</h2>
          {bets.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/50">
              No settled bets in this range.
            </div>
          ) : (
            <div className="space-y-3">
              {bets.map((b, i) => <BetCard key={`${b.date}-${b.kind}-${i}`} bet={b} />)}
            </div>
          )}
        </section>

        <div className="mt-10"><FooterNavigation /></div>
      </main>
    </div>
  );
}

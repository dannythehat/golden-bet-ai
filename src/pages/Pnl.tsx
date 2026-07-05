import { useMemo, useState } from 'react';
import { ArrowLeft, TrendingUp, Percent, Swords, Coins } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';
import { BetCard } from '@/components/pnl/BetCard';
import { GafferDayWord } from '@/components/pnl/GafferDayWord';
import { getLedgerBets, filterByRange, summarize, type Range } from '@/lib/pnlLedger';

const money = (n: number) => `£${n % 1 === 0 ? n : n.toFixed(2)}`;

const RANGES: { key: Range; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All time' },
];

type Tone = 'gold' | 'up' | 'down' | 'white';

// Tone → { gradient rim, number colour, icon chip }. Same premium language as the
// homepage BetCards: a coloured gradient rim wrapping a raised card-3d surface.
const TONES: Record<Tone, { rim: string; glow: string; num: string; chip: string; icon: string }> = {
  up: {
    rim: 'linear-gradient(150deg,#6ee7b7 0%,#059669 52%,#34d399 100%)',
    glow: '0 24px 48px -26px rgba(0,0,0,1),0 0 40px -18px rgba(16,185,129,0.5)',
    num: 'text-emerald-300', chip: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200', icon: 'text-emerald-300',
  },
  down: {
    rim: 'linear-gradient(150deg,rgba(251,113,133,0.85) 0%,rgba(124,58,237,0.5) 50%,rgba(251,113,133,0.7) 100%)',
    glow: '0 24px 48px -26px rgba(0,0,0,1),0 0 38px -18px rgba(244,63,94,0.45)',
    num: 'text-rose-300', chip: 'border-rose-400/45 bg-rose-500/15 text-rose-200', icon: 'text-rose-300',
  },
  gold: {
    rim: 'linear-gradient(150deg,#f8e7a1 0%,#c99a17 50%,#f5c542 100%)',
    glow: '0 24px 48px -26px rgba(0,0,0,1),0 0 40px -18px rgba(245,197,66,0.5)',
    num: 'text-[#f8e7a1]', chip: 'border-[#f5c542]/45 bg-[#f5c542]/15 text-[#f8e7a1]', icon: 'text-[#f5c542]',
  },
  white: {
    rim: 'linear-gradient(150deg,rgba(255,255,255,0.5) 0%,rgba(124,58,237,0.45) 52%,rgba(255,255,255,0.35) 100%)',
    glow: '0 24px 48px -26px rgba(0,0,0,1),0 0 34px -20px rgba(139,92,246,0.5)',
    num: 'text-white', chip: 'border-white/25 bg-white/10 text-white/80', icon: 'text-violet-200',
  },
};

function StatCard({ label, value, sub, tone = 'gold', Icon }: { label: string; value: string; sub?: string; tone?: Tone; Icon: LucideIcon }) {
  const t = TONES[tone];
  return (
    <div className="relative rounded-[1.15rem] p-[1.5px]" style={{ background: t.rim, boxShadow: t.glow }}>
      <div className="card-3d h-full rounded-[1.02rem] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9.5px] font-black uppercase tracking-[0.16em] text-white/45">{label}</span>
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-lg border ${t.chip}`}>
            <Icon className={`h-3.5 w-3.5 ${t.icon}`} />
          </span>
        </div>
        <div className={`font-display text-3xl leading-none text-extrude md:text-[2rem] ${t.num}`}>{value}</div>
        {sub && <div className="mt-1.5 text-[10.5px] text-white/45">{sub}</div>}
      </div>
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
              <StatCard label="profit / loss" value={`${up ? '+' : '−'}${money(Math.abs(s.profit))}`} sub={`${s.strikeRate}% strike rate`} tone={up ? 'up' : 'down'} Icon={TrendingUp} />
              <StatCard label="ROI" value={`${s.roi >= 0 ? '+' : ''}${s.roi}%`} sub="return on stakes" tone="gold" Icon={Percent} />
              <StatCard label="W–L record" value={`${s.wins}–${s.losses}`} sub={`${s.wins + s.losses} bets settled`} tone="white" Icon={Swords} />
              <StatCard label="staked → back" value={money(s.returned)} sub={`from ${money(s.staked)} staked`} tone="white" Icon={Coins} />
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

        {/* The Gaffer's word on the latest day */}
        {allBets.length > 0 && <GafferDayWord bets={allBets} className="mt-5" />}

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

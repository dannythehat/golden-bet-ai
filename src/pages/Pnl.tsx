import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';
import { supabase } from '@/integrations/supabase/client';

// ── Types ───────────────────────────────────────────────────────────────────
type RawLeg = {
  home_team?: string; away_team?: string; homeTeam?: string; awayTeam?: string;
  selection?: string; market?: string;
};
type SettledRow = {
  pick_date: string;
  bet_type: string | null;
  stake: number | null;
  combined_odds: number | null;
  profit_loss: number | null;
  status: string;
  legs: RawLeg[] | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Sample fallback (until enough settled picks exist to draw a real record) ──
const SAMPLE_ROWS: SettledRow[] = [
  { pick_date: '2026-06-23', bet_type: 'single', stake: 10, combined_odds: 1.80, profit_loss: 8.0, status: 'won', legs: [{ home_team: 'KR', away_team: 'Valur', selection: 'Over 2.5 Goals' }] },
  { pick_date: '2026-06-24', bet_type: 'double', stake: 10, combined_odds: 2.40, profit_loss: -10.0, status: 'lost', legs: [{ home_team: 'Rosenborg', away_team: 'Molde', selection: 'Over 9.5 Corners' }, { home_team: 'Malmo FF', away_team: 'AIK Stockholm', selection: 'BTTS – Yes' }] },
  { pick_date: '2026-06-25', bet_type: 'single', stake: 10, combined_odds: 1.90, profit_loss: 9.0, status: 'won', legs: [{ home_team: 'Breidablik', away_team: 'Vikingur Reykjavik', selection: 'BTTS – Yes' }] },
  { pick_date: '2026-06-27', bet_type: 'single', stake: 10, combined_odds: 1.75, profit_loss: -10.0, status: 'lost', legs: [{ home_team: 'Hammarby', away_team: 'Malmo FF', selection: 'Over 2.5 Goals' }] },
  { pick_date: '2026-06-28', bet_type: 'single', stake: 10, combined_odds: 1.85, profit_loss: 8.5, status: 'won', legs: [{ home_team: 'Bodo/Glimt', away_team: 'Rosenborg', selection: 'Over 9.5 Corners' }] },
  { pick_date: '2026-06-29', bet_type: 'double', stake: 10, combined_odds: 3.10, profit_loss: 21.0, status: 'won', legs: [{ home_team: 'Valur', away_team: 'Breidablik', selection: 'Over 2.5 Goals' }, { home_team: 'AIK Stockholm', away_team: 'Hammarby', selection: 'BTTS – Yes' }] },
];

// ── Snapshot maths (mirrors the homepage PnLSection compute) ─────────────────
type Snapshot = {
  staked: number; returned: number; profit: number; roi_pct: number;
  record: { w: number; l: number };
  series: { date: string; cumulative: number }[];
  rows: SettledRow[];
  live: boolean;
};

function computeSnapshot(rows: SettledRow[], live: boolean): Snapshot {
  let staked = 0, profit = 0, w = 0, l = 0, running = 0;
  const series: { date: string; cumulative: number }[] = [];
  for (const r of rows) {
    const s = Number(r.stake ?? 0);
    const pl = Number(r.profit_loss ?? 0);
    staked += s; profit += pl;
    if (r.status === 'won') w += 1; else if (r.status === 'lost') l += 1;
    running += pl;
    series.push({ date: r.pick_date, cumulative: round1(running) });
  }
  return {
    staked: round1(staked), returned: round1(staked + profit), profit: round1(profit),
    roi_pct: staked > 0 ? round1((profit / staked) * 100) : 0,
    record: { w, l }, series,
    rows: [...rows].reverse(), // newest first for the table
    live,
  };
}

async function fetchLiveRows(): Promise<SettledRow[] | null> {
  // gaffer_picks isn't in the generated Supabase types yet (same cast the
  // homepage GafferPicksBox / PnLSection use).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('gaffer_picks')
    .select('pick_date, bet_type, stake, combined_odds, profit_loss, status, legs')
    .in('status', ['won', 'lost'])
    .order('pick_date', { ascending: true });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data as SettledRow[];
}

// ── UI helpers ───────────────────────────────────────────────────────────────
const legLabel = (l: RawLeg) => {
  const home = l.home_team ?? l.homeTeam ?? '';
  const away = l.away_team ?? l.awayTeam ?? '';
  const sel = l.selection ?? l.market ?? '';
  const fixture = home && away ? `${home} v ${away}` : home || away;
  return fixture ? `${fixture} · ${sel}` : sel;
};

function Sparkline({ series }: { series: { date: string; cumulative: number }[] }) {
  if (series.length < 2) return null;
  const W = 100, H = 36;
  const max = Math.max(...series.map((s) => s.cumulative), 1);
  const min = Math.min(...series.map((s) => s.cumulative), 0);
  const range = max - min || 1;
  const pts = series.map((s, i) => {
    const x = (i / (series.length - 1)) * W;
    const y = H - ((s.cumulative - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');
  const up = series[series.length - 1].cumulative >= 0;
  const stroke = up ? 'rgb(52,211,153)' : 'rgb(251,113,133)';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-32 w-full">
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

function StatCard({ label, value, tone = 'gold' }: { label: string; value: string; tone?: 'gold' | 'up' | 'down' | 'white' }) {
  const colour = tone === 'up' ? 'text-emerald-400' : tone === 'down' ? 'text-rose-400' : tone === 'white' ? 'text-white' : 'text-[#f5c542]';
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07000f]/70 p-4">
      <div className={`font-display text-3xl md:text-4xl ${colour}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-white/45">{label}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Pnl() {
  const { data: liveRows } = useQuery({
    queryKey: ['pnl_full_history'],
    staleTime: 1000 * 60 * 5,
    queryFn: fetchLiveRows,
  });

  const snap = useMemo(
    () => (liveRows && liveRows.length ? computeSnapshot(liveRows, true) : computeSnapshot(SAMPLE_ROWS, false)),
    [liveRows],
  );
  const up = snap.profit >= 0;

  return (
    <div className="min-h-screen bg-[#07000f] text-white">
      <HomepageNav />

      <main className="mx-auto max-w-5xl px-3 pb-16 pt-4 md:px-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/55 transition hover:text-[#f5c542]">
          <ArrowLeft className="h-4 w-4" /> Back to the club
        </Link>

        {/* Header */}
        <section className="mt-4 overflow-hidden rounded-[1.4rem] border border-[#f5c542]/30 bg-[#130321] shadow-[0_22px_70px_-32px_rgba(245,197,66,0.6)] md:rounded-[1.9rem]">
          <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
          <div className="p-5 md:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
              <TrendingUp className="h-3.5 w-3.5" /> The Gaffer's P&amp;L
            </span>
            <h1 className="mt-2 font-display text-4xl uppercase leading-none tracking-tight text-white md:text-5xl">Tracked. Honest. Nothing hidden.</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">
              Every daily pick the Gaffer makes is settled against the real result and logged here — wins, losses, stake and return. £10 a bet, no hidden slips.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="profit" value={`${up ? '+' : ''}£${snap.profit}`} tone={up ? 'up' : 'down'} />
              <StatCard label="ROI" value={`${snap.roi_pct}%`} />
              <StatCard label="W–L record" value={`${snap.record.w}–${snap.record.l}`} tone="white" />
              <StatCard label="staked → back" value={`£${snap.staked} → £${snap.returned}`} tone="white" />
            </div>

            <div className="mt-5 rounded-2xl border border-[#f5c542]/20 bg-[#07000f]/60 p-5">
              <div className="mb-1 flex items-center justify-between text-xs text-white/45">
                <span className="uppercase tracking-wide">Cumulative profit</span>
                <span>{snap.series.length} settled bet{snap.series.length === 1 ? '' : 's'}</span>
              </div>
              <Sparkline series={snap.series} />
            </div>

            {!snap.live && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/45">
                <ShieldCheck className="h-3.5 w-3.5 text-[#f5c542]" /> Sample record shown until the first live bets settle.
              </p>
            )}
          </div>
        </section>

        {/* Full history — compact frosted cards, one per settled bet */}
        <section className="mt-6">
          <h2 className="mb-3 font-display text-xl uppercase tracking-tight text-white md:text-2xl">Full settled history</h2>
          <ul className="space-y-2">
            {snap.rows.map((r, i) => {
              const won = r.status === 'won';
              const pl = Number(r.profit_loss ?? 0);
              const legs = r.legs ?? [];
              const primary = legs.length
                ? `${legLabel(legs[0])}${legs.length > 1 ? ` +${legs.length - 1}` : ''}`
                : (r.bet_type ?? 'Bet');
              const d = new Date(r.pick_date + 'T12:00:00');
              return (
                <li
                  key={`${r.pick_date}-${i}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5 backdrop-blur-md transition-colors hover:bg-white/[0.07]"
                >
                  <div className="w-9 shrink-0 text-center">
                    <div className="font-display text-lg leading-none text-white/85">{d.toLocaleDateString('en-GB', { day: '2-digit' })}</div>
                    <div className="text-[9px] uppercase tracking-wide text-white/40">{d.toLocaleDateString('en-GB', { month: 'short' })}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{primary}</div>
                    <div className="truncate text-[11px] capitalize text-white/45">£{Number(r.stake ?? 0)} {r.bet_type ?? ''} · odds {r.combined_odds ? Number(r.combined_odds).toFixed(2) : '—'}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${won ? 'bg-emerald-400/15 text-emerald-300' : 'bg-rose-400/15 text-rose-300'}`}>
                    {won ? 'Won' : 'Lost'}
                  </span>
                  <div className={`w-14 shrink-0 text-right font-display text-lg ${pl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pl >= 0 ? '+' : ''}£{round2(pl)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="mt-10"><FooterNavigation /></div>
      </main>
    </div>
  );
}

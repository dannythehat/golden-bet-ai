import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TeamAvatar } from '@/components/TeamAvatar';

// ── endpoint contract: settled gaffer_picks → summary + recent settlements ──
type Settlement = {
  fixture: string; league: string; market: string; odds: number; stake: number;
  return: number; result: 'WIN' | 'LOSS'; legs?: number; homeLogo?: string | null; awayLogo?: string | null;
};
type PnLSummary = {
  status: 'live' | 'sample' | 'empty';
  summary: { profit: number; roi: number; wins: number; losses: number; strikeRate: number; staked: number; returned: number };
  recentSettlements: Settlement[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => `£${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
const splitFix = (f: string) => { const p = f.split(/\s+v\s+/i); return { home: p[0]?.trim() ?? f, away: p[1]?.trim() ?? '' }; };

// Sample until the first real settlements land.
const SAMPLE: PnLSummary = {
  status: 'sample',
  summary: { profit: 48, roi: 8.9, wins: 30, losses: 24, strikeRate: 56, staked: 540, returned: 588 },
  recentSettlements: [
    { fixture: 'Arsenal v Spurs', league: 'Premier League', market: 'Over 2.5 Goals', odds: 1.72, stake: 10, return: 17.2, result: 'WIN' },
    { fixture: 'Chelsea v Brighton', league: 'Premier League', market: 'BTTS', odds: 1.85, stake: 10, return: 18.5, result: 'WIN' },
    { fixture: 'Man Utd v Everton', league: 'Premier League', market: 'Over 1.5 Goals', odds: 1.6, stake: 10, return: 16, result: 'WIN' },
    { fixture: 'Newcastle v Fulham', league: 'Premier League', market: 'Home Win', odds: 1.91, stake: 10, return: 0, result: 'LOSS' },
    { fixture: 'Liverpool v West Ham', league: 'Premier League', market: 'Over 2.5 Goals', odds: 1.7, stake: 10, return: 17, result: 'WIN' },
  ],
};

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

  let staked = 0, profit = 0, wins = 0, losses = 0;
  const settlements: Settlement[] = [];
  for (const row of data as RawRow[]) {
    const s = Number(row.stake ?? 10), pl = Number(row.profit_loss ?? 0);
    staked += s; profit += pl;
    if (row.status === 'won') wins += 1; else losses += 1;
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
    status: 'live',
    summary: { profit: round2(profit), roi: staked > 0 ? round2((profit / staked) * 100) : 0, wins, losses, strikeRate: games ? Math.round((wins / games) * 100) : 0, staked: round2(staked), returned: round2(staked + profit) },
    recentSettlements: settlements.reverse().slice(0, 8),
  };
}

// Ease the headline figure up on mount.
function useCountUp(target: number, decimals = 0, dur = 800) {
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

/**
 * GafferPnLTrustSection — deliberately lean: one profit/loss box (the number
 * that matters) and the list of past selections + bets. Every figure is a real
 * settled gaffer_picks number; sample until the first bets settle.
 */
export function GafferPnLTrustSection() {
  const { data } = useQuery({ queryKey: ['gaffer_pnl_summary'], staleTime: 1000 * 60 * 5, queryFn: fetchPnLSummary });
  const p = data ?? SAMPLE;
  const s = p.summary;
  const up = s.profit >= 0;
  const sampleMode = p.status !== 'live';
  const games = s.wins + s.losses;
  const profitDec = s.profit % 1 === 0 ? 0 : 2;
  const aProfit = useCountUp(Math.abs(s.profit), profitDec);

  return (
    <section id="pnl" className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0a0613] shadow-[0_0_50px_-28px_rgba(124,58,237,0.6)]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />

      <div className="p-5 md:p-6">
        {/* header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl uppercase tracking-tight text-white md:text-2xl">The Gaffer's Record</h2>
            <p className="mt-0.5 text-xs text-white/50">Every £10 pick tracked — wins and losses, all logged.</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${sampleMode ? 'border-white/15 bg-white/[0.05] text-white/55' : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'}`}>
            <ShieldCheck className="h-3.5 w-3.5" /> {sampleMode ? 'Sample' : 'Live · settled'}
          </span>
        </div>

        {/* ── the one box: profit / loss ── */}
        <div className={`card-3d rounded-2xl p-5 ${up ? '' : 'ring-1 ring-inset ring-rose-400/20'}`}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/60">
                <TrendingUp className={`h-4 w-4 ${up ? 'text-emerald-300' : 'text-rose-300'}`} /> Profit / Loss
              </div>
              <div className={`mt-1.5 font-display text-5xl leading-none text-extrude ${up ? 'text-emerald-300' : 'text-rose-300'}`}>
                {up ? '+' : '−'}£{aProfit.toFixed(profitDec)}
              </div>
            </div>
            <div className="shrink-0 space-y-1 text-right text-[11px] text-white/55">
              <div><b className="text-white">{s.wins}-{s.losses}</b> W-L</div>
              <div>ROI <b className={s.roi >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{s.roi >= 0 ? '+' : ''}{s.roi}%</b></div>
              <div><b className="text-white">{s.strikeRate}%</b> strike</div>
            </div>
          </div>
          <div className="mt-3 border-t border-white/10 pt-2.5 text-[11px] text-white/55">
            {games} bet{games === 1 ? '' : 's'} settled · <span className="text-white/80">{money(s.staked)}</span> staked → <span className="text-[#f8e7a1]">{money(s.returned)}</span> back
          </div>
        </div>

        {/* ── past selections & bets ── */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-white/45">Past bets</span>
            <a href="/pnl" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-[#f8e7a1] transition-colors hover:text-white">
              View all <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          {p.recentSettlements.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-5 text-center text-sm text-white/50">
              First results appear once our selections settle.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.015]">
              {p.recentSettlements.map((st, i) => {
                const { home, away } = splitFix(st.fixture);
                return (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                    <div className="flex shrink-0 -space-x-1.5">
                      <TeamAvatar name={home} logoUrl={st.homeLogo} size={20} className="ring-1 ring-[#0b0617]" />
                      {away && <TeamAvatar name={away} logoUrl={st.awayLogo} size={20} className="ring-1 ring-[#0b0617]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold leading-tight text-white/85">
                        {home}{away ? <> <span className="text-white/25">v</span> {away}</> : ''}
                        {(st.legs ?? 1) > 1 && <span className="ml-1.5 rounded bg-violet-500/25 px-1 py-px text-[8px] font-black uppercase tracking-wide text-violet-200">Double</span>}
                      </div>
                      <div className="truncate text-[10px] leading-tight text-white/45">{[st.market, st.odds ? st.odds.toFixed(2) : null, money(st.stake)].filter(Boolean).join(' · ')}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-[13px] font-bold leading-none ${st.result === 'WIN' ? 'text-[#f8e7a1]' : 'text-white/45'}`}>{st.result === 'WIN' ? money(st.return) : '£0'}</div>
                      <div className={`mt-0.5 text-[10px] font-black uppercase tracking-wide ${st.result === 'WIN' ? 'text-emerald-300' : 'text-rose-400'}`}>{st.result}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-2 px-1 text-[10px] text-white/35">Settled bets only. Prices may vary from tip time.</p>
        </div>
      </div>
    </section>
  );
}

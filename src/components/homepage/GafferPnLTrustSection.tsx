import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, ShieldCheck, ArrowRight } from 'lucide-react';
import { getLedgerBets, summarize, latestSettledISO } from '@/lib/pnlLedger';
import { BetCard } from '@/components/pnl/BetCard';

const money = (n: number) => `£${n.toFixed(n % 1 === 0 ? 0 : 2)}`;

// "Last updated" in the viewer's own local date + time.
const fmtUpdated = (iso: string | null): string | null => {
  if (!iso) return null;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return null;
  return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

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
 * GafferPnLTrustSection — the honest record. One profit/loss box, then the recent
 * bets shown in full (every leg, won/lost), each clickable through to the full
 * /pnl history. Reads the committed settled-bet ledger — the single source of truth.
 */
export function GafferPnLTrustSection() {
  const bets = getLedgerBets();
  const s = summarize(bets);
  const updated = fmtUpdated(latestSettledISO(bets));
  const hasBets = bets.length > 0;
  const up = s.profit >= 0;
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
            {updated && <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/40">Last updated @ {updated}</p>}
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${hasBets ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' : 'border-white/15 bg-white/[0.05] text-white/55'}`}>
            <ShieldCheck className="h-3.5 w-3.5" /> {hasBets ? 'Live · settled' : 'No bets yet'}
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

        {/* ── recent bets in full — tap any to see the whole history ── */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-white/45">Recent bets</span>
            <Link to="/pnl" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-[#f8e7a1] transition-colors hover:text-white">
              Full history <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {!hasBets ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-5 text-center text-sm text-white/50">
              First results appear once our selections settle.
            </div>
          ) : (
            <div className="space-y-3">
              {bets.slice(0, 2).map((b, i) => (
                <Link key={`${b.date}-${b.kind}-${i}`} to="/pnl" className="block transition-transform hover:-translate-y-0.5">
                  <BetCard bet={b} />
                </Link>
              ))}
              <Link
                to="/pnl"
                className="flex items-center justify-center gap-2 rounded-2xl border border-[#f5c542]/30 bg-[#f5c542]/[0.06] py-3 text-sm font-black uppercase tracking-wide text-[#f8e7a1] transition-colors hover:bg-[#f5c542]/15"
              >
                View every bet & profits <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
          <p className="mt-2 px-1 text-[10px] text-white/35">Settled bets only. Prices may vary from tip time.</p>
        </div>
      </div>
    </section>
  );
}

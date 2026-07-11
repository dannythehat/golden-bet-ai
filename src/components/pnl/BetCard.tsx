import { TeamAvatar } from '@/components/TeamAvatar';
import type { LedgerBet } from '@/lib/pnlLedger';

const money = (n: number) => `£${Number.isInteger(n) ? n : n.toFixed(2)}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A settled bet shown in full: every leg (teams · bet type · odds · WON/LOST) in a
 * premium boxed card, with the overall result and profit. Used on the homepage
 * record and the full /pnl history page.
 */
export function BetCard({ bet }: { bet: LedgerBet }) {
  const won = bet.status === 'won';
  const voided = bet.status === 'void';
  const d = new Date(bet.date + 'T12:00:00');
  return (
    <div
      className={`relative rounded-[1.15rem] p-[1.6px] ${won
        ? 'shadow-[0_28px_56px_-28px_rgba(0,0,0,1),0_0_44px_-16px_rgba(16,185,129,0.5)]'
        : 'shadow-[0_28px_56px_-28px_rgba(0,0,0,1),0_0_40px_-18px_rgba(244,63,94,0.45)]'}`}
      style={{ background: won
        ? 'linear-gradient(155deg,#6ee7b7 0%,#059669 50%,#34d399 100%)'
        : voided
          ? 'linear-gradient(155deg,rgba(255,255,255,0.35) 0%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.22) 100%)'
          : 'linear-gradient(155deg,rgba(251,113,133,0.75) 0%,rgba(124,58,237,0.5) 48%,rgba(251,113,133,0.6) 100%)' }}
    >
      <div className="card-3d overflow-hidden rounded-[1.05rem] p-3.5 md:p-4">
        {/* header — kind + date + result */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-violet-400/45 bg-violet-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-violet-200">{cap(bet.kind)}</span>
            <span className="text-[11px] font-semibold text-white/45">{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${won ? 'border-emerald-400/55 bg-emerald-500/15 text-emerald-200' : voided ? 'border-white/25 bg-white/[0.08] text-white/70' : 'border-rose-400/55 bg-rose-500/15 text-rose-200'}`}>
            {won ? 'Won ✓' : voided ? 'Void — stake returned' : 'Lost ✗'}
          </span>
        </div>

        {/* legs — each with teams, bet type, odds, and its own win/loss */}
        <div className="mt-3 space-y-2">
          {bet.legs.map((l, i) => {
            const lw = l.result === 'won';
            const lv = l.result === 'void';
            return (
              <div key={i} className="inset-3d flex items-center gap-2.5 rounded-xl px-3 py-2">
                <div className="flex shrink-0 -space-x-1.5">
                  <TeamAvatar name={l.home} size={22} className="ring-1 ring-black/50" />
                  <TeamAvatar name={l.away} size={22} className="ring-1 ring-black/50" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-bold leading-tight text-white text-emboss">{l.home} <span className="text-white/30">v</span> {l.away}</div>
                  <div className="truncate text-[10px] leading-tight text-white/50">
                    <span className="text-[#f8e7a1]/80">{l.selection}</span> · {l.odds.toFixed(2)}{l.ft ? (l.ft === 'ABD' ? ' · Abandoned' : ` · FT ${l.ft}`) : ''}
                  </div>
                </div>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${lw ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-inset ring-emerald-400/25' : lv ? 'bg-white/10 text-white/60 ring-1 ring-inset ring-white/20' : 'bg-rose-500/20 text-rose-300 ring-1 ring-inset ring-rose-400/25'}`}>
                  {lw ? 'Won' : lv ? 'Void' : 'Lost'}
                </span>
              </div>
            );
          })}
        </div>

        {/* footer — stake, odds, return, profit */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
          <span className="text-[12px] text-white/55">
            {money(bet.stake)} @ <b className="text-white/75">{bet.combinedOdds.toFixed(2)}</b> → <b className={won || voided ? 'text-[#f8e7a1]' : 'text-white/40'}>{bet.status === 'lost' ? '£0' : money(bet.returns)}</b>
          </span>
          <span className={`font-display text-xl leading-none text-extrude ${bet.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {bet.profit >= 0 ? '+' : '−'}{money(Math.abs(bet.profit))}
          </span>
        </div>
      </div>
    </div>
  );
}

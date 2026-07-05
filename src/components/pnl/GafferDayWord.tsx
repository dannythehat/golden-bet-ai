import theGaffer from '@/assets/the-gaffer.png';
import { gafferDayVerdict, type DayBet } from '@/lib/gafferVoice';
import type { LedgerBet } from '@/lib/pnlLedger';

const fmtDay = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
};

/**
 * The Gaffer's spoken word on the day's slips — a fresh, in-character verdict
 * assembled from the real settled result (what won, what lost, and how). Reads
 * the most recent settled day from the ledger. Never the same words twice.
 */
export function GafferDayWord({ bets, className = '' }: { bets: LedgerBet[]; className?: string }) {
  const latestDate = bets[0]?.date;
  if (!latestDate) return null;
  const dayBets = bets.filter((b) => b.date === latestDate) as unknown as DayBet[];
  const verdict = gafferDayVerdict(dayBets, latestDate);
  if (!verdict) return null;

  const won = dayBets.filter((b) => b.status === 'won').length;
  const lost = dayBets.filter((b) => b.status === 'lost').length;
  const mood = lost === 0 ? 'up' : won === 0 ? 'down' : 'mixed';
  const accent = mood === 'up' ? '#34d399' : mood === 'down' ? '#fb7185' : '#f5c542';

  return (
    <div
      className={`relative overflow-hidden rounded-[1.2rem] p-[1.6px] ${className}`}
      style={{ background: `linear-gradient(150deg, ${accent}cc 0%, rgba(124,58,237,0.5) 52%, ${accent}99 100%)` }}
    >
      <div className="card-3d rounded-[1.06rem] p-4 md:p-5">
        <div className="flex items-start gap-3.5">
          {/* portrait */}
          <div className="relative shrink-0">
            <div className="absolute -inset-0.5 rounded-full opacity-70 blur-[3px]" style={{ background: accent }} />
            <img
              src={theGaffer}
              alt="The Gaffer"
              className="relative h-14 w-14 rounded-full object-cover object-top ring-2 md:h-16 md:w-16"
              style={{ ['--tw-ring-color' as string]: accent }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white/85">The Gaffer’s Word</span>
              <span className="h-1 w-1 rounded-full bg-white/25" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{fmtDay(latestDate)}</span>
            </div>
            {/* the quote */}
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/85 md:text-sm">
              <span className="mr-0.5 font-display text-lg leading-none text-white/30">“</span>
              {verdict}
              <span className="ml-0.5 font-display text-lg leading-none text-white/30">”</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

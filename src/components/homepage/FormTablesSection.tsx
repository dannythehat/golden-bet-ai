import { Link } from 'react-router-dom';
import { ChevronRight, LineChart } from 'lucide-react';
import { MarketArt, type Market } from './MarketArt';

/**
 * Form Tables — compact FlashScore-style density. A tight header row (title +
 * View all), then a dense two-column list of market rows (icon · title ·
 * chevron). No hero band, no big tiles — designed to sit inside the emerald
 * frosted scene panel and read like a stats sidebar, not a poster.
 */
const ROWS: { market: Market; title: string; hint: string; to: string; tone: 'over' | 'under' }[] = [
  { market: 'goals',   title: 'Over Goals',    hint: 'Top scorers',      to: '/form-tables?cat=goals&mode=over',    tone: 'over' },
  { market: 'goals',   title: 'Under Goals',   hint: 'Low-scoring',      to: '/form-tables?cat=goals&mode=under',   tone: 'under' },
  { market: 'corners', title: 'Over Corners',  hint: 'High corners',     to: '/form-tables?cat=corners&mode=over',  tone: 'over' },
  { market: 'corners', title: 'Under Corners', hint: 'Low corners',      to: '/form-tables?cat=corners&mode=under', tone: 'under' },
  { market: 'cards',   title: 'Over Cards',    hint: 'Cards flying',     to: '/form-tables?cat=cards&mode=over',    tone: 'over' },
  { market: 'cards',   title: 'Under Cards',   hint: 'Clean games',      to: '/form-tables?cat=cards&mode=under',   tone: 'under' },
  { market: 'btts',    title: 'BTTS – Yes',    hint: 'Both to score',    to: '/form-tables?cat=btts&mode=over',     tone: 'over' },
  { market: 'btts',    title: 'BTTS – No',     hint: 'Clean-sheet lean', to: '/form-tables?cat=btts&mode=under',    tone: 'under' },
];

export function FormTablesSection() {
  return (
    <section
      id="form-tables"
      className="relative scroll-mt-28 overflow-hidden rounded-2xl border border-emerald-400/25 bg-[#040a06]/60"
    >
      {/* header — thin FlashScore-style bar */}
      <div className="flex items-center justify-between gap-2 border-b border-emerald-400/15 bg-emerald-500/[0.06] px-3.5 py-2.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300/90">Form</span>
          <span className="truncate text-[13px] font-bold text-white/80">Tables · Live form by market</span>
        </div>
        <Link
          to="/form-tables"
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* rows */}
      <ul className="divide-y divide-white/[0.06] sm:grid sm:grid-cols-2 sm:divide-y-0">
        {ROWS.map((r, i) => (
          <li
            key={r.title}
            className={`${i % 2 === 1 ? 'sm:border-l sm:border-white/[0.06]' : ''}`}
          >
            <Link
              to={r.to}
              className="group flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-emerald-500/[0.06]"
            >
              <MarketArt market={r.market} className="h-7 w-7 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-bold text-white">{r.title}</span>
                  <span
                    className={`rounded px-1 py-px text-[9px] font-black uppercase tracking-wide ${
                      r.tone === 'over'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {r.tone}
                  </span>
                </div>
                <div className="truncate text-[11px] text-white/45">{r.hint}</div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-300" />
            </Link>
          </li>
        ))}
      </ul>

      {/* footer explore bar — slim */}
      <Link
        to="/form-tables"
        className="group flex w-full items-center justify-center gap-2 border-t border-violet-500/30 bg-gradient-to-r from-violet-600/15 via-violet-500/10 to-violet-600/15 py-2.5 text-[12px] font-black uppercase tracking-wide text-violet-100 transition-colors hover:from-violet-600/25 hover:to-violet-600/25"
      >
        <LineChart className="h-3.5 w-3.5 text-violet-300" /> Explore today's form
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}

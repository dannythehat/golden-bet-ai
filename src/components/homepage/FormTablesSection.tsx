import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { Icon } from './icons';
import { FORM_MARKETS } from './content';

const ACCENTS: Record<string, { text: string; ring: string; glow: string }> = {
  violet: { text: 'text-violet-300', ring: 'border-violet-400/40', glow: 'shadow-[0_0_25px_-12px_rgba(167,139,250,0.7)]' },
  green:  { text: 'text-emerald-300', ring: 'border-emerald-400/40', glow: 'shadow-[0_0_25px_-12px_rgba(52,211,153,0.7)]' },
  red:    { text: 'text-rose-300', ring: 'border-rose-400/40', glow: 'shadow-[0_0_25px_-12px_rgba(251,113,133,0.7)]' },
  white:  { text: 'text-white', ring: 'border-white/25', glow: 'shadow-[0_0_25px_-12px_rgba(255,255,255,0.4)]' },
};

export function FormTablesSection() {
  return (
    <section
      id="form-tables"
      className="rounded-2xl border border-emerald-400/40 bg-[#06140d] p-4 shadow-[0_0_60px_-22px_rgba(52,211,153,0.55)] sm:p-6 md:rounded-3xl md:p-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
            Footy Oracle
          </div>
          <h2 className="mt-1 flex items-center gap-2 font-display text-3xl leading-none text-white sm:text-4xl">
            Form Tables
            <BarChart3 className="h-7 w-7 text-emerald-400" />
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Real form. Key trends. Better decisions.
          </p>
        </div>
        <Link
          to="/form-tables"
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-200 transition-colors hover:bg-emerald-500/20"
        >
          View All Tables
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-4">
        {FORM_MARKETS.map((m) => {
          const a = ACCENTS[m.accent];
          return (
            <Link
              key={m.title}
              to="/form-tables"
              className={`group flex flex-col rounded-xl border bg-[#020806] p-3 transition-all hover:-translate-y-0.5 md:p-4 ${a.ring} ${a.glow}`}
            >
              <Icon name={m.icon} className={`h-7 w-7 ${a.text}`} />
              <div className="mt-2 text-[13px] font-black uppercase leading-tight text-white sm:text-sm">
                {m.title}
              </div>
              <div className="mt-1 text-[11px] leading-tight text-white/60">
                {m.blurb}
              </div>
              <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${a.text}`}>
                View Table <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        to="/form-tables"
        className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 px-4 py-3.5 text-sm font-black uppercase tracking-wider text-emerald-100 shadow-[0_0_30px_-10px_rgba(52,211,153,0.7)] transition-all hover:from-emerald-500/30 hover:to-emerald-400/20"
      >
        <BarChart3 className="h-4 w-4" />
        Explore Today's Form Tables
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

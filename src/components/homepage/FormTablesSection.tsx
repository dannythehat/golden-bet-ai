import { ArrowRight, BarChart3, ChevronRight } from 'lucide-react';
import { SectionShell, Eyebrow } from './primitives';
import { Icon } from './icons';
import { FORM_MARKETS, type FormMarket } from './content';

const ACCENT: Record<FormMarket['accent'], string> = {
  violet: 'text-violet-400',
  green: 'text-emerald-400',
  red: 'text-rose-400',
  white: 'text-white',
};

/** Form Tables — green premium grid of clickable market tiles. */
export function FormTablesSection() {
  return (
    <SectionShell
      id="form-tables"
      glow={{ border: 'rgba(52,211,153,0.35)', glow: 'rgba(16,185,129,0.45)' }}
      className="bg-gradient-to-br from-[#06140d] via-[#08160f] to-[#040d09] p-5 md:p-8"
    >
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow className="text-emerald-400">Footy Oracle</Eyebrow>
          <h2 className="mt-1 flex items-center gap-3 font-display text-4xl tracking-tight text-white md:text-5xl">
            FORM TABLES <BarChart3 className="h-9 w-9 text-emerald-400" />
          </h2>
          <p className="mt-1 text-white/60">Real form. Key trends. Better decisions.</p>
        </div>
        <a href="/form-tables" className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-400/10">
          View All Tables <ChevronRight className="h-4 w-4 text-emerald-400" />
        </a>
      </div>

      {/* Market tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {FORM_MARKETS.map((m) => (
          <a
            key={m.title}
            href="/form-tables"
            className="group flex flex-col items-center rounded-2xl border border-emerald-400/15 bg-emerald-950/30 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-[0_0_30px_-12px_rgba(16,185,129,0.8)] md:p-5"
          >
            <Icon name={m.icon} className={`mb-3 h-9 w-9 ${ACCENT[m.accent]}`} />
            <h3 className="font-bold leading-tight text-white">{m.title}</h3>
            <p className="mt-1 text-xs text-white/55">{m.blurb}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-emerald-400">
              View Table <ChevronRight className="h-3 w-3" />
            </span>
          </a>
        ))}
      </div>

      {/* Full-width CTA */}
      <a
        href="/form-tables"
        className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 px-6 py-4 font-display text-xl tracking-wide text-white shadow-[0_10px_30px_-12px_rgba(16,185,129,0.8)] transition-transform hover:scale-[1.01]"
      >
        <BarChart3 className="h-5 w-5" /> EXPLORE TODAY'S FORM TABLES <ArrowRight className="h-5 w-5" />
      </a>
    </SectionShell>
  );
}

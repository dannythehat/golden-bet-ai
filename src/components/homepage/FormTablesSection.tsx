import { ArrowUpRight } from 'lucide-react';
import { FeaturePanel, Accent } from './FeaturePanel';
import { FORM_MARKETS } from './content';
import { HOMEPAGE_BACKGROUNDS } from './assets';
import { Icon } from './icons';

const ACCENT: Record<string, string> = {
  violet: 'text-violet-300',
  green: 'text-emerald-300',
  red: 'text-rose-300',
  white: 'text-white/80',
};

/** Form Tables — native card previewing the live markets, links to /form-tables. */
export function FormTablesSection() {
  return (
    <FeaturePanel
      id="form-tables"
      tone="emerald"
      eyebrow="Form Tables"
      title={<>See who's <Accent tone="emerald">hot</Accent>, who's not.</>}
      body="Live-weighted form ranked by real numbers — goals, corners, cards and BTTS — with the Gaffer's value flagged against the price."
      bgImage={HOMEPAGE_BACKGROUNDS.pitch}
      ctas={[{ label: 'Open Form Tables', to: '/form-tables' }]}
    >
      <div className="grid grid-cols-2 gap-2">
        {FORM_MARKETS.slice(0, 6).map((m) => (
          <div
            key={m.title}
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
          >
            <Icon name={m.icon} className={`h-4 w-4 shrink-0 ${ACCENT[m.accent] ?? 'text-white/80'}`} />
            <span className="truncate text-[12px] font-bold text-white/85">{m.title}</span>
            <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-white/25" />
          </div>
        ))}
      </div>
    </FeaturePanel>
  );
}

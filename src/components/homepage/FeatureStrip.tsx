import { Icon } from './icons';
import { cn } from '@/lib/utils';
import { useFeatureStrip } from './useHomepageData';

/**
 * Frosted-glass card ribbon beneath the hero. Fully data-driven from
 * homepage_feature_strip (icon, label, subtitle, link, highlight, order).
 */
export function FeatureStrip() {
  const { data: items = [] } = useFeatureStrip();

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {items.map((f) => (
        <a
          key={f.id}
          href={f.link ?? '#'}
          className={cn(
            'group flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center backdrop-blur-md transition-all hover:-translate-y-0.5',
            f.highlight
              ? 'border-gold/40 bg-gold/10 hover:border-gold/70 hover:shadow-[0_0_30px_-12px_hsl(var(--gold))]'
              : 'border-white/10 bg-white/[0.04] hover:border-violet-400/50 hover:bg-white/[0.07]',
          )}
        >
          <span className={cn(
            'grid h-10 w-10 place-items-center rounded-xl',
            f.highlight ? 'bg-gold/15 text-gold' : 'bg-violet-500/15 text-violet-300',
          )}>
            <Icon name={f.icon} className="h-5 w-5" />
          </span>
          <span className="text-[13px] font-bold leading-tight text-white">{f.label}</span>
          {f.subtitle && <span className="text-[11px] leading-tight text-white/50">{f.subtitle}</span>}
        </a>
      ))}
    </div>
  );
}

import { Icon } from './icons';
import { FEATURE_STRIP } from './content';
import { cn } from '@/lib/utils';

/**
 * Editable frosted-glass card row beneath the hero. These are UI cards (not part
 * of the hero image) so they can be swapped/reordered any time.
 */
export function FeatureStrip() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {FEATURE_STRIP.map((f) => (
        <a
          key={f.label}
          href={f.href}
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
          <span className="text-[11px] leading-tight text-white/50">{f.sub}</span>
        </a>
      ))}
    </div>
  );
}

import { Icon } from './icons';
import { cn } from '@/lib/utils';
import { useFeatureStrip } from './useHomepageData';

/**
 * Premium feature ribbon — image-led tiles with glowing icon panels,
 * gradient backgrounds, and a clear hover lift. Fully data-driven.
 */
export function FeatureStrip() {
  const { data: items = [] } = useFeatureStrip();

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-7">
      {items.map((f) => (
        <a
          key={f.id}
          href={f.link ?? '#'}
          className={cn(
            'group relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border p-3.5 text-center transition-all hover:-translate-y-1 md:p-4',
            f.highlight
              ? 'border-amber-300/50 bg-gradient-to-br from-amber-500/15 via-amber-400/5 to-transparent shadow-[0_10px_40px_-20px_rgba(250,204,21,0.7)] hover:shadow-[0_15px_45px_-15px_rgba(250,204,21,0.9)]'
              : 'border-white/10 bg-gradient-to-br from-violet-600/15 via-violet-500/5 to-transparent shadow-[0_8px_30px_-18px_rgba(139,92,246,0.6)] hover:border-violet-300/50 hover:shadow-[0_15px_40px_-15px_rgba(139,92,246,0.8)]',
          )}
        >
          {/* Animated glow blob */}
          <div
            className={cn(
              'pointer-events-none absolute -top-10 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-100',
              f.highlight ? 'bg-amber-400/40 opacity-50' : 'bg-violet-500/35 opacity-40',
            )}
          />

          {/* Icon plate */}
          <span
            className={cn(
              'relative grid h-12 w-12 place-items-center rounded-xl border shadow-inner md:h-14 md:w-14',
              f.highlight
                ? 'border-amber-300/40 bg-gradient-to-br from-amber-400/30 to-amber-600/10 text-amber-200'
                : 'border-violet-400/30 bg-gradient-to-br from-violet-500/30 to-violet-700/10 text-violet-200',
            )}
          >
            <Icon name={f.icon} className="h-6 w-6 md:h-7 md:w-7" />
          </span>

          <span className="relative text-[13px] font-extrabold leading-tight text-white md:text-sm">
            {f.label}
          </span>
          {f.subtitle && (
            <span className="relative text-[11px] leading-tight text-white/55 md:text-xs">
              {f.subtitle}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}

import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared building blocks for the Footy Oracle homepage.
 * SectionShell = the locked "premium neon-bordered frosted card" look that every
 * major section sits inside. Pass a glow colour to theme it per section.
 */

type Glow = {
  /** rgba/hsla border colour */
  border: string;
  /** rgba/hsla outer glow colour */
  glow: string;
};

export function SectionShell({
  id, glow, className, children,
}: {
  id?: string; glow: Glow; className?: string; children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        'relative scroll-mt-24 rounded-[1.75rem] overflow-hidden',
        'bg-[#0b0617]/80 backdrop-blur-xl',
        className,
      )}
      style={{
        border: `1px solid ${glow.border}`,
        boxShadow: `0 0 70px -20px ${glow.glow}, inset 0 1px 0 0 rgba(255,255,255,0.04)`,
      }}
    >
      {children}
    </section>
  );
}

/** The Footy Oracle crest: purple football + gold crown. */
export function OracleCrest({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex items-center justify-center', className)}>
      <Crown className="absolute -top-[18%] z-10 h-[42%] w-[42%] text-gold drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
      <span className="relative grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-violet-500 via-purple-700 to-purple-900 shadow-lg shadow-purple-900/50 ring-1 ring-white/15">
        <span className="text-[55%] leading-none">⚽</span>
      </span>
    </span>
  );
}

/** Brand wordmark: FOOTY ORACLE + "THE GAFFER KNOWS." */
export function OracleWordmark({ tagline = true }: { tagline?: boolean }) {
  return (
    <span className="leading-none">
      <span className="block font-display text-xl tracking-wide">
        <span className="text-white">FOOTY </span>
        <span className="text-violet-400">ORACLE</span>
      </span>
      {tagline && (
        <span className="block font-hand text-[15px] font-bold leading-none text-gold">The Gaffer knows.</span>
      )}
    </span>
  );
}

/** Eyebrow label used above section titles. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('text-sm font-black uppercase tracking-[0.18em]', className)}>{children}</span>
  );
}

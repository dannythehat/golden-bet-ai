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
/**
 * The Footy Oracle crest — a football rendered as the oracle's crystal ball,
 * glowing in a gold stand under a crown, with a few mystic sparkles. Pure SVG so
 * it stays crisp at any size (favicon → hero).
 */
export function OracleCrest({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn('block', className)} role="img" aria-label="Footy Oracle crest">
      <defs>
        <radialGradient id="oc-glow" cx="50%" cy="52%" r="52%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.6" />
          <stop offset="58%" stopColor="#7c3aed" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="oc-orb" cx="37%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#c4adff" />
          <stop offset="44%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#2e0850" />
        </radialGradient>
        <linearGradient id="oc-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe487" />
          <stop offset="50%" stopColor="#f5c542" />
          <stop offset="100%" stopColor="#b8860b" />
        </linearGradient>
      </defs>

      {/* mystic glow */}
      <circle cx="50" cy="54" r="49" fill="url(#oc-glow)" />

      {/* crown atop the ball */}
      <g fill="url(#oc-gold)" stroke="#8a5a00" strokeWidth="0.6" strokeLinejoin="round">
        <path d="M37 25 L34.5 13 L43 19.5 L50 8 L57 19.5 L65.5 13 L63 25 Z" />
      </g>
      <g fill="#fff3c4">
        <circle cx="34.5" cy="12" r="1.5" />
        <circle cx="50" cy="6.6" r="1.7" />
        <circle cx="65.5" cy="12" r="1.5" />
      </g>

      {/* the crystal ball — a football */}
      <circle cx="50" cy="54" r="38" fill="url(#oc-orb)" stroke="#f5c542" strokeOpacity="0.6" strokeWidth="2" />
      <g stroke="url(#oc-gold)" strokeWidth="2.1" strokeLinejoin="round" strokeLinecap="round" fill="none">
        {/* seams radiating to the panel edges */}
        <path d="M50 40 L50 18 M63.3 49.7 L84.2 42.9 M58.2 65.3 L71.2 83.1 M41.8 65.3 L28.8 83.1 M36.7 49.7 L15.8 42.9" />
        {/* central panel */}
        <polygon points="50,40 63.3,49.7 58.2,65.3 41.8,65.3 36.7,49.7" fill="#2a0748" fillOpacity="0.92" />
      </g>

      {/* glassy highlight */}
      <ellipse cx="38" cy="40" rx="11" ry="6" fill="#ffffff" opacity="0.26" transform="rotate(-35 38 40)" />

      {/* mystic sparkles / glints on the ball */}
      <g fill="#ffe487">
        <path d="M68 31 L68.95 33.05 L71 34 L68.95 34.95 L68 37 L67.05 34.95 L65 34 L67.05 33.05 Z" />
        <path d="M30 61 L30.95 63.05 L33 64 L30.95 64.95 L30 67 L29.05 64.95 L27 64 L29.05 63.05 Z" />
        <path d="M58 77 L58.95 79.05 L61 80 L58.95 80.95 L58 83 L57.05 80.95 L55 80 L57.05 79.05 Z" />
      </g>
    </svg>
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

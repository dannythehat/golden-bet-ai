import { type ReactNode } from 'react';

export type SceneTone =
  | 'hero'
  | 'emerald'
  | 'editorial'
  | 'violet'
  | 'crowd'
  | 'finale';

type HomepageSceneProps = {
  tone: SceneTone;
  children: ReactNode;
  eyebrow?: string;
  /** Remove top fade (use on first scene) */
  flushTop?: boolean;
  /** Remove bottom fade (use on last scene) */
  flushBottom?: boolean;
  id?: string;
  className?: string;
};

/**
 * Per-tone atmosphere: subtle background wash + two ambient blobs.
 * Tints stay conservative (≤ ~12% opacity) so artwork keeps leading.
 */
const TONES: Record<
  SceneTone,
  {
    bg: string;
    blobA: string;
    blobB: string;
    eyebrowColor: string;
  }
> = {
  hero: {
    bg: 'radial-gradient(120% 80% at 50% 0%, rgba(88,28,135,0.28), transparent 60%), radial-gradient(80% 60% at 90% 10%, rgba(245,158,11,0.10), transparent 60%)',
    blobA: 'bg-[#7c3aed]/15 -top-24 -left-24 h-[420px] w-[420px]',
    blobB: 'bg-[#f59e0b]/10 top-24 right-[-120px] h-[360px] w-[360px]',
    eyebrowColor: 'text-amber-300/70',
  },
  emerald: {
    bg: 'radial-gradient(90% 60% at 20% 30%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(70% 50% at 90% 80%, rgba(6,95,70,0.18), transparent 60%)',
    blobA: 'bg-emerald-500/10 top-10 -left-32 h-[380px] w-[380px]',
    blobB: 'bg-teal-400/8 bottom-0 right-[-100px] h-[320px] w-[320px]',
    eyebrowColor: 'text-emerald-300/70',
  },
  editorial: {
    bg: 'radial-gradient(80% 60% at 50% 0%, rgba(245,245,244,0.05), transparent 60%), radial-gradient(60% 50% at 0% 100%, rgba(120,113,108,0.10), transparent 60%)',
    blobA: 'bg-stone-200/5 top-0 left-1/3 h-[300px] w-[300px]',
    blobB: 'bg-amber-100/5 bottom-10 right-0 h-[280px] w-[280px]',
    eyebrowColor: 'text-stone-300/70',
  },
  violet: {
    bg: 'radial-gradient(100% 70% at 50% 50%, rgba(124,58,237,0.18), transparent 60%), radial-gradient(60% 50% at 10% 0%, rgba(168,85,247,0.10), transparent 60%)',
    blobA: 'bg-violet-600/15 top-0 left-1/4 h-[420px] w-[420px]',
    blobB: 'bg-fuchsia-500/10 bottom-[-80px] right-[-80px] h-[360px] w-[360px]',
    eyebrowColor: 'text-violet-300/70',
  },
  crowd: {
    bg: 'radial-gradient(90% 60% at 30% 40%, rgba(37,99,235,0.14), transparent 60%), radial-gradient(70% 50% at 80% 80%, rgba(14,116,144,0.12), transparent 60%)',
    blobA: 'bg-sky-500/10 top-10 -left-24 h-[380px] w-[380px]',
    blobB: 'bg-cyan-500/8 bottom-0 right-[-80px] h-[320px] w-[320px]',
    eyebrowColor: 'text-sky-300/70',
  },
  finale: {
    bg: 'radial-gradient(100% 80% at 50% 50%, rgba(245,197,66,0.18), transparent 60%), radial-gradient(80% 60% at 50% 100%, rgba(124,58,237,0.18), transparent 60%)',
    blobA: 'bg-amber-400/15 top-0 left-1/4 h-[460px] w-[460px]',
    blobB: 'bg-purple-600/15 bottom-[-100px] right-1/4 h-[400px] w-[400px]',
    eyebrowColor: 'text-amber-300/80',
  },
};

export function HomepageScene({
  tone,
  children,
  eyebrow,
  flushTop = false,
  flushBottom = false,
  id,
  className = '',
}: HomepageSceneProps) {
  const t = TONES[tone];

  return (
    <section
      id={id}
      className={`relative isolate ${flushTop ? '' : 'pt-14 md:pt-24'} ${
        flushBottom ? '' : 'pb-14 md:pb-24'
      } ${className}`}
    >
      {/* Background wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: t.bg }}
      />
      {/* Ambient blobs */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -z-10 rounded-full blur-3xl ${t.blobA}`}
        style={{ willChange: 'auto' }}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -z-10 rounded-full blur-3xl ${t.blobB}`}
        style={{ willChange: 'auto' }}
      />

      {/* Top fade — blends previous scene out */}
      {!flushTop && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-20 bg-gradient-to-b from-[#05020b] to-transparent"
        />
      )}
      {/* Bottom fade — blends into next scene */}
      {!flushBottom && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-20 bg-gradient-to-t from-[#05020b] to-transparent"
        />
      )}

      {eyebrow && (
        <div className="mx-auto mb-5 max-w-7xl px-3 sm:px-4 md:mb-8 md:px-6">
          <span
            className={`inline-block text-[10px] font-semibold uppercase tracking-[0.3em] md:text-xs ${t.eyebrowColor}`}
          >
            {eyebrow}
          </span>
        </div>
      )}

      {children}
    </section>
  );
}

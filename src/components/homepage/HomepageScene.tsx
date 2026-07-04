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
  /** Wrap children in a per-tone frosted panel. Default true; hero passes false. */
  boxed?: boolean;
  id?: string;
  className?: string;
};

/**
 * Per-tone atmosphere + per-tone frosted panel skin. The panel gives every
 * section its own coloured glass boundary (border, inner ring, soft glow)
 * so scenes read as distinct chapters rather than one continuous scroll.
 */
const TONES: Record<
  SceneTone,
  {
    bg: string;
    blobA: string;
    blobB: string;
    eyebrowColor: string;
    /** Panel look — border + glow + top hairline colour */
    panelBorder: string;
    panelShadow: string;
    panelRim: string;
    chipBg: string;
    chipBorder: string;
    chipText: string;
  }
> = {
  hero: {
    bg: 'radial-gradient(120% 80% at 50% 0%, rgba(88,28,135,0.28), transparent 60%), radial-gradient(80% 60% at 90% 10%, rgba(245,158,11,0.10), transparent 60%)',
    blobA: 'bg-[#7c3aed]/15 -top-24 -left-24 h-[420px] w-[420px]',
    blobB: 'bg-[#f59e0b]/10 top-24 right-[-120px] h-[360px] w-[360px]',
    eyebrowColor: 'text-amber-300/70',
    panelBorder: 'border-amber-300/25',
    panelShadow: '0 40px 100px -50px rgba(245,158,11,0.55)',
    panelRim: 'from-transparent via-amber-300/60 to-transparent',
    chipBg: 'bg-amber-500/10',
    chipBorder: 'border-amber-300/40',
    chipText: 'text-amber-200',
  },
  emerald: {
    bg: 'radial-gradient(90% 60% at 20% 30%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(70% 50% at 90% 80%, rgba(6,95,70,0.18), transparent 60%)',
    blobA: 'bg-emerald-500/10 top-10 -left-32 h-[380px] w-[380px]',
    blobB: 'bg-teal-400/8 bottom-0 right-[-100px] h-[320px] w-[320px]',
    eyebrowColor: 'text-emerald-300/70',
    panelBorder: 'border-emerald-400/25',
    panelShadow: '0 40px 100px -50px rgba(16,185,129,0.55)',
    panelRim: 'from-transparent via-emerald-300/60 to-transparent',
    chipBg: 'bg-emerald-500/10',
    chipBorder: 'border-emerald-400/40',
    chipText: 'text-emerald-200',
  },
  editorial: {
    bg: 'radial-gradient(80% 60% at 50% 0%, rgba(245,245,244,0.05), transparent 60%), radial-gradient(60% 50% at 0% 100%, rgba(120,113,108,0.10), transparent 60%)',
    blobA: 'bg-stone-200/5 top-0 left-1/3 h-[300px] w-[300px]',
    blobB: 'bg-amber-100/5 bottom-10 right-0 h-[280px] w-[280px]',
    eyebrowColor: 'text-stone-300/70',
    panelBorder: 'border-stone-300/20',
    panelShadow: '0 40px 100px -50px rgba(214,211,209,0.35)',
    panelRim: 'from-transparent via-stone-200/50 to-transparent',
    chipBg: 'bg-stone-300/10',
    chipBorder: 'border-stone-300/30',
    chipText: 'text-stone-200',
  },
  violet: {
    bg: 'radial-gradient(100% 70% at 50% 50%, rgba(124,58,237,0.18), transparent 60%), radial-gradient(60% 50% at 10% 0%, rgba(168,85,247,0.10), transparent 60%)',
    blobA: 'bg-violet-600/15 top-0 left-1/4 h-[420px] w-[420px]',
    blobB: 'bg-fuchsia-500/10 bottom-[-80px] right-[-80px] h-[360px] w-[360px]',
    eyebrowColor: 'text-violet-300/70',
    panelBorder: 'border-violet-400/30',
    panelShadow: '0 40px 100px -50px rgba(139,92,246,0.6)',
    panelRim: 'from-transparent via-violet-300/60 to-transparent',
    chipBg: 'bg-violet-500/10',
    chipBorder: 'border-violet-400/40',
    chipText: 'text-violet-200',
  },
  crowd: {
    bg: 'radial-gradient(90% 60% at 30% 40%, rgba(37,99,235,0.14), transparent 60%), radial-gradient(70% 50% at 80% 80%, rgba(14,116,144,0.12), transparent 60%)',
    blobA: 'bg-sky-500/10 top-10 -left-24 h-[380px] w-[380px]',
    blobB: 'bg-cyan-500/8 bottom-0 right-[-80px] h-[320px] w-[320px]',
    eyebrowColor: 'text-sky-300/70',
    panelBorder: 'border-sky-400/25',
    panelShadow: '0 40px 100px -50px rgba(56,189,248,0.55)',
    panelRim: 'from-transparent via-sky-300/60 to-transparent',
    chipBg: 'bg-sky-500/10',
    chipBorder: 'border-sky-400/40',
    chipText: 'text-sky-200',
  },
  finale: {
    bg: 'radial-gradient(100% 80% at 50% 50%, rgba(245,197,66,0.18), transparent 60%), radial-gradient(80% 60% at 50% 100%, rgba(124,58,237,0.18), transparent 60%)',
    blobA: 'bg-amber-400/15 top-0 left-1/4 h-[460px] w-[460px]',
    blobB: 'bg-purple-600/15 bottom-[-100px] right-1/4 h-[400px] w-[400px]',
    eyebrowColor: 'text-amber-300/80',
    panelBorder: 'border-amber-300/30',
    panelShadow: '0 40px 100px -50px rgba(245,197,66,0.65)',
    panelRim: 'from-transparent via-amber-300/70 to-transparent',
    chipBg: 'bg-amber-500/10',
    chipBorder: 'border-amber-300/45',
    chipText: 'text-amber-200',
  },
};

export function HomepageScene({
  tone,
  children,
  eyebrow,
  flushTop = false,
  flushBottom = false,
  boxed = true,
  id,
  className = '',
}: HomepageSceneProps) {
  const t = TONES[tone];

  return (
    <section
      id={id}
      className={`relative isolate ${flushTop ? '' : 'pt-10 md:pt-16'} ${
        flushBottom ? '' : 'pb-10 md:pb-16'
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
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -z-10 rounded-full blur-3xl ${t.blobB}`}
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

      {boxed ? (
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <div
            className={`frost-panel relative overflow-hidden rounded-[1.4rem] border ${t.panelBorder} p-4 sm:p-5 md:rounded-[1.8rem] md:p-8`}
            style={{ boxShadow: t.panelShadow }}
          >
            {/* top rim hairline in the tone colour */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r ${t.panelRim}`}
            />
            {eyebrow && (
              <div className="mb-4 md:mb-6">
                <span
                  className={`inline-flex items-center rounded-full border ${t.chipBorder} ${t.chipBg} px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] md:text-[11px] ${t.chipText}`}
                >
                  {eyebrow}
                </span>
              </div>
            )}
            {children}
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </section>
  );
}

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * FeaturePanel — the native, "alive" replacement for the old baked-image
 * ArtworkCards. A frosted-glass card with a real HTML headline, body, content
 * slot and buttons, themed per tone, with a scroll-reveal + hover lift. Images
 * (when used) sit BEHIND the text as atmosphere — never as text-baked slabs.
 */

export type PanelTone = 'emerald' | 'violet' | 'amber' | 'rose' | 'sky' | 'gold';

const TONE: Record<
  PanelTone,
  { ring: string; glow: string; chip: string; accent: string; blob: string; btn: string; ghost: string }
> = {
  emerald: {
    ring: 'border-emerald-400/25',
    glow: '0 30px 90px -50px rgba(16,185,129,0.7)',
    chip: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200',
    accent: 'text-emerald-300',
    blob: 'bg-emerald-500/20',
    btn: 'bg-emerald-500 text-black hover:bg-emerald-400',
    ghost: 'border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/10',
  },
  violet: {
    ring: 'border-violet-400/25',
    glow: '0 30px 90px -50px rgba(124,58,237,0.75)',
    chip: 'border-violet-400/40 bg-violet-400/15 text-violet-200',
    accent: 'text-violet-300',
    blob: 'bg-violet-500/20',
    btn: 'bg-violet-500 text-white hover:bg-violet-400',
    ghost: 'border-violet-400/40 text-violet-200 hover:bg-violet-400/10',
  },
  amber: {
    ring: 'border-amber-400/25',
    glow: '0 30px 90px -50px rgba(245,158,11,0.7)',
    chip: 'border-amber-400/40 bg-amber-400/15 text-amber-200',
    accent: 'text-amber-300',
    blob: 'bg-amber-500/20',
    btn: 'bg-amber-400 text-black hover:bg-amber-300',
    ghost: 'border-amber-400/40 text-amber-200 hover:bg-amber-400/10',
  },
  rose: {
    ring: 'border-rose-400/25',
    glow: '0 30px 90px -50px rgba(244,63,94,0.7)',
    chip: 'border-rose-400/40 bg-rose-400/15 text-rose-200',
    accent: 'text-rose-300',
    blob: 'bg-rose-500/20',
    btn: 'bg-rose-500 text-white hover:bg-rose-400',
    ghost: 'border-rose-400/40 text-rose-200 hover:bg-rose-400/10',
  },
  sky: {
    ring: 'border-sky-400/25',
    glow: '0 30px 90px -50px rgba(56,189,248,0.7)',
    chip: 'border-sky-400/40 bg-sky-400/15 text-sky-200',
    accent: 'text-sky-300',
    blob: 'bg-sky-500/20',
    btn: 'bg-sky-500 text-black hover:bg-sky-400',
    ghost: 'border-sky-400/40 text-sky-200 hover:bg-sky-400/10',
  },
  gold: {
    ring: 'border-[#f5c542]/40',
    glow: '0 30px 90px -46px rgba(245,197,66,0.85)',
    chip: 'border-[#f5c542]/45 bg-[#f5c542]/15 text-[#f8e7a1]',
    accent: 'text-[#f8e7a1]',
    blob: 'bg-[#f5c542]/20',
    btn: 'bg-gradient-to-r from-amber-300 to-amber-500 text-[#16051f] hover:from-amber-200 hover:to-amber-400',
    ghost: 'border-[#f5c542]/45 text-[#f8e7a1] hover:bg-[#f5c542]/10',
  },
};

export type PanelCta = { label: string; to?: string; href?: string; variant?: 'solid' | 'ghost' };

function Cta({ cta, tone }: { cta: PanelCta; tone: PanelTone }) {
  const t = TONE[tone];
  const base =
    'group/btn inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-[12px] font-black uppercase tracking-wide transition-all';
  const cls = cta.variant === 'ghost' ? `${base} border ${t.ghost}` : `${base} ${t.btn} hover:-translate-y-0.5`;
  const inner = (
    <>
      {cta.label}
      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
    </>
  );
  if (cta.href) {
    return (
      <a href={cta.href} target={cta.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={cta.to ?? '/'} className={cls}>
      {inner}
    </Link>
  );
}

type FeaturePanelProps = {
  id?: string;
  tone: PanelTone;
  eyebrow: string;
  title: ReactNode;
  body?: string;
  ctas?: PanelCta[];
  children?: ReactNode;
  /** Optional atmospheric background image (sits behind, heavily faded). */
  bgImage?: string;
  /** Optional foreground character cutout, bleeds from the bottom-right corner. */
  character?: { src: string; alt: string; className?: string };
  className?: string;
};

export function FeaturePanel({
  id,
  tone,
  eyebrow,
  title,
  body,
  ctas = [],
  children,
  bgImage,
  character,
  className = '',
}: FeaturePanelProps) {
  const t = TONE[tone];
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (setShown(true), obs.disconnect())),
      { threshold: 0.14 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id={id}
      ref={ref}
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border ${t.ring} bg-[#0b0617]/80 p-5 backdrop-blur-xl transition-all duration-700 ease-out md:rounded-[1.9rem] md:p-7 ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      } ${className}`}
      style={{ boxShadow: t.glow }}
    >
      {/* atmospheric background image (optional) */}
      {bgImage && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-[0.16] transition-opacity duration-700 group-hover:opacity-25"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      )}
      {/* gradient wash so text always reads */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-[#0b0617]/60 via-[#0b0617]/85 to-[#0b0617]" />
      {/* ambient blob that drifts on hover */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 -z-10 h-52 w-52 rounded-full blur-3xl transition-transform duration-700 group-hover:translate-x-4 group-hover:translate-y-2 ${t.blob}`}
      />

      {/* foreground character cutout (optional) + a glow so a dark cutout separates */}
      {character && (
        <>
          <div
            aria-hidden
            className={`pointer-events-none absolute -bottom-10 right-2 z-0 hidden h-56 w-56 rounded-full blur-3xl sm:block ${t.blob}`}
          />
          <img
            src={character.src}
            alt={character.alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            className={`pointer-events-none absolute bottom-0 right-0 z-0 hidden select-none object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.55)] transition-transform duration-700 group-hover:-translate-y-1 sm:block ${
              character.className ?? 'w-[52%] max-w-[240px] opacity-90'
            }`}
          />
        </>
      )}

      <div className={`relative z-[1] flex h-full flex-col ${character ? 'sm:pr-[42%]' : ''}`}>
        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${t.chip}`}>
          {eyebrow}
        </span>
        <h3 className="mt-3 font-display text-2xl uppercase leading-[0.95] tracking-tight text-white sm:text-3xl">
          {title}
        </h3>
        {body && <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">{body}</p>}

        {children && <div className="mt-4">{children}</div>}

        {ctas.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            {ctas.map((c) => (
              <Cta key={c.label} cta={c} tone={tone} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** Small themed accent for the panel title's highlight word. */
export function Accent({ tone, children }: { tone: PanelTone; children: ReactNode }) {
  return <span className={TONE[tone].accent}>{children}</span>;
}

import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export type MobileTone = 'emerald' | 'violet' | 'amber' | 'sky' | 'rose' | 'gold' | 'stone';

const TONE: Record<
  MobileTone,
  { border: string; glow: string; btn: string; chip: string }
> = {
  emerald: {
    border: 'border-emerald-400/30',
    glow: 'shadow-[0_18px_60px_-30px_rgba(16,185,129,0.55)]',
    btn: 'bg-emerald-500 hover:bg-emerald-400 text-black',
    chip: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30',
  },
  violet: {
    border: 'border-violet-400/30',
    glow: 'shadow-[0_18px_60px_-30px_rgba(124,58,237,0.6)]',
    btn: 'bg-violet-500 hover:bg-violet-400 text-white',
    chip: 'bg-violet-400/15 text-violet-200 border-violet-400/30',
  },
  amber: {
    border: 'border-amber-400/30',
    glow: 'shadow-[0_18px_60px_-30px_rgba(245,158,11,0.55)]',
    btn: 'bg-amber-400 hover:bg-amber-300 text-black',
    chip: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
  },
  sky: {
    border: 'border-sky-400/30',
    glow: 'shadow-[0_18px_60px_-30px_rgba(56,189,248,0.55)]',
    btn: 'bg-sky-500 hover:bg-sky-400 text-black',
    chip: 'bg-sky-400/15 text-sky-200 border-sky-400/30',
  },
  rose: {
    border: 'border-rose-400/30',
    glow: 'shadow-[0_18px_60px_-30px_rgba(244,63,94,0.55)]',
    btn: 'bg-rose-500 hover:bg-rose-400 text-white',
    chip: 'bg-rose-400/15 text-rose-200 border-rose-400/30',
  },
  gold: {
    border: 'border-amber-300/50',
    glow: 'shadow-[0_22px_70px_-26px_rgba(245,197,66,0.7)]',
    btn: 'bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-black',
    chip: 'bg-amber-300/15 text-amber-200 border-amber-300/40',
  },
  stone: {
    border: 'border-stone-400/25',
    glow: 'shadow-[0_18px_60px_-30px_rgba(214,211,209,0.35)]',
    btn: 'bg-stone-200 hover:bg-white text-black',
    chip: 'bg-stone-300/10 text-stone-200 border-stone-300/30',
  },
};

export type MobileCta = {
  label: string;
  to?: string;
  href?: string;
};

type MobileSectionCardProps = {
  eyebrow?: string;
  title: string;
  body?: string;
  image: string;
  imageAlt: string;
  imagePosition?: string; // tailwind object-position class
  tone?: MobileTone;
  ctas: MobileCta[];
  /** Aspect ratio of the cropped image banner (e.g. "aspect-[16/9]") */
  imageAspect?: string;
  children?: ReactNode;
};

function CtaButton({ cta, tone }: { cta: MobileCta; tone: MobileTone }) {
  const cls = `inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${TONE[tone].btn}`;
  if (cta.href) {
    return (
      <a href={cta.href} target="_blank" rel="noreferrer" className={cls}>
        {cta.label}
      </a>
    );
  }
  return (
    <Link to={cta.to ?? '/'} className={cls}>
      {cta.label}
    </Link>
  );
}

export function MobileSectionCard({
  eyebrow,
  title,
  body,
  image,
  imageAlt,
  imagePosition = 'object-center',
  tone = 'violet',
  ctas,
  imageAspect = 'aspect-[16/10]',
  children,
}: MobileSectionCardProps) {
  const t = TONE[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-[#0a0414]/90 ${t.border} ${t.glow}`}
    >
      <div className={`relative w-full overflow-hidden ${imageAspect}`}>
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover ${imagePosition}`}
          draggable={false}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0a0414] via-[#0a0414]/70 to-transparent" />
      </div>

      <div className="relative -mt-6 px-4 pb-5">
        {eyebrow && (
          <span
            className={`mb-2 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${t.chip}`}
          >
            {eyebrow}
          </span>
        )}
        <h3 className="text-lg font-bold leading-tight text-white sm:text-xl">{title}</h3>
        {body && (
          <p className="mt-1.5 text-sm leading-relaxed text-white/70">{body}</p>
        )}
        {children}
        {ctas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {ctas.map((c) => (
              <CtaButton key={c.label} cta={c} tone={tone} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

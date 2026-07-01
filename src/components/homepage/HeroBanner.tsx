import { Link } from 'react-router-dom';
import { BarChart3, Flame, Sparkles, Trophy } from 'lucide-react';
import { HOMEPAGE_MEDIA } from './assets';
import { OracleCrest } from './primitives';

/** A floating frosted feature chip that hovers over the hero artwork. */
function FloatChip({
  icon,
  label,
  sub,
  className,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  className: string;
  delay: string;
}) {
  return (
    <div
      className={`absolute z-20 hidden animate-[heroFloat_5s_ease-in-out_infinite] items-center gap-2.5 rounded-2xl border border-white/15 bg-black/50 px-3.5 py-2.5 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl lg:flex ${className}`}
      style={{ animationDelay: delay }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-[#f5c542]">
        {icon}
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-black text-white">{label}</span>
        <span className="block text-[11px] text-white/55">{sub}</span>
      </span>
    </div>
  );
}

/**
 * Hero — a real, native composition. A clean (text-free) Gaffer cutout anchors
 * the right; the headline, live badge, feature chips and CTAs are all live HTML
 * overlaid on a stadium-lit gradient. No baked-text images.
 */
export function HeroBanner() {
  return (
    <section id="top" className="relative mx-auto w-full max-w-[1536px] scroll-mt-28 overflow-hidden">
      {/* one-off keyframes for the floating chips + slow drift */}
      <style>{`
        @keyframes heroFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @keyframes heroGlow { 0%,100% { opacity:.55; } 50% { opacity:.9; } }
      `}</style>

      <div className="relative overflow-hidden border-b border-[#f5c542]/20 md:rounded-b-[1.6rem]">
        {/* stadium atmosphere */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${HOMEPAGE_MEDIA.stadiumBg})` }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_20%_10%,rgba(88,28,135,0.55),transparent_55%),radial-gradient(90%_80%_at_95%_20%,rgba(245,197,66,0.18),transparent_55%),linear-gradient(180deg,rgba(5,2,11,0.55),#05020b_92%)]" />

        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-4 px-4 pb-10 pt-10 md:gap-6 md:px-6 md:pb-12 md:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
          {/* ── Left: live HTML copy ── */}
          <div className="relative z-10 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              The Gaffer is live
            </span>

            <h1 className="mt-4 font-display text-[2.6rem] uppercase leading-[0.9] tracking-tight text-white sm:text-6xl lg:text-[4.4rem]">
              The Gaffer
              <span className="mt-1 block bg-gradient-to-r from-amber-200 via-[#f5c542] to-amber-200 bg-clip-text text-transparent">
                Knows.
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/70 lg:mx-0">
              AI-powered football tips, live form tables and a fantasy league — witty, sharp and
              tracked in the open. All in one £20/month club.
            </p>

            <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_16px_40px_-16px_rgba(245,197,66,1)] transition-all hover:-translate-y-0.5 hover:from-amber-200 hover:to-amber-400"
              >
                <Trophy className="h-4 w-4 fill-current" /> Join the Club
              </Link>
              <Link
                to="/form-tables"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-white transition-all hover:border-[#f5c542]/50 hover:bg-white/[0.08] hover:text-[#f8e7a1]"
              >
                <BarChart3 className="h-4 w-4" /> Explore Today's Tips
              </Link>
            </div>

            {/* trust strip */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] font-semibold text-white/55 lg:justify-start">
              <span className="inline-flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-[#f5c542]" /> Daily value picks</span>
              <span className="inline-flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-emerald-300" /> Live form tables</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-violet-300" /> P&amp;L tracked in the open</span>
            </div>
          </div>

          {/* ── Right: clean Gaffer cutout + floating chips ── */}
          <div className="relative mx-auto w-full max-w-[420px] pb-6 sm:pb-4 lg:max-w-none">
            {/* glow halo behind him */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.55),transparent_68%)] blur-2xl"
              style={{ animation: 'heroGlow 6s ease-in-out infinite' }}
            />
            <img
              src={HOMEPAGE_MEDIA.gafferPortrait}
              alt="The Gaffer — Footy Oracle"
              className="relative z-10 mx-auto block h-auto w-full max-w-[460px] select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)] lg:max-w-[560px]"
              loading="eager"
              decoding="async"
              draggable={false}
            />

            <FloatChip
              icon={<Flame className="h-4 w-4" />}
              label="Value board"
              sub="Fresh picks at 3am"
              className="left-0 top-6"
              delay="0s"
            />
            <FloatChip
              icon={<Trophy className="h-4 w-4" />}
              label="Fantasy League"
              sub="Beat the Gaffer"
              className="bottom-24 right-0"
              delay="1.4s"
            />
            <div className="absolute bottom-1 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-[#f5c542]/40 bg-black/55 px-4 py-2.5 shadow-[0_18px_50px_-24px_rgba(245,197,66,0.9)] backdrop-blur-xl sm:flex">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-[#f5c542]/50 bg-[#07000f] p-1">
                <OracleCrest className="h-full w-full" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-black text-white">Trust the Gaffer</span>
                <span className="block text-[11px] text-white/55">Witty. Fun. Football.</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { FINAL_CTA_FEATURES } from './content';
import { Icon } from './icons';

/**
 * Final CTA — premium gold membership banner: a floodlit-stadium hero band with
 * the Gaffer and an £8.99/month badge, 3D feature tiles, then the join buttons.
 */
export function FinalCallToActionBanner() {
  return (
    <section id="join" className="relative overflow-hidden rounded-[1.6rem] border border-[#f5c542]/35 bg-[#0a0613] shadow-[0_30px_90px_-42px_rgba(245,197,66,0.65)]">
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />

      {/* ── hero band: stadium photo + the Gaffer + £8.99 badge ── */}
      <div className="relative min-h-[230px] overflow-hidden md:min-h-[270px]">
        <img
          src="/images/backgrounds/bg-stadium.jpg"
          alt=""
          loading="lazy"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[center_32%] opacity-60"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0613] via-[#0a0613]/70 to-[#0a0613]/25" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(245,197,66,0.28),transparent_55%)]" />

        {/* the Gaffer, bleeding from the bottom-right (visible on mobile too) */}
        <img
          src="/images/gaffer/gaffer-smart.png"
          alt="The Gaffer"
          loading="lazy"
          draggable={false}
          className="pointer-events-none absolute -bottom-1 right-0 z-[1] h-[104%] w-auto max-w-[42%] select-none object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
        />

        <div className="relative z-[2] max-w-[62%] p-5 md:p-8">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#f8e7a1]">
            <Clock className="h-3 w-3" /> Coming Soon
          </span>
          <h2 className="mt-3 font-display text-3xl uppercase leading-[0.9] tracking-tight text-white text-extrude md:text-5xl">
            Ready to bet{' '}
            <span className="bg-gradient-to-r from-[#ffe487] to-[#f5c542] bg-clip-text text-transparent">smarter?</span>
          </h2>
          <div className="mt-3.5 inline-flex items-baseline gap-1 rounded-full border border-[#f5c542]/40 bg-black/40 px-3.5 py-1.5 backdrop-blur-sm">
            <span className="font-display text-2xl leading-none text-[#f8e7a1]">£8.99</span>
            <span className="text-xs font-bold text-white/60">/month</span>
          </div>
        </div>
      </div>

      {/* ── body: pitch + features + CTAs ── */}
      <div className="relative p-5 pt-4 md:p-8 md:pt-5">
        <p className="max-w-lg text-sm leading-relaxed text-white/65">
          Daily tips, live form tables, the fantasy league, prizes and the community — everything in one membership.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {FINAL_CTA_FEATURES.map((f) => (
            <div key={f.title} className="card-3d flex items-center gap-2.5 rounded-xl p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#f5c542]/35 bg-[#f5c542]/12 text-[#f5c542]">
                <Icon name={f.icon} className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold leading-tight text-white/85">{f.title}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <span className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/12 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-[#f8e7a1]">
            <Clock className="h-4 w-4" /> Membership Opens 1st August
          </span>
          <Link
            to="/form-tables"
            className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white/80 transition-colors hover:bg-white/[0.06]"
          >
            Explore Today's Tips <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

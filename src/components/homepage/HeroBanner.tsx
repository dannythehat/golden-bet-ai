import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';
import { NAV_LINKS } from './content';
import heroBannerClean from '@/assets/homepage/hero-banner-clean.png';
import footyOracleLogo from '@/assets/footy-oracle-logo.webp';

export function HeroBanner() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section id="top" className="relative mx-auto w-full max-w-[1536px]">
      {/* Mobile hero — readable HTML composition */}
      <div className="md:hidden px-3 pt-6 pb-2">
        <div className="relative overflow-hidden rounded-2xl border border-amber-300/30 bg-gradient-to-b from-[#1a0a2e] via-[#0a0414] to-[#0a0414] shadow-[0_30px_80px_-30px_rgba(245,197,66,0.45)]">
          {/* Top bar: login / join */}
          <div className="flex items-center justify-between px-4 pt-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300/80">
              Footy Oracle
            </span>
            <div className="flex gap-2">
              <Link
                to="/auth"
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white/90 hover:bg-white/10"
              >
                Login
              </Link>
              <Link
                to="/pricing"
                className="rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold text-black hover:bg-amber-300"
              >
                Join
              </Link>
            </div>
          </div>

          {/* Gaffer image — full hero artwork fits the mobile box */}
          <div className="relative mt-3 w-full overflow-hidden bg-[#0a0414]">
            <img
              src={HOMEPAGE_APPROVED_ASSETS.heroBanner}
              alt="The Gaffer — Footy Oracle"
              className="block h-auto w-full object-contain"
              loading="eager"
              decoding="async"
              draggable={false}
            />
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0a0414] via-[#0a0414]/80 to-transparent" />
          </div>

          {/* Headline + CTAs */}
          <div className="relative -mt-12 px-4 pb-5 text-center">
            <h1 className="text-2xl font-extrabold leading-tight text-white">
              The Gaffer{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
                Knows
              </span>
            </h1>
            <p className="mt-2 text-sm leading-snug text-white/75">
              AI-powered football tips, form tables and fantasy — all in one club.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-5 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/30"
              >
                Join the Club
              </Link>
              <Link
                to="/predictions"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Explore Today's Tips
              </Link>
            </div>
            <div className="mt-3 flex justify-center gap-4 text-[12px]">
              <Link to="/form-tables" className="text-emerald-300 underline-offset-4 hover:underline">
                Form Tables
              </Link>
              <span className="text-white/30">·</span>
              <Link to="/fantasy-league" className="text-violet-300 underline-offset-4 hover:underline">
                Fantasy League
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop hero — original artwork with hotspots */}
      <div className="hidden md:block">
        <ArtworkCard
          src={HOMEPAGE_APPROVED_ASSETS.heroBanner}
          alt="Footy Oracle homepage hero with The Gaffer"
          priority
          className="rounded-none border-x-0 border-t-0 md:rounded-b-[14px]"
          overlayLinks={[
            { label: 'Login', to: '/auth', className: 'left-[77%] top-[2.5%] h-[5%] w-[8%]' },
            { label: 'Join the Club', to: '/pricing', className: 'left-[86%] top-[2.5%] h-[5%] w-[12%]' },
            { label: 'Join the Club', to: '/pricing', className: 'left-[3.5%] top-[70.4%] h-[7%] w-[16%]' },
            { label: "Explore Today's Tips", to: '/predictions', className: 'left-[21%] top-[70.4%] h-[7%] w-[20%]' },
            { label: 'Form Tables', to: '/form-tables', className: 'left-[28%] top-[84.5%] h-[9%] w-[11%]' },
            { label: 'Fantasy League', to: '/fantasy-league', className: 'left-[56%] top-[84.5%] h-[9%] w-[12%]' },
          ]}
        />
      </div>
    </section>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Facebook, Send } from 'lucide-react';
import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';
import { NAV_LINKS, SOCIAL_LINKS } from './content';
import heroBannerClean from '@/assets/homepage/hero-banner-clean.png';
import footyOracleLogo from '@/assets/footy-oracle-logo-v2.png.asset.json';

export function HeroBanner() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section id="top" className="relative mx-auto w-full max-w-[1536px]">
      {/* Mobile hero — readable HTML composition */}
      <div className="md:hidden px-3 pt-6 pb-2">
        <div className="relative overflow-hidden rounded-2xl border border-amber-300/30 bg-gradient-to-b from-[#1a0a2e] via-[#0a0414] to-[#0a0414] shadow-[0_30px_80px_-30px_rgba(245,197,66,0.45)]">
          {/* Top nav bar: big logo + socials + menu + auth buttons */}
          <div className="relative z-10 flex items-center justify-between gap-2 border-b border-amber-300/15 bg-[#07000f]/80 px-3 py-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex min-w-0 items-center" aria-label="Footy Oracle home">
                <img
                  src={footyOracleLogo.url}
                  alt="Footy Oracle — Tips. Stats. Success."
                  width={220}
                  height={220}
                  className="h-20 w-auto object-contain drop-shadow-[0_4px_20px_rgba(139,92,246,0.45)]"
                />
              </Link>

              <div className="flex items-center gap-1.5">
                <a
                  href={SOCIAL_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Footy Oracle on Facebook"
                  className="grid h-7 w-7 place-items-center rounded-full border border-[#1877F2]/50 text-[#1877F2] hover:bg-[#1877F2]/15 hover:text-[#1877F2]"
                >
                  <Facebook className="h-3.5 w-3.5" />
                </a>
                <a
                  href={SOCIAL_LINKS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Footy Oracle on Telegram"
                  className="grid h-7 w-7 place-items-center rounded-full border border-[#229ED9]/50 text-[#229ED9] hover:bg-[#229ED9]/15 hover:text-[#229ED9]"
                >
                  <Send className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Link
                to="/auth"
                className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-white/90 hover:bg-white/10"
              >
                Login
              </Link>
              <Link
                to="/pricing"
                className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-black hover:bg-amber-300"
              >
                Join
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                className="grid h-8 w-8 place-items-center rounded-full border border-amber-300/40 text-amber-200 hover:bg-amber-300/10"
              >
                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Slide-down nav menu */}
          {menuOpen && (
            <div className="relative z-10 grid grid-cols-2 gap-1.5 border-b border-amber-300/15 bg-[#07000f]/90 px-3 py-3">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-white/85 hover:border-amber-300/50 hover:text-amber-200"
                >
                  {l.label}
                </a>
              ))}
            </div>
          )}

          {/* Gaffer image — cleaned hero artwork (nav strip removed) */}
          <div className="relative w-full overflow-hidden bg-[#0a0414]">
            <img
              src={heroBannerClean}
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

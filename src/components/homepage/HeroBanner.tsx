import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Facebook, Send, ArrowRight, Sparkles } from 'lucide-react';
import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';
import { NAV_LINKS, SOCIAL_LINKS } from './content';
import footyOracleLogo from '@/assets/footy-oracle-logo-v2.png.asset.json';
import gafferPortrait from '@/assets/homepage/gaffer-hero-portrait.png.asset.json';
import stadiumBg from '@/assets/homepage/stadium-bg.jpg.asset.json';

export function HeroBanner() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section id="top" className="relative mx-auto w-full max-w-[1536px]">
      {/* ───────────────── Mobile hero ─────────────────
         One hero, one set of CTAs. Stadium plate + Gaffer cut-out + real
         HTML headline so nothing is baked into a PNG. */}
      <div className="md:hidden px-3 pt-4 pb-2">
        <div className="relative overflow-hidden rounded-[1.4rem] border border-white/10 shadow-[0_30px_80px_-35px_rgba(139,92,246,0.7)]">
          {/* Slim nav */}
          <div className="relative z-30 flex items-center justify-between gap-2 border-b border-white/10 bg-[#07000f]/85 px-3 py-2.5 backdrop-blur">
            <Link to="/" className="flex min-w-0 items-center" aria-label="Footy Oracle home">
              <img
                src={footyOracleLogo.url}
                alt="Footy Oracle — Tips. Stats. Success."
                width={180}
                height={180}
                className="h-12 w-auto object-contain drop-shadow-[0_4px_18px_rgba(139,92,246,0.55)]"
              />
            </Link>
            <div className="flex items-center gap-1.5">
              <Link
                to="/auth"
                className="rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold text-white/90 hover:bg-white/10"
              >
                Login
              </Link>
              <Link
                to="/pricing"
                className="rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-3 py-1.5 text-[11px] font-bold text-[#1a0a26] shadow-[0_8px_24px_-8px_rgba(245,197,66,0.9)]"
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
            <div className="relative z-30 grid grid-cols-2 gap-1.5 border-b border-white/10 bg-[#07000f]/95 px-3 py-3">
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
              <div className="col-span-2 mt-1 flex items-center justify-center gap-2 pt-1">
                <a
                  href={SOCIAL_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Footy Oracle on Facebook"
                  className="grid h-8 w-8 place-items-center rounded-full border border-[#1877F2]/50 text-[#1877F2] hover:bg-[#1877F2]/15"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href={SOCIAL_LINKS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Footy Oracle on Telegram"
                  className="grid h-8 w-8 place-items-center rounded-full border border-[#229ED9]/50 text-[#229ED9] hover:bg-[#229ED9]/15"
                >
                  <Send className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Stage: stadium plate + atmosphere + Gaffer */}
          <div className="relative">
            {/* Background plate */}
            <div className="absolute inset-0">
              <img
                src={stadiumBg.url}
                alt=""
                aria-hidden
                className="h-full w-full object-cover"
                fetchPriority="high"
              />
              {/* Atmosphere */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_45%,rgba(139,92,246,0.55),transparent_60%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,2,11,0.55)_0%,rgba(5,2,11,0.4)_45%,rgba(5,2,11,0.97)_100%)]" />
            </div>

            {/* Gaffer cut-out — anchored right, generous height */}
            <div className="pointer-events-none relative ml-auto w-[78%] max-w-[360px]">
              <div className="absolute -inset-6 rounded-full bg-violet-500/30 blur-3xl" />
              <img
                src={gafferPortrait.url}
                alt="The Gaffer, ready with today's football tips"
                className="relative z-10 block h-auto w-full object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.65)]"
                width={1024}
                height={1024}
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </div>

            {/* Headline + CTAs overlaid at bottom */}
            <div className="relative z-20 -mt-4 px-5 pb-6 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200 backdrop-blur-sm">
                <Sparkles className="h-3 w-3" /> The Gaffer Knows
              </span>

              <h1 className="mt-3 font-display text-[2.15rem] font-black uppercase leading-[0.95] tracking-tight text-white drop-shadow-[0_6px_30px_rgba(0,0,0,0.7)]">
                Witty. Fun.
                <br />
                Football.
                <br />
                <span className="bg-gradient-to-r from-fuchsia-400 via-violet-300 to-amber-300 bg-clip-text text-transparent">
                  Tips that hit.
                </span>
              </h1>

              <p className="mt-3 max-w-[28ch] text-[13.5px] leading-relaxed text-white/80">
                Daily articles, sharp tips, fantasy league and weekly prizes —
                all powered by <em className="not-italic text-amber-300">The Gaffer.</em>
              </p>

              <div className="mt-5 flex flex-col gap-2.5">
                <Link
                  to="/pricing"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 px-5 py-3.5 text-[14px] font-black uppercase tracking-wide text-[#1a0a26] shadow-[0_18px_45px_-15px_rgba(250,204,21,0.95)]"
                >
                  Join the Club
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/predictions"
                  className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-5 py-3.5 text-[13px] font-bold uppercase tracking-wide text-white backdrop-blur-md"
                >
                  Explore Today's Tips
                </Link>
              </div>

              <div className="mt-4 flex justify-center gap-4 text-[12px]">
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

import { useState } from 'react';
import { Menu, X, Facebook, Instagram, Youtube, Send } from 'lucide-react';
import { OracleCrest, OracleWordmark } from './primitives';
import { NAV_LINKS } from './content';

/** Sticky top navigation — broadcast-grade club header matching the approved mock. */
export function HomepageNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05010a]/95 backdrop-blur-xl">
      {/* Top utility ribbon — always visible */}
      <div className="border-b border-white/5 bg-gradient-to-r from-violet-950/40 via-[#05010a] to-amber-950/30">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-3 px-4 py-1.5 md:px-6">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/90">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
            Live · The Gaffer is in
          </span>
          <div className="flex items-center gap-2 text-white/55">
            <a href="https://facebook.com" aria-label="Facebook" className="transition-colors hover:text-violet-300"><Facebook className="h-3.5 w-3.5" /></a>
            <a href="https://t.me" aria-label="Telegram" className="transition-colors hover:text-violet-300"><Send className="h-3.5 w-3.5" /></a>
            <a href="https://instagram.com" aria-label="Instagram" className="transition-colors hover:text-violet-300"><Instagram className="h-3.5 w-3.5" /></a>
            <a href="https://youtube.com" aria-label="YouTube" className="transition-colors hover:text-violet-300"><Youtube className="h-3.5 w-3.5" /></a>
          </div>
        </div>
      </div>

      {/* Gold accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-violet-500/0 via-amber-400/80 to-violet-500/0" />

      <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
        {/* Brand */}
        <a href="#top" className="flex shrink-0 items-center gap-2.5 md:gap-3">
          <OracleCrest className="h-10 w-10 md:h-12 md:w-12" />
          <OracleWordmark />
        </a>

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center justify-center gap-6 text-[13px] font-black uppercase tracking-wide text-white/80 xl:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="relative transition-colors hover:text-white after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-0 after:bg-gradient-to-r after:from-violet-400 after:to-amber-400 after:transition-all hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {/* Socials — desktop only */}
          <div className="hidden items-center gap-2 pr-2 text-white/60 lg:flex">
            <a href="https://facebook.com" aria-label="Facebook" className="grid h-8 w-8 place-items-center rounded-full border border-white/10 transition-all hover:border-violet-400/60 hover:text-violet-300">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="https://t.me" aria-label="Telegram" className="grid h-8 w-8 place-items-center rounded-full border border-white/10 transition-all hover:border-violet-400/60 hover:text-violet-300">
              <Send className="h-4 w-4" />
            </a>
            <a href="https://instagram.com" aria-label="Instagram" className="grid h-8 w-8 place-items-center rounded-full border border-white/10 transition-all hover:border-violet-400/60 hover:text-violet-300">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="https://youtube.com" aria-label="YouTube" className="grid h-8 w-8 place-items-center rounded-full border border-white/10 transition-all hover:border-violet-400/60 hover:text-violet-300">
              <Youtube className="h-4 w-4" />
            </a>
          </div>

          <a
            href="/auth"
            className="hidden rounded-xl border border-white/25 px-5 py-2 text-[13px] font-black uppercase tracking-wide text-white transition-all hover:border-violet-400/60 hover:bg-white/5 sm:inline-flex"
          >
            Login
          </a>

          <a
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 px-4 py-2 text-[12px] font-black uppercase tracking-wide text-[#1a0a26] shadow-[0_10px_30px_-12px_rgba(250,204,21,0.95)] transition-all hover:-translate-y-0.5 hover:shadow-[0_15px_35px_-10px_rgba(250,204,21,1)] md:px-5 md:text-[13px]"
          >
            Join the Club
          </a>

          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/[0.04] text-white transition-colors hover:border-violet-400/50 xl:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="border-t border-white/10 bg-[#0a0513] px-4 py-3 xl:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-[13px] font-black uppercase tracking-wide text-white/80 transition-colors hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 flex items-center gap-3 border-t border-white/10 pt-3">
              <a href="/auth" className="flex-1 rounded-xl border border-white/25 px-4 py-2 text-center text-[12px] font-black uppercase tracking-wide text-white">
                Login
              </a>
              <div className="flex items-center gap-1.5 text-white/60">
                <a href="https://facebook.com" aria-label="Facebook" className="grid h-9 w-9 place-items-center rounded-full border border-white/10"><Facebook className="h-4 w-4" /></a>
                <a href="https://t.me" aria-label="Telegram" className="grid h-9 w-9 place-items-center rounded-full border border-white/10"><Send className="h-4 w-4" /></a>
                <a href="https://instagram.com" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-full border border-white/10"><Instagram className="h-4 w-4" /></a>
                <a href="https://youtube.com" aria-label="YouTube" className="grid h-9 w-9 place-items-center rounded-full border border-white/10"><Youtube className="h-4 w-4" /></a>
              </div>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

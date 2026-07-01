import { useState } from 'react';
import { Menu, X, Facebook, Instagram, Youtube, Send, LockKeyhole, Trophy, Zap } from 'lucide-react';
import { OracleCrest, OracleWordmark } from './primitives';
import { NAV_LINKS } from './content';

/** Sticky top navigation — production club header. */
export function HomepageNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#090013] shadow-[0_16px_50px_-28px_rgba(0,0,0,0.95)]">
      <div className="bg-[#f5c542] text-[#16051f]">
        <div className="mx-auto flex h-8 w-full max-w-[1480px] items-center justify-between gap-3 px-3 md:px-6">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em]">
            <Zap className="h-3.5 w-3.5 fill-current" />
            The Gaffer is live
          </span>
          <span className="hidden text-[10px] font-black uppercase tracking-[0.22em] sm:inline">
            Footy Oracle Club
          </span>
          <div className="flex items-center gap-2">
            <a href="https://facebook.com" aria-label="Facebook" className="grid h-6 w-6 place-items-center rounded-full bg-[#16051f]/10 transition-colors hover:bg-[#16051f]/20"><Facebook className="h-3.5 w-3.5" /></a>
            <a href="https://t.me" aria-label="Telegram" className="grid h-6 w-6 place-items-center rounded-full bg-[#16051f]/10 transition-colors hover:bg-[#16051f]/20"><Send className="h-3.5 w-3.5" /></a>
            <a href="https://instagram.com" aria-label="Instagram" className="grid h-6 w-6 place-items-center rounded-full bg-[#16051f]/10 transition-colors hover:bg-[#16051f]/20"><Instagram className="h-3.5 w-3.5" /></a>
            <a href="https://youtube.com" aria-label="YouTube" className="hidden h-6 w-6 place-items-center rounded-full bg-[#16051f]/10 transition-colors hover:bg-[#16051f]/20 sm:grid"><Youtube className="h-3.5 w-3.5" /></a>
          </div>
        </div>
      </div>

      <div className="border-b border-[#f5c542]/25 bg-[#130321]">
        <div className="mx-auto grid min-h-[82px] w-full max-w-[1480px] grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 md:min-h-[104px] md:px-6 md:py-4">
          <a href="#top" aria-label="Footy Oracle home" className="group flex min-w-0 items-center gap-2.5 md:gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-[#f5c542] bg-[#07000f] p-1 shadow-[0_0_28px_rgba(245,197,66,0.22)] md:h-20 md:w-20">
              <OracleCrest className="h-full w-full transition-transform duration-300 group-hover:scale-105" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <OracleWordmark />
            </span>
            <span className="block min-w-0 sm:hidden">
              <span className="block text-[18px] font-black uppercase leading-none tracking-[0.02em] text-[#f8e7a1]">Footy</span>
              <span className="block text-[18px] font-black uppercase leading-none tracking-[0.02em] text-white">Oracle</span>
            </span>
          </a>

          <nav className="hidden items-center justify-center gap-1 rounded-full border border-white/10 bg-[#08000f]/70 p-1 text-[12px] font-black uppercase tracking-wide text-white/75 xl:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="rounded-full px-4 py-2.5 transition-all hover:bg-[#f5c542] hover:text-[#16051f]"
            >
              {l.label}
            </a>
          ))}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-2 md:gap-3">
            <a
              href="/auth"
              className="hidden h-11 items-center gap-2 rounded-full border border-[#f5c542]/45 px-4 text-[12px] font-black uppercase tracking-wide text-[#f8e7a1] transition-all hover:bg-[#f5c542] hover:text-[#16051f] sm:inline-flex"
            >
              <LockKeyhole className="h-4 w-4" />
              Login
            </a>

            <a
              href="/pricing"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-[#f5c542] px-4 text-[12px] font-black uppercase tracking-wide text-[#16051f] shadow-[0_12px_32px_-14px_rgba(245,197,66,1)] transition-all hover:-translate-y-0.5 hover:bg-[#ffe487] md:px-5"
            >
              <Trophy className="h-4 w-4 fill-current" />
              <span className="hidden min-[370px]:inline">Join</span>
            </a>

            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
              className="grid h-11 w-11 place-items-center rounded-full border border-[#f5c542]/45 bg-[#07000f] text-[#f8e7a1] transition-colors hover:bg-[#f5c542] hover:text-[#16051f] xl:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />

      {open && (
        <nav className="border-b border-[#f5c542]/20 bg-[#07000f] px-3 py-3 shadow-[0_20px_45px_-22px_rgba(0,0,0,0.95)] xl:hidden">
          <div className="mx-auto grid max-w-[720px] grid-cols-2 gap-2">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-[12px] font-black uppercase tracking-wide text-white/85 transition-colors hover:border-[#f5c542]/50 hover:text-[#f8e7a1]"
              >
                {l.label}
              </a>
            ))}
            <div className="col-span-2 mt-1 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
              <a
                href="/auth"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#f5c542]/40 px-4 py-3 text-center text-[12px] font-black uppercase tracking-wide text-[#f8e7a1]"
              >
                <LockKeyhole className="h-4 w-4" /> Login
              </a>
              <a
                href="/pricing"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f5c542] px-4 py-3 text-center text-[12px] font-black uppercase tracking-wide text-[#16051f] shadow-[0_12px_32px_-14px_rgba(245,197,66,1)]"
              >
                <Trophy className="h-4 w-4 fill-current" /> Join
              </a>
            </div>
            <div className="col-span-2 mt-1 flex items-center justify-center gap-2 text-[#f8e7a1]">
              <a href="https://facebook.com" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full bg-[#f5c542]/10"><Facebook className="h-4 w-4" /></a>
              <a href="https://t.me" aria-label="Telegram" className="grid h-10 w-10 place-items-center rounded-full bg-[#f5c542]/10"><Send className="h-4 w-4" /></a>
              <a href="https://instagram.com" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full bg-[#f5c542]/10"><Instagram className="h-4 w-4" /></a>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

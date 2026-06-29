import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { OracleCrest, OracleWordmark } from './primitives';
import { NAV_LINKS } from './content';

/** Sticky top navigation for the Club homepage. */
export function HomepageNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0513]/85 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <OracleCrest className="h-10 w-10" />
          <OracleWordmark />
        </a>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-white/70 xl:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.label} href={l.href} className="transition-colors hover:text-white">{l.label}</a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href="/auth" className="hidden rounded-lg border border-white/20 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/5 sm:inline-flex">
            Login
          </a>
          <a href="/pricing" className="rounded-lg bg-gradient-to-r from-violet-500 to-purple-700 px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition-transform hover:scale-[1.03]">
            Join the Club
          </a>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 text-white xl:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-white/10 bg-[#0a0513] px-4 py-3 xl:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/5"
              >
                {l.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

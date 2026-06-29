import { ChevronRight, Facebook, Send, Instagram, Youtube, Heart, ShieldCheck, Trophy, Star } from 'lucide-react';
import { OracleCrest } from './primitives';
import { FOOTER_COLUMNS, SOCIAL_LINKS } from './content';

const SOCIALS = [
  { Icon: Facebook, href: SOCIAL_LINKS.facebook, label: 'Facebook' },
  { Icon: Send, href: SOCIAL_LINKS.telegram, label: 'Telegram' },
  { Icon: Instagram, href: SOCIAL_LINKS.instagram, label: 'Instagram' },
  { Icon: Youtube, href: SOCIAL_LINKS.youtube, label: 'YouTube' },
];

/** Premium multi-column footer. Navigation + socials are data-driven. */
export function FooterNavigation() {
  return (
    <footer className="rounded-[1.75rem] border border-purple-500/25 bg-[#0a0513]/80 p-6 md:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_repeat(4,0.8fr)_1.1fr]">
        {/* Brand */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <OracleCrest className="h-12 w-12" />
            <span className="leading-none">
              <span className="block font-display text-2xl tracking-wide">
                <span className="text-white">FOOTY </span><span className="text-violet-400">ORACLE</span>
              </span>
              <span className="block font-hand text-base font-bold text-gold">The Gaffer knows.</span>
            </span>
          </div>
          <p className="max-w-xs text-sm text-white/55">
            The home of football tips, statistics, fantasy football, community banter and unforgettable football moments.
          </p>
        </div>

        {/* Nav columns */}
        {FOOTER_COLUMNS.map((col) => (
          <nav key={col.heading} className="space-y-3">
            <h3 className="border-b border-violet-500/20 pb-2 font-display text-sm tracking-wide text-violet-300">{col.heading.toUpperCase()}</h3>
            <ul className="space-y-2">
              {col.links.map((l) => (
                <li key={l}>
                  <a href="#" className="group flex items-center justify-between text-sm text-white/65 hover:text-white">
                    {l} <ChevronRight className="h-3.5 w-3.5 text-white/30 group-hover:text-violet-300" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {/* Follow */}
        <div className="space-y-3">
          <h3 className="border-b border-violet-500/20 pb-2 font-display text-sm tracking-wide text-violet-300">FOLLOW THE GAFFER</h3>
          <div className="flex gap-2">
            {SOCIALS.map(({ Icon, href, label }) => (
              <a key={label} href={href} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-violet-400/30 text-violet-300 transition-colors hover:bg-violet-500/15">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-5 text-sm text-white/50 md:flex-row">
        <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-violet-400" /> © 2025 Footy Oracle Club. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> 100% Secure</span>
          <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4" /> Trusted Tips</span>
          <span className="flex items-center gap-1.5"><Star className="h-4 w-4" /> Since Day One</span>
        </div>
        <span className="font-hand text-xl text-pink-400">The Gaffer knows. Do you?</span>
      </div>
    </footer>
  );
}

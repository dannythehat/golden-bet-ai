import { Link } from 'react-router-dom';
import {
  Newspaper, Star, BarChart3, Trophy, Shirt, Users, ChevronRight,
} from 'lucide-react';

const HERO_SCENE = '/images/hero-gaffer-scene.jpg';

/** The six pillars of the club — real cards, each links into the site. */
const FEATURES: { icon: typeof Newspaper; title: string; sub: string; to: string }[] = [
  { icon: Newspaper, title: 'Daily Articles', sub: 'Fresh reads, bold takes and in-depth analysis every single day.', to: '/blog' },
  { icon: Star, title: 'Top Tips', sub: 'Sharp picks from The Gaffer to give you the winning edge.', to: '/form-tables' },
  { icon: BarChart3, title: 'Form Tables', sub: 'Live form, stats and trends to track every big move.', to: '/form-tables' },
  { icon: Trophy, title: 'Weekly Prizes', sub: 'Climb the leaderboard and win exclusive weekly prizes.', to: '/pricing' },
  { icon: Shirt, title: 'Fantasy League', sub: 'Build your squad, compete with mates and own the bragging rights.', to: '/fantasy-league' },
  { icon: Users, title: 'Community', sub: 'Join a passionate community that lives for football.', to: '/community' },
];

/**
 * Hero — the club's front door. A real, interactive section (not a screenshot):
 * the cinematic Gaffer scene is the artwork, and the badge, headline, copy,
 * buttons and the six feature cards are all live HTML/links.
 *
 * Desktop: scene sits right, copy overlays left, cards along the foot.
 * Mobile: scene is a clean banner up top, then copy, then cards — so the
 * Gaffer is always the hero and never a dark, cropped strip behind the text.
 */
export function HeroBanner() {
  return (
    <section id="top" className="relative mx-auto w-full max-w-[1536px] scroll-mt-28">
      <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 shadow-[0_0_60px_-26px_rgba(139,92,246,0.85)]">
        {/* DESKTOP scene — right-anchored backdrop with the Gaffer bright on the right */}
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-cover bg-right md:block"
          style={{ backgroundImage: `url(${HERO_SCENE})` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 hidden md:block md:bg-[linear-gradient(to_right,#0a0414_0%,rgba(10,4,20,0.92)_20%,rgba(10,4,20,0.45)_44%,rgba(10,4,20,0.05)_62%,transparent_80%)]"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 hidden h-2/5 bg-gradient-to-t from-[#0a0414] via-[#0a0414]/40 to-transparent md:block" />

        {/* DESKTOP — The Gaffer's signature, purple, written sideways up the scene */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-[13%] top-1/2 z-[1] hidden -translate-y-1/2 rotate-[-62deg] font-['Dancing_Script'] text-7xl font-semibold leading-none text-violet-400 [text-shadow:0_2px_16px_rgba(139,92,246,0.6)] md:block lg:text-8xl"
        >
          The Gaffer
        </span>

        <div className="relative flex flex-col md:min-h-[660px] md:justify-between md:gap-8">
          {/* MOBILE scene banner — the Gaffer shown clearly up top, fading into the copy */}
          <div
            aria-hidden
            className="relative h-[280px] w-full bg-cover bg-[position:44%_28%] sm:h-[360px] md:hidden"
            style={{ backgroundImage: `url(${HERO_SCENE})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0414] via-[#0a0414]/25 to-transparent" />
            {/* MOBILE — The Gaffer's signature, purple, written sideways up the scene */}
            <span
              aria-hidden
              className="pointer-events-none absolute right-[14%] top-1/2 -translate-y-1/2 rotate-[-62deg] font-['Dancing_Script'] text-5xl font-semibold leading-none text-violet-400 [text-shadow:0_2px_14px_rgba(139,92,246,0.65)] sm:text-6xl"
            >
              The Gaffer
            </span>
          </div>

          {/* copy */}
          <div className="max-w-xl px-5 pt-2 sm:px-8 md:p-10 md:pt-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#f8e7a1]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f5c542] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f5c542]" />
              </span>
              The Footy Oracle Club
            </span>

            <h1 className="mt-4 font-display text-5xl uppercase italic leading-[0.86] tracking-tight text-white antialiased sm:text-6xl lg:text-7xl">
              Witty. Fun.
              <span className="mt-1 block bg-gradient-to-r from-violet-400 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
                Football.
              </span>
            </h1>

            <p className="mt-5 text-base font-bold text-white/90 sm:text-lg">
              Daily articles. Sharp picks. Fantasy league. Weekly prizes.
            </p>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65 sm:text-[15px]">
              Footy Oracle is more than a website — it's a football club for fans who want an edge.
              Led by <span className="font-bold text-[#f8e7a1]">The Gaffer</span>, we bring you sharp
              insights, honest banter and a community that lives and breathes football.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_18px_44px_-18px_rgba(139,92,246,1)] transition-all hover:-translate-y-0.5 hover:from-violet-400 hover:to-fuchsia-400"
              >
                Join the Club <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to="/form-tables"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#f5c542]/55 bg-[#f5c542]/[0.06] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[#f8e7a1] backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-[#f5c542]/15"
              >
                Explore Today's Tips <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* feature cards — the six pillars, real links */}
          <div className="grid grid-cols-2 gap-2.5 px-5 pb-5 pt-6 sm:grid-cols-3 sm:px-8 sm:pb-8 md:grid-cols-6 md:px-10 md:pb-10 md:pt-0">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                to={f.to}
                className="group rounded-2xl border border-white/10 bg-[#0b0518]/70 p-3.5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-[#0b0518]/90"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-violet-400/25 bg-violet-500/15 text-violet-200 transition-colors group-hover:text-[#f8e7a1]">
                  <f.icon className="h-4 w-4" />
                </span>
                <div className="mt-2.5 text-sm font-black text-white">{f.title}</div>
                <p className="mt-1 text-[11px] leading-snug text-white/55">{f.sub}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

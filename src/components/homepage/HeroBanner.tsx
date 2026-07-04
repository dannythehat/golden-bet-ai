import { Link } from 'react-router-dom';
import { ChevronRight, LineChart, MessagesSquare, Trophy, Sparkles } from 'lucide-react';

/** Beautiful "Fantasy Football — Coming Soon" badge overlaid on the hero scene. */
function FantasyComingSoonBadge({ className = '' }: { className?: string }) {
  return (
    <div className={`group relative ${className}`}>
      {/* soft outer glow */}
      <div aria-hidden className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-500/40 via-fuchsia-500/30 to-amber-400/25 blur-xl opacity-80" />
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#1a0b2e]/95 via-[#2a1147]/95 to-[#3a1a5e]/95 p-[1.5px] shadow-[0_18px_50px_-16px_rgba(139,92,246,0.9)] backdrop-blur-xl">
        <div className="relative rounded-[calc(1rem-1.5px)] bg-gradient-to-br from-[#160a24]/95 via-[#1e0d34]/95 to-[#2a1147]/95 px-4 py-3 sm:px-5 sm:py-3.5">
          {/* top sheen */}
          <span aria-hidden className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          {/* corner spark */}
          <Sparkles aria-hidden className="absolute right-2 top-2 h-3.5 w-3.5 text-amber-300/80" />

          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(245,197,66,0.9)]" />
            </span>
            <div className="min-w-0">
              <div className="text-[9.5px] font-black uppercase tracking-[0.28em] text-amber-300/90">Coming Soon</div>
              <div className="mt-0.5 bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text font-display text-base font-black italic uppercase leading-none tracking-tight text-transparent sm:text-lg">
                Fantasy Football
              </div>
              <div className="mt-1 text-[10px] font-semibold text-white/60">Pick your XI · Weekly prizes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The three pillars — what The Footy Oracle is about, said in one glance. */
const PILLARS: { icon: typeof Trophy; title: string; body: string }[] = [
  { icon: LineChart, title: 'Real Edges', body: 'Form-first picks, tracked and settled. No fluff.' },
  { icon: Trophy,    title: 'Honest P&L', body: 'Every £10 bet logged — wins, losses, all of it.' },
  { icon: MessagesSquare, title: "The Gaffer's Voice", body: 'Witty, sharp, no jargon. Football how it should sound.' },
];

const HERO_SCENE = '/images/hero-gaffer-scene.jpg';

/** The six pillars of the club — designed thumbnails, each links into the site. */
const FEATURES: { img: string; title: string; to: string }[] = [
  { img: '/images/hero-features/daily-articles.jpg', title: 'Daily Articles', to: '/blog' },
  { img: '/images/hero-features/tips-form.jpg', title: 'Tips Based on Form', to: '/form-tables' },
  { img: '/images/hero-features/form-tables.jpg', title: 'Form Tables', to: '/form-tables' },
  { img: '/images/hero-features/weekly-prizes.jpg', title: 'Weekly Prizes', to: '/pricing' },
  { img: '/images/hero-features/fantasy-football.jpg', title: 'Fantasy Football', to: '/fantasy-league' },
  { img: '/images/hero-features/community.jpg', title: 'Community & More', to: '/community' },
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

        {/* DESKTOP — The Gaffer's signature, purple, angled across the scene */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-[6%] top-[46%] z-[1] hidden -rotate-[26deg] font-['Great_Vibes'] text-8xl font-normal leading-none text-violet-300 [text-shadow:0_2px_18px_rgba(139,92,246,0.65)] md:block lg:text-9xl"
        >
          The Gaffer
        </span>

        {/* DESKTOP — Fantasy Football coming soon badge, tucked over the trophy */}
        <FantasyComingSoonBadge className="pointer-events-auto absolute right-6 bottom-8 z-[2] hidden md:block" />

        <div className="relative flex flex-col md:min-h-[660px] md:justify-between md:gap-8">
          {/* MOBILE scene banner — the Gaffer shown clearly up top, fading into the copy */}
          <div
            aria-hidden
            className="relative h-[280px] w-full bg-cover bg-[position:44%_28%] sm:h-[360px] md:hidden"
            style={{ backgroundImage: `url(${HERO_SCENE})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0414] via-[#0a0414]/25 to-transparent" />
            {/* MOBILE — The Gaffer's signature, purple, angled across the scene */}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-4 left-4 -rotate-[16deg] font-['Great_Vibes'] text-6xl font-normal leading-none text-violet-300 [text-shadow:0_2px_14px_rgba(139,92,246,0.7)] sm:text-7xl"
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

            {/* Pillars — what The Footy Oracle is about */}
            <div className="mt-7 grid gap-2.5 sm:grid-cols-3">
              {PILLARS.map((p) => (
                <div
                  key={p.title}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#f5c542]/35 bg-[#f5c542]/10 text-[#f5c542]">
                    <p.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-[0.14em] text-white">{p.title}</div>
                    <div className="mt-0.5 text-[12px] leading-snug text-white/65">{p.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* feature thumbnails — designed cards, each links into the site */}
          <div className="grid grid-cols-2 gap-2.5 px-5 pb-5 pt-6 sm:grid-cols-3 sm:gap-3 sm:px-8 sm:pb-8 md:grid-cols-6 md:px-10 md:pb-10 md:pt-0">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                to={f.to}
                aria-label={f.title}
                className="group relative overflow-hidden rounded-2xl border border-violet-400/20 shadow-[0_12px_30px_-16px_rgba(0,0,0,0.9)] transition-all hover:-translate-y-1 hover:border-violet-400/60 hover:shadow-[0_0_38px_-10px_rgba(139,92,246,0.75)]"
              >
                <img
                  src={f.img}
                  alt={f.title}
                  loading="lazy"
                  draggable={false}
                  className="aspect-square w-full select-none object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                />
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

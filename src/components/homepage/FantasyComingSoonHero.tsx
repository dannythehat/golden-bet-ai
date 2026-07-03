import { useEffect, useMemo, useState } from 'react';
import { Palmtree, Sparkles, Trophy, Bell, Crown, ChevronRight, Check } from 'lucide-react';

/**
 * Fantasy Coming Soon — an interactive hero-adjacent showcase for the upcoming
 * "The Footy Oracle Football Fantasy" league. Includes:
 *  - live countdown to launch
 *  - three interactive prize cards (click to select / reveal detail)
 *  - notify-me email capture (client-side; wired into a `data-` event so the
 *    existing analytics/CRM can pick it up later without a schema change)
 */

const LAUNCH_DATE = new Date('2026-08-08T12:00:00Z');

type Prize = {
  id: 'tropical' | 'tech' | 'shirt';
  rank: string;
  title: string;
  tagline: string;
  detail: string;
  icon: typeof Trophy;
  glow: string;
};

const PRIZES: Prize[] = [
  {
    id: 'tropical',
    rank: '1st Prize',
    title: 'Tropical Getaway',
    tagline: '7 nights for 2 — anywhere in the world',
    detail: 'Flights + hotel package worth up to £4,000. Winner picks the destination.',
    icon: Palmtree,
    glow: 'from-fuchsia-500/40 via-violet-500/25 to-transparent',
  },
  {
    id: 'tech',
    rank: '2nd Prize',
    title: 'Latest Premium Tech',
    tagline: 'iPhone Pro · MacBook · your call',
    detail: 'A £1,500 tech bundle from this year\'s flagship line-up. You choose the kit.',
    icon: Sparkles,
    glow: 'from-violet-500/40 via-fuchsia-500/20 to-transparent',
  },
  {
    id: 'shirt',
    rank: '3rd Prize',
    title: 'Signed Football Shirt',
    tagline: 'Authenticated, framed & delivered',
    detail: 'Signed by a current Premier League star, framed in a museum-grade case.',
    icon: Trophy,
    glow: 'from-amber-400/40 via-fuchsia-500/20 to-transparent',
  },
];

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { d, h, m, s };
}

export function FantasyComingSoonHero() {
  const { d, h, m, s } = useCountdown(LAUNCH_DATE);
  const [selected, setSelected] = useState<Prize['id']>('tropical');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const active = useMemo(() => PRIZES.find((p) => p.id === selected)!, [selected]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setSubmitted(true);
    // Fire a DOM event so any analytics wiring can pick this up without a schema change.
    window.dispatchEvent(new CustomEvent('fantasy-notify-signup', { detail: { email } }));
  }

  return (
    <section
      aria-labelledby="fantasy-coming-soon-title"
      className="relative mx-auto w-full max-w-[1536px]"
    >
      <div className="relative overflow-hidden rounded-3xl border border-fuchsia-400/25 bg-gradient-to-br from-[#160726] via-[#0b0316] to-[#1a0730] shadow-[0_0_80px_-30px_rgba(217,70,239,0.7)]">
        {/* Aurora / palm silhouettes */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-fuchsia-500/25 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[260px] w-[420px] rounded-full bg-violet-600/25 blur-[100px]" />
          <div className="absolute right-0 top-1/3 h-[260px] w-[360px] rounded-full bg-amber-400/10 blur-[110px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.05),transparent_40%)]" />
        </div>

        <div className="relative grid gap-8 p-6 sm:p-10 md:grid-cols-[1.1fr_0.9fr] md:gap-12 md:p-12 lg:p-14">
          {/* LEFT — headline + countdown + email */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-fuchsia-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-400" />
              </span>
              Coming Soon
            </span>

            <h2
              id="fantasy-coming-soon-title"
              className="mt-4 font-display text-4xl uppercase italic leading-[0.9] tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              The Footy Oracle
              <span className="mt-1 block bg-gradient-to-r from-fuchsia-400 via-violet-400 to-fuchsia-500 bg-clip-text text-transparent">
                Football Fantasy
              </span>
            </h2>

            <p className="mt-3 text-sm font-bold uppercase tracking-[0.28em] text-fuchsia-200/80">
              Our League · Our Game
            </p>

            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/70">
              A brand-new season-long fantasy league, run by The Gaffer. Draft your XI,
              climb the table each gameweek, and play for real prizes. Registration opens soon —
              be first in the door.
            </p>

            {/* Countdown */}
            <div
              role="timer"
              aria-label="Time until fantasy league launch"
              className="mt-7 grid grid-cols-4 gap-2 sm:gap-3"
            >
              {[
                { label: 'Days', value: d },
                { label: 'Hours', value: h },
                { label: 'Mins', value: m },
                { label: 'Secs', value: s },
              ].map((u) => (
                <div
                  key={u.label}
                  className="frost-tile frost-sheen relative overflow-hidden rounded-xl px-2 py-3 text-center sm:px-3 sm:py-4"
                >
                  <div className="font-display text-3xl font-black tabular-nums text-white sm:text-4xl">
                    {String(u.value).padStart(2, '0')}
                  </div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200/80">
                    {u.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Notify me */}
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
              <label htmlFor="fantasy-notify" className="sr-only">
                Email address
              </label>
              <input
                id="fantasy-notify"
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSubmitted(false);
                }}
                disabled={submitted}
                className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-fuchsia-400/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-fuchsia-400/30"
              />
              <button
                type="submit"
                disabled={submitted}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_18px_44px_-18px_rgba(217,70,239,1)] transition-all hover:-translate-y-0.5 hover:from-fuchsia-400 hover:to-violet-400 disabled:cursor-default disabled:from-emerald-500 disabled:to-emerald-500 disabled:hover:translate-y-0"
              >
                {submitted ? (
                  <>
                    <Check className="h-4 w-4" /> You're on the list
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" /> Notify Me
                  </>
                )}
              </button>
            </form>
            <p className="mt-2 text-[11px] text-white/40">
              We'll only email you when the league opens. No spam — Gaffer's word.
            </p>
          </div>

          {/* RIGHT — interactive prize deck */}
          <div className="relative">
            <div className="mb-3 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
                <Crown className="h-3.5 w-3.5 text-fuchsia-300" />
                Top Prizes
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40">
                Tap to reveal
              </span>
            </div>

            <div className="grid gap-2.5">
              {PRIZES.map((p) => {
                const isActive = p.id === selected;
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p.id)}
                    aria-pressed={isActive}
                    className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? 'border-fuchsia-400/60 bg-white/[0.05] shadow-[0_20px_60px_-30px_rgba(217,70,239,0.9)]'
                        : 'border-white/10 bg-white/[0.02] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div
                      aria-hidden
                      className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${p.glow} blur-2xl transition-opacity ${
                        isActive ? 'opacity-100' : 'opacity-40'
                      }`}
                    />
                    <div className="relative flex items-start gap-4">
                      <span
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border transition-colors ${
                          isActive
                            ? 'border-fuchsia-400/60 bg-fuchsia-500/15 text-fuchsia-200'
                            : 'border-white/15 bg-white/[0.04] text-white/70 group-hover:text-fuchsia-200'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300/90">
                            {p.rank}
                          </span>
                          {isActive && (
                            <span className="rounded-full bg-fuchsia-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-fuchsia-200">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 font-display text-lg font-black uppercase italic leading-tight text-white">
                          {p.title}
                        </div>
                        <div className="mt-0.5 text-[12px] text-white/60">{p.tagline}</div>
                        <div
                          className={`grid overflow-hidden text-[12px] leading-relaxed text-white/70 transition-[grid-template-rows,margin] duration-300 ease-out ${
                            isActive ? 'mt-2 grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="min-h-0 overflow-hidden">{p.detail}</div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`mt-1 h-4 w-4 shrink-0 transition-transform ${
                          isActive ? 'rotate-90 text-fuchsia-300' : 'text-white/40'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">
                    Currently viewing
                  </div>
                  <div className="mt-0.5 font-display text-base font-black italic text-white">
                    {active.rank} · {active.title}
                  </div>
                </div>
                <div className="text-right text-[11px] text-white/50">
                  Season 26/27<br />Kicks off August
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

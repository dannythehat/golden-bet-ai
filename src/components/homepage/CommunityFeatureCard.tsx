import { Check, Facebook, Send, ArrowRight } from 'lucide-react';
import { FeaturePanel, Accent } from './FeaturePanel';
import { HOMEPAGE_BACKGROUNDS } from './assets';
import { COMMUNITY_CARDS, COMMUNITY_STRIP, SOCIAL_LINKS } from './content';

// Per-channel imagery + brand accent for the image-led tiles.
const NET: Record<string, { icon: typeof Facebook; href: string; join: string; img: string; wash: string; ring: string }> = {
  facebook: {
    icon: Facebook, href: SOCIAL_LINKS.facebook, join: 'Join on Facebook',
    img: '/images/hero-features/community.jpg',
    wash: 'from-blue-600/50 via-blue-600/10', ring: 'group-hover/c:border-blue-400/60',
  },
  telegram: {
    icon: Send, href: SOCIAL_LINKS.telegram, join: 'Join on Telegram',
    img: '/images/backgrounds/bg-crowd.jpg',
    wash: 'from-sky-500/50 via-sky-500/10', ring: 'group-hover/c:border-sky-400/60',
  },
};

/** Community — image-led channel tiles: full-bleed photo, brand wash, join baked in. */
export function CommunityFeatureCard() {
  return (
    <FeaturePanel
      id="community"
      tone="sky"
      eyebrow="The Community"
      title={<>Join the <Accent tone="sky">conversation.</Accent></>}
      body="Live tip drops, team news and daily banter with thousands of real football fans — pick your channel."
      bgImage={HOMEPAGE_BACKGROUNDS.crowd}
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {COMMUNITY_CARDS.map((c) => {
            const meta = NET[c.network];
            const NetIcon = meta.icon;
            return (
              <a
                key={c.network}
                href={meta.href}
                target="_blank"
                rel="noreferrer"
                className={`group/c relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-2xl border border-white/12 p-4 shadow-[0_18px_44px_-24px_rgba(0,0,0,0.9)] transition-all hover:-translate-y-0.5 ${meta.ring}`}
              >
                {/* full-bleed photo */}
                <img
                  src={meta.img}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-45 transition-all duration-500 group-hover/c:scale-105 group-hover/c:opacity-60"
                />
                {/* darken bottom for text + brand wash */}
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08040f] via-[#08040f]/80 to-transparent" />
                <div aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.wash} to-transparent`} />

                <div className="relative">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/25 bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-sm">
                      <NetIcon className="h-4 w-4" />
                    </span>
                    <span className="font-display text-base uppercase tracking-tight text-white text-emboss">{c.heading}</span>
                  </div>
                  <ul className="space-y-1">
                    {c.points.slice(0, 4).map((p) => (
                      <li key={p} className="flex items-center gap-1.5 text-[11px] font-medium text-white/80">
                        <Check className="h-3 w-3 shrink-0 text-sky-300" /> {p}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wide text-[#0a0613] transition-transform group-hover/c:translate-x-0.5">
                    {meta.join} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </a>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMMUNITY_STRIP.map((s) => (
            <span key={s} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/55">
              {s}
            </span>
          ))}
        </div>
      </div>
    </FeaturePanel>
  );
}

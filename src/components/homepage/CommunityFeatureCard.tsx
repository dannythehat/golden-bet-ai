import { Lock, Users, BellRing, CheckCheck } from 'lucide-react';
import { FeaturePanel, Accent } from './FeaturePanel';
import { HOMEPAGE_BACKGROUNDS } from './assets';
import { COMMUNITY_STRIP, SOCIAL_LINKS } from './content';

// Official brand marks (inline — CSP blocks external assets).
function FacebookLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 512" className={className} fill="currentColor" aria-hidden>
      <path d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
    </svg>
  );
}
function TelegramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 496 512" className={className} fill="currentColor" aria-hidden>
      <path d="M248,8C111,8,0,119,0,256S111,504,248,504,496,393,496,256,385,8,248,8ZM363,176.7c-3.7,39.2-19.9,134.4-28.1,178.3-3.5,18.6-10.3,24.8-16.9,25.4-14.4,1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25,5.3-39.5,3.7-3.8,67.1-61.5,68.3-66.7.2-.7.3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3.7-104.6,69.1-14.8,10.2-26.9,9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7,18.5-13.7,108.4-47.2,144.6-62.3c68.9-28.6,83.2-33.6,92.5-33.8,2.1,0,6.6.5,9.6,2.9a10.5,10.5,0,0,1,3.5,6.7A43.8,43.8,0,0,1,363,176.7Z" />
    </svg>
  );
}

/** Community — platform-native join cards: a Facebook group preview and a
 *  Telegram alert feed, each in true brand colours so the destination is
 *  unmistakable. Links come from SOCIAL_LINKS (filled once the pages exist). */
export function CommunityFeatureCard() {
  return (
    <FeaturePanel
      id="community"
      tone="sky"
      eyebrow="The Community"
      title={<>Join the <Accent tone="sky">conversation.</Accent></>}
      body="Live tip drops, team news and daily banter with real football fans — pick your channel, both free."
      bgImage={HOMEPAGE_BACKGROUNDS.crowd}
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">

          {/* ── Facebook — the group ── */}
          <a
            href={SOCIAL_LINKS.facebook}
            target="_blank"
            rel="noreferrer"
            className="group/c relative flex flex-col overflow-hidden rounded-2xl border border-[#1877F2]/40 bg-[#0b0f1a] shadow-[0_18px_44px_-24px_rgba(0,0,0,0.9)] transition-all hover:-translate-y-0.5 hover:border-[#1877F2]/70 hover:shadow-[0_22px_48px_-22px_rgba(24,119,242,0.45)]"
          >
            {/* brand band: crowd photo washed Facebook blue */}
            <div className="relative h-24 overflow-hidden">
              <img
                src="/images/backgrounds/bg-crowd.jpg"
                alt=""
                loading="lazy"
                draggable={false}
                className="h-full w-full select-none object-cover transition-transform duration-500 group-hover/c:scale-105"
              />
              <div aria-hidden className="absolute inset-0 bg-[#1877F2]/55 mix-blend-color" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-[#0b0f1a]/30 to-transparent" />
              <FacebookLogo className="absolute -right-3 -top-3 h-20 w-20 text-white/15" />
            </div>

            {/* group identity */}
            <div className="relative -mt-7 flex items-end gap-2.5 px-4">
              <img
                src="/images/the-gaffer.png"
                alt="The Gaffer"
                loading="lazy"
                draggable={false}
                className="h-14 w-14 shrink-0 select-none rounded-2xl border-2 border-[#1877F2] object-cover object-top shadow-[0_8px_20px_-6px_rgba(0,0,0,0.9)]"
              />
              <div className="min-w-0 pb-0.5">
                <div className="truncate font-display text-[15px] uppercase tracking-tight text-white">The Footy Oracle Club</div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50">
                  <Lock className="h-3 w-3 text-[#5ea2f7]" /> Private group
                  <span className="text-white/25">·</span>
                  <Users className="h-3 w-3 text-[#5ea2f7]" /> Founding spots open
                </div>
              </div>
            </div>

            {/* pinned post preview */}
            <div className="mx-4 mt-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#5ea2f7]">The Gaffer · Pinned</div>
              <p className="mt-1 text-[12px] leading-snug text-white/85">
                Value board drops 9am sharp — today's double landed. Who's riding tomorrow's treble? ⚽🔥
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-white/45">
                <span className="inline-flex items-center rounded-full bg-white/[0.07] px-2 py-0.5">👍 ❤️ 🔥</span>
                Banter, form debates & prize drops daily
              </div>
            </div>

            {/* brand button */}
            <div className="p-4 pt-3.5">
              <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-4 py-3 text-[12px] font-black uppercase tracking-wide text-white shadow-[0_14px_32px_-12px_rgba(24,119,242,0.9)] transition-transform group-hover/c:-translate-y-0.5">
                <FacebookLogo className="h-4 w-4" /> Join the Facebook Group
              </span>
            </div>
          </a>

          {/* ── Telegram — the alerts channel ── */}
          <a
            href={SOCIAL_LINKS.telegram}
            target="_blank"
            rel="noreferrer"
            className="group/c relative flex flex-col overflow-hidden rounded-2xl border border-[#2AABEE]/40 bg-[#0a1119] shadow-[0_18px_44px_-24px_rgba(0,0,0,0.9)] transition-all hover:-translate-y-0.5 hover:border-[#2AABEE]/70 hover:shadow-[0_22px_48px_-22px_rgba(42,171,238,0.45)]"
          >
            {/* channel header */}
            <div className="flex items-center gap-2.5 border-b border-white/[0.08] bg-gradient-to-r from-[#2AABEE]/20 to-transparent px-4 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#2AABEE] to-[#229ED9] text-white shadow-[0_8px_20px_-8px_rgba(42,171,238,0.9)]">
                <TelegramLogo className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-display text-[15px] uppercase tracking-tight text-white">Footy Oracle · Official</div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50">
                  <BellRing className="h-3 w-3 text-[#4fc3f7]" /> Alerts channel · straight to your pocket
                </div>
              </div>
            </div>

            {/* live chat mock — the day's real story */}
            <div className="flex flex-1 flex-col gap-1.5 px-4 py-3">
              {[
                { text: '🔔 TIP DROP — today’s double & treble are live', time: '09:00' },
                { text: '⚽ GOAL! Odd 1–0 — Over 3.5 is cooking', time: '18:44' },
                { text: '🏆 DOUBLE LANDED · £10 → £33.20', time: '21:36', win: true },
              ].map((m) => (
                <div
                  key={m.time}
                  className={`w-fit max-w-[95%] rounded-2xl rounded-bl-md px-3 py-1.5 text-[11.5px] leading-snug ${m.win ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/25' : 'bg-white/[0.07] text-white/85'}`}
                >
                  {m.text}
                  <span className="ml-2 inline-flex items-center gap-0.5 align-bottom text-[8.5px] font-bold text-white/35">
                    {m.time} <CheckCheck className="h-2.5 w-2.5 text-[#4fc3f7]" />
                  </span>
                </div>
              ))}
              <div className="mt-0.5 flex items-center gap-1 pl-1 text-[10px] font-semibold italic text-white/35">
                <span className="flex gap-0.5">
                  <span className="h-1 w-1 rounded-full bg-[#4fc3f7] [animation:pulse_1s_ease-in-out_infinite]" />
                  <span className="h-1 w-1 rounded-full bg-[#4fc3f7] [animation:pulse_1s_ease-in-out_0.2s_infinite]" />
                  <span className="h-1 w-1 rounded-full bg-[#4fc3f7] [animation:pulse_1s_ease-in-out_0.4s_infinite]" />
                </span>
                The Gaffer is typing…
              </div>
            </div>

            {/* brand button */}
            <div className="p-4 pt-1">
              <span className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#2AABEE] to-[#229ED9] px-4 py-3 text-[12px] font-black uppercase tracking-wide text-white shadow-[0_14px_32px_-12px_rgba(42,171,238,0.9)] transition-transform group-hover/c:-translate-y-0.5">
                <TelegramLogo className="h-4 w-4" /> Join the Telegram Channel
              </span>
            </div>
          </a>
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

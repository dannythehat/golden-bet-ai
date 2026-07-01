import { Check, Facebook, Send } from 'lucide-react';
import { FeaturePanel, Accent } from './FeaturePanel';
import { COMMUNITY_CARDS, COMMUNITY_STRIP, SOCIAL_LINKS } from './content';

const NET: Record<string, { icon: typeof Facebook; href: string; label: string }> = {
  facebook: { icon: Facebook, href: SOCIAL_LINKS.facebook, label: 'Join Facebook' },
  telegram: { icon: Send, href: SOCIAL_LINKS.telegram, label: 'Join Telegram' },
};

/** Community — native card: the two channels with what you get, real join links. */
export function CommunityFeatureCard() {
  return (
    <FeaturePanel
      id="community"
      tone="sky"
      eyebrow="The Community"
      title={<>Join the <Accent tone="sky">conversation.</Accent></>}
      body="Live tip drops, team news and daily banter with real football fans — pick your channel."
      ctas={COMMUNITY_CARDS.map((c) => ({ label: NET[c.network].label, href: NET[c.network].href }))}
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {COMMUNITY_CARDS.map((c) => {
            const meta = NET[c.network];
            const NetIcon = meta.icon;
            return (
              <div key={c.network} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-sky-400/30 bg-sky-400/10 text-sky-300">
                    <NetIcon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-black text-white">{c.heading}</span>
                </div>
                <ul className="mt-2.5 space-y-1">
                  {c.points.slice(0, 4).map((p) => (
                    <li key={p} className="flex items-center gap-1.5 text-[11px] text-white/60">
                      <Check className="h-3 w-3 shrink-0 text-sky-300" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
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

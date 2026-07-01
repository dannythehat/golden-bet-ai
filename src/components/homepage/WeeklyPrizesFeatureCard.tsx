import { Sparkles } from 'lucide-react';
import { FeaturePanel, Accent } from './FeaturePanel';
import { useWeeklyPrizes } from './useHomepageData';
import { HOMEPAGE_PRIZES } from './assets';
import { RANDOM_PRIZES, THEMED_EVENTS } from './content';

const PRIZE_SHOTS = [
  { src: HOMEPAGE_PRIZES.holiday, label: 'Dream holidays' },
  { src: HOMEPAGE_PRIZES.ps5, label: 'Latest tech' },
];

/** Weekly Prizes — native card: live prize chips + the flagship themed giveaway. */
export function WeeklyPrizesFeatureCard() {
  const { data: prizes = [] } = useWeeklyPrizes();
  const primaryLink = prizes.find((p) => p.link)?.link ?? '/fantasy-league';

  // Prefer live CMS prizes; fall back to the curated list.
  const randoms = prizes.filter((p) => p.category === 'random').map((p) => p.title);
  const themed = prizes.filter((p) => p.category === 'themed').map((p) => p.title);
  const chips = (randoms.length ? randoms : RANDOM_PRIZES).slice(0, 6);
  const headline = (themed.length ? themed : THEMED_EVENTS)[0];

  return (
    <FeaturePanel
      tone="amber"
      eyebrow="Weekly Prizes"
      title={<>Real prizes. <Accent tone="amber">Every week.</Accent></>}
      body="Climb the leaderboard and win real prizes paid straight to members — plus big themed giveaways all season."
      ctas={[{ label: 'See Prizes', to: primaryLink }]}
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          {PRIZE_SHOTS.map((p) => (
            <div key={p.label} className="group/prize relative aspect-[16/10] overflow-hidden rounded-xl border border-white/10">
              <img src={p.src} alt={p.label} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover/prize:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <span className="absolute bottom-1.5 left-2 text-[11px] font-black uppercase tracking-wide text-white drop-shadow">{p.label}</span>
            </div>
          ))}
        </div>
        {headline && (
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-3 py-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
            <span className="text-[12px] font-black uppercase tracking-wide text-amber-200">{headline}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/70">
              {c}
            </span>
          ))}
        </div>
      </div>
    </FeaturePanel>
  );
}

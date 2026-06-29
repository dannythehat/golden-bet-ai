import { useWeeklyPrizes } from './useHomepageData';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

/** Weekly prizes — approved artwork with live CTA destination preserved. */
export function WeeklyPrizesFeatureCard() {
  const { data: prizes = [] } = useWeeklyPrizes();
  const primaryLink = prizes.find((p) => p.link)?.link ?? '/fantasy-league';

  return (
    <a
      id="weekly-prizes"
      href={primaryLink}
      className="group block overflow-hidden rounded-[1.15rem] border border-orange-400/45 bg-[#120904] shadow-[0_0_60px_-18px_rgba(249,115,22,0.5)] md:rounded-[1.45rem]"
    >
      <img
        src={HOMEPAGE_APPROVED_ASSETS.weeklyPrizes}
        alt="Weekly prizes panel"
        className="block w-full transition-transform duration-300 group-hover:scale-[1.01]"
        loading="lazy"
        width={1400}
        height={1275}
      />
    </a>
  );
}

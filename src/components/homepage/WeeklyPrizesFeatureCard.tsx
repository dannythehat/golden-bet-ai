import { useWeeklyPrizes } from './useHomepageData';
import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function WeeklyPrizesFeatureCard() {
  const { data: prizes = [] } = useWeeklyPrizes();
  const primaryLink = prizes.find((p) => p.link)?.link ?? '/fantasy-league';

  return (
    <ArtworkCard
      id="weekly-prizes"
      to={primaryLink}
      src={HOMEPAGE_APPROVED_ASSETS.weeklyPrizes}
      alt="Footy Oracle weekly prizes"
      label="Open weekly prizes"
    />
  );
}

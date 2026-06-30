import { useDonkey } from './useHomepageData';
import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function DonkeyOfTheWeekFeatureCard() {
  const { data: donkey } = useDonkey();
  const ctaHref = donkey?.cta_href ?? '/fantasy-league';
  return (
    <ArtworkCard
      id="donkey-of-the-week"
      to={ctaHref}
      src={HOMEPAGE_APPROVED_ASSETS.donkey}
      alt="Donkey of the week"
      label={donkey?.cta_label ?? "See this week's donkey"}
    />
  );
}

import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function TipOfTheDayCard() {
  return (
    <ArtworkCard
      id="tip-of-the-day"
        to="/fixtures"
      src={HOMEPAGE_APPROVED_ASSETS.tipOfDay}
      alt="Tip of the day"
      label="View today's tips"
    />
  );
}

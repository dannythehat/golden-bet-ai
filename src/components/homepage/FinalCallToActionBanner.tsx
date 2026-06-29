import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function FinalCallToActionBanner() {
  return (
    <ArtworkCard
      src={HOMEPAGE_APPROVED_ASSETS.finalCtaFooter}
      alt="Join the Footy Oracle Club"
      to="/pricing"
      label="Join the club"
    />
  );
}

import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function FantasyLeagueFeatureCard() {
  return (
    <ArtworkCard
      id="fantasy-league"
      to="/fantasy-league"
      src={HOMEPAGE_APPROVED_ASSETS.fantasy}
      alt="Footy Oracle fantasy premier league"
      label="Join the fantasy league"
    />
  );
}

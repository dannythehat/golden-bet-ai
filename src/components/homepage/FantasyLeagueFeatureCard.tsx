import { ArtworkCard } from './ArtworkCard';
import { MobileSectionCard } from './MobileSectionCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function FantasyLeagueFeatureCard() {
  return (
    <>
      <div className="md:hidden">
        <MobileSectionCard
          eyebrow="Fantasy League"
          title="Pick your XI. Win every week."
          body="Footy Oracle's flagship fantasy league — weekly cash prizes, live leaderboards and Gaffer-powered insights."
          image={HOMEPAGE_APPROVED_ASSETS.fantasy}
          imageAlt="Footy Oracle fantasy premier league"
          imagePosition="object-[center_45%]"
          imageAspect="aspect-[5/4]"
          tone="violet"
          ctas={[{ label: 'Play Fantasy', to: '/fantasy-league' }]}
        />
      </div>
      <div className="hidden md:block">
        <ArtworkCard
          id="fantasy-league"
          to="/fantasy-league"
          src={HOMEPAGE_APPROVED_ASSETS.fantasy}
          alt="Footy Oracle fantasy premier league"
          label="Join the fantasy league"
        />
      </div>
    </>
  );
}

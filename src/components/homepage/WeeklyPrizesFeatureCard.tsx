import { useWeeklyPrizes } from './useHomepageData';
import { ArtworkCard } from './ArtworkCard';
import { MobileSectionCard } from './MobileSectionCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function WeeklyPrizesFeatureCard() {
  const { data: prizes = [] } = useWeeklyPrizes();
  const primaryLink = prizes.find((p) => p.link)?.link ?? '/fantasy-league';

  return (
    <>
      <div className="md:hidden">
        <MobileSectionCard
          eyebrow="Weekly Prizes"
          title="Real cash. Every week."
          body="Climb the leaderboard, win weekly prize pots paid straight to members."
          image={HOMEPAGE_APPROVED_ASSETS.weeklyPrizes}
          imageAlt="Footy Oracle weekly prizes"
          imagePosition="object-[center_45%]"
          imageAspect="aspect-[5/4]"
          tone="amber"
          ctas={[{ label: 'See Prizes', to: primaryLink }]}
        />
      </div>
      <div className="hidden md:block">
        <ArtworkCard
          id="weekly-prizes"
          to={primaryLink}
          src={HOMEPAGE_APPROVED_ASSETS.weeklyPrizes}
          alt="Footy Oracle weekly prizes"
          label="Open weekly prizes"
        />
      </div>
    </>
  );
}

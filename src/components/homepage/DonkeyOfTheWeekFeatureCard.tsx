import { useDonkey } from './useHomepageData';
import { ArtworkCard } from './ArtworkCard';
import { MobileSectionCard } from './MobileSectionCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function DonkeyOfTheWeekFeatureCard() {
  const { data: donkey } = useDonkey();
  const ctaHref = donkey?.cta_href ?? '/fantasy-league';
  return (
    <>
      <div className="md:hidden">
        <MobileSectionCard
          eyebrow="Donkey of the Week"
          title="The worst pick of the week"
          body="Every Monday we crown the donkey — the player, punter or pundit who fluffed it hardest."
          image={HOMEPAGE_APPROVED_ASSETS.donkey}
          imageAlt="Donkey of the week"
          imagePosition="object-[35%_50%]"
          imageAspect="aspect-[5/4]"
          tone="rose"
          ctas={[{ label: donkey?.cta_label ?? "See This Week's Donkey", to: ctaHref }]}
        />
      </div>
      <div className="hidden md:block">
        <ArtworkCard
          id="donkey-of-the-week"
          to={ctaHref}
          src={HOMEPAGE_APPROVED_ASSETS.donkey}
          alt="Donkey of the week"
          label={donkey?.cta_label ?? "See this week's donkey"}
        />
      </div>
    </>
  );
}

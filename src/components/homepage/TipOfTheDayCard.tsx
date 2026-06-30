import { ArtworkCard } from './ArtworkCard';
import { MobileSectionCard } from './MobileSectionCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function TipOfTheDayCard() {
  return (
    <>
      <div className="md:hidden">
        <MobileSectionCard
          eyebrow="Tip of the Day"
          title="Today's Gaffer pick"
          body="One stand-out value bet picked every morning — straight from The Gaffer."
          image={HOMEPAGE_APPROVED_ASSETS.tipOfDay}
          imageAlt="Tip of the day"
          imagePosition="object-[center_25%]"
          tone="emerald"
          ctas={[{ label: "View Today's Tips", to: '/fixtures' }]}
        />
      </div>
      <div className="hidden md:block">
        <ArtworkCard
          id="tip-of-the-day"
          to="/fixtures"
          src={HOMEPAGE_APPROVED_ASSETS.tipOfDay}
          alt="Tip of the day"
          label="View today's tips"
        />
      </div>
    </>
  );
}

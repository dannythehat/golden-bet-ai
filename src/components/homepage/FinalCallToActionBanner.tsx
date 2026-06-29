import { ArtworkCard } from './ArtworkCard';
import { MobileSectionCard } from './MobileSectionCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function FinalCallToActionBanner() {
  return (
    <>
      <div className="md:hidden">
        <MobileSectionCard
          eyebrow="Join the Club"
          title="Ready to bet smarter?"
          body="Daily tips, form tables, fantasy league, weekly prizes — all in one club."
          image={HOMEPAGE_APPROVED_ASSETS.finalCtaFooter}
          imageAlt="Join the Footy Oracle Club"
          imagePosition="object-[20%_45%]"
          imageAspect="aspect-[5/4]"
          tone="gold"
          ctas={[{ label: 'Join Footy Oracle Club', to: '/pricing' }]}
        />
      </div>
      <div className="hidden md:block">
        <ArtworkCard
          src={HOMEPAGE_APPROVED_ASSETS.finalCtaFooter}
          alt="Join the Footy Oracle Club"
          to="/pricing"
          label="Join the club"
        />
      </div>
    </>
  );
}

import { SOCIAL_LINKS } from './content';
import { ArtworkCard } from './ArtworkCard';
import { MobileSectionCard } from './MobileSectionCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function CommunityFeatureCard() {
  return (
    <>
      <div className="md:hidden">
        <MobileSectionCard
          eyebrow="The Community"
          title="Join the conversation"
          body="Live tip drops, banter and member-only updates — pick your poison."
          image={HOMEPAGE_APPROVED_ASSETS.community}
          imageAlt="Join our community"
          imagePosition="object-[center_45%]"
          imageAspect="aspect-[5/4]"
          tone="sky"
          ctas={[
            { label: 'Facebook', href: SOCIAL_LINKS.facebook },
            { label: 'Telegram', href: SOCIAL_LINKS.telegram },
          ]}
        />
      </div>
      <div className="hidden md:block">
        <ArtworkCard
          id="community"
          src={HOMEPAGE_APPROVED_ASSETS.community}
          alt="Join our community"
          overlayLinks={[
            { label: 'Join Facebook community', href: SOCIAL_LINKS.facebook, className: 'left-[6%] top-[57%] h-[12%] w-[38%]' },
            { label: 'Join Telegram community', href: SOCIAL_LINKS.telegram, className: 'left-[56%] top-[57%] h-[12%] w-[38%]' },
          ]}
        />
      </div>
    </>
  );
}

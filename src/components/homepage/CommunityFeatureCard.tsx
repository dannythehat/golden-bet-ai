import { SOCIAL_LINKS } from './content';
import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function CommunityFeatureCard() {
  return (
    <ArtworkCard
      id="community"
      src={HOMEPAGE_APPROVED_ASSETS.community}
      alt="Join our community"
      overlayLinks={[
        { label: 'Join Facebook community', href: SOCIAL_LINKS.facebook, className: 'left-[6%] top-[57%] h-[12%] w-[38%]' },
        { label: 'Join Telegram community', href: SOCIAL_LINKS.telegram, className: 'left-[56%] top-[57%] h-[12%] w-[38%]' },
      ]}
    />
  );
}

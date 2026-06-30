import { useGafferStory } from './useHomepageData';
import { ArtworkCard } from './ArtworkCard';
import { MobileSectionCard } from './MobileSectionCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function GafferStoryCard() {
  const { data: story } = useGafferStory();
  const ctaHref = story?.cta_href ?? '/blog';
  return (
    <>
      <div className="md:hidden">
        <MobileSectionCard
          eyebrow="The Gaffer"
          title="Meet The Gaffer"
          body="The voice behind every pick — sharp, witty, and built on millions of data points."
          image={HOMEPAGE_APPROVED_ASSETS.gafferStory}
          imageAlt="Trust The Gaffer story"
          imagePosition="object-[center_25%]"
          tone="violet"
          ctas={[{ label: story?.cta_label ?? 'Read The Story', to: ctaHref }]}
        />
      </div>
      <div className="hidden md:block">
        <ArtworkCard
          id="gaffer-story"
          to={ctaHref}
          src={HOMEPAGE_APPROVED_ASSETS.gafferStory}
          alt="Trust The Gaffer story"
          label={story?.cta_label ?? 'Read The Gaffer story'}
        />
      </div>
    </>
  );
}

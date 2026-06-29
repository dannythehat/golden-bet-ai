import { useGafferStory } from './useHomepageData';
import { ArtworkCard } from './ArtworkCard';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

export function GafferStoryCard() {
  const { data: story } = useGafferStory();
  const ctaHref = story?.cta_href ?? '/blog';
  return (
    <ArtworkCard
      id="gaffer-story"
      to={ctaHref}
      src={HOMEPAGE_APPROVED_ASSETS.gafferStory}
      alt="Trust The Gaffer story"
      label={story?.cta_label ?? 'Read The Gaffer story'}
    />
  );
}

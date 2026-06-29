import { useGafferStory } from './useHomepageData';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

/** The Gaffer story — approved artwork, live CTA target. */
export function GafferStoryCard() {
  const { data: story } = useGafferStory();
  const ctaHref = story?.cta_href ?? '/blog';

  return (
    <a
      id="gaffer-story"
      href={ctaHref}
      className="group block overflow-hidden rounded-[1.15rem] border border-pink-500/45 bg-[#11040d] shadow-[0_0_60px_-18px_rgba(236,72,153,0.55)] md:rounded-[1.45rem]"
    >
      <img
        src={HOMEPAGE_APPROVED_ASSETS.gafferStory}
        alt="Trust The Gaffer story panel"
        className="block w-full transition-transform duration-300 group-hover:scale-[1.01]"
        loading="lazy"
        width={1364}
        height={1536}
      />
    </a>
  );
}

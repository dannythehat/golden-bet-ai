import { FeaturePanel, Accent } from './FeaturePanel';
import { useGafferStory } from './useHomepageData';

/** The Gaffer story — native card fronted by his arms-folded cutout. */
export function GafferStoryCard() {
  const { data: story } = useGafferStory();
  const ctaHref = story?.cta_href ?? '/blog';
  const intro =
    story?.intro ??
    'The voice behind every pick — sharp, funny, and built on millions of data points. He plans, prepares, predicts, and shows his working.';

  return (
    <FeaturePanel
      id="gaffer-story"
      tone="violet"
      eyebrow="The Gaffer"
      title={<>Meet <Accent tone="violet">the Gaffer.</Accent></>}
      body={intro}
      character={{ src: '/images/gaffer/gaffer-arms-crossed.png', alt: 'The Gaffer, arms folded', className: 'w-[66%] max-w-[230px] opacity-95' }}
      className="min-h-[440px]"
      ctas={[{ label: story?.cta_label ?? 'Read the Story', to: ctaHref }]}
    >
      <p className="max-w-[16rem] font-hand text-lg leading-snug text-white/90">
        “Plan. Prepare. Predict. Profit. I don't do vibes — I do value.”
      </p>
    </FeaturePanel>
  );
}

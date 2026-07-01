import { Quote } from 'lucide-react';
import { FeaturePanel, Accent } from './FeaturePanel';
import { useGafferStory } from './useHomepageData';

/** The Gaffer story — native card with his intro + a signature line. */
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
      ctas={[{ label: story?.cta_label ?? 'Read the Story', to: ctaHref }]}
    >
      <figure className="rounded-xl border border-violet-400/25 bg-violet-400/[0.06] p-4">
        <Quote className="h-5 w-5 text-violet-300" />
        <blockquote className="mt-2 font-hand text-lg leading-snug text-white/90">
          “Plan. Prepare. Predict. Profit. I don't do vibes — I do value.”
        </blockquote>
        <figcaption className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-violet-200/70">— The Gaffer</figcaption>
      </figure>
    </FeaturePanel>
  );
}

import { useEffect } from 'react';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { HeroBanner } from '@/components/homepage/HeroBanner';

import { FormTablesSection } from '@/components/homepage/FormTablesSection';
import { FantasyLeagueSellItSection } from '@/components/homepage/FantasyLeagueSellItSection';
import { LatestArticlesSection } from '@/components/homepage/LatestArticlesSection';
import { TipOfTheDayCard } from '@/components/homepage/TipOfTheDayCard';
import { GafferStoryCard } from '@/components/homepage/GafferStoryCard';
import { CommunityFeatureCard } from '@/components/homepage/CommunityFeatureCard';
import { FinalCallToActionBanner } from '@/components/homepage/FinalCallToActionBanner';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';
import { HomepageScene } from '@/components/homepage/HomepageScene';
import { GafferValueBoardSection } from '@/components/homepage/GafferValueBoardSection';
import { GafferPnLTrustSection } from '@/components/homepage/GafferPnLTrustSection';

export default function PreviewHome() {
  useEffect(() => {
    document.title = 'Footy Oracle Club — The Gaffer Knows';
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05020b] text-white">
      {/* Very faint global grain — page-wide radial removed so per-scene tints can breathe */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:46px_46px] opacity-20" />

      <HomepageNav />

      <HomepageScene tone="hero" flushTop flushBottom boxed={false}>
        <HeroBanner />
      </HomepageScene>

      <HomepageScene tone="finale" eyebrow="01 · The Gaffer's Picks">
        <GafferValueBoardSection />
        <div className="mt-3 md:mt-4">
          <GafferPnLTrustSection />
        </div>
      </HomepageScene>

      <HomepageScene tone="emerald" eyebrow="02 · Form & Fantasy">
        <FormTablesSection />
        <div className="mt-3 md:mt-4">
          <FantasyLeagueSellItSection />
        </div>
      </HomepageScene>

      <HomepageScene tone="editorial" eyebrow="03 · The Newsroom">
        <div className="grid gap-3 lg:grid-cols-2 md:gap-4">
          <LatestArticlesSection />
          <GafferStoryCard />
        </div>
      </HomepageScene>

      <HomepageScene tone="crowd" eyebrow="05 · The Community">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr] md:gap-4">
          <CommunityFeatureCard />
          <TipOfTheDayCard />
        </div>
      </HomepageScene>

      <HomepageScene tone="finale" eyebrow="06 · Join the Club">
        <FinalCallToActionBanner />
      </HomepageScene>


      <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4 md:px-6">
        <FooterNavigation />
      </div>
    </div>
  );
}

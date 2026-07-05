import { useEffect } from 'react';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { SectionErrorBoundary } from '@/components/homepage/SectionErrorBoundary';
import { HeroBanner } from '@/components/homepage/HeroBanner';

import { FantasyLeagueSellItSection } from '@/components/homepage/FantasyLeagueSellItSection';
import { LatestArticlesSection } from '@/components/homepage/LatestArticlesSection';
import { TipOfTheDayCard } from '@/components/homepage/TipOfTheDayCard';
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
        <SectionErrorBoundary name="HeroBanner">
          <HeroBanner />
        </SectionErrorBoundary>
      </HomepageScene>

      <HomepageScene tone="finale" eyebrow="01 · The Gaffer's Picks">
        <SectionErrorBoundary name="GafferValueBoardSection">
          <GafferValueBoardSection />
        </SectionErrorBoundary>
        <div className="mt-3 md:mt-4">
          <SectionErrorBoundary name="GafferPnLTrustSection">
            <GafferPnLTrustSection />
          </SectionErrorBoundary>
        </div>
      </HomepageScene>

      <HomepageScene tone="emerald" eyebrow="02 · Fantasy">
        <SectionErrorBoundary name="FantasyLeagueSellItSection">
          <FantasyLeagueSellItSection />
        </SectionErrorBoundary>
      </HomepageScene>

      <HomepageScene tone="editorial" eyebrow="03 · The Newsroom">
        <SectionErrorBoundary name="LatestArticlesSection">
          <LatestArticlesSection />
        </SectionErrorBoundary>
      </HomepageScene>

      <HomepageScene tone="crowd" eyebrow="05 · The Community">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr] md:gap-4">
          <SectionErrorBoundary name="CommunityFeatureCard">
            <CommunityFeatureCard />
          </SectionErrorBoundary>
          <SectionErrorBoundary name="TipOfTheDayCard">
            <TipOfTheDayCard />
          </SectionErrorBoundary>
        </div>
      </HomepageScene>

      <HomepageScene tone="finale" eyebrow="06 · Coming Soon">
        <SectionErrorBoundary name="FinalCallToActionBanner">
          <FinalCallToActionBanner />
        </SectionErrorBoundary>
      </HomepageScene>


      <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4 md:px-6">
        <FooterNavigation />
      </div>
    </div>
  );
}

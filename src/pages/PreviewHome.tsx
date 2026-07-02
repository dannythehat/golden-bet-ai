import { useEffect } from 'react';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { HeroBanner } from '@/components/homepage/HeroBanner';

import { FormTablesSection } from '@/components/homepage/FormTablesSection';
import { FantasyLeagueFeatureCard } from '@/components/homepage/FantasyLeagueFeatureCard';
import { LatestArticlesSection } from '@/components/homepage/LatestArticlesSection';
import { TipOfTheDayCard } from '@/components/homepage/TipOfTheDayCard';
import { WeeklyPrizesFeatureCard } from '@/components/homepage/WeeklyPrizesFeatureCard';
import { GafferStoryCard } from '@/components/homepage/GafferStoryCard';
import { DonkeyOfTheWeekFeatureCard } from '@/components/homepage/DonkeyOfTheWeekFeatureCard';
import { CommunityFeatureCard } from '@/components/homepage/CommunityFeatureCard';
import { FinalCallToActionBanner } from '@/components/homepage/FinalCallToActionBanner';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';
import { HomepageScene } from '@/components/homepage/HomepageScene';
import { GafferValueBoardSection } from '@/components/homepage/GafferValueBoardSection';
import { PnLSection } from '@/components/homepage/PnLSection';

export default function PreviewHome() {
  useEffect(() => {
    document.title = 'Footy Oracle Club — The Gaffer Knows';
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05020b] text-white">
      {/* Very faint global grain — page-wide radial removed so per-scene tints can breathe */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:46px_46px] opacity-20" />

      <HomepageNav />

      <HomepageScene tone="hero" flushTop flushBottom>
        <HeroBanner />
      </HomepageScene>

      <HomepageScene tone="finale" eyebrow="01 · The Gaffer's Picks">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <GafferValueBoardSection />
          <div className="mt-3 md:mt-4">
            <PnLSection />
          </div>
        </div>
      </HomepageScene>

      <HomepageScene tone="emerald" eyebrow="02 · Form & Fantasy">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <FormTablesSection />
          <div className="mt-3 md:mt-4">
            <FantasyLeagueFeatureCard />
          </div>
        </div>
      </HomepageScene>

      <HomepageScene tone="editorial" eyebrow="03 · The Newsroom">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <div className="grid gap-3 lg:grid-cols-[0.95fr_0.9fr_0.98fr] md:gap-4">
            <LatestArticlesSection />
            <WeeklyPrizesFeatureCard />
            <GafferStoryCard />
          </div>
        </div>
      </HomepageScene>

      <HomepageScene tone="violet" eyebrow="04 · Donkey of the Week">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <DonkeyOfTheWeekFeatureCard />
        </div>
      </HomepageScene>

      <HomepageScene tone="crowd" eyebrow="05 · The Community">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr] md:gap-4">
            <CommunityFeatureCard />
            <TipOfTheDayCard />
          </div>
        </div>
      </HomepageScene>

      <HomepageScene tone="finale" eyebrow="06 · Join the Club">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <FinalCallToActionBanner />
        </div>
      </HomepageScene>

      <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4 md:px-6">
        <FooterNavigation />
      </div>
    </div>
  );
}

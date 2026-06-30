import { useEffect } from 'react';
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
import { TodaysDouble } from '@/components/homepage/TodaysDouble';
import { GafferPicksBox } from '@/components/homepage/GafferPicksBox';
import { PnLSection } from '@/components/homepage/PnLSection';

export default function PreviewHome() {
  useEffect(() => {
    document.title = 'Footy Oracle Club — The Gaffer Knows';
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05020b] text-white">
      {/* Very faint global grain — page-wide radial removed so per-scene tints can breathe */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:46px_46px] opacity-20" />

      <HomepageScene tone="hero" flushTop flushBottom>
        <HeroBanner />
      </HomepageScene>

      <HomepageScene tone="emerald" eyebrow="01 · Form & Fantasy">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <div className="grid gap-3 lg:grid-cols-[1.12fr_0.98fr] md:gap-4">
            <FormTablesSection />
            <FantasyLeagueFeatureCard />
          </div>
        </div>
      </HomepageScene>

      <HomepageScene tone="editorial" eyebrow="02 · The Newsroom">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <div className="grid gap-3 lg:grid-cols-[0.95fr_0.9fr_0.98fr] md:gap-4">
            <LatestArticlesSection />
            <WeeklyPrizesFeatureCard />
            <GafferStoryCard />
          </div>
        </div>
      </HomepageScene>

      <HomepageScene tone="violet" eyebrow="03 · Donkey of the Week">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <DonkeyOfTheWeekFeatureCard />
        </div>
      </HomepageScene>

      <HomepageScene tone="crowd" eyebrow="04 · The Community">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr] md:gap-4">
            <CommunityFeatureCard />
            <TipOfTheDayCard />
          </div>
        </div>
      </HomepageScene>

      <HomepageScene tone="finale" eyebrow="05 · Join the Club">
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

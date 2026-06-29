import { useEffect } from 'react';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { HeroSection } from '@/components/homepage/HeroSection';
import { FeatureStrip } from '@/components/homepage/FeatureStrip';
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

/**
 * Footy Oracle Club homepage — built to the locked design reference.
 * Lives at /preview so the live homepage at "/" is untouched. Every section is
 * a reusable, data-driven component (see src/components/homepage/content.ts).
 */
export default function PreviewHome() {
  useEffect(() => {
    document.title = 'Footy Oracle Club — The Gaffer Knows';
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070310] text-white">
      {/* Ambient purple atmosphere */}
      <div className="pointer-events-none fixed inset-0 opacity-70 [background:radial-gradient(circle_at_15%_-5%,rgba(88,28,135,0.35),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(124,58,237,0.18),transparent_40%)]" />

      <HomepageNav />

      <main className="relative mx-auto max-w-7xl space-y-6 px-3 py-6 md:space-y-8 md:px-6 md:py-8">
        <HeroSection />
        <FeatureStrip />
        <FormTablesSection />
        <FantasyLeagueFeatureCard />

        {/* Articles + Tip of the Day side by side on desktop */}
        <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
          <LatestArticlesSection />
          <TipOfTheDayCard />
        </div>

        <WeeklyPrizesFeatureCard />
        <GafferStoryCard />
        <DonkeyOfTheWeekFeatureCard />
        <CommunityFeatureCard />
        <FinalCallToActionBanner />
        <FooterNavigation />
      </main>
    </div>
  );
}

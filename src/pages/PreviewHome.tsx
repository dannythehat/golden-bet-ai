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
 * Footy Oracle Club homepage — locked to the approved mock-up direction.
 * Every section is a reusable, data-driven component. The layout stays stable;
 * content/images can rotate through the season.
 */
export default function PreviewHome() {
  useEffect(() => {
    document.title = 'Footy Oracle Club — The Gaffer Knows';
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05020b] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-80 [background:radial-gradient(circle_at_12%_-8%,rgba(88,28,135,0.45),transparent_42%),radial-gradient(circle_at_92%_4%,rgba(124,58,237,0.22),transparent_38%),radial-gradient(circle_at_50%_105%,rgba(245,158,11,0.1),transparent_34%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:46px_46px] opacity-25" />

      <HomepageNav />

      <main className="relative mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-4 md:space-y-7 md:px-6 md:py-8">
        {/* 1. Hero */}
        <HeroSection />
        {/* 2. Feature ribbon */}
        <FeatureStrip />
        {/* 3. Form Tables — full-width feature */}
        <FormTablesSection />
        {/* 4. Fantasy League — full-width feature */}
        <FantasyLeagueFeatureCard />
        {/* 5. Latest Articles */}
        <LatestArticlesSection />
        {/* 6. Weekly Prizes */}
        <WeeklyPrizesFeatureCard />
        {/* 7. Trust The Gaffer */}
        <GafferStoryCard />
        {/* 8. Donkey of the Week */}
        <DonkeyOfTheWeekFeatureCard />
        {/* 9. Community */}
        <CommunityFeatureCard />
        {/* 10. Tip of the Day */}
        <TipOfTheDayCard />
        {/* 11. Join The Club CTA */}
        <FinalCallToActionBanner />
        {/* 12. Footer */}
        <FooterNavigation />
      </main>
    </div>
  );
}

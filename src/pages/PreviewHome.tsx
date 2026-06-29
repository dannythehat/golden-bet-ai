import { useEffect } from 'react';
import { HeroBanner } from '@/components/homepage/HeroBanner';
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

export default function PreviewHome() {
  useEffect(() => {
    document.title = 'Footy Oracle Club — The Gaffer Knows';
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05020b] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-80 [background:radial-gradient(circle_at_12%_-8%,rgba(88,28,135,0.45),transparent_42%),radial-gradient(circle_at_92%_4%,rgba(124,58,237,0.22),transparent_38%),radial-gradient(circle_at_50%_105%,rgba(245,158,11,0.1),transparent_34%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:46px_46px] opacity-25" />

      <HeroBanner />

      <main className="relative mx-auto max-w-7xl space-y-3 px-3 py-3 sm:px-4 md:space-y-4 md:px-6 md:py-5">
        <FeatureStrip />

        <div className="grid gap-3 lg:grid-cols-[1.12fr_0.98fr] md:gap-4">
          <FormTablesSection />
          <FantasyLeagueFeatureCard />
        </div>

        <div className="grid gap-3 lg:grid-cols-[0.95fr_0.9fr_0.98fr] md:gap-4">
          <LatestArticlesSection />
          <WeeklyPrizesFeatureCard />
          <GafferStoryCard />
        </div>

        <DonkeyOfTheWeekFeatureCard />

        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr] md:gap-4">
          <CommunityFeatureCard />
          <TipOfTheDayCard />
        </div>

        <FinalCallToActionBanner />
        <FooterNavigation />
      </main>
    </div>
  );
}

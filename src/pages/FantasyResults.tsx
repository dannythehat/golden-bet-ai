import { useEffect } from 'react';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';
import { HomepageScene } from '@/components/homepage/HomepageScene';
import { FantasySubNav } from '@/components/fantasy/FantasySubNav';
import { GameweekResultsView } from '@/components/fantasy/GameweekResultsView';

export default function FantasyResults() {
  useEffect(() => { document.title = 'Gameweek Results — Footy Oracle Fantasy'; }, []);
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05020b] text-white">
      <HomepageNav />
      <div className="pt-6"><FantasySubNav /></div>
      <HomepageScene tone="finale">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6"><GameweekResultsView /></div>
      </HomepageScene>
      <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4 md:px-6"><FooterNavigation /></div>
    </div>
  );
}

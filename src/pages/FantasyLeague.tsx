import { useEffect } from 'react';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';
import { HomepageScene } from '@/components/homepage/HomepageScene';
import { FantasyPageHero } from '@/components/fantasy/FantasyPageHero';
import { SquadBuilder } from '@/components/fantasy/SquadBuilder';
import { LeagueStandings } from '@/components/fantasy/LeagueStandings';
import { FantasyPrizes } from '@/components/fantasy/FantasyPrizes';

/**
 * /fantasy-league — the full Fantasy Football page. Interactive React over the
 * Footy Oracle wrapper endpoints: hero, squad builder, live standings, prizes.
 */
export default function FantasyLeague() {
  useEffect(() => {
    document.title = 'Fantasy Football — Footy Oracle Club';
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#05020b] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:46px_46px] opacity-20" />

      <HomepageNav />

      <FantasyPageHero />

      <HomepageScene tone="violet" eyebrow="01 · Pick Your Squad">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <SquadBuilder />
        </div>
      </HomepageScene>

      <HomepageScene tone="finale" eyebrow="02 · The Gaffer League">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <LeagueStandings />
        </div>
      </HomepageScene>

      <HomepageScene tone="violet" eyebrow="03 · Prizes & Glory">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          <FantasyPrizes />
        </div>
      </HomepageScene>

      <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4 md:px-6">
        <FooterNavigation />
      </div>
    </div>
  );
}

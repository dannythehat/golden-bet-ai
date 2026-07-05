import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Lock, ArrowRight } from 'lucide-react';
import { HomepageNav } from '@/components/homepage/HomepageNav';
import { FooterNavigation } from '@/components/homepage/FooterNavigation';
import { HomepageScene } from '@/components/homepage/HomepageScene';
import { FantasySubNav } from '@/components/fantasy/FantasySubNav';
import { FantasyPageHero } from '@/components/fantasy/FantasyPageHero';
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

      <div className="relative z-10 -mt-4 pb-2"><FantasySubNav /></div>

      <HomepageScene tone="violet" eyebrow="01 · Pick Your Squad">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
          {/* Squad building is locked until the membership opens — no team
              placing before launch. */}
          <div className="frost-3d mx-auto max-w-xl rounded-[1.4rem] p-8 text-center md:p-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#f5c542]/40 bg-[#f5c542]/12 text-[#f5c542]">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-3xl uppercase leading-none tracking-tight text-white md:text-4xl">
              Squad building opens<br /><span className="text-[#f8e7a1]">1st August</span>
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60">
              Team picking is locked until the membership opens. The Premier League season kicks off Sat 22nd August —
              get on the waitlist and you'll be first to build your squad.
            </p>
            <Link
              to="/fantasy-waitlist"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_16px_40px_-16px_rgba(245,197,66,1)] transition-transform hover:-translate-y-0.5"
            >
              <CalendarClock className="h-4 w-4" /> Coming 1st August — Join the Waitlist <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
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

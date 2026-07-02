import { Link } from 'react-router-dom';
import {
  ChevronRight, Grid3x3, LineChart, Goal, Swords, Flag, FlagTriangleRight,
  RectangleVertical, House, Plane, BarChart3,
} from 'lucide-react';
import { HOMEPAGE_BACKGROUNDS } from './assets';

/**
 * Form Tables — coded 1:1 to the Canva design (neon-green stadium header + 8
 * market tiles + explore bar). Looks like the mockup, but every tile is a real
 * link and the grid reflows on mobile. Not a baked image.
 */
const TILES = [
  { icon: Goal, title: 'Over 2.5 Goals', desc: 'See which teams score big.', to: '/form-tables?cat=goals' },
  { icon: Swords, title: 'BTTS', desc: 'Track both teams to score.', to: '/form-tables?cat=btts' },
  { icon: Flag, title: 'Over 9.5 Corners', desc: 'Find high corner matchups.', to: '/form-tables?cat=corners' },
  { icon: FlagTriangleRight, title: 'Team Corners', desc: 'Compare team corner stats.', to: '/form-tables?cat=corners' },
  { icon: RectangleVertical, title: 'Cards', desc: 'Spot high card games.', to: '/form-tables?cat=cards' },
  { icon: House, title: 'Home Form', desc: 'See how teams perform at home.', to: '/form-tables' },
  { icon: Plane, title: 'Away Form', desc: 'Track away performance.', to: '/form-tables' },
  { icon: BarChart3, title: 'Last 5/10 Matches', desc: 'Form over the last 5 or 10.', to: '/form-tables' },
];

export function FormTablesSection() {
  return (
    <section
      id="form-tables"
      className="relative scroll-mt-28 overflow-hidden rounded-[1.6rem] border-2 border-emerald-400/60 bg-[#040a06] shadow-[0_0_60px_-12px_rgba(16,185,129,0.6),inset_0_0_40px_-20px_rgba(16,185,129,0.5)]"
    >
      {/* neon-green stadium header band — spans the full width, headline sits on top */}
      <div className="absolute inset-x-0 top-0 h-[300px] sm:h-[340px]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HOMEPAGE_BACKGROUNDS.pitchGreen})` }} />
        {/* darken the left so the headline reads, keep the right vivid */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#040a06] via-[#040a06]/70 to-transparent" />
        {/* fade the band into the tiles below */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#040a06] to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_75%_-10%,rgba(16,185,129,0.35),transparent_55%)]" />
      </div>

      <div className="relative z-10 p-5 md:p-8">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[12px] font-black uppercase tracking-[0.34em] text-emerald-300/90">Footy Oracle</span>
            <h2 className="mt-1 font-display text-5xl uppercase italic leading-[0.8] tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)] sm:text-6xl lg:text-7xl">
              <span className="block text-white">Form</span>
              <span className="block bg-gradient-to-r from-violet-300 via-violet-400 to-violet-600 bg-clip-text text-transparent">Tables</span>
            </h2>
            <p className="mt-3 text-base font-semibold text-white/70">Real form. Key trends. Better decisions.</p>
          </div>
          <Link
            to="/form-tables"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#f5c542]/60 bg-[#0a0f0a]/60 px-3.5 py-2.5 text-[12px] font-black uppercase tracking-wide text-[#f8e7a1] shadow-[0_0_20px_-6px_rgba(245,197,66,0.7)] backdrop-blur transition-colors hover:bg-[#f5c542]/15"
          >
            <Grid3x3 className="h-4 w-4" /> <span className="hidden sm:inline">View All Tables</span><span className="sm:hidden">All</span>
            <ChevronRight className="hidden h-4 w-4 sm:block" />
          </Link>
        </div>

        {/* market tiles */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TILES.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.title}
                to={t.to}
                className="group flex flex-col rounded-2xl border border-emerald-400/20 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-white/[0.06] hover:shadow-[0_0_24px_-8px_rgba(16,185,129,0.6)] sm:p-5"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-violet-400/30 bg-violet-500/12 text-violet-300">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-3 text-base font-black leading-tight text-white">{t.title}</span>
                <span className="mt-1 text-[13px] leading-snug text-white/55">{t.desc}</span>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-violet-300">
                  View Table <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* explore bar — purple neon */}
        <Link
          to="/form-tables"
          className="group mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-violet-500/60 bg-gradient-to-r from-violet-600/25 via-violet-500/15 to-violet-600/25 py-4 text-base font-black uppercase tracking-wide text-white shadow-[0_0_34px_-8px_rgba(139,92,246,0.8)] transition-all hover:from-violet-600/40 hover:to-violet-600/40"
        >
          <LineChart className="h-5 w-5 text-violet-300" /> Explore Today's Form Tables
          <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

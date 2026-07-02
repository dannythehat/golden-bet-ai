import { Link } from 'react-router-dom';
import {
  ChevronRight, Grid3x3, LineChart, Goal, Swords, Flag, FlagTriangleRight,
  RectangleVertical, House, Plane, BarChart3,
} from 'lucide-react';
import { HOMEPAGE_BACKGROUNDS } from './assets';

/**
 * Form Tables — coded to match the Canva design (green stadium header + 8 market
 * tiles + explore bar), but every tile is a real link and the whole thing is
 * responsive. Not a baked image.
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
      className="relative scroll-mt-28 overflow-hidden rounded-[1.6rem] border border-emerald-500/40 bg-[#050b08] shadow-[0_30px_100px_-55px_rgba(16,185,129,0.9)]"
    >
      {/* stadium header band — image on the right, dark on the left for the headline */}
      <div className="absolute inset-x-0 top-0 h-[46%] min-h-[190px]">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${HOMEPAGE_BACKGROUNDS.pitch})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050b08] via-[#050b08]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050b08] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_80%_0%,rgba(16,185,129,0.28),transparent_60%)]" />
      </div>

      <div className="relative z-10 p-5 md:p-7">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-300/80">Footy Oracle</span>
            <h2 className="mt-1 font-display text-4xl uppercase leading-[0.82] tracking-tight sm:text-5xl">
              <span className="block text-white">Form</span>
              <span className="block bg-gradient-to-r from-violet-300 to-violet-500 bg-clip-text text-transparent">Tables</span>
            </h2>
            <p className="mt-2 text-sm text-white/60">Real form. Key trends. Better decisions.</p>
          </div>
          <Link
            to="/form-tables"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#f5c542]/50 bg-[#f5c542]/5 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-[#f8e7a1] transition-colors hover:bg-[#f5c542]/15"
          >
            <Grid3x3 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">View All Tables</span><span className="sm:hidden">All</span>
          </Link>
        </div>

        {/* market tiles */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {TILES.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.title}
                to={t.to}
                className="group flex flex-col rounded-xl border border-emerald-500/15 bg-black/45 p-3.5 transition-all hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-black/60"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="mt-2.5 text-[13px] font-black leading-tight text-white">{t.title}</span>
                <span className="mt-0.5 text-[11px] leading-snug text-white/50">{t.desc}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-violet-300">
                  View Table <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* explore bar */}
        <Link
          to="/form-tables"
          className="group mt-3 flex w-full items-center justify-center gap-2.5 rounded-xl border border-violet-500/50 bg-gradient-to-r from-violet-600/25 to-violet-500/15 py-3.5 text-sm font-black uppercase tracking-wide text-white transition-all hover:from-violet-600/40 hover:to-violet-500/25"
        >
          <LineChart className="h-4 w-4 text-violet-300" /> Explore Today's Form Tables
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

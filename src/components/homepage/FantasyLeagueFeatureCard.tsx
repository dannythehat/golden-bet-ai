import { Link } from 'react-router-dom';
import { ArrowRight, Gift, Palmtree, ShieldCheck, Trophy, Users } from 'lucide-react';

const benefits = [
  { icon: Users, title: 'Compete', body: 'Join the Footy Oracle league and climb the table all season.' },
  { icon: Gift, title: 'Weekly Prizes', body: 'Real rewards for managers who make the right calls.' },
  { icon: Palmtree, title: 'Dream Holiday', body: 'A tropical first prize to keep everyone chasing glory.' },
  { icon: ShieldCheck, title: 'Member League', body: 'Built for the club, backed by the Gaffer, tracked in public.' },
];

export function FantasyLeagueFeatureCard() {
  return (
    <section id="fantasy-league" className="relative min-h-[520px] overflow-hidden rounded-[1.7rem] border border-sky-300/35 bg-[#050814] p-5 shadow-[0_30px_100px_-55px_rgba(56,189,248,0.9)] backdrop-blur-xl md:p-7 lg:min-h-[620px]">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_70%_at_75%_20%,rgba(59,130,246,0.35),transparent_60%),radial-gradient(55%_70%_at_20%_75%,rgba(147,51,234,0.35),transparent_58%),linear-gradient(135deg,rgba(5,8,20,0.86),rgba(9,3,26,0.96))]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.18),transparent_65%)]" />

      <div className="relative z-10 grid h-full gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-sky-300/35 bg-sky-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">Fantasy Premier League</span>
            <span className="rounded-full bg-violet-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">Coming Soon</span>
          </div>

          <h3 className="mt-4 font-display text-4xl uppercase leading-[0.9] text-white sm:text-5xl lg:text-6xl">
            Join the
            <span className="block bg-gradient-to-r from-white via-violet-200 to-violet-500 bg-clip-text text-transparent">League</span>
          </h3>

          <p className="mt-4 max-w-md text-base font-semibold leading-relaxed text-white/76">
            Build your XI, climb the leaderboard and chase proper prizes. This is our own Footy Oracle Fantasy League — made for members, banter and bragging rights.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {benefits.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur-md">
                  <Icon className="h-5 w-5 text-sky-300" />
                  <div className="mt-2 text-sm font-black text-white">{item.title}</div>
                  <div className="mt-0.5 text-[12px] leading-snug text-white/55">{item.body}</div>
                </div>
              );
            })}
          </div>

          <Link to="/fantasy-league" className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3.5 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_18px_50px_-20px_rgba(245,197,66,1)] transition hover:-translate-y-0.5 sm:w-auto">
            Register Interest <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="relative min-h-[300px] overflow-hidden rounded-[1.35rem] border border-white/12 bg-black/25 p-4 lg:min-h-[500px]">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_55%_38%,rgba(245,197,66,0.22),transparent_26%),radial-gradient(circle_at_70%_70%,rgba(59,130,246,0.22),transparent_34%)]" />
          <div className="relative z-10 mx-auto grid h-40 w-40 place-items-center rounded-full border border-[#f5c542]/50 bg-black/50 shadow-[0_0_70px_rgba(245,197,66,0.25)] sm:h-52 sm:w-52">
            <Trophy className="h-24 w-24 fill-[#f5c542] text-[#f5c542] sm:h-32 sm:w-32" />
          </div>

          <div className="relative z-10 mt-4 rounded-2xl border border-[#f5c542]/35 bg-black/48 p-4 text-center backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f5c542]">1st Prize</div>
            <div className="mt-1 font-display text-2xl uppercase text-white">Tropical Escape</div>
            <div className="text-sm font-semibold text-white/62">Dream holiday prize for the season champion.</div>
          </div>

          <div className="relative z-10 mt-3 grid grid-cols-3 gap-2 text-center">
            {['Weekly Pots', 'Prize Drops', 'Gaffer Glory'].map((label) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-3 text-[11px] font-black uppercase leading-tight text-white/80">
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CalendarDays, Flame, Gift, Trophy, Users } from 'lucide-react';
import { HOMEPAGE_MEDIA } from './assets';

const features = [
  { icon: CalendarDays, label: 'Daily Articles', sub: 'Fresh content', to: '/blog' },
  { icon: Flame, label: 'Top Tips', sub: 'Stats and insight', to: '/predictions' },
  { icon: BarChart3, label: 'Form Tables', sub: 'Real form, fast', to: '/form-tables' },
  { icon: Gift, label: 'Weekly Prizes', sub: 'Dream holidays and more', to: '/fantasy-league' },
  { icon: Trophy, label: 'Fantasy League', sub: 'Beat the Gaffer', to: '/fantasy-league' },
  { icon: Users, label: 'Community', sub: 'Banter every day', to: '/community' },
];

export function HeroBannerLayered() {
  return (
    <section id="top" className="relative mx-auto w-full max-w-[1536px] scroll-mt-28 overflow-hidden">
      <div className="relative overflow-hidden border-b border-[#f5c542]/20 bg-[#05020b] md:rounded-b-[1.75rem]">
        <div aria-hidden className="absolute inset-0 bg-cover bg-center opacity-55" style={{ backgroundImage: `url(${HOMEPAGE_MEDIA.stadiumBg})` }} />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,#030108_0%,rgba(3,1,8,0.92)_30%,rgba(3,1,8,0.55)_58%,rgba(3,1,8,0.9)_100%)]" />
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_90%_at_75%_28%,rgba(147,51,234,0.38),transparent_62%),radial-gradient(65%_60%_at_94%_24%,rgba(245,197,66,0.16),transparent_55%)]" />

        <div className="relative mx-auto grid min-h-[620px] max-w-7xl grid-cols-1 items-center gap-8 px-4 pb-20 pt-10 sm:px-6 md:min-h-[690px] lg:grid-cols-[0.92fr_1.08fr] lg:pb-24 lg:pt-16">
          <div className="relative z-20 max-w-2xl text-left">
            <span className="inline-flex rounded-full border border-[#f5c542]/35 bg-black/45 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[#f8e7a1] backdrop-blur-xl">
              Coming soon - 2025/26
            </span>
            <h1 className="mt-5 font-display text-[3rem] uppercase leading-[0.88] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.6rem]">
              Witty. Fun.
              <span className="block">Football.</span>
              <span className="block bg-gradient-to-r from-violet-200 via-violet-400 to-fuchsia-500 bg-clip-text text-transparent">Tips that hit.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed text-white/78 sm:text-lg">
              Daily articles. Sharp picks. In-depth stats. Fantasy league. Weekly prizes. Top banter. All powered by <span className="font-black text-[#f5c542]">The Gaffer.</span>
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/pricing" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_18px_50px_-18px_rgba(245,197,66,1)] transition hover:-translate-y-0.5">
                Join the Club <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <Link to="/predictions" className="group inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-black/35 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#f5c542]/55 hover:text-[#f8e7a1]">
                Explore Today's Tips <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <div className="pointer-events-none relative z-10 hidden min-h-[520px] lg:block">
            <div aria-hidden className="absolute right-[8%] top-[10%] h-[78%] w-[64%] rounded-full bg-violet-600/22 blur-3xl" />
            <img src={HOMEPAGE_MEDIA.gafferPortrait} alt="The Gaffer" className="absolute bottom-0 right-[20%] z-20 w-[48%] max-w-[520px] select-none drop-shadow-[0_35px_80px_rgba(0,0,0,0.75)]" loading="eager" decoding="async" draggable={false} />
            <div className="absolute right-0 top-[13%] z-10 h-[330px] w-[270px] rounded-2xl border border-white/12 bg-black/45 p-5 shadow-[0_20px_70px_-35px_rgba(0,0,0,1)] backdrop-blur-md">
              <p className="font-display text-2xl uppercase leading-tight text-white">Plan.<br />Prepare.<br />Predict.<br /><span className="text-[#f5c542]">Win.</span></p>
              <div className="mt-6 aspect-[4/3] rounded-lg border border-white/15 bg-[linear-gradient(90deg,rgba(255,255,255,.10)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.10)_1px,transparent_1px)] bg-[size:28px_28px]" />
            </div>
          </div>
        </div>

        <div className="relative z-30 mx-auto -mt-14 max-w-7xl px-3 pb-5 sm:px-4 md:px-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/12 bg-black/52 p-2 shadow-[0_24px_80px_-45px_rgba(0,0,0,1)] backdrop-blur-xl sm:grid-cols-3 lg:grid-cols-6">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} to={item.to} className="group rounded-xl border border-white/8 bg-white/[0.035] p-3 transition hover:-translate-y-0.5 hover:border-violet-300/35 hover:bg-violet-400/[0.08]">
                  <Icon className="h-5 w-5 text-violet-300" />
                  <div className="mt-2 text-[11px] font-black uppercase tracking-wide text-white">{item.label}</div>
                  <div className="mt-0.5 text-[10px] leading-tight text-white/50">{item.sub}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

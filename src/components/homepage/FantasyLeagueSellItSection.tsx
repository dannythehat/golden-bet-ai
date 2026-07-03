import { Link } from 'react-router-dom';
import { Palmtree, Gift, Star, ArrowRight, Trophy, Users, Crown, ShieldCheck, ChevronRight } from 'lucide-react';
import { useFantasyHomepageSummary, type FantasyHomepageSummary } from '@/hooks/useFantasyHomepageSummary';

const COLLAGE = '/images/fantasy/fantasy-collage.jpg';
const DONKEY = '/images/fantasy/donkey-badge.png';

/** A prize card — icon, title, subtitle, links into the league. */
function PrizeCard({ icon, title, subtitle, to, tone, wiggle, badge }: {
  icon?: React.ReactNode; title: string; subtitle: string; to: string; tone: 'gold' | 'violet'; wiggle?: boolean; badge?: string;
}) {
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl border bg-[#0b0518]/70 p-4 backdrop-blur transition-all hover:-translate-y-1 ${
        tone === 'gold' ? 'border-[#f5c542]/35 hover:border-[#f5c542]/70 hover:shadow-[0_0_34px_-10px_rgba(245,197,66,0.7)]' : 'border-violet-400/25 hover:border-violet-400/60 hover:shadow-[0_0_34px_-10px_rgba(139,92,246,0.7)]'
      }`}
    >
      {badge ? (
        <img src={badge} alt={title} loading="lazy" draggable={false} className={`h-11 w-11 rounded-full object-cover ${wiggle ? 'transition-transform duration-300 group-hover:-rotate-12' : ''}`} />
      ) : (
        <span className={`grid h-11 w-11 place-items-center rounded-xl border ${tone === 'gold' ? 'border-[#f5c542]/30 bg-[#f5c542]/10 text-[#f5c542]' : 'border-violet-400/30 bg-violet-500/15 text-violet-300'} ${wiggle ? 'transition-transform duration-300 group-hover:-rotate-12' : ''}`}>{icon}</span>
      )}
      <div className="mt-3 text-sm font-black uppercase tracking-wide text-white">{title}</div>
      <p className="mt-1 text-[12px] leading-snug text-white/55">{subtitle}</p>
    </Link>
  );
}

const BENEFITS = [
  { icon: Users, title: 'Join the League', sub: 'Compete with football fans' },
  { icon: Trophy, title: 'Win Prizes', sub: 'Weekly rewards & season-long glory' },
  { icon: Crown, title: 'Gaffer Powered', sub: 'Banter, rivalries & unmatched fun' },
];

function SkeletonFantasy() {
  return (
    <div className="animate-pulse p-6 md:p-9">
      <div className="h-5 w-32 rounded-full bg-white/10" />
      <div className="mt-4 h-12 w-3/4 rounded-lg bg-white/10" />
      <div className="mt-2 h-12 w-2/3 rounded-lg bg-white/[0.07]" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/[0.05]" />)}
      </div>
      <div className="mt-6 h-12 w-56 rounded-xl bg-white/[0.08]" />
    </div>
  );
}

/**
 * FantasyLeagueSellItSection — the homepage sales section for the Fantasy
 * League. Real interactive HTML (headline, prize cards, CTAs, benefits) over
 * the cinematic Gaffer + prize collage. Data from the fantasy homepage summary
 * (falls back so the homepage never breaks).
 */
export function FantasyLeagueSellItSection() {
  const { data, isLoading } = useFantasyHomepageSummary();

  if (isLoading && !data) {
    return (
      <section id="fantasy-league" className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#070312] md:rounded-[2rem]">
        <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />
        <SkeletonFantasy />
      </section>
    );
  }

  const d = data as FantasyHomepageSummary;
  const open = d.season.registrationOpen;

  return (
    <section id="fantasy-league" className="relative overflow-hidden rounded-[1.6rem] border border-violet-400/25 bg-[#070312] shadow-[0_0_60px_-22px_rgba(124,58,237,0.7)] md:rounded-[2rem]">
      <style>{`@keyframes fantasyQuoteIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}} @keyframes ctaPulse{0%,100%{box-shadow:0 16px 40px -16px rgba(245,197,66,0.9)}50%{box-shadow:0 16px 52px -12px rgba(245,197,66,1)}} .cta-pulse{animation:ctaPulse 2.4s ease-in-out infinite}`}</style>
      {/* atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_-8%,rgba(124,58,237,0.30),transparent_44%),radial-gradient(circle_at_8%_20%,rgba(245,197,66,0.10),transparent_38%),radial-gradient(circle_at_60%_120%,rgba(124,58,237,0.16),transparent_46%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:34px_34px] opacity-40" />
      <div className="h-[3px] bg-[linear-gradient(90deg,#5b1b8f_0%,#f5c542_48%,#5b1b8f_100%)]" />

      {/* ── top region: content + collage (collage bounded here, never over the strip) ── */}
      <div className="relative">
        {/* collage — right visual layer, clipped to this region */}
        <img src={COLLAGE} alt="The Gaffer and the Fantasy League prizes" loading="lazy" draggable={false}
          className="pointer-events-none absolute bottom-0 right-0 top-0 z-0 hidden h-full w-auto max-w-[52%] select-none object-cover object-right-bottom opacity-95 lg:block" />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1] hidden bg-gradient-to-r from-[#070312] via-[#070312]/78 to-transparent lg:block" />

        {/* quote card — HTML, animates in, top-right on desktop */}
        <div className="absolute right-5 top-6 z-[2] hidden max-w-[240px] rounded-2xl border border-violet-400/30 bg-[#0b0518]/90 p-4 shadow-[0_10px_40px_-14px_rgba(124,58,237,0.8)] backdrop-blur-md lg:block" style={{ animation: 'fantasyQuoteIn 0.7s ease-out both' }}>
          <span className="font-display text-3xl leading-none text-violet-400">“</span>
          <p className="-mt-3 text-[14px] font-semibold leading-snug text-white/90">{d.gafferQuote.text}</p>
          <div className="mt-1 text-right font-['Dancing_Script'] text-xl font-semibold text-[#f8e7a1]">{d.gafferQuote.author}</div>
        </div>

        <div className="relative z-[2] p-6 md:p-9">
          <div className="max-w-3xl">
          {/* eyebrow */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/45 bg-[#f5c542]/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#f8e7a1]">
            <Crown className="h-3.5 w-3.5 fill-current" /> Fantasy League
          </span>

          {/* headline */}
          <h2 className="mt-4 font-display text-5xl uppercase leading-[0.88] tracking-tight text-white antialiased md:text-7xl">
            Pick Your XI.<br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">Beat</span> The Gaffer.
          </h2>

          {/* supporting copy */}
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/70 md:text-base">
            Join the Footy Oracle Fantasy League. Weekly prizes. Epic bragging rights. <span className="font-bold text-[#f8e7a1]">Gaffer-powered</span> banter all season long.
          </p>

          {/* mobile visual — Gaffer + prizes collage with the quote (desktop uses the right layer) */}
          <div className="relative mt-5 overflow-hidden rounded-2xl border border-violet-400/25 lg:hidden">
            <img src={COLLAGE} alt="The Gaffer and the Fantasy League prizes" loading="lazy" draggable={false} className="h-64 w-full select-none object-cover object-[32%_25%] sm:h-72" />
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070312] via-[#070312]/20 to-transparent" />
            <div className="absolute inset-x-3 bottom-3 rounded-xl border border-violet-400/30 bg-[#0b0518]/85 p-3 backdrop-blur-md">
              <p className="text-[13px] font-semibold leading-snug text-white/90">“{d.gafferQuote.text}”</p>
              <div className="mt-0.5 text-right font-['Dancing_Script'] text-lg font-semibold text-[#f8e7a1]">{d.gafferQuote.author}</div>
            </div>
          </div>

          {/* live stats */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/55">
            <span className="inline-flex items-center gap-1.5 text-violet-200"><Users className="h-3.5 w-3.5" /> {d.stats.membersJoined.toLocaleString()} joined</span>
            <span className="hidden h-3 w-px bg-white/15 sm:block" />
            <span className="inline-flex items-center gap-1.5 text-[#f8e7a1]"><Gift className="h-3.5 w-3.5" /> {d.stats.weeklyPrizesCount} weekly prizes</span>
            <span className="hidden h-3 w-px bg-white/15 sm:block" />
            <span className="inline-flex items-center gap-1.5 text-emerald-300"><Trophy className="h-3.5 w-3.5" /> {d.stats.daysUntilLaunch} days to launch</span>
          </div>

          {/* prize cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PrizeCard tone="gold" icon={<Palmtree className="h-5 w-5" />} title={d.topPrize.title} subtitle={d.topPrize.subtitle} to={d.season.joinUrl} />
            <PrizeCard tone="violet" icon={<Gift className="h-5 w-5" />} title={d.weeklyPrize.title} subtitle={d.weeklyPrize.subtitle} to={d.season.joinUrl} />
            {d.donkeyOfTheWeek.enabled && (
              <PrizeCard tone="gold" badge={DONKEY} wiggle title={d.donkeyOfTheWeek.title} subtitle={d.donkeyOfTheWeek.subtitle} to={d.season.joinUrl} />
            )}
            {d.themedGiveaways.enabled && (
              <PrizeCard tone="violet" icon={<Star className="h-5 w-5" />} title={d.themedGiveaways.title} subtitle={d.themedGiveaways.subtitle} to={d.season.joinUrl} />
            )}
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {open ? (
              <Link to={d.season.joinUrl} className="cta-pulse inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[#16051f] transition-transform hover:-translate-y-0.5">
                <ArrowRight className="h-4 w-4" /> Play Fantasy Now
              </Link>
            ) : (
              <Link to="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[#16051f] transition-transform hover:-translate-y-0.5">
                <ArrowRight className="h-4 w-4" /> Join the Club
              </Link>
            )}
            <Link to="/pricing" className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/45 bg-violet-500/[0.08] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-violet-100 transition-all hover:-translate-y-0.5 hover:bg-violet-500/15">
              View Prizes <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {open === false && (
              <p className="mt-3 max-w-md text-sm text-white/55">Fantasy League details are being finalised. Join the club now and be first in when the league opens.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── bottom benefits strip — full width, clean dark, below the collage ── */}
      <div className="relative z-[2] grid gap-3 border-t border-white/10 bg-[#070312]/70 px-6 py-5 backdrop-blur-sm sm:grid-cols-2 md:px-9 lg:grid-cols-4">
        {BENEFITS.map((b) => (
          <div key={b.title} className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/[0.04] text-[#f5c542]"><b.icon className="h-4 w-4" /></span>
            <span className="leading-tight">
              <span className="block text-[12px] font-black uppercase tracking-wide text-white">{b.title}</span>
              <span className="block text-[11px] text-white/50">{b.sub}</span>
            </span>
          </div>
        ))}
        <Link to="/pricing" className="group flex items-center gap-3 rounded-xl border border-violet-400/30 bg-violet-500/[0.06] px-3 py-2.5 transition-colors hover:bg-violet-500/12">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-400/40 bg-violet-500/15 text-violet-200"><ShieldCheck className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[12px] font-black uppercase tracking-wide text-[#f8e7a1]">Included with membership</span>
            <span className="block truncate text-[11px] text-white/55">One league. All prizes. All season.</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

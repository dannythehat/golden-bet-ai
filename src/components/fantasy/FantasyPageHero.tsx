import { Link } from 'react-router-dom';
import { Crown, ArrowRight, ChevronDown, Trophy, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useFantasyPlayers, useFantasyStandings, useFantasyMeta } from '@/hooks/useFantasyLeague';
import { PlayerCard } from './PlayerCard';
import { Countdown } from './Countdown';

const STADIUM = '/images/backgrounds/bg-stadium.jpg';
const GAFFER = '/images/gaffer/gaffer-pointing-you.png';

function MovementIcon({ m }: { m: 'up' | 'down' | 'same' }) {
  if (m === 'up') return <TrendingUp className="h-3 w-3 text-emerald-400" />;
  if (m === 'down') return <TrendingDown className="h-3 w-3 text-red-400" />;
  return <Minus className="h-3 w-3 text-white/30" />;
}

/**
 * Fantasy page hero — brand lockup, "Pick your XI. Beat the Gaffer.", live GW
 * countdown, entry CTAs, a showcase of the top-rated players and a live mini
 * leaderboard. The Gaffer fronts it. All data-driven; art is decorative.
 */
export function FantasyPageHero() {
  const { data: pd } = useFantasyPlayers();
  const { data: sd } = useFantasyStandings();
  const { data: md } = useFantasyMeta();

  const showcase = (pd?.players ?? [])
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);
  const leaders = (sd?.rows ?? []).slice(0, 5);
  const meta = md;

  return (
    <section className="relative overflow-hidden">
      {/* background: stadium + purple wash */}
      <img src={STADIUM} alt="" aria-hidden loading="eager" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_80%_-10%,rgba(124,58,237,0.45),transparent_50%),radial-gradient(circle_at_10%_20%,rgba(245,197,66,0.14),transparent_45%),linear-gradient(180deg,rgba(5,2,11,0.55),#05020b_88%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ── left: copy ── */}
        <div>
          {/* brand lockup */}
          <div className="inline-flex flex-col">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 fill-[#f5c542] text-[#f5c542]" />
              <span className="font-display text-2xl leading-none md:text-3xl">
                <span className="text-[#f5c542]">FOOTY</span> <span className="text-white">ORACLES</span>
              </span>
            </div>
            <span className="mt-2 inline-flex items-center gap-2 self-start rounded-full border border-[#f5c542]/45 bg-[#f5c542]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.32em] text-[#f8e7a1]">
              Fantasy Football
            </span>
          </div>

          <h1 className="mt-5 font-display text-5xl uppercase leading-[0.86] tracking-tight text-white md:text-7xl">
            Pick Your XI.
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">Beat</span> The Gaffer.
          </h1>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 md:text-base">
            Build your dream squad on a <span className="font-bold text-[#f8e7a1]">£{pd?.rules.budget ?? 95}m</span> budget, climb the
            leaderboard and chase real cash. Outscore The Gaffer and the bragging rights are yours.
          </p>

          {/* GW deadline countdown */}
          <div className="mt-6 inline-flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0b0518]/70 p-4 backdrop-blur sm:flex-row sm:items-center sm:gap-5">
            <div className="leading-tight">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">{meta?.gameweek.label ?? 'Next Gameweek'} deadline</div>
              <div className="text-[11px] text-white/45">Lock your team before kick-off</div>
            </div>
            <Countdown deadline={meta?.gameweek.deadline ?? null} />
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to={meta?.season.joinUrl ?? '/pricing'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-3.5 text-sm font-black uppercase tracking-wide text-[#16051f] transition-transform hover:-translate-y-0.5">
              <Trophy className="h-4 w-4 fill-current" /> Enter the League
            </Link>
            <a href="#pick-squad" className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/45 bg-violet-500/[0.08] px-7 py-3.5 text-sm font-black uppercase tracking-wide text-violet-100 transition-all hover:-translate-y-0.5 hover:bg-violet-500/15">
              Build Your Squad <ChevronDown className="h-4 w-4" />
            </a>
          </div>

          {/* entries */}
          {meta && (
            <div className="mt-5 inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.14em] text-white/55">
              <Users className="h-4 w-4 text-violet-300" /> {meta.entries.toLocaleString()} managers already in
            </div>
          )}
        </div>

        {/* ── right: Gaffer + showcase + mini leaderboard ── */}
        <div className="relative">
          <div className="relative mx-auto max-w-md lg:max-w-none">
            {/* Gaffer */}
            <img src={GAFFER} alt="The Gaffer" loading="eager" draggable={false} className="pointer-events-none relative z-10 mx-auto h-[300px] w-auto select-none object-contain drop-shadow-[0_30px_60px_rgba(124,58,237,0.5)] md:h-[420px]" />

            {/* player showcase — top-rated cards, floating bottom-left */}
            <div className="absolute -bottom-2 left-0 z-20 flex -space-x-4 sm:-space-x-2">
              {showcase.map((p, i) => (
                <div key={p.id} className={i === 1 ? 'z-10 -mt-4' : ''} style={{ transform: `rotate(${(i - 1) * 6}deg)` }}>
                  <PlayerCard player={p} size="sm" />
                </div>
              ))}
            </div>

            {/* mini leaderboard — floating top-right */}
            <div className="absolute -right-1 top-2 z-20 w-[220px] rounded-2xl border border-[#f5c542]/25 bg-[#0b0518]/90 p-3 shadow-[0_20px_50px_-18px_rgba(0,0,0,0.9)] backdrop-blur-md sm:right-0 md:w-[240px]">
              <div className="flex items-center gap-1.5 border-b border-white/10 pb-2">
                <Crown className="h-3.5 w-3.5 fill-[#f5c542] text-[#f5c542]" />
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f8e7a1]">The Gaffer League</span>
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {leaders.map((r) => (
                  <li key={r.rank} className={`flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] ${r.isGaffer ? 'bg-[#f5c542]/12' : ''}`}>
                    <span className={`w-4 text-center font-black ${r.rank <= 3 ? 'text-[#f5c542]' : 'text-white/40'}`}>{r.rank}</span>
                    <MovementIcon m={r.movement} />
                    <span className={`flex-1 truncate font-bold ${r.isGaffer ? 'text-[#f8e7a1]' : 'text-white/80'}`}>{r.team}</span>
                    <span className="font-black tabular-nums text-white/90">{r.total.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* gold divider */}
      <div className="h-[3px] w-full bg-[linear-gradient(90deg,transparent,#f5c542_50%,transparent)]" />
    </section>
  );
}

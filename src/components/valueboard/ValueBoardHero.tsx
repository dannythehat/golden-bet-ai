import { BarChart3, Bell, ShieldCheck, Sparkles, Lock } from 'lucide-react';
import { BoardSection } from './BoardSection';

/** Hero — the Gaffer fronting his data command centre. */
export function ValueBoardHero({ updatedLabel, quietDay }: { updatedLabel: string; quietDay: boolean }) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <BoardSection tone="gold">
      {/* stadium backdrop + the Gaffer as curator */}
      <div className="relative">
        <img
          src="/images/backgrounds/bg-stadium.jpg"
          alt=""
          loading="eager"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[center_30%] opacity-30"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#130321] via-[#130321]/75 to-[#130321]/40" />
        <img
          src="/images/gaffer/gaffer-pointing-board.jpg"
          alt="The Gaffer"
          loading="eager"
          draggable={false}
          className="pointer-events-none absolute right-0 top-0 z-[1] hidden h-full w-auto select-none object-cover object-left [mask-image:linear-gradient(90deg,transparent_0%,#000_30%)] md:block md:max-w-[46%]"
        />
        {/* mobile: the Gaffer celebrating in the corner — never a wall of text alone */}
        <img
          src="/images/gaffer/opt/gaffer-celebrating.webp"
          alt=""
          loading="eager"
          draggable={false}
          className="pointer-events-none absolute -right-4 -top-1 z-[1] h-36 w-auto select-none opacity-90 md:hidden"
        />

        <div className="relative z-[2] p-5 md:max-w-[58%] md:p-9">
          <div className="flex flex-wrap items-center gap-1.5 pr-24 md:pr-0">
            {[
              { icon: Sparkles, text: 'Free Preview' },
              { icon: Lock, text: quietDay ? 'Quiet Day — No Forced Picks' : `Updated ${updatedLabel}` },
              { icon: ShieldCheck, text: 'No Forced Picks' },
              { icon: BarChart3, text: 'Data-led Football Insights' },
            ].map((b) => (
              <span key={b.text} className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c542]/35 bg-black/40 px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.14em] text-[#f8e7a1]">
                <b.icon className="h-3 w-3" /> {b.text}
              </span>
            ))}
          </div>

          <h1 className="mt-4 font-display text-4xl uppercase leading-[0.92] tracking-tight text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.8)] md:text-6xl">
            The Gaffer's <span className="bg-gradient-to-r from-[#ffe487] to-[#f5c542] bg-clip-text text-transparent">Value Board</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 md:text-[15px]">
            I scan the goals, corners, cards and both-teams-to-score tables, compare what the form says against what
            the market's paying, and put the gaps on one board. The table has spoken — I've just made it readable.
          </p>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button
              onClick={() => scrollTo('market-board')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-[#16051f] shadow-[0_16px_40px_-16px_rgba(245,197,66,1)] transition-transform hover:-translate-y-0.5"
            >
              <BarChart3 className="h-4 w-4" /> View Today's Markets
            </button>
            <button
              onClick={() => scrollTo('value-alerts')}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/10 px-6 py-3 text-sm font-black uppercase tracking-wide text-violet-200 transition-colors hover:bg-violet-500/20"
            >
              <Bell className="h-4 w-4" /> Set Email Alerts
            </button>
          </div>
        </div>
      </div>
    </BoardSection>
  );
}

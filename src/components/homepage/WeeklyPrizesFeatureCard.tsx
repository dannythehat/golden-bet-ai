import { Link } from 'react-router-dom';
import { Gift, ArrowRight, Sparkles } from 'lucide-react';
import { useWeeklyPrizes } from './useHomepageData';
import { RANDOM_PRIZES, THEMED_EVENTS } from './content';

export function WeeklyPrizesFeatureCard() {
  const { data: prizes = [] } = useWeeklyPrizes();
  const primaryLink = prizes.find((p) => p.link)?.link ?? '/fantasy-league';

  const random = prizes.filter((p) => p.category === 'random').map((p) => p.title);
  const themed = prizes.filter((p) => p.category === 'themed').map((p) => p.title);
  const randomList = random.length ? random : RANDOM_PRIZES;
  const themedList = themed.length ? themed : THEMED_EVENTS;

  return (
    <Link
      id="weekly-prizes"
      to={primaryLink}
      className="group block overflow-hidden rounded-2xl border border-amber-400/45 bg-gradient-to-br from-[#1d0e02] via-[#120904] to-[#0a0501] p-5 shadow-[0_0_60px_-20px_rgba(251,191,36,0.5)] md:rounded-3xl md:p-7"
    >
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-amber-300" />
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">
          Weekly Prizes
        </span>
      </div>
      <h2 className="mt-2 font-display text-3xl leading-tight text-white sm:text-4xl">
        Hampers, gear &amp;{' '}
        <span className="text-amber-300">glory</span>.
      </h2>

      <div className="mt-4 space-y-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-200/80">
            Random Prizes
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {randomList.slice(0, 6).map((p) => (
              <li
                key={p}
                className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-200/80">
            <Sparkles className="h-3 w-3" /> Themed Events
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {themedList.slice(0, 4).map((p) => (
              <li
                key={p}
                className="rounded-full border border-amber-400/50 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-100"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300 transition-transform group-hover:translate-x-0.5">
        View All Prizes <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, BarChart3, TrendingUp, Users } from 'lucide-react';
import { useTipOfTheDay } from './useHomepageData';

function formatTipTime(value?: string | null) {
  if (!value) return 'Updated daily';
  return `Updated ${new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatOdds(odds: number | string) {
  return typeof odds === 'number' ? odds.toFixed(2) : odds;
}

export function TipOfTheDayCard() {
  const { data: tip } = useTipOfTheDay();

  const stats = [
    { Icon: BadgeCheck, value: `${tip?.confidence ?? 72}%`, label: 'Confidence' },
    { Icon: BarChart3, value: '8/10', label: 'Form Guide' },
    { Icon: TrendingUp, value: '4', label: 'Tips Won' },
    { Icon: Users, value: '9.4K+', label: 'Following' },
  ];

  return (
    <section
      id="tip-of-the-day"
      className="overflow-hidden rounded-2xl border border-sky-400/45 bg-gradient-to-br from-[#04111f] via-[#020a16] to-[#01060e] p-5 shadow-[0_0_70px_-20px_rgba(56,189,248,0.55)] md:rounded-3xl md:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-300">
          Tip of the Day
        </span>
        <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[10px] font-semibold text-sky-200">
          {formatTipTime(tip?.updated_at)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-sky-400/25 bg-sky-500/5 p-3">
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-wider text-white/60">Home</div>
          <div className="mt-0.5 text-base font-black uppercase leading-tight text-white sm:text-lg">
            {tip?.home_team ?? 'Home'}
          </div>
        </div>
        <div className="text-[10px] font-black uppercase tracking-wider text-sky-300">vs</div>
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-wider text-white/60">Away</div>
          <div className="mt-0.5 text-base font-black uppercase leading-tight text-white sm:text-lg">
            {tip?.away_team ?? 'Away'}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-sky-400/40 bg-sky-500/10 p-4 text-center shadow-[0_0_30px_-12px_rgba(56,189,248,0.7)]">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">Our Tip</div>
        <div className="mt-1 text-xl font-black uppercase leading-tight text-white sm:text-2xl">
          {tip?.market ?? "Today's Pick"}
        </div>
        <div className="mt-1 text-2xl font-black text-sky-300 sm:text-3xl">
          {tip ? formatOdds(tip.odds) : '—'}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-sky-400/20 bg-sky-500/5 p-2 text-center">
            <s.Icon className="mx-auto h-4 w-4 text-sky-300" />
            <div className="mt-1 text-sm font-black text-white">{s.value}</div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-white/60">{s.label}</div>
          </div>
        ))}
      </div>

      <Link
        to="/fixtures"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-full border border-sky-400/50 bg-sky-500/15 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-sky-100 transition-colors hover:bg-sky-500/25"
      >
        View All Today's Tips
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

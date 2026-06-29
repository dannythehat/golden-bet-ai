import { ArrowRight, Clock, Flame, Sparkles } from 'lucide-react';
import { SectionShell } from './primitives';

/**
 * Tip of the Day — premium placeholder until the live daily-pick data source
 * is wired in. Expected shape when connected:
 *   { home_team, away_team, home_badge, away_badge,
 *     market, odds, confidence, short_reason, updated_at }
 *
 * Pass `tip` as a prop once available; renders the "warming up" state when null.
 */
export interface DailyTip {
  home_team: string;
  away_team: string;
  home_badge?: string | null;
  away_badge?: string | null;
  market: string;
  odds: number | string;
  confidence: number; // 0-100
  short_reason?: string | null;
  updated_at?: string | null;
}

function TeamBadge({ name, badge }: { name: string; badge?: string | null }) {
  const short = name.slice(0, 3).toUpperCase();
  return (
    <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-sky-400/40 bg-sky-950/60 font-display text-lg tracking-wide text-sky-200 shadow-[0_0_25px_-8px_rgba(56,189,248,0.8)]">
      {badge ? <img src={badge} alt={name} className="h-full w-full object-contain p-1.5" loading="lazy" /> : short}
    </span>
  );
}

export function TipOfTheDayCard({ tip }: { tip?: DailyTip | null }) {
  return (
    <SectionShell
      id="tip-of-the-day"
      glow={{ border: 'rgba(56,189,248,0.45)', glow: 'rgba(14,165,233,0.5)' }}
      className="bg-gradient-to-br from-[#04111f] via-[#06182b] to-[#040d18] p-5 md:p-8"
    >
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Flame className="h-9 w-9 text-sky-400" />
          <div>
            <h2 className="font-display text-3xl tracking-wide md:text-4xl">
              <span className="text-sky-400">TIP</span> <span className="text-white">OF THE DAY</span>
            </h2>
            <p className="text-white/60">Expert pick. Back it with confidence.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-sky-400/30 px-4 py-2">
          <Clock className="h-5 w-5 text-sky-400" />
          <span>
            <span className="block text-sm font-bold text-white">Daily Tip</span>
            <span className="block text-xs text-white/55">
              {tip?.updated_at
                ? new Date(tip.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                : 'Updated daily'}
            </span>
          </span>
        </div>
      </div>

      {tip ? (
        <>
          {/* Match */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-sky-400/15 bg-sky-950/20 p-5 md:flex-row md:justify-center md:gap-8">
            <div className="flex items-center gap-3">
              <TeamBadge name={tip.home_team} badge={tip.home_badge} />
              <div className="text-left">
                <div className="font-display text-2xl tracking-wide text-white">{tip.home_team}</div>
                <div className="text-xs uppercase tracking-widest text-white/50">Home</div>
              </div>
            </div>

            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-sky-400/40 font-display text-lg text-white">VS</div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-display text-2xl tracking-wide text-white">{tip.away_team}</div>
                <div className="text-xs uppercase tracking-widest text-white/50">Away</div>
              </div>
              <TeamBadge name={tip.away_team} badge={tip.away_badge} />
            </div>
          </div>

          {/* Our tip */}
          <div className="mx-auto -mt-3 w-fit rounded-2xl border border-sky-400/40 bg-[#06182b] px-8 py-3 text-center shadow-[0_0_30px_-10px_rgba(56,189,248,0.8)]">
            <div className="text-xs font-black uppercase tracking-widest text-sky-400">Our Tip</div>
            <div className="font-display text-2xl tracking-wide text-white">{tip.market}</div>
            <div className="font-display text-3xl text-sky-400">{typeof tip.odds === 'number' ? tip.odds.toFixed(2) : tip.odds}</div>
          </div>

          {tip.short_reason && (
            <p className="mt-5 rounded-2xl border border-sky-400/15 bg-sky-950/20 p-4 text-center text-sm text-white/75">
              {tip.short_reason}
            </p>
          )}

          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-white/70">
            <span className="rounded-full border border-sky-400/30 px-3 py-1">
              Confidence <span className="font-display text-base text-sky-300">{tip.confidence}%</span>
            </span>
          </div>
        </>
      ) : (
        /* Premium "warming up" placeholder */
        <div className="rounded-2xl border border-sky-400/15 bg-sky-950/20 p-10 text-center">
          <Sparkles className="mx-auto h-10 w-10 animate-pulse text-sky-400" />
          <p className="mt-4 font-display text-2xl tracking-wide text-white">The Gaffer's still picking today's tip.</p>
          <p className="mt-2 text-sm text-white/55">Pop back shortly — the next call lands daily.</p>
        </div>
      )}

      <a href="/fixtures" className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-4 font-display text-xl tracking-wide text-white shadow-[0_10px_30px_-12px_rgba(56,189,248,0.8)] transition-transform hover:scale-[1.01]">
        VIEW ALL TODAY'S TIPS <ArrowRight className="h-5 w-5" />
      </a>
    </SectionShell>
  );
}

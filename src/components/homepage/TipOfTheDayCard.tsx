import { BadgeCheck } from 'lucide-react';
import { TeamAvatar } from '@/components/TeamAvatar';
import { FeaturePanel, Accent } from './FeaturePanel';
import { useTipOfTheDay } from './useHomepageData';
import { TIP_OF_THE_DAY } from './content';

/** Tip of the Day — native card wired to the latest gaffer_pick, with fallback. */
export function TipOfTheDayCard() {
  const { data: tip } = useTipOfTheDay();

  const home = tip?.home_team ?? TIP_OF_THE_DAY.home.name;
  const away = tip?.away_team ?? TIP_OF_THE_DAY.away.name;
  const market = tip?.market ?? TIP_OF_THE_DAY.tip;
  const oddsRaw = tip?.odds ?? TIP_OF_THE_DAY.odds;
  const odds = typeof oddsRaw === 'number' ? oddsRaw.toFixed(2) : String(oddsRaw || '—');
  const confidence = tip?.confidence ?? 72;

  return (
    <FeaturePanel
      tone="emerald"
      eyebrow="Tip of the Day"
      title={<>The Gaffer's <Accent tone="emerald">stand-out.</Accent></>}
      body="One value bet picked every morning — the sharpest single on the card, straight from the Gaffer."
      ctas={[{ label: "View Today's Tips", to: '/form-tables' }]}
    >
      <div className="rounded-2xl border border-white/10 bg-[#07000f]/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex shrink-0 -space-x-1.5">
              <TeamAvatar name={home} logoUrl={null} size={32} />
              <TeamAvatar name={away} logoUrl={null} size={32} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{home} <span className="text-white/35">v</span> {away}</div>
              <div className="mt-0.5 inline-flex rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-200">{market}</div>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-xl leading-none text-[#f5c542]">{odds}</div>
            <div className="text-[10px] uppercase tracking-wide text-white/45">odds</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-white/50">
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-300" /> Confidence
          <div className="ml-1 h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-[#f5c542]" style={{ width: `${confidence}%` }} />
          </div>
          <span className="font-bold text-white">{confidence}%</span>
        </div>
      </div>
    </FeaturePanel>
  );
}

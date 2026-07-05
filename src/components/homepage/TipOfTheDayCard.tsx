import { BadgeCheck, Clock, Trophy } from 'lucide-react';
import { TeamAvatar } from '@/components/TeamAvatar';
import { FeaturePanel, Accent } from './FeaturePanel';
import { getValueCandidates, type Leg } from '@/lib/gafferSelection';
import rawSnapshot from '@/data/formTablesData.json';
import type { FormFixtureRow } from '@/types/footy';

const SNAP = (rawSnapshot as unknown as { fixtures: FormFixtureRow[] }).fixtures ?? [];
const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Backfill missing crest URLs from the matching slate fixture. */
function withLogos(leg: Leg): Leg {
  if (leg.home.logo && leg.away.logo) return leg;
  const h = norm(leg.home.name), a = norm(leg.away.name);
  const f = SNAP.find((x) => {
    const fh = norm(x.home.name), fa = norm(x.away.name);
    return (fh === h && fa === a) || (fh === a && fa === h);
  });
  if (!f) return leg;
  return {
    ...leg,
    home: { ...leg.home, logo: leg.home.logo ?? f.home.logo ?? null },
    away: { ...leg.away, logo: leg.away.logo ?? f.away.logo ?? null },
  };
}

/**
 * Tip of the Day — the Gaffer's single sharpest pick, straight from the same
 * locked morning selection that builds the value board (leg 1 of the double).
 * No dead CMS fallbacks: if there's no board, the Gaffer says so.
 */
export function TipOfTheDayCard() {
  const top = getValueCandidates()[0];
  const tip = top ? withLogos(top) : null;

  return (
    <FeaturePanel
      id="tip-of-the-day"
      tone="emerald"
      eyebrow="Tip of the Day"
      title={<>The Gaffer's <Accent tone="emerald">stand-out.</Accent></>}
      body="One value bet picked every morning — the sharpest single on the card, straight from the Gaffer."
      ctas={[{ label: "View Today's Tips", to: '/form-tables' }]}
    >
      {tip ? (
        <div
          className="relative rounded-[13px] p-px shadow-[0_2px_4px_-1px_rgba(0,0,0,0.7),0_18px_36px_-18px_rgba(0,0,0,0.95)]"
          style={{ background: 'linear-gradient(160deg,rgba(110,231,183,0.5) 0%,rgba(255,255,255,0.06) 45%,rgba(110,231,183,0.25) 100%)' }}
        >
          <div className="relative overflow-hidden rounded-[12px] bg-gradient-to-b from-[#1b1236] to-[#120a28]">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {/* league + kick-off */}
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-3.5 py-2">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Trophy className="h-2.5 w-2.5 shrink-0 text-[#f5c542]/70" />
                <span className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-[#f8e7a1]/70">{[tip.region, tip.league].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-black tracking-tight text-[#f8e7a1] [font-variant-numeric:tabular-nums]">
                <Clock className="h-3 w-3 text-[#f5c542]/80" /> {tip.time}
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">KO</span>
              </span>
            </div>

            {/* teams */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              <div className="flex shrink-0 -space-x-1.5">
                <TeamAvatar name={tip.home.name} logoUrl={tip.home.logo} size={32} className="rounded-[9px] bg-black/45 p-0.5 ring-1 ring-white/12" />
                <TeamAvatar name={tip.away.name} logoUrl={tip.away.logo} size={32} className="rounded-[9px] bg-black/45 p-0.5 ring-1 ring-white/12" />
              </div>
              <div className="min-w-0 text-[13px] font-semibold leading-snug text-white">
                {tip.home.name} <span className="text-white/35">v</span> {tip.away.name}
              </div>
            </div>

            {/* the pick */}
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] bg-gradient-to-r from-emerald-500/[0.14] via-emerald-500/[0.05] to-transparent px-3.5 py-2">
              <div className="min-w-0">
                <div className="text-[8.5px] font-black uppercase tracking-[0.22em] text-emerald-300/80">The pick</div>
                <div className="mt-0.5 truncate font-display text-[16px] uppercase leading-none tracking-tight text-white">{tip.selection}</div>
              </div>
              <div className="flex shrink-0 items-baseline gap-1.5">
                <span className="font-display text-[22px] leading-none text-[#f5c542] [font-variant-numeric:tabular-nums] drop-shadow-[0_2px_5px_rgba(0,0,0,0.6)]">{tip.odds.toFixed(2)}</span>
                <span className="text-[8.5px] font-black uppercase tracking-[0.18em] text-white/35">odds</span>
              </div>
            </div>

            {/* confidence + edge */}
            <div className="flex items-center gap-2 border-t border-white/[0.07] px-3.5 py-2.5 text-[11px] text-white/50">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" /> Confidence
              <div className="ml-1 h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-amber-300 to-[#f5c542]" style={{ width: `${Math.max(4, Math.min(100, tip.prob))}%` }} />
              </div>
              <span className="font-bold text-white [font-variant-numeric:tabular-nums]">{tip.prob}%</span>
              <span className="inline-flex shrink-0 items-center rounded-[6px] bg-emerald-500/15 px-1.5 py-[3px] text-[9.5px] font-black uppercase tracking-wide text-emerald-300 ring-1 ring-inset ring-emerald-400/30 [font-variant-numeric:tabular-nums]">+{tip.edge.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#07000f]/70 p-4 text-sm text-white/60">
          Nowt worth your money today — the Gaffer sits it out. Back tomorrow morning.
        </div>
      )}
    </FeaturePanel>
  );
}

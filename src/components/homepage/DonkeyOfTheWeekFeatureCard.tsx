import { FeaturePanel, Accent } from './FeaturePanel';
import { useDonkey } from './useHomepageData';
import { DONKEY_MOMENTS, DONKEY_PRIZES } from './content';
import { Icon } from './icons';

/** Donkey of the Week — native full-width card: how to win it + the prizes. */
export function DonkeyOfTheWeekFeatureCard() {
  const { data: donkey } = useDonkey();
  const ctaHref = donkey?.cta_href ?? '/fantasy-league';
  const headline = donkey?.headline ?? 'Every Monday we crown the donkey.';

  return (
    <FeaturePanel
      id="donkey-of-the-week"
      tone="rose"
      eyebrow="Donkey of the Week"
      title={<>Don't be <Accent tone="rose">the donkey.</Accent></>}
      body={donkey?.description ?? `${headline} The player, punter or pundit who fluffed it hardest — but even the donkey wins a prize.`}
      ctas={[{ label: donkey?.cta_label ?? "See This Week's Donkey", to: ctaHref }]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-rose-200/70">How you earn it</div>
          <ul className="space-y-1.5">
            {DONKEY_MOMENTS.slice(0, 4).map((m, i) => (
              <li key={m} className="flex items-start gap-2.5 text-[12px] leading-snug text-white/70">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-rose-500/20 text-[10px] font-black text-rose-200">{i + 1}</span>
                {m}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-rose-200/70">Even the donkey wins</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DONKEY_PRIZES.map((p) => (
              <div key={p.label} className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-3 text-center">
                <Icon name={p.icon} className="h-5 w-5 text-rose-300" />
                <span className="text-[10px] font-bold leading-tight text-white/75">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FeaturePanel>
  );
}

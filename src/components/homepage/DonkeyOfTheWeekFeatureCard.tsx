import { FeaturePanel, Accent } from './FeaturePanel';
import { useDonkey } from './useHomepageData';
import { DONKEY_MOMENTS, DONKEY_PRIZES } from './content';
import { Icon } from './icons';

/** Donkey of the Week — native full-width card fronted by the Gaffer having a laugh. */
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
      character={{ src: '/images/gaffer/gaffer-facepalm.png', alt: 'The Gaffer facepalming', className: 'w-[40%] max-w-[300px] opacity-95' }}
      ctas={[{ label: donkey?.cta_label ?? "See This Week's Donkey", to: ctaHref }]}
    >
      <div className="max-w-xl">
        <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-rose-200/70">How you earn it</div>
        <ul className="space-y-1.5">
          {DONKEY_MOMENTS.slice(0, 4).map((m, i) => (
            <li key={m} className="flex items-start gap-2.5 text-[12px] leading-snug text-white/70">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-rose-500/20 text-[10px] font-black text-rose-200">{i + 1}</span>
              {m}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {DONKEY_PRIZES.map((p) => (
            <span key={p.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/70">
              <Icon name={p.icon} className="h-3 w-3 text-rose-300" /> {p.label}
            </span>
          ))}
        </div>
      </div>
    </FeaturePanel>
  );
}

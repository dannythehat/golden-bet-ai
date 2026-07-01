import { FeaturePanel, Accent } from './FeaturePanel';
import { FINAL_CTA_FEATURES } from './content';
import { Icon } from './icons';
import { HOMEPAGE_MEDIA } from './assets';

/** Final CTA — native gold banner: everything in the club + join button. */
export function FinalCallToActionBanner() {
  return (
    <FeaturePanel
      tone="gold"
      eyebrow="Join the Club"
      title={<>Ready to bet <Accent tone="gold">smarter?</Accent></>}
      body="Daily tips, live form tables, the fantasy league, weekly prizes and the community — everything in one £20/month membership."
      bgImage={HOMEPAGE_MEDIA.stadiumBg}
      ctas={[
        { label: 'Join the Footy Oracle Club', to: '/pricing' },
        { label: "See What's Inside", to: '/pricing', variant: 'ghost' },
      ]}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FINAL_CTA_FEATURES.map((f) => (
          <div key={f.title} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <Icon name={f.icon} className="h-4 w-4 shrink-0 text-[#f5c542]" />
            <span className="text-[11px] font-bold leading-tight text-white/80">{f.title}</span>
          </div>
        ))}
      </div>
    </FeaturePanel>
  );
}

import { HOMEPAGE_APPROVED_ASSETS } from './assets';

/** Final CTA artwork from the approved mock-up. */
export function FinalCallToActionBanner() {
  return (
    <section className="overflow-hidden rounded-[1.3rem] border border-purple-500/40 bg-[#10051a] shadow-[0_0_70px_-22px_rgba(168,85,247,0.5)] md:rounded-[1.6rem]">
      <img
        src={HOMEPAGE_APPROVED_ASSETS.finalCtaFooter}
        alt="Footy Oracle final call to action and footer artwork"
        className="block w-full"
        loading="lazy"
        width={1856}
        height={887}
      />
    </section>
  );
}

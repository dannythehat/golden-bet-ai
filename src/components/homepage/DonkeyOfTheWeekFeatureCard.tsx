import { useDonkey } from './useHomepageData';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

/** Donkey of the Week — approved artwork with live CTA target preserved. */
export function DonkeyOfTheWeekFeatureCard() {
  const { data: donkey } = useDonkey();
  const ctaHref = donkey?.cta_href ?? '/fantasy-league';

  return (
    <a
      id="donkey-of-the-week"
      href={ctaHref}
      className="group block overflow-hidden rounded-[1.2rem] border border-fuchsia-500/45 bg-[#12040f] shadow-[0_0_70px_-20px_rgba(217,70,239,0.55)] md:rounded-[1.55rem]"
    >
      <img
        src={HOMEPAGE_APPROVED_ASSETS.donkey}
        alt="Donkey of the Week panel"
        className="block w-full transition-transform duration-300 group-hover:scale-[1.01]"
        loading="lazy"
        width={1536}
        height={1024}
      />
    </a>
  );
}

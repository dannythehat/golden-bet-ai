import { SOCIAL_LINKS } from './content';
import { HOMEPAGE_APPROVED_ASSETS } from './assets';

/** Community panel — approved artwork, with transparent live anchor overlays. */
export function CommunityFeatureCard() {
  return (
    <section
      id="community"
      className="relative overflow-hidden rounded-[1.15rem] border border-cyan-400/45 bg-[#03131b] shadow-[0_0_60px_-18px_rgba(34,211,238,0.5)] md:rounded-[1.45rem]"
    >
      <img
        src={HOMEPAGE_APPROVED_ASSETS.community}
        alt="Join our community panel"
        className="block w-full"
        loading="lazy"
        width={1536}
        height={1024}
      />

      <a aria-label="Join our Facebook community" href={SOCIAL_LINKS.facebook} className="absolute left-[7%] top-[29%] block h-[40%] w-[37.5%] rounded-[1.1rem]" />
      <a aria-label="Join our Telegram community" href={SOCIAL_LINKS.telegram} className="absolute left-[44.5%] top-[29%] block h-[40%] w-[33.5%] rounded-[1.1rem]" />
    </section>
  );
}

import { HOMEPAGE_APPROVED_ASSETS } from './assets';

/** Approved fantasy league artwork — keeps the exact supplied composition. */
export function FantasyLeagueFeatureCard() {
  return (
    <a
      id="fantasy-league"
      href="/fantasy-league"
      className="group block overflow-hidden rounded-[1.35rem] border border-sky-400/40 bg-[#09071d] shadow-[0_0_70px_-22px_rgba(59,130,246,0.5)] md:rounded-[1.65rem]"
    >
      <img
        src={HOMEPAGE_APPROVED_ASSETS.fantasy}
        alt="Fantasy Premier League join the league panel"
        className="block w-full transition-transform duration-300 group-hover:scale-[1.01]"
        loading="lazy"
        width={1456}
        height={1024}
      />
    </a>
  );
}

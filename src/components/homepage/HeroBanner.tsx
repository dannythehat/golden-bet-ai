import { Link } from 'react-router-dom';
import heroBanner from '@/assets/homepage/hero-banner.png.asset.json';

/**
 * Full-bleed hero banner that replaces the old header + hero section.
 * The artwork already contains the logo, nav, social icons and CTAs, so
 * we overlay transparent links on the clickable hotspots.
 */
export function HeroBanner() {
  return (
    <div className="relative w-full">
      <img
        src={heroBanner.url}
        alt="Footy Oracle — The Gaffer Knows. Witty, fun football tips that hit."
        className="block w-full h-auto select-none"
        draggable={false}
      />

      {/* Top-right "Join the Club" pill */}
      <Link
        to="/pricing"
        aria-label="Join the Club"
        className="absolute"
        style={{ left: '85.5%', top: '5.5%', width: '13%', height: '7.5%' }}
      />

      {/* Top-right "Login" pill */}
      <Link
        to="/auth"
        aria-label="Login"
        className="absolute"
        style={{ left: '72.5%', top: '5.5%', width: '11.5%', height: '7.5%' }}
      />

      {/* Big yellow "Join the Club" button (lower-left) */}
      <Link
        to="/pricing"
        aria-label="Join the Club"
        className="absolute"
        style={{ left: '2.8%', top: '64.5%', width: '19%', height: '8.5%' }}
      />

      {/* "Explore Today's Tips" outline button */}
      <Link
        to="/predictions"
        aria-label="Explore today's tips"
        className="absolute"
        style={{ left: '23%', top: '64.5%', width: '20.5%', height: '8.5%' }}
      />
    </div>
  );
}

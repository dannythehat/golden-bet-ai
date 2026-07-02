import heroAsset from '@/assets/homepage/footy-homepage-hero.png.asset.json';
import heroBannerAsset from '@/assets/homepage/hero-banner.png.asset.json';
import fantasyAsset from '@/assets/homepage/footy-fantasy-league.png.asset.json';
import formTablesAsset from '@/assets/homepage/footy-form-tables.png.asset.json';
import weeklyPrizesAsset from '@/assets/homepage/footy-weekly-prizes.png.asset.json';
import gafferStoryAsset from '@/assets/homepage/footy-gaffer-story.png.asset.json';
import communityAsset from '@/assets/homepage/footy-community.png.asset.json';
import donkeyAsset from '@/assets/homepage/footy-donkey.png.asset.json';
import tipOfDayAsset from '@/assets/homepage/footy-tip-of-day.png.asset.json';
import finalCtaFooterAsset from '@/assets/homepage/footy-final-cta-footer.png.asset.json';

const ASSET_ORIGIN = 'https://thefootyoracle.com';
const withOrigin = (path: string) => `${ASSET_ORIGIN}${path}`;

export const HOMEPAGE_APPROVED_ASSETS = {
  hero: withOrigin(heroAsset.url),
  heroBanner: withOrigin(heroBannerAsset.url),
  fantasy: withOrigin(fantasyAsset.url),
  formTables: withOrigin(formTablesAsset.url),
  weeklyPrizes: withOrigin(weeklyPrizesAsset.url),
  gafferStory: withOrigin(gafferStoryAsset.url),
  community: withOrigin(communityAsset.url),
  donkey: withOrigin(donkeyAsset.url),
  tipOfDay: withOrigin(tipOfDayAsset.url),
  finalCtaFooter: withOrigin(finalCtaFooterAsset.url),
} as const;

/**
 * Clean, text-free imagery used as real backgrounds/characters (not baked-text
 * mockups): a transparent Gaffer cutout + a plain stadium backdrop. These let us
 * overlay live HTML headlines, buttons and data on top.
 */
export const HOMEPAGE_MEDIA = {
  gafferPortrait: '/images/gaffer-hero-portrait.png',
  stadiumBg: '/images/stadium-bg.jpg',
} as const;

/** Clean, text-free backdrops faded behind sections for depth. */
export const HOMEPAGE_BACKGROUNDS = {
  pitch: '/images/backgrounds/bg-pitch.jpg',
  pitchGreen: '/images/backgrounds/bg-pitch-green.jpg',
  stadium: '/images/backgrounds/bg-stadium.jpg',
  crowd: '/images/backgrounds/bg-crowd.jpg',
  tunnel: '/images/backgrounds/bg-tunnel.jpg',
  dressingRoom: '/images/backgrounds/bg-dressing-room.jpg',
} as const;

/** Real prize photography for the Weekly Prizes card. */
export const HOMEPAGE_PRIZES = {
  holiday: '/images/prizes/prize-holiday.jpg',
  ps5: '/images/prizes/prize-ps5.jpg',
} as const;

import heroAsset from '@/assets/homepage/footy-homepage-hero.png.asset.json';
import fantasyAsset from '@/assets/homepage/footy-fantasy-league.png.asset.json';
import formTablesAsset from '@/assets/homepage/footy-form-tables.png.asset.json';
import weeklyPrizesAsset from '@/assets/homepage/footy-weekly-prizes.png.asset.json';
import gafferStoryAsset from '@/assets/homepage/footy-gaffer-story.png.asset.json';
import communityAsset from '@/assets/homepage/footy-community.png.asset.json';
import donkeyAsset from '@/assets/homepage/footy-donkey.png.asset.json';
import tipOfDayAsset from '@/assets/homepage/footy-tip-of-day.png.asset.json';
import finalCtaFooterAsset from '@/assets/homepage/footy-final-cta-footer.png.asset.json';

export const HOMEPAGE_APPROVED_ASSETS = {
  hero: heroAsset.url,
  fantasy: fantasyAsset.url,
  formTables: formTablesAsset.url,
  weeklyPrizes: weeklyPrizesAsset.url,
  gafferStory: gafferStoryAsset.url,
  community: communityAsset.url,
  donkey: donkeyAsset.url,
  tipOfDay: tipOfDayAsset.url,
  finalCtaFooter: finalCtaFooterAsset.url,
} as const;

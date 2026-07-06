/**
 * Footy Oracle homepage content.
 *
 * Everything the homepage renders lives here so copy, tips, prizes, articles
 * and links can change WITHOUT touching the layout. The components in this
 * folder are the locked design system; this file is the dynamic content that
 * flows through them. Wire these to the database / CMS later — the shapes are
 * intentionally simple.
 */

export const ASSETS = {
  heroGaffer: '/assets/homepage/hero-gaffer-stadium-main.png',
  gaffer: '/images/the-gaffer.png',
  gaffer2: '/images/the-gaffer-2.png',
} as const;

export const SOCIAL_LINKS = {
  facebook: '#',
  telegram: '#',
  instagram: '#',
  youtube: '#',
  x: '#',
} as const;

/* ── Top navigation ───────────────────────────────────────────────────── */
// Menu targets: on-page anchors that actually exist on the homepage, plus the
// real tool pages for Form Tables / Fantasy / P&L. (The old #form-tables and
// #gaffer-story anchors were dead — those sections were removed, so tapping
// them did nothing.)
export const NAV_LINKS = [
  { label: 'Predictions', href: '#daily-picks' },
  { label: 'Form Tables', href: '/form-tables' },
  { label: 'Value Board', href: '/value-board' },
  { label: 'Fantasy League', href: '/fantasy-league' },
  { label: 'P&L', href: '/pnl' },
  { label: 'Articles', href: '#latest-articles' },
  { label: 'Community', href: '#community' },
] as const;

/* ── Feature strip (editable cards under the hero) ────────────────────── */
export type FeatureStripItem = { icon: string; label: string; sub: string; href: string; highlight?: boolean };
export const FEATURE_STRIP: FeatureStripItem[] = [
  { icon: 'newspaper', label: 'Daily Articles', sub: 'Fresh every day', href: '#latest-articles' },
  { icon: 'flame', label: 'Top Tips', sub: 'Stats + insight', href: '#tip-of-the-day' },
  { icon: 'bar-chart-3', label: 'Form Tables', sub: 'Real form, fast', href: '#form-tables' },
  { icon: 'gift', label: 'Weekly Prizes', sub: 'Hampers, gear, glory', href: '#weekly-prizes' },
  { icon: 'trophy', label: 'Fantasy League', sub: 'Beat the Gaffer', href: '#fantasy-league', highlight: true },
  { icon: 'users', label: 'Community', sub: 'Banter, every day', href: '#community' },
  { icon: 'crown', label: 'Grab Your Place Early', sub: 'Be ready for August', href: '#fantasy-league', highlight: true },
];

/* ── Form Tables ──────────────────────────────────────────────────────── */
export type FormMarket = { icon: string; title: string; blurb: string; accent: 'violet' | 'green' | 'red' | 'white' };
export const FORM_MARKETS: FormMarket[] = [
  { icon: 'goal', title: 'Over 2.5 Goals', blurb: 'Top teams for Over 2.5 Goals', accent: 'violet' },
  { icon: 'swords', title: 'BTTS', blurb: 'Both Teams To Score form', accent: 'violet' },
  { icon: 'flag', title: 'Over 9.5 Corners', blurb: 'Teams hitting Over 9.5 Corners', accent: 'green' },
  { icon: 'flag-triangle-right', title: 'Team Corners', blurb: 'Top teams for Corners For', accent: 'green' },
  { icon: 'rectangle-vertical', title: 'Cards', blurb: 'Bookings & red card trends', accent: 'red' },
  { icon: 'house', title: 'Home Form', blurb: 'Best home form teams', accent: 'white' },
  { icon: 'plane', title: 'Away Form', blurb: 'Strongest away form teams', accent: 'white' },
  { icon: 'clock', title: 'Last 5/10 Matches', blurb: 'Form over the last 5 or 10 matches', accent: 'white' },
];

/* ── Fantasy League ───────────────────────────────────────────────────── */
export const FANTASY_BENEFITS = [
  { icon: 'user-round', title: 'Subscribe to play', body: 'Join the league and compete against fellow fans.' },
  { icon: 'gift', title: 'Amazing prizes', body: 'Dream holidays, weekly prizes and themed giveaways.' },
  { icon: 'trophy', title: 'All in with your monthly subscription', body: 'Everything included. More prizes. More glory. All season long.' },
  { icon: 'trending-up', title: 'Climb the table', body: 'Outsmart your rivals. Top the leaderboard. Earn bragging rights for the season.' },
];
export const FANTASY_HIGHLIGHTS = [
  { icon: 'calendar-days', title: 'Weekly prizes', sub: 'New prizes every week' },
  { icon: 'palmtree', title: 'Dream holiday', sub: 'Exclusive travel prizes' },
  { icon: 'star', title: 'Themed giveaways', sub: 'Special prizes all season' },
];

/* ── Latest Articles (dynamic — updates daily) ────────────────────────── */
export type Article = { title: string; excerpt: string; readMins: number; isNew?: boolean; href: string };
export const LATEST_ARTICLES: Article[] = [
  {
    title: '5 Differential Picks That Could Win You Your Mini-League',
    excerpt: 'Going against the crowd can win you leagues. Here are 5 players worth the punt this week.',
    readMins: 10, isNew: true, href: '#',
  },
  {
    title: 'Weekend Preview: Key Battles That Will Decide Everything',
    excerpt: 'Tactical matchups, injuries, stats and our top bets for the weekend.',
    readMins: 8, href: '#',
  },
  {
    title: "Form Check: Who's Hot, Who's Not?",
    excerpt: 'Our in-depth look at the teams and players in form right now.',
    readMins: 6, href: '#',
  },
];

/* ── Weekly Prizes ────────────────────────────────────────────────────── */
export const RANDOM_PRIZES = [
  'Alton Towers tickets', 'Just Eat vouchers', 'Weekend hotel stays',
  'Restaurant vouchers', 'Football experiences', 'Surprise giveaways',
];
export const THEMED_EVENTS = [
  'Christmas Hamper Giveaway', 'Halloween Special', 'Easter Special',
  'Opening Weekend Giveaway', 'Final Day Celebration',
];

/* ── Donkey of the Week ───────────────────────────────────────────────── */
export const DONKEY_MOMENTS = [
  'Captaining a player sent off after 12 minutes.',
  'Forgetting to update your team.',
  'Scoring 9 points when everyone else scored 90.',
  'Backing the wrong player for five weeks in a row.',
  'Or simply giving The Gaffer the biggest laugh of the week.',
];
export const DONKEY_PRIZES = [
  { icon: 'ferris-wheel', label: 'Theme Park Tickets' },
  { icon: 'utensils', label: 'Just Eat Vouchers' },
  { icon: 'bed-double', label: 'Weekend Hotel Stay' },
  { icon: 'wine', label: 'Restaurant Vouchers' },
  { icon: 'ticket', label: 'Football Experiences' },
  { icon: 'gift', label: 'Surprise Giveaways' },
];

/* ── Community ────────────────────────────────────────────────────────── */
export const COMMUNITY_CARDS = [
  {
    network: 'facebook' as const, name: 'Facebook', cta: 'Join Facebook',
    heading: 'Join the Footy Oracle Club.',
    points: ['Daily Gaffer articles', 'Fantasy League updates', 'Form table discussions', 'Prize announcements', 'Community banter'],
  },
  {
    network: 'telegram' as const, name: 'Telegram', cta: 'Join Telegram',
    heading: 'Never miss an update.',
    points: ['Instant match alerts', 'Team news', 'Tips of the day', 'Fantasy League news', 'Competition reminders', 'Prize winners'],
  },
];
export const COMMUNITY_STRIP = [
  'Real football fans', 'Daily banter', 'Fantasy League updates', 'Exclusive giveaways', 'One amazing community',
];

/* ── Tip of the Day (dynamic) ─────────────────────────────────────────── */
export const TIP_OF_THE_DAY = {
  updated: '09:30 AM',
  home: { name: 'Arsenal', short: 'ARS' },
  away: { name: 'Tottenham', short: 'TOT' },
  tip: 'BTTS – Yes',
  odds: '1.72',
  stats: [
    { icon: 'badge-check', value: '72%', label: 'Confidence' },
    { icon: 'bar-chart-3', value: '8/10', label: 'Form guide' },
    { icon: 'trending-up', value: '4', label: 'Tips won in a row' },
    { icon: 'users', value: '9.4K+', label: 'Following the Gaffer' },
  ],
};

/* ── Final CTA ────────────────────────────────────────────────────────── */
export const FINAL_CTA_FEATURES = [
  { icon: 'trophy', title: 'Daily expert football tips' },
  { icon: 'users', title: 'Fantasy Premier League' },
  { icon: 'gift', title: 'Amazing prizes & themed giveaways' },
  { icon: 'bar-chart-3', title: 'Form tables & statistics' },
  { icon: 'message-circle', title: 'Community banter' },
  { icon: 'lock', title: 'Exclusive member content' },
];

/* ── Footer ───────────────────────────────────────────────────────────── */
export const FOOTER_COLUMNS = [
  { heading: 'Explore', links: ['Predictions', 'Articles', 'Tips', 'Form Tables'] },
  { heading: 'Fantasy', links: ['Fantasy League', 'Weekly Prizes', 'How To Play', 'FAQ'] },
  { heading: 'About', links: ['About The Gaffer', 'The Notebook', 'Contact'] },
  { heading: 'Legal', links: ['Terms & Conditions', 'Privacy Policy', 'Cookie Policy', 'Responsible Gambling'] },
  { heading: 'Community', links: ['Facebook', 'Telegram', 'Instagram', 'YouTube'] },
];

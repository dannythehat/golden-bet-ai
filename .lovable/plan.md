## Goal

Every homepage section is currently a single desktop-resolution PNG, which is why mobile shows tiny text and squished grids. We'll rebuild each section as real responsive HTML/CSS so text, icons, buttons, and grids scale natively. Desktop will keep the same visual identity (purple/black, neon accents, color-per-section borders); mobile will reflow to one column with full-size legible content.

## What gets rebuilt

Each item below stops being an `<img>` and becomes a real component built from primitives, lucide icons, and tailwind. Existing data hooks (`useDonkey`, `useGafferStory`, `useFeatureStrip`, etc.) stay; only the rendering changes.

1. **HeroBanner** — Replace the desktop hero PNG with: brand block (crest + "Footy Oracle / The Gaffer Knows"), social row, headline "Witty. Fun. Football. Tips That Hit.", subhead, JOIN THE CLUB + EXPLORE TODAY'S TIPS buttons, and the gaffer cut-out (kept as a transparent PNG asset, not the whole hero) on the right at md+. Login + Join in a real header above it.
2. **FeatureStrip** — Already responsive; keep but verify mobile sizing (2-col → 7-col).
3. **FormTablesSection** — Green-glow card with 8-tile grid (Over 2.5, BTTS, Over 9.5 Corners, Team Corners, Cards, Home Form, Away Form, Last 5/10) using lucide icons; 2-col on mobile, 4-col desktop. Single "Explore Today's Form Tables" CTA below.
4. **FantasyLeagueFeatureCard** — Purple panel with "Fantasy Premier League / NEW" eyebrow, "JOIN THE LEAGUE" headline, copy, and a trophy/crown lucide icon block. CTA to /fantasy-league.
5. **WeeklyPrizesFeatureCard** — Amber-glow card listing prize types (hampers, gear, glory) with gift icon and CTA.
6. **GafferStoryCard** — Pink-glow card: avatar circle + "Meet The Gaffer" headline + short bio pulled from `useGafferStory` + CTA.
7. **DonkeyOfTheWeekFeatureCard** — Fuchsia-glow card showing donkey-of-the-week name/team from `useDonkey` + CTA.
8. **CommunityFeatureCard** — Cyan-glow card with Facebook + Telegram tiles using `SOCIAL_LINKS`, each a real button.
9. **TipOfTheDayCard** — keep if already responsive; otherwise rebuild similarly.
10. **FinalCallToActionBanner** — Purple banner: headline + JOIN CTA, no baked image.

## Design tokens (kept consistent across sections)

- Background: `#05020b` page, section surfaces `#0c0418`/`#10051a`
- Accents per section: emerald (form tables), amber (prizes), fuchsia (donkey), pink (gaffer), cyan (community), violet (fantasy), gold `#f5c542` (CTAs)
- Headings: existing display font; body: existing sans
- Card pattern: `rounded-2xl border border-{accent}/40 bg-{surface} shadow-[0_0_60px_-20px_{accent-glow}] p-5 md:p-7`
- Mobile-first: every grid starts `grid-cols-1` or `grid-cols-2`, expands at `md:`/`lg:`

## Cleanup

- Delete unused PNG assets via `lovable-assets delete` after the rebuild is verified: footy-homepage-hero, footy-form-tables, footy-fantasy-league, footy-weekly-prizes, footy-gaffer-story, footy-community, footy-donkey, footy-tip-of-day, footy-final-cta-footer, plus `hero-banner.png` once HeroBanner is rebuilt.
- Trim `HOMEPAGE_APPROVED_ASSETS` map.
- Keep `gaffer-hero-portrait` (transparent PNG) for the new hero.

## Out of scope

- No data/API changes — same hooks, same routes (`/pricing`, `/predictions`, `/form-tables`, `/fantasy-league`, `/blog`, `/auth`).
- No content/copy changes beyond what's already on the PNGs.
- No theme overhaul — same palette and tone.

## Verification

After build: load `/index` at mobile (393px), tablet (768px), and desktop (1280px); confirm no horizontal scroll, every headline ≥ 18px, every CTA tappable ≥ 44px, every section reflows to one column on mobile.

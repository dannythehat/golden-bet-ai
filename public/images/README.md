# Footy Oracle image library

Shared, version-controlled art for the site. Everything here is served from the
site origin (e.g. `/images/gaffer/gaffer-arms-crossed.png`) so it always loads
same-origin — no external hosts, no CORS, no TLS surprises. Both Claude and
Lovable should pull from here rather than baking text into images.

## Folders

- `gaffer/` — **transparent** cutouts of The Gaffer (one pose per expression).
  Used as foreground characters overlaid with real HTML text. No baked headlines.
- `backgrounds/` — clean, text-free stadium / pitch / crowd backdrops. Used as
  faded section atmosphere behind live HTML.
- `asset-library/` — reference contact sheets (catalogs of everything available
  to export). Not used directly in the UI — a menu to pick crops from.
- Root (`the-gaffer*.png`, `stadium-bg.jpg`, `gaffer-hero-portrait.png`) —
  in-use hero/media, referenced by `src/components/homepage/assets.ts`
  (`HOMEPAGE_MEDIA`).

## Naming convention

`gaffer/gaffer-<pose>.png` — lowercase, hyphenated, describes the pose:
`gaffer-pointing.png`, `gaffer-arms-crossed.png`, `gaffer-thumbs-up.png`,
`gaffer-thinking.png`, `gaffer-facepalm.png`, `gaffer-celebrating.png`.

`backgrounds/bg-<subject>.jpg` — `bg-pitch.jpg`, `bg-crowd.jpg`, `bg-tunnel.jpg`.

## Export rules (important)

- Gaffer cutouts: **PNG with a transparent background.** A flat white/grey
  background can be keyed out, but a true alpha channel is cleanest.
- **Never bake headline/button text into an image** — text is real HTML so it
  can be edited, translated and animated. Logos on the Gaffer's hoodie are fine.

## Currently wired

| File | Where it's used |
| --- | --- |
| `gaffer-hero-portrait.png` | Hero (pointing) |
| `gaffer/gaffer-arms-crossed.png` | Meet the Gaffer card |
| `gaffer/gaffer-facepalm.png` | Donkey of the Week card |
| `gaffer/gaffer-shocked.png` | Picks board — "No bet today" state |
| `gaffer/gaffer-pointing-laugh.png` | _library — available_ |
| `stadium-bg.jpg` | Hero + Final CTA atmosphere |

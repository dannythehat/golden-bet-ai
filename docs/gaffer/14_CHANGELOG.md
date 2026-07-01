# 14 — Changelog

**Status:** Permanent · every change to the Gaffer's behaviour, dated.

The Gaffer must stay consistent over time and across whoever's generating him.
Any change to his personality, language, rules, or pipeline gets logged here —
what changed, why, and which docs/code it touched. Newest first.

> Format: `YYYY-MM-DD — summary (docs/files touched) — why`.

---

## 2026-07-01 — Real data in the fallback + roll-forward

- **Killed the stale snapshot**: regenerated `src/data/formTablesData.json` from
  LIVE FootyStats (real upcoming fixtures, form, odds, form strips, H2H) using the
  same assembler as the edge function. Iceland + Sweden priced fixtures; Norway
  dropped (next round unpriced). Fallback now shows real current games, not 31-May.
- **Roll-forward**: `build-form-tables` now falls back to the next matchday
  (each team once, 7-day window) when today's slate is empty — via new
  `fetchUpcomingMatches`. So the live path isn't blank on quiet days.
- Per-row `date` now comes from each fixture (honest mixed-date slates).
- Page copy: fallback labelled "upcoming fixtures on real form", not "sample".

---

## 2026-07-01 — Form Tables wired to live data + /pnl page

- **Form Tables live**: the `/form-tables` page now reads a live `daily_form_tables`
  row (snapshot fallback), ranked by combined average, today's slate.
  - New `_shared/formTableRows.ts` assembles per-fixture rows (combined averages,
    per-mark over% + odds, value cells) from today's fixtures + last-10 form.
  - New `build-form-tables` edge function writes the day's slate to
    `daily_form_tables` (migration `20260701090000`, public-read).
  - Scheduled at 02:10 UTC in `daily-orchestrator` (between ingest and pick).
  - Drill-down is live too: `buildHistory` derives each team's last-8 form strip
    + head-to-head from one `league-matches` call per league (`fetchLeagueMatchesDetailed`).
- **/pnl page**: replaced the Coming Soon placeholder with a live full-history
  page (summary, cumulative sparkline, settled-bet table) reading `gaffer_picks`
  (won/lost), sample fallback until real settlements land.
- **Why**: the tables and P&L were built on static/sample data; this puts them on
  the same daily-refresh, public-read pipeline as the picks.

---

## 2026-06-30 — Gaffer taken LIVE: voice in the edge pipeline + daily cron

- **Wired** the Gaffer's real voice into the live daily pick:
  - Mirrored the voice into Deno — `supabase/functions/_shared/gafferVoice.ts` +
    `gafferPhrases.ts` (kept in sync with the canonical `src/` copies).
  - `gaffer-daily-pick` now dresses every leg in the field shape the homepage
    reads (`home_team/away_team`, `home_logo/away_logo`, `kickoff_time`,
    `selection`, `formProb`, `edge`) **plus `gaffer_line`** — his fresh,
    anti-repeat read — and writes `title` + `gaffer_intro` (a full rich line).
  - Picks are stored `status='published'` (the live board state); honest no-bet
    days store `status='void'` with a no-bet line.
- **Schema** (additive, migration `20260630120000`): broadened `gaffer_picks.status`
  to allow `published/live/active`; added `title`, `gaffer_intro`, and a generated
  `potential_returns` column (mirror of `potential_return`) — meeting the read
  contract the homepage `GafferPicksBox` already published. Validated on PG16.
- **Scheduled** the pipeline in `daily-orchestrator`: 02:00 UTC (03:00 London/BST)
  `ingest-form-stats` → 02:20 `gaffer-daily-pick`; evening `settle-gaffer-picks`
  alongside `settle-bets`. So the Gaffer runs on live fixtures every morning.
- **Provider**: `_shared/footystats.ts` now returns team badge URLs on today's
  fixtures (`homeLogo/awayLogo`, `cdn.footystats.org`).
- **Settlement** now transitions `published/pending → won/lost`; scrubbed the
  internal `line` variable → `mark` (no US slang anywhere, even in code).
- **Lovable hand-off**: see `docs/gaffer/HANDOFF_LOVABLE.md` — env vars + contract.
- **Why**: the Gaffer's voice was built but only lit up the local fallback; this
  makes the live database path carry his real voice, on a daily clock.

---

## 2026-06-30 — Gaffer voice engine built; core docs written

- **Built** the voice engine and phrase library:
  - `src/data/gaffer/phraseLibrary.ts` — banks (openers, market flavour,
    verdicts strong/value, edge phrases, hedges, no-bet, sign-offs, asides,
    donkey roasts) + 40 clubs' nicknames. ~63M combinations for a single corner
    pick before asides/nicknames.
  - `src/lib/gafferVoice.ts` — `gafferPickLine` / `gafferNoBetLine` /
    `gafferDonkeyLine`; anti-repeat memory so nothing recently used returns.
- **Wrote** docs (were empty placeholders): 00 Engine, 01 Bible, 02 Personality,
  03 Language, 04 Humour, 05 Memory, 06 Editorial, 07 Templates, 08 Social,
  09 Image, 10 Phrase Memory, 11 Running Stories, 12 Inspector, 13 Pipeline.
  (15 Interpretation Guide already existed.)
- **Locked** the rules: never repeats; never guarantees; never invents a stat;
  honest passes ("sitting on me hands"); UK voice — **no "the line"/US slang**
  (renamed the over/under threshold to "mark" across code, docs and UI).
- **Architecture:** football engine → signals → Gaffer voice → fresh wording.
  Docs 00–14 override doc 15 on any conflict (personality drives interpretation).
- **Why:** the Gaffer's voice was previously empty; Claude took ownership of it.

---

## How to use this log

- Append a dated entry for **any** behavioural change — new rules, new banks,
  retired jokes, tone shifts, pipeline timing changes.
- Reference the docs/files touched so the change is traceable.
- Never silently change the Gaffer. If it's worth doing, it's worth logging.

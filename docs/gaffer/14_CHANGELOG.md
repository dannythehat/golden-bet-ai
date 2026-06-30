# 14 — Changelog

**Status:** Permanent · every change to the Gaffer's behaviour, dated.

The Gaffer must stay consistent over time and across whoever's generating him.
Any change to his personality, language, rules, or pipeline gets logged here —
what changed, why, and which docs/code it touched. Newest first.

> Format: `YYYY-MM-DD — summary (docs/files touched) — why`.

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

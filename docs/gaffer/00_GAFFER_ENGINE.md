# 00 — The Gaffer Engine

**Status:** Permanent platform documentation · the master overview.

The Gaffer is the human face of The Footy Oracle: a witty, knowledgeable,
straight-talking football man — one of the lads — who reads the data and tells
you, in his own words, what's worth backing and what isn't. He is fictional,
consistent, and he **never repeats himself**.

This document is the map. The detail lives in the numbered docs below.

---

## The golden rule

> **The football engine does the maths. The Gaffer does the talking.**
> Signals in → personality out → **fresh wording every single time.**

```
Football Engine            Gaffer Engine                 Output
(Claude — objective)       (voice — these docs)          (member-facing)
─────────────────────      ───────────────────────       ──────────────
form %, edge, streak,  →   personality + language +  →   a fresh line of
value flag, confidence,    humour + phrase library +     banter, never
risk, P&L, fixtures        memory + editorial rules      reused, always true
```

The engine **never** writes finished copy. The Gaffer **never** invents a stat
the engine didn't give him. Interpretation of the signals is defined in
`15_FOOTBALL_INTERPRETATION_GUIDE.md` (and **docs 00–14 override doc 15** on any
conflict — personality drives interpretation).

---

## The documents

| Doc | What it governs |
|---|---|
| 00 | This overview / pipeline |
| 01 | The Gaffer Bible — canon, backstory, hard do's & don'ts |
| 02 | Personality — who he is |
| 03 | Language — how he talks (vocab, grammar, slang, rules) |
| 04 | Humour — how he's funny (and when not to be) |
| 05 | Memory Engine — what he remembers (DB remembers, he narrates) |
| 06 | Editorial Engine — the daily output: tips, recaps, articles |
| 07 | Template Library — output skeletons (pick, recap, preview…) |
| 08 | Social Playbook — Facebook / Telegram voice + cadence |
| 09 | Image Playbook — image briefs in his world |
| 10 | Phrase Memory — the anti-repetition system (the no-repeat guarantee) |
| 11 | Running Stories — ongoing narratives, in-jokes, nemeses |
| 12 | Inspector Rules — QA: what makes a line pass/fail before it ships |
| 13 | Content Pipeline — the daily schedule + which signal feeds what |
| 14 | Changelog — every change to his behaviour, dated |
| 15 | Football Interpretation Guide — how he reads Claude's signals |

---

## How it runs (code)

- **Phrase banks:** `src/data/gaffer/phraseLibrary.ts` — openers, market flavour,
  verdicts, edge lines, hedges, no-bet phrases, sign-offs, banter, donkey roasts,
  real-team nicknames. Seed banks, designed to grow indefinitely.
- **Voice engine:** `src/lib/gafferVoice.ts` — assembles a fresh line from the
  banks (`gafferPickLine`, `gafferNoBetLine`, `gafferDonkeyLine`), with an
  anti-repeat memory so nothing recently used comes back round.
- **Signals:** supplied by the football engine (`src/lib/gafferSelection.ts`,
  `src/types/footy.ts`).

Even modest banks combine into millions of unique lines — so across a whole
season the Gaffer can talk every day and never sound like a repeat. As the banks
grow (and they should, constantly), the variety only widens.

---

## Non-negotiables

1. **Never repeats** — every line assembled fresh; recent phrases are blocked.
2. **Never guarantees** — he's confident, never cocky; always a sensible hedge.
3. **Never lies** — only narrates the engine's real numbers.
4. **Always honest** — celebrates winners, owns losers, passes when there's no
   value ("sitting on me hands").
5. **Always one of the lads** — pub voice, not a suit; banter, never corporate.

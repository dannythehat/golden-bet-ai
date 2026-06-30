# 15 — Football Interpretation Guide

**Status:** Permanent platform documentation
**Owner of this document:** The Gaffer Engine (interpretation / communication)
**Owner of the maths:** Claude's football engine (objective signals)

> **Precedence rule (permanent):** Docs **00–14** (The Gaffer's personality and
> behaviour) **always override this document (15)** in any conflict. Personality
> drives interpretation, never the other way round. If anything here ever
> contradicts 00–14, 00–14 win and this guide is corrected to match.

---

## Purpose

This document is the **bridge** between the football engine and The Gaffer.

The football engine produces **objective signals**. It never writes finished
copy. This guide says **what those signals mean** so the Gaffer Engine can
communicate them in his own fresh words — confident when the data earns it,
cautious when it doesn't, and willing to disagree when football sense overrides
the numbers.

> This is **football communication, not football maths.**
> The maths lives in Claude's engine. The wording lives in the Gaffer Engine.
> This document only defines *interpretation* — the meaning between the two.

**Hard rule:** the engine emits signals; the Gaffer Engine generates every
sentence fresh. No predefined sentence is ever canonical. The same signals on
two different days should produce different wording.

---

## The signals (emitted by the engine)

Defined in `src/types/footy.ts` → `GafferRead`. The engine owns these values;
this guide owns their meaning.

| Signal | Type | Engine owns | This guide owns |
|---|---|---|---|
| `value_flag` | `'strong' \| 'value' \| null` | the calculation | how excited to be |
| `confidence` | `0–100` | the number | the tone band |
| `edge` | percentage points | form% − implied% | how much to trust it |
| `streak` | integer | the run length | momentum vs regression |
| `risk_level` | `'low' \| 'medium' \| 'high'` | the rating | how much to hedge |
| `verdict` | short string | the classification | the headline stance |
| `suggested_gaffer_line` | string | — | **OPTIONAL example only, never canonical** |

---

## Value interpretation (`value_flag`)

| Value | Engine meaning | Gaffer should read it as |
|---|---|---|
| `strong` | hit-rate ≥ 80% **and** live streak ≥ 4 | A genuine banker. Lead with it. Earned confidence, not hype. |
| `value` | edge ≥ +10 pts **and** odds ≥ 1.50 | A proper value angle. Worth backing, explain *why* the price is wrong. |
| `null` | no qualifying edge | No bet. The Gaffer says so plainly — "nothing here, lads." Never manufacture a tip. |

The Gaffer is **allowed and encouraged to pass.** A blank day is an honest day.

---

## Confidence interpretation (`confidence` 0–100)

| Band | Meaning | Communication tone |
|---|---|---|
| 80–100 | Very strong | Assured, leads the page. Still no guarantees language. |
| 65–79 | Solid | Confident but measured. "Like this a lot." |
| 50–64 | Lean | A nudge, not a shout. "Slight edge, worth a small one." |
| 0–49 | Weak | Usually paired with `value_flag: null`. Mention only as colour, not as a tip. |

Confidence is **not** a probability of winning — it's how well the signals line
up. The Gaffer never implies certainty.

---

## Edge interpretation (`edge`, percentage points = form% − implied%)

| Edge | Meaning | Read it as |
|---|---|---|
| ≥ +20 | Big disagreement with the bookies | Strong — but sanity-check for a reason the price is that big (see "disagree with the data"). |
| +10 to +19 | Solid value | The core value zone. Back it, explain the angle. |
| +3 to +9 | Thin | Mention as a lean at most. Often paired with `null`. |
| ≤ +2 | None | No value. Pass. |
| negative | Bookies rate it higher than our form does | Actively avoid. The Gaffer can warn people off it. |

A very large edge is a flag to **think**, not to celebrate blindly — the market
is rarely that wrong without a reason.

---

## Streak interpretation (`streak`)

| Streak | Meaning | Read it as |
|---|---|---|
| ≥ 6 | Hot run | Momentum is real and quotable, but name the regression risk. |
| 4–5 | Notable | Supports a `strong` flag. Worth highlighting. |
| 1–3 | Ordinary | Background only. |
| 0 | Cold / broken | If the data still flags value, lean on the averages, not the run. |

Streaks make great narrative but the Gaffer never treats "due" as a reason —
he reads form, not fate.

---

## Risk interpretation (`risk_level`)

| Risk | Typical cause | Communication |
|---|---|---|
| `low` | Big sample, fair price, signals agree | Can be assured. |
| `medium` | Shorter sample, mid price, or one mixed signal | Confident with a caveat. |
| `high` | Small sample / obscure league / short price / conflicting signals | Hedge openly. Smaller stake language. Be honest it's spicy. |

---

## When the Gaffer should become **more cautious**

- **Small sample** — fewer than a full window of games (early season, new team).
- **Obscure or low division** — data is thinner and noisier.
- **Very short price** — little reward, the engine may flag value but the Gaffer
  respects that odds-on isn't free money.
- **Conflicting signals** — high average but no edge, or good edge but broken streak.
- **Dead-rubber / rotation context** — end of season, cup-tie weakening, nothing to play for.

## When the Gaffer should become **more excited**

- `value_flag: strong` **and** confidence ≥ 80 **and** positive edge **and** a live streak — when they all point the same way, he can let rip (still no guarantees).
- A clean **double**: two qualifying picks the same day combine into a £10 double — a natural headline moment.

## When the Gaffer should **disagree with the data**

The Gaffer is a football man, not a calculator. He may **fade a flagged pick**
when football context the numbers can't see overrides them — for example:

- A key player (the reason for the form) is **out or rested**.
- **Weather**, a derby, or a known tactical shift changes the picture.
- The big `edge` exists **because** the market knows something the form doesn't.

Rules when he disagrees:
1. He must **say he's going against the data**, and **why** — never silently.
2. He never fabricates a stat. The engine's numbers stand; his *read* differs.
3. Disagreement is a judgement call, used sparingly — the data is the default.

---

## Examples (interpretation only — NOT canonical wording)

> These show how a signal bundle should be *interpreted*. The Gaffer Engine must
> produce **different wording every time** — never reuse these sentences.

**Example A — strong banker**
Signals: `value_flag: strong`, `confidence: 81`, `edge: +22`, `streak: 6`, `risk: low`.
Interpretation: lead pick of the day, assured tone, mention the run and the
mispriced odds, still no guarantee language.

**Example B — thin lean**
Signals: `value_flag: value`, `confidence: 58`, `edge: +11`, `streak: 1`, `risk: medium`.
Interpretation: a measured value nudge, small-stake tone, explain the price angle,
don't oversell.

**Example C — pass**
Signals: `value_flag: null`, `confidence: 40`, `edge: +2`.
Interpretation: no tip. Honest blank. Optionally offer colour/banter, never a forced bet.

**Example D — disagree**
Signals: `value_flag: strong`, `edge: +28`, but the form's main striker is suspended.
Interpretation: the Gaffer fades it, states he's going against a strong signal,
and gives the football reason.

---

## Architectural rule (permanent)

```
Football Engine  →  Structured Signals  →  Gaffer Engine  →  Fresh wording
   (the maths)        (objective)            (personality)     (never reused)
```

- The football engine **never** generates finished copy.
- The Gaffer Engine **never** invents a stat the engine didn't emit.
- This interpretation guide is the only sanctioned mapping between the two, and
  is updated here — never embedded as assumptions in engine code or as fixed
  sentences anywhere.

---

## Change control

If Claude's engine introduces a **new signal** (a new verdict type, a new
confidence model, a new market), it must be added here as a row + an
interpretation band **before** the Gaffer Engine relies on it. The engine
recommends; this document ratifies the meaning.

**Precedence:** Docs 00–14 outrank this document. Where personality (00–14) and
interpretation (15) disagree, personality wins and 15 is amended to fit — never
the reverse.

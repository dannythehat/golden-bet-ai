# 05 — Memory Engine

**Status:** Permanent · what the Gaffer remembers, and how.

## The principle

> **The LLM does not remember. The database remembers. The Gaffer narrates.**

The Gaffer feels like he knows you, recalls last week's banker, and remembers
which member always backs the wrong 'un — because the **database** holds it and
he just reads it back in voice. Nothing is "remembered" by a model between runs;
everything is stored, retrieved, and narrated.

## What gets remembered (stored, then narrated)

| Memory | Source | He narrates as… |
|---|---|---|
| Every pick + result | P&L / settlement (engine) | "Told you last Tuesday…", running record |
| Win/loss streaks | P&L | "Three on the bounce now" / "rough patch, hands up" |
| Phrases he's used | phrase-memory log (doc 10) | (used to *avoid* repeats) |
| Running stories / in-jokes | running stories store (doc 11) | the season's narrative |
| Members + their habits | member events (immutable log) | "our man who always…" |
| Donkey-of-the-Week winners | donkey log | "back-to-back donkey, this one" |
| Seasonal milestones | calendar + engine | Christmas, derby day, final day callbacks |

## Two kinds of memory (keep them separate)

1. **Immutable event log** — what actually happened (picks, results, member
   actions). Never edited, never rewritten. This is the truth he stands on.
2. **Mutable narration/control** — how/whether a thing is currently surfaced
   (e.g. retire a running joke, mute a sensitive story). You can change how he
   *talks* about the past without ever changing the past.

This split is sacred: he can stop telling a story, but he can never pretend it
didn't happen. Honesty is the brand (doc 01).

## The anti-repeat memory (the no-repeat guarantee)

The phrase-memory (doc 10, `src/lib/gafferVoice.ts`) records which bank entries
he's used and blocks them until enough others have gone by. For true season-long
permanence, that recent-use log is persisted here in the Memory Engine — so he
won't reuse a line from three weeks ago either.

## How the Gaffer uses memory in copy

- **Callbacks:** "Same again from {team}, just like that Tuesday banker."
- **Honesty:** "Hands up — I had us down for that one and it stunk the place out."
- **Continuity:** "Our donkey's defending his crown this week, lads."
- **Warmth:** referencing a member's running story makes the club feel like home.

Rules: only narrate what's truly in the store; never invent a past event; keep
callbacks light and earned, never forced.

## Engine ↔ memory handshake

The football engine writes the facts (picks, results, P&L, donkey flags). The
Gaffer Engine writes the narration log and the phrase-memory. ChatGPT/owner can
adjust narration control. Claude's engine never edits the immutable log except
to append new, true events.

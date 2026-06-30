# 13 — Content Pipeline

**Status:** Permanent · the daily machine, end to end.

This is how a day's football turns into the Gaffer's published words — which
signal feeds what, in what order, on what clock. It ties together the football
engine (Claude), the Gaffer Engine (voice), and publishing (Lovable).

## The daily clock (UK)

```
03:00  Engine refresh — pull today's fixtures across the chosen leagues,
       compute form tables (combined averages), value flags, the day's picks.
       Fallback: if today's thin, roll forward to the next matchday.
06:00  Recap data ready — yesterday's settled results + P&L.
       → Gaffer writes the morning recap (T4).
09:30  Picks ready — the day's value selection(s) + £10 single/double.
       → Gaffer writes today's pick(s) (T1/T2)  — or the no-bet notice (T3).
LIVE   Live scores tick (<60s where the API allows) — optional in-play nudges.
FT     Settlement — results in, P&L updated, picks marked won/lost.
MON    Donkey candidates flagged → winner chosen → roast published (T5).
WEEK   Round-up, awards, prize announcements.
```

## The flow for one piece

```
1. SIGNALS   football engine emits objective signals
             (form %, odds, edge, streak, value flag, P&L, donkey flags)
2. INTERPRET interpretation guide (doc 15) maps signals → meaning
             (cautious / excited / pass), under the personality (docs 00–14 win)
3. SELECT    Editorial Engine (doc 06) picks the format + template (doc 07)
4. ASSEMBLE  Gaffer voice engine builds a FRESH line from the phrase banks
             (doc 10), filling live data, blocking recent phrases
5. INSPECT   Inspector (doc 12) — data-true, in voice, hedged, fresh, safe
6. PUBLISH   passes → Lovable renders it (homepage / pages / social, doc 08)
             fails → back to step 4 (the retry differs by design)
7. REMEMBER  log the pick, the result later, and the phrases used (doc 05)
```

## Who owns each step

| Step | Owner |
|---|---|
| Signals, refresh, fallback, P&L, donkey flags | Claude (football engine) |
| Interpretation meaning | doc 15 (under docs 00–14) |
| Format, voice, assembly, templates, banks | Gaffer Engine (voice) |
| Inspector gate | Gaffer Engine / QA |
| Publishing / rendering / scheduling | Lovable |
| Memory + running stories | Gaffer Engine + DB (Claude appends facts) |

## Non-negotiables

- **Nothing publishes that fails the Inspector** (doc 12).
- **No value → no-bet notice**, never a forced tip.
- **Fresh every time** — the anti-repeat memory spans the whole pipeline.
- **Data-true** end to end — the words can only ever describe the real signals.
- **On the clock** — content is ready before it's needed (03:00 refresh feeds
  the 06:00 and 09:30 drops).

## Failure handling

- Thin/empty slate → roll-forward fallback (engine) + honest no-bet voice.
- Missing data → hold the piece, don't guess. A late tip beats a wrong one.
- Inspector hard fail → block + log; never ship to "fill the slot".

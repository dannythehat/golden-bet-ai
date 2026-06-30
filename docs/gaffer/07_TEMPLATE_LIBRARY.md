# 07 — Template Library

**Status:** Permanent · the skeletons each output is built on.

A template is a **shape**, not a script. It says which parts go where; the parts
come fresh from the phrase banks (doc 10) every time, so the same template never
produces the same words twice.

> Notation: `[BANK]` = pull fresh from that bank · `{placeholder}` = live data ·
> `(optional)` = include sometimes. Banks live in `src/data/gaffer/phraseLibrary.ts`.

---

## T1 — Daily pick (the core)

```
[OPENER]
[MARKET_FLAVOUR for {market}]
[EDGE_PHRASES] (fills {pct}, {odds}, {streak})
[VERDICT_STRONG | VERDICT_VALUE by tier]
(ASIDES)
[HEDGES]
[SIGN_OFFS]
```
Built by `gafferPickLine(signals, seed)`. Selection + numbers come from the
football engine; tier (strong/value) from the value flag (doc 15).

**Example shape filled:** "Right, {Arsenal} v {Liverpool}. [corner flavour].
[edge with 84% / 1.83]. That's value, not a hope. [aside]. No guarantees, mind.
Tenner on it."

## T2 — Daily double / single (bet of the day)

```
[OPENER framing "today's £10 {double|single}"]
leg 1: {team} v {opp} — {selection} @ {odds}
leg 2 (if double): {team} v {opp} — {selection} @ {odds}
combined {combinedOdds} → returns £{returns} from £10
[HEDGES]
[SIGN_OFFS]
```
Staking from `getDailyBet` (engine): two qualifiers → £10 double, else £10 single.

## T3 — No-bet notice

```
[NO_BET]
(brief look-ahead: "back tomorrow")
```
Built by `gafferNoBetLine(seed)`. One honest line. Never apologise for it.

## T4 — Morning recap

```
greeting + date
what landed: {wins} (callback if it was a flagged banker)
what stunk: {losses} (own it — doc 01)
the running record: {W-L}, {roiPct}% (from P&L)
look ahead: a teaser for today
[SIGN_OFFS]
```
Data from P&L / settlement. Honest first, funny second.

## T5 — Donkey of the Week

```
fanfare opener
[DONKEY_ROASTS] (or the specific flagged moment, narrated)
the prize on offer
"could it be you?" nudge
```
Candidates flagged by the engine; winner chosen by admin (docs 05, 06).

## T6 — Article (preview / form check / weekend ahead)

```
hooky headline (in voice)
the angle (what the form says)
2–4 fixtures, each: short read + the value (T1 condensed)
a running-story callback (optional, doc 11)
honest sign-off
```
Longer room, same rules: data-true, fresh, hedged, funny.

## T7 — Social post (see doc 08 for platform voice)

```
short hook
the pick or the result, tight
one emoji max (social only)
CTA / link
```

---

## Rules for all templates

- **No part is hard-coded.** Every `[BANK]` pulls fresh and respects the
  anti-repeat memory (doc 10).
- **Live data only** in `{placeholders}` — never a made-up number or team.
- **Order can flex** for rhythm, but the *job* of each part stays.
- **Always hedged, always in voice**, always passes the Inspector (doc 12).
- New templates get added here first, then wired in the Editorial Engine (doc 06).

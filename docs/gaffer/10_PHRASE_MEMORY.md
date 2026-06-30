# 10 — Phrase Memory (the no-repeat guarantee)

**Status:** Permanent · the system that stops the Gaffer ever repeating himself.

## The promise

The Gaffer can talk **every single day, all season**, and never sound like a
repeat. He doesn't read a fixed script — every line is **assembled fresh** from
banks of interchangeable parts, and a memory blocks anything he's used recently.

## How it works

A line is built by picking one entry from each relevant bank and slotting in the
live numbers:

```
[opener] + [market flavour] + [edge line] + [verdict] + (optional aside)
        + [hedge] + [sign-off]
```

Each bank holds many alternatives. The maths of variety is the whole point —
combinations multiply:

> 20 openers × 7 corner flavours × 7 edge lines × 10 verdicts × 7 hedges
> × 10 sign-offs ≈ **685,000** corner lines alone — before nicknames, asides,
> and the other markets. Add a few entries to any bank and it leaps again.

So the banks don't need thousands of *finished sentences* — they need plenty of
*parts*, and the combinations give you the thousands (millions, really).

## The anti-repeat memory

Implemented in `src/lib/gafferVoice.ts`:

- Every time a bank entry is used, its index is remembered.
- The picker **won't choose a remembered entry** until enough others have been
  used (it remembers ~60% of each bank before letting one come back round).
- So within any short window — a day's card, a week of posts — he never reuses
  the same opener, verdict, joke or sign-off.
- Seeding by `fixtureId + date` keeps a given pick **stable** (regenerating
  doesn't reshuffle it) while different picks/days never collide.

For cross-session permanence (so he doesn't repeat last Tuesday's line three
weeks later), the recent-use log is persisted via the Memory Engine (doc 05) —
the database remembers; the Gaffer narrates.

## The banks (in `src/data/gaffer/phraseLibrary.ts`)

| Bank | Job |
|---|---|
| `OPENERS` | how he kicks a pick off |
| `MARKET_FLAVOUR` | colour per market (Corners/Goals/Cards/BTTS) |
| `VERDICT_STRONG` / `VERDICT_VALUE` | his call, by value tier |
| `EDGE_PHRASES` | the "bookies asleep" lines (numbers slot in) |
| `HEDGES` | the never-a-guarantee caveats |
| `NO_BET` | ways to say "no value, I'm passing" |
| `SIGN_OFFS` | closers |
| `ASIDES` | banter/domestic asides (optional sprinkle) |
| `DONKEY_ROASTS` | Donkey-of-the-Week lines |
| `TEAM_NICKNAMES` | real-team epithets (the Gunners, the Toon…) |

## Growing the library (ongoing job)

- **Always be adding.** New openers, new jokes, new sign-offs, seasonal lines
  (Christmas, derby day, final day), more team nicknames as leagues come into
  season. The engine scales automatically — more parts, more variety.
- **Write in voice.** Every new entry must pass docs 02/03/04 (personality,
  language, humour). When in doubt, read it aloud in a pub voice.
- **Keep jobs single.** One opener does one job; don't bake the verdict into the
  opener, or you lose combinations.
- **No near-duplicates.** Two entries that say the same thing the same way waste
  a slot — make them genuinely different.

## Placeholders

`{team} {opp} {teamNick} {oppNick} {market} {mark} {odds} {pct} {edge} {streak}`
— filled by the voice engine from the live signals. Never hard-code a team or a
number into a bank entry.

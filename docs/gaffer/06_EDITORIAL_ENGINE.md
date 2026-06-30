# 06 — Editorial Engine

**Status:** Permanent · what the Gaffer publishes, and when.

The Editorial Engine turns the day's signals into the Gaffer's output. Every
piece is assembled fresh (docs 03, 04, 10), built on real data (the football
engine), and true to character (docs 01, 02).

## The daily beats

| Time (UK) | Piece | Built from | Voice |
|---|---|---|---|
| 06:00 | **Morning recap** | yesterday's settled picks + P&L (engine) | honest, warm, owns losers |
| 09:30 | **Today's pick(s)** | the day's value selections + £10 single/double | confident, hedged, funny |
| 09:30 | **No-bet notice** (if nothing qualifies) | empty selection | dry, disciplined, content |
| Live | **In-play nudges** (optional) | live scores | brief, buzzing |
| Weekly (Mon) | **Donkey of the Week** | donkey candidates (engine) → winner (admin) | full theatre |
| Weekly | **Round-up / awards** | week's results, standings | celebratory, communal |
| Seasonal | **Specials** | calendar (derby, Christmas, final day) | raises his game |

## The output types (skeletons live in doc 07)

1. **Daily pick** — opener → market read → value (form % vs odds) → verdict →
   (aside) → hedge → sign-off. Built by `gafferPickLine`.
2. **No-bet** — a single honest pass line. Built by `gafferNoBetLine`.
3. **Recap** — short, conversational: what landed, what stunk, the running
   record, a look ahead.
4. **Donkey of the Week** — the roast. Built by `gafferDonkeyLine` + the winner.
5. **Article** — longer-form (preview, form check, weekend ahead). Same voice,
   more room; still never padded, still data-true.

## Iron rules for every piece

- **Data-true.** Only the engine's real numbers, never invented.
- **Fresh.** Nothing reused — every piece goes through the phrase memory (doc 10).
- **Hedged.** Confidence always carries a sensible caveat.
- **Honest.** Losers owned as loudly as winners are celebrated.
- **In character.** Passes docs 01–04 and the Inspector (doc 12) before it ships.
- **UK voice.** Decimal odds, pounds, no "the line", no US slang.

## Cadence discipline

- He posts **every day** — even a no-bet day gets a line. Silence isn't on brand.
- He never forces a tip to fill a slot. No value → no-bet notice, proudly.
- Big occasions get more theatre; quiet midweeks stay lean.

## Hand-offs

- **Football engine (Claude):** supplies picks, results, P&L, donkey candidates,
  fixtures, the structured signals + interpretation (doc 15).
- **Gaffer Engine (voice):** turns those into fresh, in-character copy.
- **UI/CMS (Lovable):** renders/publishes; surfaces it on the homepage, the
  pages, and social (doc 08).

## Quality gate

Nothing publishes until it passes the Inspector (doc 12): in voice, in date,
data-true, hedged, not a repeat. A piece that fails goes back, it never ships.

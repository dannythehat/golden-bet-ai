/**
 * THE GAFFER — day-verdict phrase banks.
 *
 * His spoken word on the day's slips once they've settled. Same rule as the rest
 * of his voice: nothing is a fixed sentence — the verdict is ASSEMBLED fresh from
 * these banks (opener × mood × a real winning highlight × a real losing highlight
 * × closer), seeded by the date so it's stable for the day but never the same two
 * days running. The moods react to the actual result: a clean sweep gets him
 * buzzing, a mixed day gets a wry grin, a blank gets an honest chin-up.
 *
 * Placeholders the assembler fills from the real result: {home} {away} {ft}
 * {g} (total goals) {cul} (the side that let a BTTS leg down) {note} (optional
 * match colour — a hook for live football news later: "last-minute winner" etc).
 */

/* ── Openers — he pulls up a chair to give the report ────────────────────── */
export const DAY_OPENERS = [
  'Right, team talk — here’s how the slips landed.',
  'Gather round, the Gaffer’s report is in.',
  'So, how’d we do? Let me walk you through it.',
  'Verdict time. The good, the bad, all of it.',
  'Pull up a chair — here’s how the day played out.',
  'Let’s run the rule over the day’s action.',
  'Slips are settled, so here’s your honest word from the Gaffer.',
  'Whistle’s gone on the lot — here’s the damage.',
  'Results are in, and I never hide from ’em. Here we go.',
  'Right then, let’s total up the day.',
];

/* ── Perfect day — BOTH slips home. He is over the moon ──────────────────── */
export const DAY_PERFECT = [
  'Get IN! The double AND the treble — both home. Days like this are why we do it.',
  'Clean sweep, the lot of it! Not a leg out of place. I’m buzzing, lads.',
  'Full house! Double in, treble in — frame this one and hang it on the wall.',
  'Both up, flawless. Read every single one right. Get the drinks in.',
  'Perfect day at the office — double and treble both bang in. Doesn’t get sweeter.',
  'The whole card paid. I’d take that every day of the week and twice on Saturdays.',
  'Absolute masterclass — everything landed. The Gaffer’s grinning ear to ear.',
];

/* ── Single/overall winner — a green day ─────────────────────────────────── */
export const DAY_WIN = [
  'Winner! Came in just as I called it — lovely start to the week.',
  'Get on! That one paid out nice and easy. Green’s the colour.',
  'Banked. Did exactly what the numbers said it would. Tidy.',
  'Cashed. The form talked and the slip listened. Happy days.',
  'In it goes. A proper result — that’s money in the bank.',
];

/* ── Mixed day — one up, one down. Happy but honest ──────────────────────── */
export const DAY_MIXED = [
  'Mixed bag, this. The double came in — get in! — but the treble fell short.',
  'Half and half. Banked the double, the treble just missed. A green day’s a green day.',
  'One up, one down. The double did the business; the treble had a leg too many.',
  'Winning day overall — the double paid even if the treble let us slip. Onwards.',
  'Bit of both. Pocketed one, waved the other goodbye. Still ahead, still smiling.',
  'The double delivered, the treble teased us. That’s the game — we bank the good.',
];

/* ── Blank day — both down. No spin, chin up ─────────────────────────────── */
export const DAY_ALL_LOST = [
  'Not our day, I’ll be straight with ya — both slips went down. It happens. We don’t hide from it.',
  'Hands up, the card didn’t land. That’s football. We dust off and go again.',
  'Rough one. Nothing came in. But I’ve banked more winners than losers, and that won’t change.',
  'A blank — no sugar-coating it, both bets lost. The good days pay for the likes of this.',
  'Took one on the chin today. Every tipster has ’em; the honest ones tell you. We’re honest.',
  'Didn’t come off, simple as. I deal in edges, not miracles — some days the ball won’t roll our way.',
];

/* ── A real WINNING leg to shout about (filled from the result) ──────────── */
export const WIN_LEG: Record<string, string[]> = {
  Goals: [
    '{home} and {away} threw {g} goals at us{note} — the over was never in doubt.',
    '{g} goals in the {home} game{note}, {ft} — called the goal-fest to a tee.',
    '{home} v {away} finished {ft}{note} — told you the net would bulge, and bulge it did.',
    '{g}-goal thriller at {home}{note} — {ft}, and the over strolled home.',
    'no danger in {home} v {away}{note} — {ft}, {g} goals, easy as you like.',
    '{home} v {away} served up {ft}{note} — that’s {g} goals for the greedy, over romped in.',
    'the goals turned up early and often in {home} v {away}{note} — {ft}, get in.',
  ],
  BTTS: [
    'both ends busy in {home} v {away}, {ft}{note} — both-teams-to-score, textbook.',
    '{home} {ft} {away}{note} — both found the net, exactly as the Gaffer ordered.',
    'nets rippling at both ends in {home} v {away}{note} — {ft} and paid in full.',
    'neither kept it out in {home} v {away}{note} — {ft}, both scored, lovely.',
    '{home} v {away} traded goals like I said they would{note} — {ft}, both-to-score home.',
    'two teams, two nets bulging in {home} v {away}{note} — {ft}, cashed.',
  ],
  Corners: [
    'the flags never stopped in {home} v {away}{note} — corners cashed, easy money.',
    '{home} v {away} was a set-piece factory{note} — the corner line sailed in.',
    'corners raining in at {home} v {away}{note} — the over never looked in doubt.',
    '{home} v {away} whipped ’em in from everywhere{note} — corner line home and hosed.',
  ],
  default: [
    '{home} v {away} did exactly what I said{note}, {ft} — spot on.',
    '{home} v {away} came good, {ft}{note}. Reading the form, that’s all it is.',
    '{home} v {away} landed clean, {ft}{note} — money in the bank.',
  ],
};

/* ── The leg that COST us — named and explained, no hiding ───────────────── */
export const LOSS_LEG: Record<string, string[]> = {
  Goals: [
    '{home} v {away} bored us rigid at {ft}{note} — the goals never turned up, and there’s your loser.',
    'the {home} game died a death, {ft}{note} — not enough goals, and that’s the leg that did us.',
    '{home} v {away} kept the shutters down, {ft}{note} — the over never got going, that’s the one.',
    'a low-scorer in {home} v {away} of all games, {ft}{note} — the goals dried up and cost us.',
    '{home} v {away} froze at {ft}{note} — nowhere near the goals, and that’s our loser.',
  ],
  BTTS: [
    '{cul} couldn’t buy a goal ({ft}){note} — no both-teams-scored, and that’s what cost us.',
    'a clean sheet in {home} v {away} of all games, {ft}{note} — {cul} let us down, simple as.',
    '{home} v {away} stayed one-sided at {ft}{note} — {cul} never showed up, there’s the loser.',
    '{cul} drew a blank in {home} v {away}, {ft}{note} — both-to-score down the drain.',
    '{ft} in {home} v {away}{note} — {cul} forgot their shooting boots, and that sank the slip.',
    'only one team turned up in {home} v {away}, {ft}{note} — {cul} silent, there’s the dud.',
  ],
  Corners: [
    'the corners dried right up in {home} v {away}{note} — the one leg that let the slip down.',
    '{home} v {away} kept it narrow{note} — the corner count fell short, and that’s our loser.',
    'not enough flags in {home} v {away}{note} — the corner line missed, that’s the one that hurt.',
  ],
  default: [
    '{home} v {away} was the one that got away, {ft}{note}. Football, eh.',
    '{home} v {away} let us slip at {ft}{note} — that’s the leg I’d want back.',
    '{home} v {away} came up short, {ft}{note} — the leg that cost the lot.',
  ],
};

/* ── Closers — forward-looking, never the same twice ─────────────────────── */
export const DAY_CLOSERS = [
  'Fresh card tomorrow — let’s keep the good times rolling.',
  'That’s yesterday. Today’s another day, another slip, another chance.',
  'On to the next — the Gaffer’s already eyeing tomorrow’s value.',
  'Long game, this. We reset and go again.',
  'Same time tomorrow. Bring your tenner and your optimism.',
  'Here’s hoping the luck stays with us — back at it in the morning.',
  'Never stop, never settle — tomorrow’s winners are already brewing.',
  'That’s the beauty of it: always another game round the corner.',
  'Chin up or chest out, either way we go again tomorrow.',
  'The card never sleeps, and neither does the Gaffer. See you tomorrow.',
];

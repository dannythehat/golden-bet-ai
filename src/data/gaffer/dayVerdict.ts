/**
 * THE GAFFER — day-verdict phrase banks.
 *
 * His spoken word on the day's slips once they've settled. Same rule as the rest
 * of his voice: nothing is a fixed sentence — the verdict is ASSEMBLED fresh from
 * these banks (opener × mood × a real winning highlight × a real losing highlight
 * × closer), seeded by the date so it's stable for the day but never the same two
 * days running.
 *
 * VOICE RULE: every entry is a complete, flowing thought that could stand alone
 * in his mouth — proper sentences with connective tissue, wit woven in rather
 * than bolted on. Entries begin with a capital because they're joined after
 * full stops.
 *
 * Placeholders filled from the real result: {home} {away} {ft} {g} (total
 * goals) {cul} (the side that let a BTTS leg down) {note} (optional colour).
 */

/* ── Openers — he pulls up a chair to give the report ────────────────────── */
export const DAY_OPENERS = [
  'Right, pull up a chair, because I owe you the honest word on yesterday’s slips — the good, the bad, and the bits I’d rather not talk about.',
  'Results are in, and you know the house rule by now: I read them out whether they flatter me or not.',
  'Team talk time — the whistle’s gone on everything we backed, so let’s tot up the damage and the glory in that order or the other.',
  'Let me walk you through how yesterday actually went, because a record only means something if somebody’s honest about it every single morning.',
  'The slips are settled and the kettle’s on, so here’s your report from the Gaffer — no spin, no hiding, just what happened.',
  'Morning, you lot. Before we talk about today’s card, we settle up yesterday’s like grown-ups.',
  'I’ve had my coffee and read the scores twice, so here it is — yesterday’s verdict, straight from the man who picked them.',
  'Every morning I mark my own homework in public, which is either brave or daft depending on the scoreline — let’s find out which today.',
];

/* ── Perfect day — BOTH slips home. He is over the moon ──────────────────── */
export const DAY_PERFECT = [
  'And what a morning to be marking it, because the LOT came in — the double, the treble, every leg standing to attention. Days like this are why I put up with the other kind.',
  'Clean sweep. Every slip, every leg, exactly as called — I’ve been grinning since the final whistle and I have no intention of stopping.',
  'Both slips landed, not a leg out of place, and I want it on record that I called every one of them before a ball was kicked — frame this day and hang it in the hallway.',
  'Full house! The double paid, the treble paid, and somewhere a bookmaker is staring at his screen wondering where it all went wrong. I can tell him: the form table.',
  'Perfection, more or less — everything we touched turned green, and while I’d love to act humble about it, humility can wait until we lose one.',
  'The whole card came home like it was on rails. Read the form, trust the numbers, collect — some days this game makes you look like a genius, and I’m taking it.',
];

/* ── Single/overall winner — a green day ─────────────────────────────────── */
export const DAY_WIN = [
  'And it’s a green one — the slip did exactly what the numbers said it would, which is the most satisfying sentence in this whole trade.',
  'Winner. Not a dramatic one, not a lucky one — just the form doing what the form’s been doing for weeks, with our money sat on top of it.',
  'The slip landed, the ledger ticks up, and the system does what the system does — no fireworks needed, just another brick in the wall.',
  'Banked it. When you read the game right, the final whistle is just an administrative detail — money in, on we go.',
  'A tidy green day — called it in the morning, cashed it by night, and slept like a man whose spreadsheet loves him.',
];

/* ── Mixed day — one up, one down. Happy but honest ──────────────────────── */
export const DAY_MIXED = [
  'It was a day of two halves, this — the double marched home without breaking sweat, but the treble found the one result on the card with other ideas.',
  'Mixed bag, and I’ll give it to you straight: the double banked, the treble came up a leg short, and the ledger still moved the right direction — which is the bit that matters.',
  'We took one and dropped one — the double paid out handsomely while the treble tripped over its own shoelaces at the final hurdle. A green day overall, and I’ll bank those all season.',
  'Half glory, half grumbling: the double did everything asked of it, the treble had one leg too ambitious. That’s trebles for you — bigger pay-off, more ways to break your heart.',
  'The double delivered like a good pro, the treble teased us and fell away — but when the maths shakes out, we’re still up on the day, and up is up.',
  'One slip in, one slip down, profit still positive — I’d call that a decent day at the office anywhere in football.',
];

/* ── Blank day — both down. No spin, chin up ─────────────────────────────── */
export const DAY_ALL_LOST = [
  'I’ll not dress it up: both slips went down, and no amount of clever words turns red into green. It happens to every honest record — the dishonest ones just delete days like this.',
  'A blank, and it stings — nothing landed, the ledger takes a knock, and I take it on the chin in public, because that’s the deal we have.',
  'Rough day at the office — both bets lost, and while the reads were right more than the results suggest, results are what pay, so we log it and move.',
  'Both slips down, hands up from me. I deal in edges, and edges mean sometimes the percentages take a day off — the long game is where we win, and the long game continues tomorrow.',
  'Not our day, simple as that — the card went against us leg by leg, and I’d rather show you the loss in full than pretend it didn’t happen. Honest record, honest morning.',
];

/* ── A real WINNING leg to shout about (filled from the result) ──────────── */
export const WIN_LEG: Record<string, string[]> = {
  Goals: [
    'The star of the show was {home} against {away} — {g} goals in it{note}, finished {ft}, and honestly the over was home before some of you had found your seats.',
    'Take a bow, {home} v {away}: I promised goals, they delivered {g} of them{note}, and the {ft} scoreline made our over look less like a bet and more like a spoiler.',
    'The pick of the winners was the {home} game — {ft}{note}, {g} goals for the greedy, and the sweet feeling of watching a form read play out to the letter.',
    '{home} v {away} did everything I said it would and then some{note} — {ft} at the whistle, and the over sailed home with time to spare.',
    'I told you the {home} v {away} defences were held together with tape, and {g} goals later{note} the scoreboard read {ft} — that’s the form table talking, not luck.',
  ],
  BTTS: [
    'The both-teams-to-score in {home} v {away} was almost rude in how easily it landed — {ft}{note}, both nets rippling, exactly the open game the numbers promised.',
    '{home} and {away} traded goals just like I said they would{note} — {ft} at full time, both sides on the scoresheet, and the slip never in a moment’s danger.',
    'Sweetest of the winners was {home} v {away} — neither defence turned up, which is precisely why we were there, and the {ft}{note} paid us in full.',
    'The BTTS in {home} v {away} behaved impeccably{note} — both ends found the net on the way to {ft}, textbook stuff from two teams who simply cannot help themselves.',
  ],
  Corners: [
    'The corners in {home} v {away} came exactly as advertised{note} — flags flying all game, the line beaten with room to spare, and the easiest watch of the day.',
    'Our corner play in {home} v {away} was a joy{note} — two teams whipping it wide all afternoon, the count climbing like a lift, and the over home well before the end.',
    '{home} v {away} turned into the set-piece festival I promised{note} — corner after corner until the line was a dot in the rear-view mirror.',
  ],
  default: [
    '{home} v {away} came in clean at {ft}{note} — read the form, backed the form, paid by the form. That’s the whole method in one result.',
    'The {home} game did precisely what the numbers ordered{note} — {ft}, slip paid, another one for the “told you so” folder.',
  ],
};

/* ── The leg that COST us — named and explained, no hiding ───────────────── */
export const LOSS_LEG: Record<string, string[]> = {
  Goals: [
    'The villain of the piece was {home} v {away}, which crawled to {ft}{note} — the goals I promised never showed up, and that single flat game is what sank the slip.',
    'Where did it go wrong? {home} against {away}, that’s where — a {ft} borefest{note} from two teams who’d scored for fun all month and picked yesterday to remember how to defend.',
    'The leg that cost us was {home} v {away} at {ft}{note} — I read an open game and got a chess match, and I’ll hold my hands up: the goals simply never came.',
    'Everything stood up except {home} v {away}, which froze at {ft}{note} — that’s the one I’d want back, and the one I’ll be studying over breakfast.',
  ],
  BTTS: [
    'The dud was the both-teams-to-score in {home} v {away} — {cul} couldn’t buy a goal at {ft}{note}, and one shy front line is all it takes to sink that market.',
    'Our BTTS died in {home} v {away}, where {cul} forgot their shooting boots entirely{note} — {ft} at the whistle, one net untouched, slip down the drain.',
    'The costly one was {home} v {away} at {ft}{note} — I needed both to score and {cul} never looked like obliging, which is football’s way of keeping a man humble.',
    'One team turned up in {home} v {away} and it wasn’t {cul}{note} — {ft}, no both-teams-scored, and there’s your loser, named and shamed.',
  ],
  Corners: [
    'The leg that let us down was the corners in {home} v {away}{note} — the game stayed narrow, the flags stayed still, and the count fell short of the line.',
    'Blame the corners in {home} v {away}{note} — two wide-loving teams picked yesterday to play through the middle, and our line never got close.',
  ],
  default: [
    'The one that got away was {home} v {away} at {ft}{note} — right read, wrong day, and that’s the leg I’ll be turning over in my head tonight.',
    '{home} v {away} came up short at {ft}{note} — one leg out of step, and in this game one is all it takes.',
  ],
};

/* ── Closers — forward-looking, never the same twice ─────────────────────── */
export const DAY_CLOSERS = [
  'That’s yesterday filed — today’s card is already on my desk, the coffee’s fresh, and the value doesn’t find itself. Back shortly with the picks.',
  'We log it, we learn from it, and we go again — the beautiful thing about this game is there’s always another card tomorrow, and I intend to read it better than the bookies do.',
  'Long game, this — one day never makes us and one day never breaks us, which is exactly why the record stays public and the method stays the same.',
  'Same time tomorrow, same honest report — bring your tenner, bring your patience, and let the numbers do their slow, reliable work.',
  'Right, that’s the accounting done — now if you’ll excuse me, tomorrow’s form tables aren’t going to squint at themselves.',
  'The card never sleeps and neither does the spreadsheet — see you in the morning with the next round of value.',
  'On we go — the season is a marathon of small edges, and yesterday, whatever it was, is now just one more data point behind us.',
  'Whatever yesterday gave us, today asks a new question — and I’ll have an answer on the board by breakfast, same as always.',
];

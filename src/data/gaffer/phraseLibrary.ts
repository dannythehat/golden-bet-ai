/**
 * THE GAFFER — phrase library (the voice's raw material).
 *
 * The Gaffer never repeats himself. He doesn't read fixed sentences — every line
 * is ASSEMBLED fresh from these banks (opener × flavour × verdict × aside ×
 * sign-off), with a memory that avoids anything used recently (see
 * src/lib/gafferVoice.ts). Modest banks combine into millions of unique lines.
 *
 * Placeholders the assembler fills: {team} {opp} {teamNick} {oppNick} {market}
 * {mark} {odds} {pct} {edge} {streak}.
 *
 * These are SEED banks — designed to keep growing. Add entries freely; the
 * engine scales automatically. Voice rules live in docs/gaffer/03_LANGUAGE.md
 * and docs/gaffer/10_PHRASE_MEMORY.md.
 */

/* ── Real-team nicknames (the Gaffer never says the same name twice running) ── */
export const TEAM_NICKNAMES: Record<string, string[]> = {
  Arsenal: ['the Gunners', 'the Arsenal', 'Arteta’s lot', 'the North London lot'],
  Liverpool: ['the Reds', 'the Scousers', 'the Anfield mob', 'Liverpool'],
  'Manchester City': ['City', 'the Citizens', 'Pep’s lot', 'the Sky Blues'],
  'Manchester United': ['United', 'the Red Devils', 'the Old Trafford lot'],
  Chelsea: ['the Blues', 'the Pensioners', 'Chelsea', 'the Stamford Bridge lot'],
  Tottenham: ['Spurs', 'the Lilywhites', 'the Tottenham lot'],
  Newcastle: ['the Toon', 'the Magpies', 'the Geordies', 'Newcastle'],
  Everton: ['the Toffees', 'the Goodison lot', 'Everton'],
  'Aston Villa': ['Villa', 'the Villans', 'the Claret and Blue'],
  Brighton: ['the Seagulls', 'Brighton', 'the Albion'],
  'West Ham': ['the Hammers', 'the Irons', 'West Ham'],
  Wolves: ['Wolves', 'the Wanderers', 'the Old Gold'],
  Leeds: ['Leeds', 'the Whites', 'the Yorkshire lot'],
  Brentford: ['the Bees', 'Brentford'],
  Fulham: ['the Cottagers', 'Fulham'],
  'Crystal Palace': ['the Eagles', 'Palace', 'the Selhurst lot'],
  'Nottingham Forest': ['Forest', 'the Tricky Trees', 'the City Ground lot'],
  Bournemouth: ['the Cherries', 'Bournemouth'],
  Barcelona: ['Barça', 'the Catalans', 'the Blaugrana'],
  'Real Madrid': ['Madrid', 'Los Blancos', 'the Bernabéu lot'],
};

/** Resolve a varied epithet for a team (falls back to the plain name). */
export function nickname(team: string, i: number): string {
  const list = TEAM_NICKNAMES[team];
  if (!list || !list.length) return team;
  return list[i % list.length];
}

/* ── Openers — how he kicks a pick off ───────────────────────────────────── */
export const OPENERS = [
  'Right, {team} v {opp}.',
  'Get this one down, lads — {team} against {opp}.',
  'Now then. {team} hosting {opp}.',
  'Cop a look at {team} v {opp}.',
  'Here’s your one for today: {team} v {opp}.',
  'I’ve had me magnifying glass on {team} v {opp}.',
  'Don’t scroll past this — {team} v {opp}.',
  'Listen in. {team} v {opp} is the one.',
  'Pen out for {team} v {opp}.',
  'Been all over {team} v {opp} this morning.',
  'Stick the kettle on for {team} v {opp}.',
  'Cards on the table — {team} v {opp}.',
  'This is the standout: {team} v {opp}.',
  'Eyes here. {team} take on {opp}.',
  'One jumped off the page — {team} v {opp}.',
  'Sat with me coffee studying {team} v {opp}.',
  'Tell you where the value is: {team} v {opp}.',
  'Trust me on {team} v {opp}.',
  'Had a proper dig into {team} v {opp}.',
  'Pin your ears back — {team} v {opp}.',
];

/* ── Market flavour — colour per market (anti-dry) ───────────────────────── */
export const MARKET_FLAVOUR: Record<string, string[]> = {
  Corners: [
    'Both these mobs treat defending like an optional extra — corners flying in from everywhere.',
    'These two get the ball wide and whip it in all day. Flag’s never still.',
    'Wingers on both sides living in the corner — it’s a set-piece factory.',
    'They attack like the back door’s open. Corners stack up quick.',
    'Full-backs bombing on, crosses raining in — corner count goes through the roof.',
    'Neither of these can keep it out for toffee — corners by the bucketload.',
    'It’s end to end with this pair, and that means flags, flags and more flags.',
  ],
  Goals: [
    'Both these lot think defending’s beneath them — goals guaranteed entertainment.',
    'Two sides that’d rather score four than keep one out.',
    'Leaky at the back, lively up top — the net’s going to bulge.',
    'This pair couldn’t play a 0-0 if you paid ’em.',
    'Open as a 24-hour garage, the both of ’em. Goals coming.',
    'Forwards firing, defenders dozing — that’s a goal-fest brewing.',
  ],
  Cards: [
    'A proper needle match, this — ref’ll be reaching for his pocket early.',
    'Bad blood between these two. Bookings written all over it.',
    'Tasty fixture, this one. Tackles flying, names going in the book.',
    'Tempers fray when these meet — the ref won’t have a quiet afternoon.',
    'Niggly, scrappy affair coming up — cards on the cards.',
  ],
  BTTS: [
    'Both these score for fun and ship ’em just as easy — both teams to score is the play.',
    'Neither keeps a clean sheet to save their life — they’ll both find the net.',
    'Two sides that always trade goals. Both to score, no fuss.',
    'Soft at the back, sharp up front — both ends getting busy.',
  ],
};

/* ── Verdicts — STRONG tier (his bankers) ────────────────────────────────── */
export const VERDICT_STRONG = [
  'That’s not a hope, that’s a banker.',
  'I’m as sure as I get on this one.',
  'This is the strongest call on the card.',
  'If I’m having one today, it’s this.',
  'I’d be amazed if this doesn’t land.',
  'Nailed on as far as I’m concerned.',
  'This one I’m putting me name to.',
  'Daylight robbery at the price — get on.',
  'That’s the one I’m loading up.',
  'Confident as you like with this.',
];

/* ── Verdicts — VALUE tier (worth a punt) ────────────────────────────────── */
export const VERDICT_VALUE = [
  'There’s proper value in there.',
  'The price is wrong and we’re taking advantage.',
  'That’s value, not a hope.',
  'Bookies have slipped up on the price — pounce.',
  'Worth a few quid, that.',
  'Tidy little value play.',
  'The numbers say yes and the odds say thank you.',
  'A sneaky bit of value, this.',
  'Edge is with us here.',
  'That’ll do nicely for value.',
];

/* ── Edge / "bookies asleep" phrases (slot the numbers in) ─────────────────── */
export const EDGE_PHRASES = [
  'Form says {pct}% and the bookies are still kipping at {odds}.',
  'My numbers have it {pct}%, they’ve priced {odds} — that gap is the value.',
  'The book’s asleep: {pct}% on the form, {odds} on the board.',
  '{pct}% says the form, {odds} says the bookie. We pocket the difference.',
  'Bookies pricing it like a coin flip — form’s screaming {pct}%.',
  '{streak} on the spin in this market and they’ve still left {odds} lying about.',
  'They’ve under-cooked the price — {pct}% form against {odds}, all day.',
];

/* ── Confidence hedges — NEVER a guarantee ───────────────────────────────── */
export const HEDGES = [
  'No guarantees, mind — it’s football, not magic.',
  'Bet responsibly, eh. Even the Gaffer gets one wrong.',
  'It’s a strong call, not a certainty — nothing ever is.',
  'Stake what you can laugh off if it goes south.',
  'Football does what it wants — back it sensibly.',
  'No such thing as a sure thing, but this is close as it gets.',
  'Keep it tidy with the stakes — long game, this.',
];

/* ── No-bet phrases — when there's no value, he passes (loads of these) ─────── */
export const NO_BET = [
  'Had a proper look at today’s card and… nothing. Bookies have got it bang on.',
  'No value out there today, lads. I’m sitting on me hands.',
  'Nada. Nowt worth a tenner. I’ll not hand the bookies free money.',
  'Quiet one today — nothing clears the bar. Saving the powder.',
  'Looked everywhere. The prices are all spot on. No bet from me.',
  'Some days the value just isn’t there. This is one of ’em. Pass.',
  'Not forcing it. No edge, no bet — back tomorrow.',
  'Bookies have done their homework today. I’m staying out of it.',
  'Nothing tickles me today. Empty bet slip and proud of it.',
  'The Gaffer knows when to shut his wallet an’ all. No bet.',
];

/* ── Sign-offs — closers ─────────────────────────────────────────────────── */
export const SIGN_OFFS = [
  'Tenner on it and put the kettle on.',
  'Get it on. The Gaffer knows.',
  'On you go. Don’t say I never give you owt.',
  'Fill yer boots.',
  'That’s your lot — see you tomorrow.',
  'Back it and crack on.',
  'Lovely. Next.',
  'Job done. Trust the Gaffer.',
  'In the slip it goes.',
  'Enjoy, you lot.',
];

/* ── Banter asides — sprinkle of personality (optional) ──────────────────── */
export const ASIDES = [
  'I’ve seen pub teams defend better, but that suits us.',
  'My nan could’ve spotted this one, and she hates football.',
  'Don’t tell the missus how much I’m on it for.',
  'I was right last week an’ all, not that anyone says ta.',
  'Football, eh? Beautiful game, daft odds.',
  'I’d put me last Rolo on it.',
  'Even the cat agrees with this one.',
];

/* ── Donkey of the Week roasts ───────────────────────────────────────────── */
export const DONKEY_ROASTS = [
  'Step forward this week’s donkey — captained a fella who got sent off before he’d broken sweat.',
  'This week’s donkey forgot to set his team. Forgot. The whole team. Genius.',
  'Give it up for the donkey who benched a 19-pointer to start a bloke who didn’t leave the dugout.',
  'Our donkey backed the same dud striker five weeks running. Loyalty’s lovely, points are better.',
  'This week’s prize muppet scored nine when the rest of us got ninety. Take a bow, son.',
];

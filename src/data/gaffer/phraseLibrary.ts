/**
 * THE GAFFER — phrase library (the voice's raw material).
 *
 * The Gaffer never repeats himself. He doesn't read fixed sentences — every line
 * is ASSEMBLED fresh from these banks (opener × flavour × verdict × aside ×
 * sign-off), with a memory that avoids anything used recently (see
 * src/lib/gafferVoice.ts). Modest banks combine into millions of unique lines.
 *
 * VOICE RULE (hard-won): every entry must be a COMPLETE, FLOWING thought — a
 * proper sentence or two with connective tissue, the way a real manager talks
 * over a pint. No three-word fragments. When fragments get stitched together
 * the Gaffer sounds like a fruit machine; when full thoughts get stitched
 * together he sounds like himself.
 *
 * Placeholders the assembler fills: {team} {opp} {teamNick} {oppNick} {market}
 * {mark} {odds} {pct} {edge} {streak}.
 */

/* ── Real-team nicknames (the Gaffer never says the same name twice running) ── */
export const TEAM_NICKNAMES: Record<string, string[]> = {
  // Premier League
  Arsenal: ['the Gunners', 'the Arsenal', 'Arteta’s lot', 'the North London lot'],
  Liverpool: ['the Reds', 'the Scousers', 'the Anfield mob', 'the Kop'],
  'Manchester City': ['City', 'the Citizens', 'Pep’s lot', 'the Sky Blues'],
  'Manchester United': ['United', 'the Red Devils', 'the Old Trafford lot'],
  Chelsea: ['the Blues', 'the Pensioners', 'the Stamford Bridge lot'],
  Tottenham: ['Spurs', 'the Lilywhites', 'the Tottenham lot'],
  Newcastle: ['the Toon', 'the Magpies', 'the Geordies'],
  Everton: ['the Toffees', 'the Goodison lot', 'Everton'],
  'Aston Villa': ['Villa', 'the Villans', 'the Claret and Blue'],
  Brighton: ['the Seagulls', 'Brighton', 'the Albion'],
  'West Ham': ['the Hammers', 'the Irons', 'the London Stadium lot'],
  Wolves: ['Wolves', 'the Wanderers', 'the Old Gold'],
  Leeds: ['Leeds', 'the Whites', 'the Yorkshire lot'],
  Brentford: ['the Bees', 'Brentford'],
  Fulham: ['the Cottagers', 'Fulham'],
  'Crystal Palace': ['the Eagles', 'Palace', 'the Selhurst lot'],
  'Nottingham Forest': ['Forest', 'the Tricky Trees', 'the City Ground lot'],
  Bournemouth: ['the Cherries', 'Bournemouth'],
  Sunderland: ['the Black Cats', 'the Mackems', 'Sunderland'],
  Burnley: ['the Clarets', 'Burnley'],
  // Big European
  Barcelona: ['Barça', 'the Catalans', 'the Blaugrana'],
  'Real Madrid': ['Madrid', 'Los Blancos', 'the Bernabéu lot'],
  'Atletico Madrid': ['Atléti', 'the Rojiblancos'],
  'Bayern Munich': ['Bayern', 'the Bavarians'],
  'Borussia Dortmund': ['Dortmund', 'BVB', 'the Yellow Wall lot'],
  'Paris Saint-Germain': ['PSG', 'the Parisians'],
  Juventus: ['Juve', 'the Old Lady', 'the Bianconeri'],
  'Inter Milan': ['Inter', 'the Nerazzurri'],
  'AC Milan': ['Milan', 'the Rossoneri'],
  Ajax: ['Ajax', 'the Amsterdam lot'],
  // Summer-active leagues (in season now)
  KR: ['KR', 'the Reykjavík lot'],
  Valur: ['Valur', 'the Reykjavík reds'],
  Breidablik: ['Breidablik', 'the Kópavogur lot'],
  'Vikingur Reykjavik': ['Víkingur', 'the Víkings'],
  Rosenborg: ['Rosenborg', 'the Trondheim lot'],
  'FK Bodo - Glimt': ['Bodø/Glimt', 'the yellow lot from the Arctic'],
  Molde: ['Molde'],
  'Malmo FF': ['Malmö', 'the Sky Blues of Sweden'],
  'AIK Stockholm': ['AIK', 'the Stockholm lot'],
  Hammarby: ['Hammarby', 'Bajen'],
};

/** Resolve a varied epithet for a team (falls back to the plain name). */
export function nickname(team: string, i: number): string {
  const list = TEAM_NICKNAMES[team];
  if (!list || !list.length) return team;
  return list[i % list.length];
}

/* ── Openers — how he pulls you in before the read ───────────────────────── */
export const OPENERS = [
  'Right, gather round, because {team} against {opp} is the game I’ve been chewing on all morning.',
  'I’ve had the spreadsheets out since before me toast went cold, and {team} v {opp} is the one that kept staring back.',
  'Let me save you twenty minutes of scrolling: {team} v {opp} is where today’s money lives.',
  'Now then — {team} against {opp} might look like nothing on the coupon, but sit tight, because the numbers tell a different story.',
  'Every card has one game hiding in plain sight, and today it’s {team} v {opp}.',
  'I’ve watched more footage of {team} and {opp} this week than is strictly healthy for a man my age, and it’s paid off.',
  'You know that feeling when a price jumps off the page and slaps you? {team} v {opp} just did that to me.',
  'Forget the glamour ties — {team} against {opp} is where the bookies have left the window open.',
  'Done me homework on {team} v {opp}, checked it twice, and I’m still grinning.',
  'If you trust me on one game today, make it {team} v {opp}, and I’ll tell you exactly why.',
  'The best value never announces itself, which is how {team} v {opp} slipped past everyone but me.',
  'Been in this game long enough to smell a mispriced match from the car park — and {team} v {opp} absolutely reeks of it.',
];

/* ── Market flavour — the actual football read, per market ────────────────── */
export const MARKET_FLAVOUR: Record<string, string[]> = {
  Corners: [
    'Both of these teams live on the flanks — full-backs bombing past the wingers, crosses whipped in from everywhere — and when neither side can defend the first ball, the corner count climbs all afternoon.',
    'Watch five minutes of either team and you’ll see the pattern: work it wide, swing it in, defender panics, corner. Rinse and repeat until the linesman’s arm needs a physio.',
    'Neither of these sides plays through the middle when there’s a flank to overload, and both defences clear everything behind for a corner like they’re being paid per flag.',
    'This is two teams whose entire attacking plan is width and crosses, meeting two back lines that block everything out for another corner — a set-piece factory with the machines running hot.',
    'The corner numbers here aren’t a fluke of one mad game either — week after week these two rack them up, because both sets of wingers would rather die than cut inside.',
    'When a team can’t break a low block, they go wide and force corners, and both of these have spent the season doing exactly that to everyone they’ve played.',
    'Everything about the way these two attack — overlaps, deflections, keepers parrying behind — funnels the game toward that corner flag, and the stats have been saying it for weeks.',
    'These two produce corners the way other teams produce throw-ins: constantly, carelessly, and without either manager seeming to mind one bit. Suits us.',
  ],
  Goals: [
    'Both of these teams attack like the game owes them something and defend like they’ve never been introduced to the concept, which is precisely the cocktail you want when you’re backing goals.',
    'I’ve watched both back lines recently and, being kind, they’re generous — high lines with no pace behind them, and forwards at the other end who don’t need asking twice.',
    'Neither manager knows how to shut a game down, and honestly I don’t think either wants to — they trade punches until the whistle, and the scoreboard keeps up as best it can.',
    'When you get one team that has to chase the game and another that can’t help attacking the space, you get goals — and that’s this fixture down to the ground.',
    'The recent scorelines between these types of teams read like darts checkouts, and nothing in the form suggests either has suddenly discovered defending.',
    'Both keepers have spent the season picking the ball out of the net while their defenders point at each other, and both attacks are in the kind of form that punishes exactly that.',
    'A clean sheet in this one would genuinely be the biggest shock on the card — neither side has the personnel for it, the shape for it, or frankly the interest in it.',
    'These two play the sort of open, end-to-end stuff that’s brilliant to watch and terrible to defend, and the goals-per-game numbers have been screaming about it for a month.',
    'You can keep your tactical chess matches — this is two teams sprinting at each other for ninety minutes, and history says that ends with the net rippling at both ends.',
  ],
  Cards: [
    'There’s proper needle in this fixture — the kind where the first tackle sets the tone, the second starts an argument, and by the hour mark the ref has writer’s cramp.',
    'Both of these teams foul to break up play because neither can win the ball cleanly in midfield, and referees have been booking that all season without mercy.',
    'This is a scrap dressed up as a football match: two physical sides, plenty of history, and a card average between them that should come with a health warning.',
    'When two teams press this aggressively and time their tackles this badly, the bookings pile up on their own — no bad blood required, though there’s plenty of that too.',
    'Every meeting between these two follows the same script — niggly first half, boiling point after the break, and a referee reaching for his pocket like it’s on commission.',
  ],
  BTTS: [
    'Both of these score in nearly every game they play, and both concede in nearly every game they play — you don’t need my thirty years in football to finish that thought.',
    'Neither side can keep a clean sheet to save their lives, but both have forwards in genuine form, which makes both-teams-to-score less a punt and more an observation.',
    'The pattern with these two is carved in stone: they always find a goal because they always commit bodies forward, and they always concede because of the space that leaves behind.',
    'You look at one team that scores freely but leaks, and another built exactly the same way, and both-teams-to-score practically writes itself onto the slip.',
    'Both attacks are purring, both defences are held together with tape and good intentions — I’ve seen this movie a hundred times and it always ends with goals at both ends.',
    'Every route through this game leads to both nets bulging: too much quality up top on both sides, nowhere near enough resistance at the back on either.',
  ],
};

/* ── Verdicts — STRONG tier (his bankers) ────────────────────────────────── */
export const VERDICT_STRONG = [
  'This is the strongest call on the card by a distance, and I don’t say that lightly — I’ve turned down prettier prices this morning because the football didn’t back them up. This one has both.',
  'If you only follow me into one bet this week, make it this one — the pattern’s been repeating for a month and the market still hasn’t caught up.',
  'I’d put me name, me reputation and me best flat cap on this — everything I look for is here, and nothing I worry about is.',
  'Some picks I talk myself into; this one grabbed me by the collar. It’s the banker of the day and it isn’t close.',
  'I’ve done this long enough to know the difference between hoping and knowing, and this sits firmly in the second camp.',
  'You can build the whole slip around this one — it’s the kind of pick that makes the rest of the card feel like decoration.',
  'When the form, the matchup and the price all point the same way, you don’t hesitate — you get on, and you get on properly.',
  'I checked this three times looking for the catch, and there isn’t one — sometimes the game just hands you one.',
];

/* ── Verdicts — VALUE tier (worth a punt) ────────────────────────────────── */
export const VERDICT_VALUE = [
  'It’s not the flashiest pick you’ll see today, but the price is simply wrong, and taking wrong prices is how this whole operation stays in profit.',
  'The bookies have priced the reputation instead of the football here, and every time they do that, it’s our job to make them regret it.',
  'This is a proper value angle — not a coin flip dressed up, but a genuine gap between what the numbers say and what the market’s offering.',
  'I’m not promising fireworks, I’m promising an edge — and over a season, edges beat fireworks every single time.',
  'The smart money takes prices like this all day and lets the averages do the heavy lifting — that’s the trade, and this is a textbook example.',
  'Somebody at the bookmakers priced this one up in a hurry before their brew, and it shows — we’ll take advantage politely and move on.',
  'This is the kind of quiet, unglamorous value that nobody brags about and everybody profits from — my favourite kind.',
  'The door’s been left ajar on this price, and I’ve never once walked past an open door in thirty years of doing this.',
];

/* ── Edge / "bookies asleep" phrases (slot the numbers in) ─────────────────── */
export const EDGE_PHRASES = [
  'My numbers make this a {pct}% shot, and yet there it sits at {odds} like nobody at the bookmakers has looked at a form table since Christmas — that gap is where we make our living.',
  'The form says {pct}%, the price says {odds}, and when those two disagree this loudly, I know exactly which one I’m trusting — the one that doesn’t have a marketing department.',
  'Run the maths yourself if you like: {pct}% on the recent form against {odds} on the coupon leaves a gap you could drive the team bus through.',
  'They’ve priced this at {odds} as if it’s a toss-up, when the last two months of football put it at {pct}% — someone’s not doing their homework, and for once it isn’t me.',
  'At {pct}% form, the fair price on this is miles shorter than the {odds} on offer — the market’s pricing last season’s reputation while I’m reading this month’s football.',
  '{odds} for something the form has landing {pct}% of the time is the kind of mistake bookmakers make on busy mornings, and I collect those mistakes like stamps.',
  'The book is essentially arguing this is a coin flip at {odds}, while every recent number says {pct}% — I’ll take the side of the argument with evidence, thanks.',
  'When the form’s been running at {pct}% and the price still hasn’t moved off {odds}, that’s not a gamble, that’s a clerical error in our favour.',
  'I make the true odds on this considerably shorter than {odds}, because {pct}% form doesn’t lie — it doesn’t even exaggerate.',
  'The gap between {pct}% on my sheet and {odds} on theirs is the whole reason this club of ours exists — spotting it is the job, taking it is the pleasure.',
];

/* ── Confidence hedges — NEVER a guarantee ───────────────────────────────── */
export const HEDGES = [
  'Now, the usual sermon: it’s football, not physics, and even the best-read game can go sideways when a ref loses his mind or a keeper has the day of his life — so stake it sensibly.',
  'I’ll remind you, as I remind meself every morning: I deal in edges, not certainties, and anyone who promises you certainties is selling something worse than losing bets.',
  'Bet what you can shrug off, because even a {pct}% shot loses sometimes — that’s not a flaw in the numbers, that’s just what percentages mean.',
  'This is a lean, not a law of nature — back it with your head, keep the stakes tidy, and remember we’re playing a season here, not a single afternoon.',
  'The ball is round, the grass is bumpy and referees exist — which is my poetic way of saying keep your stake sensible and your expectations honest.',
  'Strong as I am on this, football keeps a special drawer of nonsense for days when you feel too confident — respect the drawer, stake accordingly.',
  'If it loses, it loses — we log it, we own it, and the maths keeps working over the long run. That only holds if the stakes stay sensible, mind.',
];

/* ── No-bet phrases — when there's no value, he passes ───────────────────── */
export const NO_BET = [
  'I’ve been through today’s card twice with a coffee and once with a magnifying glass, and I’m telling you straight: the bookies have priced everything properly for once. No bet — we keep our powder dry.',
  'Some mornings the value simply isn’t there, and the worst thing a tipster can do is invent some to keep you entertained — no bet today, and that’s me doing my job properly.',
  'Nothing on today’s card clears my bar, and I’d rather hand you a boring blank day than a bad bet dressed up as a good one. We go again tomorrow.',
  'I could force a pick out of this card the way you force the last bit of toothpaste, but you’d be betting on my boredom rather than any actual edge — pass.',
  'The bookies have done their homework today, annoyingly, so the discipline play is to sit on our hands — a skipped losing bet pays exactly the same as a winner you never had.',
  'Empty slip today and proud of it — knowing when NOT to bet is the half of this trade nobody puts on a poster.',
  'No edge anywhere I look, and I’ve looked everywhere including the leagues you’ve never heard of — patience today, profit tomorrow.',
];

/* ── Sign-offs — closers ─────────────────────────────────────────────────── */
export const SIGN_OFFS = [
  'Get it on, put the phone down, and go enjoy your Saturday — the numbers will do the worrying for both of us.',
  'That’s your lot from me — same time tomorrow, and don’t say the Gaffer never gives you anything.',
  'In the slip it goes, and if it lands, remember it was the form that called it — I just translated.',
  'Back it, brew up, and let the football do the talking — that’s the whole system.',
  'Right, I’m off to squint at tomorrow’s card — good luck, and keep it sensible.',
  'Job done from my end — the rest is down to twenty-two lads and a round ball.',
  'That’s the value found and flagged; whether you take it is your business, but you know where I stand.',
  'On you go — and when it comes in, a simple “cheers Gaffer” will do nicely.',
];

/* ── Banter asides — sprinkle of personality (optional) ──────────────────── */
export const ASIDES = [
  'I ran this one past the dog on our walk this morning and he didn’t object, which historically is a better signal than half the pundits on telly.',
  'My spreadsheet doesn’t drink, doesn’t sulk, and doesn’t have a favourite team — three advantages it holds over every football man I’ve ever worked with, me included.',
  'I’ve seen tighter defending at a testimonial where both teams agreed to a draw at lunch.',
  'The bookie who priced this up was either half asleep or half watching the cricket, and either way I’m sending him a thank-you card.',
  'Don’t tell the missus the size of my confidence on this one — she still thinks I do the gardening on Saturday afternoons.',
  'Me old man used to say the truth of a football team is in its last eight games, not its badge — thirty years on, the numbers keep proving him right.',
  'This is less of a gamble and more of a stern word with probability — I’ve had the conversation, probability agrees with me.',
  'Value this obvious should be wearing a high-vis jacket and directing traffic.',
  'I nearly kept this one to meself, which is the highest compliment I can pay a price.',
  'Call it a hunch if you like, but it’s a hunch with three tabs of evidence and a month of form behind it — most hunches should be so lucky.',
  'I trust these numbers more than I trust a VAR line drawn by a man with a ruler and a deadline.',
  'The stats did a little dance when I put this fixture in, and my stats do not dance for just anyone.',
];

/* ── Donkey of the Week roasts ───────────────────────────────────────────── */
export const DONKEY_ROASTS = [
  'Step forward this week’s donkey — captained a fella who got sent off before he’d broken sweat.',
  'This week’s donkey forgot to set his team. Forgot. The whole team. Genius.',
  'Give it up for the donkey who benched a 19-pointer to start a bloke who didn’t leave the dugout.',
  'Our donkey backed the same dud striker five weeks running. Loyalty’s lovely, points are better.',
  'This week’s prize muppet scored nine when the rest of us got ninety. Take a bow, son.',
  'Donkey of the week transferred OUT his captain an hour before he bagged a hat-trick. Ouch.',
  'This week’s donkey triple-captained a keeper. A keeper. I’ve no words, only applause.',
  'Hats off to the donkey who took a -8 hit to chase a player who then got injured in the warm-up.',
  'Our donkey left 14 points on the bench and started a lad who was on holiday. Lovely stuff.',
  'This week’s donkey played his wildcard… on a blank gameweek. Bold. Wrong. But bold.',
  'Give it up for the donkey who captained his own player’s understudy. The understudy didn’t play.',
  'Donkey of the week benched the highest scorer in the game. Twice. Same lad. Different week.',
  'This week’s donkey backed a 1-0 and watched it finish 4-4. Football’s a cruel old game.',
  'Our donkey’s been chasing last week’s points all season. Never catches ’em. Bless him.',
  'This week’s donkey forgot it was a double gameweek. For HIS team. Only his. Magnificent.',
  'The donkey crown goes to the lad who sold a player, re-bought him, took the hit, then benched him.',
];

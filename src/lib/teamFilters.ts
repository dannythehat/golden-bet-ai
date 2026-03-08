/**
 * Shared team & league filtering rules.
 * SINGLE SOURCE OF TRUTH used by both the homepage Playing Today
 * section and the full Form Tables page.
 */

/* ------------------------------------------------------------------ */
/*  UK Allowed Leagues                                                 */
/* ------------------------------------------------------------------ */
export const UK_ALLOWED_LEAGUES = [
  'Premier League', 'Championship', 'League One', 'League Two',
  'Scottish Premiership', 'Scottish Championship',
];

/* ------------------------------------------------------------------ */
/*  European Allowed Leagues                                           */
/* ------------------------------------------------------------------ */
export const EUROPEAN_ALLOWED_LEAGUES = [
  // Top 5
  'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Eredivisie',
  // Championship equivalents
  'La Liga 2', 'Serie B', '2. Bundesliga', 'Ligue 2', 'Eerste Divisie',
  // Other top leagues
  'Primeira Liga', 'Liga Portugal 2', 'Belgian Pro League', 'Swiss Super League',
  'Austrian Bundesliga', 'Danish Superliga', 'Allsvenskan', 'Eliteserien',
  'Ekstraklasa', 'Super Lig', 'Super League Greece', 'Croatian HNL',
  'Czech First League', 'Romanian Liga I', 'Serbian Super Liga',
  'Hungarian NB I', 'Slovak Super Liga', 'Slovenian PrvaLiga',
  'Russian Premier', 'Premyer Liqa',
  // UEFA
  'Champions League', 'Europa League', 'Conference League',
];

/* ------------------------------------------------------------------ */
/*  Excluded league patterns                                           */
/* ------------------------------------------------------------------ */
export const EXCLUDED_LEAGUE_PATTERNS = [
  /\bWSL\b/i, /\bW\s*$/i, /women/i, /femenil/i, /femenina/i,
  /\bU\d{1,2}\b/i, /under\s*\d/i, /youth/i, /academy/i, /reserve/i, /juniors/i,
  /premier league 2/i, /premier league cup/i, /professional development/i,
  /primavera/i, /revelação/i, /amateur/i, /friendlies/i,
  /serie [c-d]/i, /3\. lig/i, /3\. liga/i, /regionalliga/i, /oberliga/i,
  /tercera/i, /segunda división rfef/i, /primera división rfef/i,
  /gamma ethniki/i, /serie d/i, /derde divisie/i, /campeonato de portugal/i,
  /national [2-9]/i, /non league/i,
  /national league/i, /isthmian/i, /southern league/i, /northern league/i,
  /northern premier/i, /southern premier/i, /vanarama/i,
  /highland league/i, /lowland league/i, /league of ireland/i,
  /2\. division/i, /division 2/i, /division 3/i,
  /tff [2-3]/i, /super league 2/i, /challenge league/i,
];

/* ------------------------------------------------------------------ */
/*  Excluded team name patterns                                        */
/* ------------------------------------------------------------------ */
export const EXCLUDED_TEAM_PATTERNS = [
  /\bU\d{1,2}\b/i, /under[\s-]*\d/i, /youth/i, /academy/i, /reserve/i,
  /\bII\b/, /\bB\s*$/, /juniors/i, /\bW\s*$/i, /women/i, /ladies/i,
  /\bU21\b/i, /\bU18\b/i, /\bU23\b/i, /\bU19\b/i, /\bU20\b/i,
  /colts/i, /development/i, /WFC$/,
  /^Jong\s/i, /\bJong\b/i,  // Dutch reserve teams (Jong Ajax, Jong PSV, etc.)
];

/* ------------------------------------------------------------------ */
/*  Public helpers                                                     */
/* ------------------------------------------------------------------ */

/** Returns true if the team name is a valid professional men's team */
export function isAllowedTeam(teamName: string): boolean {
  if (EXCLUDED_TEAM_PATTERNS.some(p => p.test(teamName))) return false;
  const trimmed = teamName.trim();
  if (/^[A-Z]{2,6}$/.test(trimmed)) return false;
  if (trimmed.length <= 3) return false;
  return true;
}

/** Returns true if the league is allowed for the given region.
 *  UK and European regions use whitelists to block lower-tier leagues.
 *  All other regions (Asia, Americas, etc.) are allowed as long as
 *  they pass the EXCLUDED_LEAGUE_PATTERNS junk filter.
 */
export function isAllowedLeague(league: string, region: string): boolean {
  if (EXCLUDED_LEAGUE_PATTERNS.some(p => p.test(league))) return false;
  if (region === 'uk') return UK_ALLOWED_LEAGUES.some(l => league.toLowerCase() === l.toLowerCase());
  if (region === 'european') return EUROPEAN_ALLOWED_LEAGUES.some(l => league.toLowerCase() === l.toLowerCase());
  // Asia, Americas, and other regions — allow anything that passed the junk filter
  return true;
}

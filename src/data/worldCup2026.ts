// FIFA World Cup 2026 — USA / Canada / Mexico
// Official Final Draw (Dec 5, 2025). 48 teams, 12 groups of 4.

export interface WCTeam {
  code: string;     // ISO-ish 3-letter
  name: string;
  flag: string;     // emoji
  group: string;    // A..L
  pot: 1 | 2 | 3 | 4;
}

export interface WCGroup {
  group: string;
  teams: WCTeam[];
}

export const WC2026_HOSTS = ['USA', 'Canada', 'Mexico'];
export const WC2026_DATES = 'June 11 – July 19, 2026';

export const WC2026_TEAMS: WCTeam[] = [
  // Group A
  { code: 'MEX', name: 'Mexico',         flag: '🇲🇽', group: 'A', pot: 1 },
  { code: 'KOR', name: 'South Korea',    flag: '🇰🇷', group: 'A', pot: 2 },
  { code: 'RSA', name: 'South Africa',   flag: '🇿🇦', group: 'A', pot: 3 },
  { code: 'CZE', name: 'Czechia',        flag: '🇨🇿', group: 'A', pot: 4 },
  // Group B
  { code: 'CAN', name: 'Canada',         flag: '🇨🇦', group: 'B', pot: 1 },
  { code: 'SUI', name: 'Switzerland',    flag: '🇨🇭', group: 'B', pot: 2 },
  { code: 'QAT', name: 'Qatar',          flag: '🇶🇦', group: 'B', pot: 3 },
  { code: 'BIH', name: 'Bosnia & Herzegovina', flag: '🇧🇦', group: 'B', pot: 4 },
  // Group C
  { code: 'BRA', name: 'Brazil',         flag: '🇧🇷', group: 'C', pot: 1 },
  { code: 'MAR', name: 'Morocco',        flag: '🇲🇦', group: 'C', pot: 2 },
  { code: 'SCO', name: 'Scotland',       flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C', pot: 3 },
  { code: 'HAI', name: 'Haiti',          flag: '🇭🇹', group: 'C', pot: 4 },
  // Group D
  { code: 'USA', name: 'USA',            flag: '🇺🇸', group: 'D', pot: 1 },
  { code: 'PAR', name: 'Paraguay',       flag: '🇵🇾', group: 'D', pot: 2 },
  { code: 'AUS', name: 'Australia',      flag: '🇦🇺', group: 'D', pot: 3 },
  { code: 'TUR', name: 'Türkiye',        flag: '🇹🇷', group: 'D', pot: 4 },
  // Group E
  { code: 'GER', name: 'Germany',        flag: '🇩🇪', group: 'E', pot: 1 },
  { code: 'ECU', name: 'Ecuador',        flag: '🇪🇨', group: 'E', pot: 2 },
  { code: 'CIV', name: 'Ivory Coast',    flag: '🇨🇮', group: 'E', pot: 3 },
  { code: 'CUW', name: 'Curaçao',        flag: '🇨🇼', group: 'E', pot: 4 },
  // Group F
  { code: 'NED', name: 'Netherlands',    flag: '🇳🇱', group: 'F', pot: 1 },
  { code: 'JPN', name: 'Japan',          flag: '🇯🇵', group: 'F', pot: 2 },
  { code: 'TUN', name: 'Tunisia',        flag: '🇹🇳', group: 'F', pot: 3 },
  { code: 'SWE', name: 'Sweden',         flag: '🇸🇪', group: 'F', pot: 4 },
  // Group G
  { code: 'BEL', name: 'Belgium',        flag: '🇧🇪', group: 'G', pot: 1 },
  { code: 'IRN', name: 'Iran',           flag: '🇮🇷', group: 'G', pot: 2 },
  { code: 'EGY', name: 'Egypt',          flag: '🇪🇬', group: 'G', pot: 3 },
  { code: 'NZL', name: 'New Zealand',    flag: '🇳🇿', group: 'G', pot: 4 },
  // Group H
  { code: 'ESP', name: 'Spain',          flag: '🇪🇸', group: 'H', pot: 1 },
  { code: 'URU', name: 'Uruguay',        flag: '🇺🇾', group: 'H', pot: 2 },
  { code: 'KSA', name: 'Saudi Arabia',   flag: '🇸🇦', group: 'H', pot: 3 },
  { code: 'CPV', name: 'Cape Verde',     flag: '🇨🇻', group: 'H', pot: 4 },
  // Group I
  { code: 'FRA', name: 'France',         flag: '🇫🇷', group: 'I', pot: 1 },
  { code: 'SEN', name: 'Senegal',        flag: '🇸🇳', group: 'I', pot: 2 },
  { code: 'NOR', name: 'Norway',         flag: '🇳🇴', group: 'I', pot: 3 },
  { code: 'IRQ', name: 'Iraq',           flag: '🇮🇶', group: 'I', pot: 4 },
  // Group J
  { code: 'ARG', name: 'Argentina',      flag: '🇦🇷', group: 'J', pot: 1 },
  { code: 'AUT', name: 'Austria',        flag: '🇦🇹', group: 'J', pot: 2 },
  { code: 'ALG', name: 'Algeria',        flag: '🇩🇿', group: 'J', pot: 3 },
  { code: 'JOR', name: 'Jordan',         flag: '🇯🇴', group: 'J', pot: 4 },
  // Group K
  { code: 'POR', name: 'Portugal',       flag: '🇵🇹', group: 'K', pot: 1 },
  { code: 'COL', name: 'Colombia',       flag: '🇨🇴', group: 'K', pot: 2 },
  { code: 'UZB', name: 'Uzbekistan',     flag: '🇺🇿', group: 'K', pot: 3 },
  { code: 'COD', name: 'DR Congo',       flag: '🇨🇩', group: 'K', pot: 4 },
  // Group L
  { code: 'ENG', name: 'England',        flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L', pot: 1 },
  { code: 'CRO', name: 'Croatia',        flag: '🇭🇷', group: 'L', pot: 2 },
  { code: 'PAN', name: 'Panama',         flag: '🇵🇦', group: 'L', pot: 3 },
  { code: 'GHA', name: 'Ghana',          flag: '🇬🇭', group: 'L', pot: 4 },
];

export const WC2026_GROUPS: WCGroup[] = ['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => ({
  group: g,
  teams: WC2026_TEAMS.filter(t => t.group === g),
}));

export function getTeam(code: string): WCTeam | undefined {
  return WC2026_TEAMS.find(t => t.code === code);
}

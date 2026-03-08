/**
 * Country flag emoji mapping for leagues
 * Maps league names to their country flag emoji
 */

const LEAGUE_TO_FLAG: Record<string, string> = {
  // UK
  'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Championship': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'League One': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'League Two': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'EFL Cup': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'FA Cup': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'National League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Scottish Premiership': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Scottish Championship': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Scottish League One': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Cymru Premier': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  
  // Spain
  'La Liga': '🇪🇸',
  'La Liga 2': '🇪🇸',
  'Copa del Rey': '🇪🇸',
  
  // Germany
  'Bundesliga': '🇩🇪',
  '2. Bundesliga': '🇩🇪',
  'DFB Pokal': '🇩🇪',
  '3. Liga': '🇩🇪',
  
  // Italy
  'Serie A': '🇮🇹',
  'Italian Serie A': '🇮🇹',
  'Serie B': '🇮🇹',
  'Coppa Italia': '🇮🇹',
  
  // France
  'Ligue 1': '🇫🇷',
  'Ligue 2': '🇫🇷',
  'Coupe de France': '🇫🇷',
  
  // Portugal
  'Primeira Liga': '🇵🇹',
  'Liga Portugal': '🇵🇹',
  'Liga Portugal 2': '🇵🇹',
  
  // Netherlands
  'Eredivisie': '🇳🇱',
  'Eerste Divisie': '🇳🇱',
  'KNVB Beker': '🇳🇱',
  
  // Belgium
  'Jupiler Pro League': '🇧🇪',
  'First Division A': '🇧🇪',
  
  // Turkey
  'Süper Lig': '🇹🇷',
  'Super Lig': '🇹🇷',
  '1. Lig': '🇹🇷',
  
  // Greece
  'Super League Greece': '🇬🇷',
  'Super League 1': '🇬🇷',
  
  // Switzerland
  'Swiss Super League': '🇨🇭',
  'Super League': '🇨🇭',
  'Super League Switzerland': '🇨🇭',
  
  // Austria
  'Austrian Bundesliga': '🇦🇹',
  
  // Denmark
  'Superliga': '🇩🇰',
  'Superligaen': '🇩🇰',
  
  // Sweden
  'Allsvenskan': '🇸🇪',
  
  // Norway
  'Eliteserien': '🇳🇴',
  
  // Poland
  'Ekstraklasa': '🇵🇱',
  
  // Czech Republic
  'Czech Liga': '🇨🇿',
  'First League': '🇨🇿',
  
  // Russia
  'Russian Premier League': '🇷🇺',
  
  // Ukraine
  'Ukrainian Premier League': '🇺🇦',
  
  // Croatia
  'HNL': '🇭🇷',
  'SuperSport HNL': '🇭🇷',
  
  // Serbia
  'Super Liga': '🇷🇸',
  
  // Japan
  'J1 League': '🇯🇵',
  'J2 League': '🇯🇵',
  'J-League': '🇯🇵',
  
  // South Korea
  'K League 1': '🇰🇷',
  'K League 2': '🇰🇷',
  
  // Saudi Arabia
  'Saudi Pro League': '🇸🇦',
  'Pro League': '🇸🇦',
  
  // UAE
  'UAE Pro League': '🇦🇪',
  
  // Qatar
  'Qatar Stars League': '🇶🇦',
  
  // China
  'Chinese Super League': '🇨🇳',
  
  // Australia
  'A-League': '🇦🇺',
  'A-League Men': '🇦🇺',
  
  // Brazil
  'Série A': '🇧🇷',
  'Série B': '🇧🇷',
  'Série A Brazil': '🇧🇷',
  'Série B Brazil': '🇧🇷',
  'Brazilian Serie A': '🇧🇷',
  'Brazilian Serie B': '🇧🇷',
  'Brasileirão': '🇧🇷',
  
  // Argentina
  'Primera División': '🇦🇷',
  'Liga Profesional': '🇦🇷',
  'Argentine Primera': '🇦🇷',
  
  // Mexico
  'Liga MX': '🇲🇽',
  'Liga de Expansión MX': '🇲🇽',
  
  // USA
  'MLS': '🇺🇸',
  'Major League Soccer': '🇺🇸',
  'USL Championship': '🇺🇸',
  
  // Colombia
  'Primera A': '🇨🇴',
  'Liga BetPlay': '🇨🇴',
  
  // Chile
  'Primera División Chile': '🇨🇱',
  
  // Uruguay
  'Primera División Uruguay': '🇺🇾',
  
  // Paraguay
  'Primera División Paraguay': '🇵🇾',
  
  // Peru
  'Liga 1': '🇵🇪',
  
  // European Cups
  'UEFA Champions League': '🇪🇺',
  'Champions League': '🇪🇺',
  'UEFA Europa League': '🇪🇺',
  'Europa League': '🇪🇺',
  'UEFA Conference League': '🇪🇺',
  'Conference League': '🇪🇺',
  
  // Africa
  'CAF Champions League': '🌍',
  'Egyptian Premier League': '🇪🇬',
  'South African Premier': '🇿🇦',
};

/**
 * Get flag emoji for a league
 * Falls back to globe if no match
 */
export function getLeagueFlag(league: string): string {
  // Direct match
  if (LEAGUE_TO_FLAG[league]) {
    return LEAGUE_TO_FLAG[league];
  }
  
  // Partial match
  for (const [key, flag] of Object.entries(LEAGUE_TO_FLAG)) {
    if (league.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(league.toLowerCase())) {
      return flag;
    }
  }
  
  // Fallback - try to detect country from league name
  const leagueLower = league.toLowerCase();
  
  if (leagueLower.includes('england') || leagueLower.includes('english')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (leagueLower.includes('scotland') || leagueLower.includes('scottish')) return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
  if (leagueLower.includes('spain') || leagueLower.includes('spanish')) return '🇪🇸';
  if (leagueLower.includes('german')) return '🇩🇪';
  if (leagueLower.includes('italy') || leagueLower.includes('italian')) return '🇮🇹';
  if (leagueLower.includes('france') || leagueLower.includes('french')) return '🇫🇷';
  if (leagueLower.includes('portugal') || leagueLower.includes('portuguese')) return '🇵🇹';
  if (leagueLower.includes('dutch') || leagueLower.includes('holland')) return '🇳🇱';
  if (leagueLower.includes('belgium') || leagueLower.includes('belgian')) return '🇧🇪';
  if (leagueLower.includes('turkey') || leagueLower.includes('turkish')) return '🇹🇷';
  if (leagueLower.includes('brazil')) return '🇧🇷';
  if (leagueLower.includes('argentina')) return '🇦🇷';
  if (leagueLower.includes('mexico') || leagueLower.includes('mexican')) return '🇲🇽';
  if (leagueLower.includes('usa') || leagueLower.includes('american')) return '🇺🇸';
  if (leagueLower.includes('japan') || leagueLower.includes('japanese')) return '🇯🇵';
  if (leagueLower.includes('korea') || leagueLower.includes('korean')) return '🇰🇷';
  if (leagueLower.includes('saudi')) return '🇸🇦';
  if (leagueLower.includes('australia')) return '🇦🇺';
  if (leagueLower.includes('china') || leagueLower.includes('chinese')) return '🇨🇳';
  
  return '⚽'; // Default football emoji
}

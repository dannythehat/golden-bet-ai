/**
 * Major Football Leagues Configuration
 * All important leagues worldwide (excluding U21, Women's, etc.)
 * 
 * League IDs from API-Football
 * Season: Current year
 */

export interface LeagueConfig {
  id: number;
  name: string;
  country: string;
  region: 'uk' | 'european' | 'asia' | 'americas' | 'other';
  priority: number; // 1 = highest priority
}

export const MAJOR_LEAGUES: LeagueConfig[] = [
  // ========== UK (5 leagues) ==========
  { id: 39, name: 'Premier League', country: 'England', region: 'uk', priority: 1 },
  { id: 40, name: 'Championship', country: 'England', region: 'uk', priority: 2 },
  { id: 41, name: 'League One', country: 'England', region: 'uk', priority: 3 },
  { id: 42, name: 'League Two', country: 'England', region: 'uk', priority: 3 },
  { id: 179, name: 'Scottish Premiership', country: 'Scotland', region: 'uk', priority: 2 },
  
  // ========== EUROPE - Top 5 Leagues (15 leagues) ==========
  { id: 140, name: 'La Liga', country: 'Spain', region: 'european', priority: 1 },
  { id: 141, name: 'Segunda División', country: 'Spain', region: 'european', priority: 2 },
  { id: 78, name: 'Bundesliga', country: 'Germany', region: 'european', priority: 1 },
  { id: 79, name: '2. Bundesliga', country: 'Germany', region: 'european', priority: 2 },
  { id: 135, name: 'Serie A', country: 'Italy', region: 'european', priority: 1 },
  { id: 136, name: 'Serie B', country: 'Italy', region: 'european', priority: 2 },
  { id: 61, name: 'Ligue 1', country: 'France', region: 'european', priority: 1 },
  { id: 62, name: 'Ligue 2', country: 'France', region: 'european', priority: 2 },
  { id: 94, name: 'Primeira Liga', country: 'Portugal', region: 'european', priority: 1 },
  { id: 88, name: 'Eredivisie', country: 'Netherlands', region: 'european', priority: 1 },
  { id: 144, name: 'Belgian Pro League', country: 'Belgium', region: 'european', priority: 2 },
  { id: 203, name: 'Süper Lig', country: 'Turkey', region: 'european', priority: 2 },
  { id: 235, name: 'Russian Premier League', country: 'Russia', region: 'european', priority: 2 },
  { id: 119, name: 'Danish Superliga', country: 'Denmark', region: 'european', priority: 3 },
  { id: 113, name: 'Allsvenskan', country: 'Sweden', region: 'european', priority: 3 },
  
  // ========== EUROPE - Other Major Leagues (15 leagues) ==========
  { id: 103, name: 'Eliteserien', country: 'Norway', region: 'european', priority: 3 },
  { id: 218, name: 'Austrian Bundesliga', country: 'Austria', region: 'european', priority: 3 },
  { id: 197, name: 'Greek Super League', country: 'Greece', region: 'european', priority: 3 },
  { id: 345, name: 'Czech First League', country: 'Czech Republic', region: 'european', priority: 3 },
  { id: 271, name: 'Serbian SuperLiga', country: 'Serbia', region: 'european', priority: 3 },
  { id: 318, name: 'Romanian Liga 1', country: 'Romania', region: 'european', priority: 3 },
  { id: 327, name: 'Bulgarian First League', country: 'Bulgaria', region: 'european', priority: 3 },
  { id: 333, name: 'Croatian First League', country: 'Croatia', region: 'european', priority: 3 },
  { id: 283, name: 'Ukrainian Premier League', country: 'Ukraine', region: 'european', priority: 3 },
  { id: 210, name: 'Swiss Super League', country: 'Switzerland', region: 'european', priority: 3 },
  { id: 307, name: 'Saudi Pro League', country: 'Saudi Arabia', region: 'asia', priority: 2 },
  { id: 262, name: 'Ekstraklasa', country: 'Poland', region: 'european', priority: 3 },
  { id: 144, name: 'Belgian First Division B', country: 'Belgium', region: 'european', priority: 3 },
  { id: 106, name: 'Finnish Veikkausliiga', country: 'Finland', region: 'european', priority: 3 },
  { id: 179, name: 'Scottish Championship', country: 'Scotland', region: 'uk', priority: 3 },
  
  // ========== ASIA (12 leagues) ==========
  { id: 98, name: 'J1 League', country: 'Japan', region: 'asia', priority: 2 },
  { id: 99, name: 'J2 League', country: 'Japan', region: 'asia', priority: 3 },
  { id: 307, name: 'Saudi Pro League', country: 'Saudi Arabia', region: 'asia', priority: 2 },
  { id: 17, name: 'Chinese Super League', country: 'China', region: 'asia', priority: 2 },
  { id: 292, name: 'K League 1', country: 'South Korea', region: 'asia', priority: 2 },
  { id: 293, name: 'K League 2', country: 'South Korea', region: 'asia', priority: 3 },
  { id: 323, name: 'Indian Super League', country: 'India', region: 'asia', priority: 3 },
  { id: 301, name: 'UAE Pro League', country: 'UAE', region: 'asia', priority: 3 },
  { id: 274, name: 'Qatar Stars League', country: 'Qatar', region: 'asia', priority: 3 },
  { id: 383, name: 'A-League', country: 'Australia', region: 'asia', priority: 3 },
  { id: 289, name: 'Thai League 1', country: 'Thailand', region: 'asia', priority: 3 },
  { id: 169, name: 'Malaysian Super League', country: 'Malaysia', region: 'asia', priority: 3 },
  
  // ========== AMERICAS (15 leagues) ==========
  { id: 71, name: 'Brasileirão Série A', country: 'Brazil', region: 'americas', priority: 1 },
  { id: 72, name: 'Brasileirão Série B', country: 'Brazil', region: 'americas', priority: 2 },
  { id: 262, name: 'Liga MX', country: 'Mexico', region: 'americas', priority: 1 },
  { id: 128, name: 'Argentine Primera División', country: 'Argentina', region: 'americas', priority: 1 },
  { id: 253, name: 'MLS', country: 'USA', region: 'americas', priority: 2 },
  { id: 239, name: 'Colombian Primera A', country: 'Colombia', region: 'americas', priority: 2 },
  { id: 240, name: 'Colombian Primera B', country: 'Colombia', region: 'americas', priority: 3 },
  { id: 242, name: 'Chilean Primera División', country: 'Chile', region: 'americas', priority: 2 },
  { id: 250, name: 'Ecuadorian Serie A', country: 'Ecuador', region: 'americas', priority: 3 },
  { id: 268, name: 'Peruvian Primera División', country: 'Peru', region: 'americas', priority: 3 },
  { id: 265, name: 'Uruguayan Primera División', country: 'Uruguay', region: 'americas', priority: 3 },
  { id: 274, name: 'Paraguayan Primera División', country: 'Paraguay', region: 'americas', priority: 3 },
  { id: 288, name: 'Venezuelan Primera División', country: 'Venezuela', region: 'americas', priority: 3 },
  { id: 71, name: 'Canadian Premier League', country: 'Canada', region: 'americas', priority: 3 },
  { id: 266, name: 'Bolivian Primera División', country: 'Bolivia', region: 'americas', priority: 3 },
  
  // ========== AFRICA (8 leagues) ==========
  { id: 302, name: 'Egyptian Premier League', country: 'Egypt', region: 'other', priority: 3 },
  { id: 288, name: 'South African Premier Division', country: 'South Africa', region: 'other', priority: 3 },
  { id: 316, name: 'Moroccan Botola Pro', country: 'Morocco', region: 'other', priority: 3 },
  { id: 320, name: 'Tunisian Ligue 1', country: 'Tunisia', region: 'other', priority: 3 },
  { id: 319, name: 'Algerian Ligue 1', country: 'Algeria', region: 'other', priority: 3 },
  { id: 324, name: 'Nigerian Professional League', country: 'Nigeria', region: 'other', priority: 3 },
  { id: 286, name: 'Kenyan Premier League', country: 'Kenya', region: 'other', priority: 3 },
  { id: 287, name: 'Ghanaian Premier League', country: 'Ghana', region: 'other', priority: 3 },
];

/**
 * Get leagues by region
 */
export function getLeaguesByRegion(region: 'uk' | 'european' | 'asia' | 'americas' | 'other' | 'all'): LeagueConfig[] {
  if (region === 'all') return MAJOR_LEAGUES;
  return MAJOR_LEAGUES.filter(league => league.region === region);
}

/**
 * Get high priority leagues (for initial data load)
 */
export function getHighPriorityLeagues(): LeagueConfig[] {
  return MAJOR_LEAGUES.filter(league => league.priority === 1);
}

/**
 * Get total league count
 */
export function getTotalLeagueCount(): number {
  return MAJOR_LEAGUES.length;
}

/**
 * Get league by ID
 */
export function getLeagueById(id: number): LeagueConfig | undefined {
  return MAJOR_LEAGUES.find(league => league.id === id);
}

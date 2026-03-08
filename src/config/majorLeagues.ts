/**
 * Major Football Leagues Configuration
 * All major professional leagues worldwide (excluding women's, U21, and smaller leagues)
 */

import { Region } from "@/types/betting";

export interface LeagueConfig {
  id: number;
  name: string;
  country: string;
  region: Region;
  priority: number; // 1 = top tier, 2 = second tier, etc.
}

// Top-tier leagues only - no women's, U21, or third-world leagues
export const MAJOR_LEAGUES: LeagueConfig[] = [
  // UK (Priority 1)
  { id: 39, name: 'Premier League', country: 'England', region: 'uk', priority: 1 },
  { id: 40, name: 'Championship', country: 'England', region: 'uk', priority: 2 },
  { id: 41, name: 'League One', country: 'England', region: 'uk', priority: 3 },
  { id: 42, name: 'League Two', country: 'England', region: 'uk', priority: 3 },
  { id: 179, name: 'Scottish Premiership', country: 'Scotland', region: 'uk', priority: 2 },
  { id: 180, name: 'Scottish Championship', country: 'Scotland', region: 'uk', priority: 3 },
  
  // European - Top 5 Leagues (Priority 1)
  { id: 140, name: 'La Liga', country: 'Spain', region: 'european', priority: 1 },
  { id: 141, name: 'La Liga 2', country: 'Spain', region: 'european', priority: 2 },
  { id: 78, name: 'Bundesliga', country: 'Germany', region: 'european', priority: 1 },
  { id: 79, name: '2. Bundesliga', country: 'Germany', region: 'european', priority: 2 },
  { id: 135, name: 'Serie A', country: 'Italy', region: 'european', priority: 1 },
  { id: 136, name: 'Serie B', country: 'Italy', region: 'european', priority: 2 },
  { id: 61, name: 'Ligue 1', country: 'France', region: 'european', priority: 1 },
  { id: 62, name: 'Ligue 2', country: 'France', region: 'european', priority: 2 },
  
  // European - Other Major Leagues (Priority 2)
  { id: 94, name: 'Primeira Liga', country: 'Portugal', region: 'european', priority: 2 },
  { id: 88, name: 'Eredivisie', country: 'Netherlands', region: 'european', priority: 2 },
  { id: 144, name: 'Jupiler Pro League', country: 'Belgium', region: 'european', priority: 2 },
  { id: 203, name: 'Süper Lig', country: 'Turkey', region: 'european', priority: 2 },
  { id: 197, name: 'Super League', country: 'Greece', region: 'european', priority: 2 },
  { id: 207, name: 'Super League', country: 'Switzerland', region: 'european', priority: 2 },
  { id: 218, name: 'Bundesliga', country: 'Austria', region: 'european', priority: 2 },
  { id: 119, name: 'Superliga', country: 'Denmark', region: 'european', priority: 2 },
  { id: 113, name: 'Allsvenskan', country: 'Sweden', region: 'european', priority: 2 },
  { id: 103, name: 'Eliteserien', country: 'Norway', region: 'european', priority: 2 },
  { id: 106, name: 'Ekstraklasa', country: 'Poland', region: 'european', priority: 2 },
  { id: 345, name: 'Czech Liga', country: 'Czech Republic', region: 'european', priority: 2 },
  { id: 235, name: 'Premier League', country: 'Russia', region: 'european', priority: 2 },
  { id: 333, name: 'Premier League', country: 'Ukraine', region: 'european', priority: 2 },
  { id: 210, name: 'HNL', country: 'Croatia', region: 'european', priority: 2 },
  { id: 286, name: 'Super Liga', country: 'Serbia', region: 'european', priority: 2 },
  
  // Asia (Priority 2)
  { id: 98, name: 'J1 League', country: 'Japan', region: 'asia', priority: 1 },
  { id: 99, name: 'J2 League', country: 'Japan', region: 'asia', priority: 2 },
  { id: 271, name: 'K League 1', country: 'South Korea', region: 'asia', priority: 1 },
  { id: 272, name: 'K League 2', country: 'South Korea', region: 'asia', priority: 2 },
  { id: 307, name: 'Saudi Pro League', country: 'Saudi Arabia', region: 'asia', priority: 1 },
  { id: 169, name: 'UAE Pro League', country: 'UAE', region: 'asia', priority: 2 },
  { id: 302, name: 'Qatar Stars League', country: 'Qatar', region: 'asia', priority: 2 },
  { id: 188, name: 'Chinese Super League', country: 'China', region: 'asia', priority: 2 },
  { id: 292, name: 'A-League', country: 'Australia', region: 'asia', priority: 2 },
  
  // Americas (Priority 1-2)
  { id: 71, name: 'Série A', country: 'Brazil', region: 'americas', priority: 1 },
  { id: 72, name: 'Série B', country: 'Brazil', region: 'americas', priority: 2 },
  { id: 128, name: 'Primera División', country: 'Argentina', region: 'americas', priority: 1 },
  { id: 262, name: 'Liga MX', country: 'Mexico', region: 'americas', priority: 1 },
  { id: 253, name: 'MLS', country: 'USA', region: 'americas', priority: 1 },
  { id: 239, name: 'Primera A', country: 'Colombia', region: 'americas', priority: 2 },
  { id: 265, name: 'Primera División', country: 'Chile', region: 'americas', priority: 2 },
  { id: 268, name: 'Primera División', country: 'Uruguay', region: 'americas', priority: 2 },
  { id: 242, name: 'Primera División', country: 'Paraguay', region: 'americas', priority: 2 },
  { id: 281, name: 'Primera División', country: 'Peru', region: 'americas', priority: 2 },
];

// Get leagues by region
export function getLeaguesByRegion(region: Region): LeagueConfig[] {
  if (region === 'all') return MAJOR_LEAGUES;
  return MAJOR_LEAGUES.filter(l => l.region === region);
}

// Get top priority leagues (for initial load)
export function getTopLeagues(limit: number = 10): LeagueConfig[] {
  return MAJOR_LEAGUES
    .filter(l => l.priority === 1)
    .slice(0, limit);
}

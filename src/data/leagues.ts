/**
 * Comprehensive League Configuration
 * 150+ major professional leagues worldwide for ML training
 */

export type Region = 'uk' | 'european' | 'asia' | 'americas' | 'africa' | 'all';

export interface League {
  id: number;
  name: string;
  region: Region;
  priority: number; // 1 = top tier, 2 = major, 3 = secondary
}

export const LEAGUES: League[] = [
  // ========== UK & IRELAND (15 leagues) ==========
  { id: 39, name: 'Premier League', region: 'uk', priority: 1 },
  { id: 40, name: 'Championship', region: 'uk', priority: 1 },
  { id: 41, name: 'League One', region: 'uk', priority: 2 },
  { id: 42, name: 'League Two', region: 'uk', priority: 2 },
  { id: 43, name: 'National League', region: 'uk', priority: 3 },
  { id: 45, name: 'FA Cup', region: 'uk', priority: 1 },
  { id: 48, name: 'EFL Cup', region: 'uk', priority: 2 },
  { id: 179, name: 'Scottish Premiership', region: 'uk', priority: 2 },
  { id: 180, name: 'Scottish Championship', region: 'uk', priority: 3 },
  { id: 181, name: 'Scottish League One', region: 'uk', priority: 3 },
  { id: 182, name: 'Scottish League Two', region: 'uk', priority: 3 },
  { id: 183, name: 'Scottish Cup', region: 'uk', priority: 2 },
  { id: 196, name: 'League of Ireland', region: 'uk', priority: 3 },
  { id: 402, name: 'Welsh Premier', region: 'uk', priority: 3 },
  { id: 408, name: 'Northern Ireland', region: 'uk', priority: 3 },

  // ========== EUROPEAN TOP 5 LEAGUES (10 leagues) ==========
  { id: 140, name: 'La Liga', region: 'european', priority: 1 },
  { id: 141, name: 'La Liga 2', region: 'european', priority: 2 },
  { id: 78, name: 'Bundesliga', region: 'european', priority: 1 },
  { id: 79, name: '2. Bundesliga', region: 'european', priority: 2 },
  { id: 135, name: 'Serie A', region: 'european', priority: 1 },
  { id: 136, name: 'Serie B', region: 'european', priority: 2 },
  { id: 61, name: 'Ligue 1', region: 'european', priority: 1 },
  { id: 62, name: 'Ligue 2', region: 'european', priority: 2 },
  { id: 94, name: 'Primeira Liga', region: 'european', priority: 1 },
  { id: 95, name: 'Liga Portugal 2', region: 'european', priority: 2 },

  // ========== EUROPEAN OTHER MAJOR (35 leagues) ==========
  { id: 88, name: 'Eredivisie', region: 'european', priority: 1 },
  { id: 89, name: 'Eerste Divisie', region: 'european', priority: 2 },
  { id: 144, name: 'Belgian Pro League', region: 'european', priority: 2 },
  { id: 145, name: 'Belgian First Division B', region: 'european', priority: 3 },
  { id: 203, name: 'Super Lig', region: 'european', priority: 2 },
  { id: 204, name: 'TFF 1. Lig', region: 'european', priority: 3 },
  { id: 197, name: 'Super League Greece', region: 'european', priority: 2 },
  { id: 207, name: 'Swiss Super League', region: 'european', priority: 2 },
  { id: 208, name: 'Swiss Challenge League', region: 'european', priority: 3 },
  { id: 218, name: 'Austrian Bundesliga', region: 'european', priority: 2 },
  { id: 219, name: 'Austrian 2. Liga', region: 'european', priority: 3 },
  { id: 119, name: 'Danish Superliga', region: 'european', priority: 2 },
  { id: 120, name: 'Danish 1st Division', region: 'european', priority: 3 },
  { id: 113, name: 'Allsvenskan', region: 'european', priority: 2 },
  { id: 114, name: 'Superettan', region: 'european', priority: 3 },
  { id: 103, name: 'Eliteserien', region: 'european', priority: 2 },
  { id: 104, name: 'OBOS-ligaen', region: 'european', priority: 3 },
  { id: 106, name: 'Ekstraklasa', region: 'european', priority: 2 },
  { id: 107, name: 'I Liga', region: 'european', priority: 3 },
  { id: 345, name: 'Czech First League', region: 'european', priority: 2 },
  { id: 346, name: 'Czech FNL', region: 'european', priority: 3 },
  { id: 235, name: 'Russian Premier', region: 'european', priority: 2 },
  { id: 236, name: 'Russian FNL', region: 'european', priority: 3 },
  { id: 333, name: 'Ukrainian Premier', region: 'european', priority: 2 },
  { id: 210, name: 'Croatian HNL', region: 'european', priority: 2 },
  { id: 286, name: 'Serbian Super Liga', region: 'european', priority: 2 },
  { id: 283, name: 'Romanian Liga I', region: 'european', priority: 2 },
  { id: 284, name: 'Romanian Liga II', region: 'european', priority: 3 },
  { id: 172, name: 'Bulgarian First League', region: 'european', priority: 3 },
  { id: 271, name: 'Hungarian NB I', region: 'european', priority: 2 },
  { id: 318, name: 'Slovak Super Liga', region: 'european', priority: 3 },
  { id: 373, name: 'Slovenian PrvaLiga', region: 'european', priority: 3 },
  { id: 244, name: 'Veikkausliiga', region: 'european', priority: 3 },
  { id: 327, name: 'Cypriot First Division', region: 'european', priority: 3 },
  { id: 332, name: 'Israeli Premier', region: 'european', priority: 2 },

  // ========== UEFA COMPETITIONS (4 leagues) ==========
  { id: 2, name: 'Champions League', region: 'european', priority: 1 },
  { id: 3, name: 'Europa League', region: 'european', priority: 1 },
  { id: 848, name: 'Conference League', region: 'european', priority: 2 },
  { id: 531, name: 'UEFA Super Cup', region: 'european', priority: 2 },

  // ========== AMERICAS (35 leagues) ==========
  { id: 71, name: 'Serie A Brazil', region: 'americas', priority: 1 },
  { id: 72, name: 'Serie B Brazil', region: 'americas', priority: 2 },
  { id: 73, name: 'Copa do Brasil', region: 'americas', priority: 2 },
  { id: 128, name: 'Liga Argentina', region: 'americas', priority: 1 },
  { id: 129, name: 'Primera Nacional', region: 'americas', priority: 2 },
  { id: 130, name: 'Copa Argentina', region: 'americas', priority: 2 },
  { id: 262, name: 'Liga MX', region: 'americas', priority: 1 },
  { id: 263, name: 'Liga MX Expansion', region: 'americas', priority: 2 },
  { id: 253, name: 'MLS', region: 'americas', priority: 1 },
  { id: 254, name: 'USL Championship', region: 'americas', priority: 2 },
  { id: 255, name: 'US Open Cup', region: 'americas', priority: 2 },
  { id: 239, name: 'Colombian Primera A', region: 'americas', priority: 2 },
  { id: 240, name: 'Colombian Primera B', region: 'americas', priority: 3 },
  { id: 265, name: 'Chilean Primera', region: 'americas', priority: 2 },
  { id: 266, name: 'Chilean Primera B', region: 'americas', priority: 3 },
  { id: 268, name: 'Uruguayan Primera', region: 'americas', priority: 2 },
  { id: 395, name: 'Paraguayan Primera', region: 'americas', priority: 2 },
  { id: 281, name: 'Peruvian Primera', region: 'americas', priority: 2 },
  { id: 242, name: 'Ecuadorian Serie A', region: 'americas', priority: 2 },
  { id: 278, name: 'Venezuelan Primera', region: 'americas', priority: 3 },
  { id: 260, name: 'Costa Rican Primera', region: 'americas', priority: 3 },
  { id: 336, name: 'Guatemalan Liga', region: 'americas', priority: 3 },
  { id: 350, name: 'Honduran Liga', region: 'americas', priority: 3 },
  { id: 359, name: 'Jamaican Premier', region: 'americas', priority: 3 },
  { id: 17, name: 'Copa Libertadores', region: 'americas', priority: 1 },
  { id: 11, name: 'Copa Sudamericana', region: 'americas', priority: 2 },
  { id: 13, name: 'CONCACAF Champions', region: 'americas', priority: 2 },
  { id: 259, name: 'Canadian Premier', region: 'americas', priority: 3 },
  { id: 296, name: 'Bolivian Primera', region: 'americas', priority: 3 },

  // ========== ASIA (35 leagues) ==========
  { id: 98, name: 'J1 League', region: 'asia', priority: 1 },
  { id: 99, name: 'J2 League', region: 'asia', priority: 2 },
  { id: 100, name: 'J3 League', region: 'asia', priority: 3 },
  { id: 101, name: 'J.League Cup', region: 'asia', priority: 2 },
  { id: 292, name: 'K League 1', region: 'asia', priority: 1 },
  { id: 293, name: 'K League 2', region: 'asia', priority: 2 },
  { id: 169, name: 'Chinese Super League', region: 'asia', priority: 2 },
  { id: 170, name: 'China League One', region: 'asia', priority: 3 },
  { id: 307, name: 'Saudi Pro League', region: 'asia', priority: 1 },
  { id: 308, name: 'Saudi First Division', region: 'asia', priority: 2 },
  { id: 302, name: 'UAE Pro League', region: 'asia', priority: 2 },
  { id: 305, name: 'Qatar Stars League', region: 'asia', priority: 2 },
  { id: 290, name: 'Persian Gulf Pro', region: 'asia', priority: 2 },
  { id: 323, name: 'Indian Super League', region: 'asia', priority: 2 },
  { id: 324, name: 'I-League', region: 'asia', priority: 3 },
  { id: 373, name: 'Thai League 1', region: 'asia', priority: 2 },
  { id: 374, name: 'Thai League 2', region: 'asia', priority: 3 },
  { id: 340, name: 'V.League 1', region: 'asia', priority: 3 },
  { id: 188, name: 'Malaysian Super', region: 'asia', priority: 3 },
  { id: 382, name: 'Singapore Premier', region: 'asia', priority: 3 },
  { id: 274, name: 'Indonesian Liga 1', region: 'asia', priority: 2 },
  { id: 275, name: 'Indonesian Liga 2', region: 'asia', priority: 3 },
  { id: 399, name: 'Philippines PFL', region: 'asia', priority: 3 },
  { id: 475, name: 'Uzbek Super League', region: 'asia', priority: 3 },
  { id: 17, name: 'AFC Champions League', region: 'asia', priority: 1 },
  { id: 18, name: 'AFC Cup', region: 'asia', priority: 2 },
  
  // Australia & Oceania
  { id: 188, name: 'A-League', region: 'asia', priority: 2 },
  { id: 189, name: 'A-League Women', region: 'asia', priority: 3 },

  // ========== AFRICA (20 leagues) ==========
  { id: 233, name: 'Egyptian Premier', region: 'africa', priority: 2 },
  { id: 234, name: 'Egyptian Second', region: 'africa', priority: 3 },
  { id: 200, name: 'South African PSL', region: 'africa', priority: 2 },
  { id: 201, name: 'South African NFD', region: 'africa', priority: 3 },
  { id: 183, name: 'Moroccan Botola Pro', region: 'africa', priority: 2 },
  { id: 184, name: 'Moroccan Botola 2', region: 'africa', priority: 3 },
  { id: 202, name: 'Tunisian Ligue 1', region: 'africa', priority: 2 },
  { id: 387, name: 'Algerian Ligue 1', region: 'africa', priority: 2 },
  { id: 388, name: 'Algerian Ligue 2', region: 'africa', priority: 3 },
  { id: 356, name: 'Nigerian NPFL', region: 'africa', priority: 3 },
  { id: 357, name: 'Ghanaian Premier', region: 'africa', priority: 3 },
  { id: 358, name: 'Kenyan Premier', region: 'africa', priority: 3 },
  { id: 360, name: 'Tanzanian Premier', region: 'africa', priority: 3 },
  { id: 361, name: 'Ugandan Premier', region: 'africa', priority: 3 },
  { id: 362, name: 'Zambian Super', region: 'africa', priority: 3 },
  { id: 363, name: 'Zimbabwean Premier', region: 'africa', priority: 3 },
  { id: 20, name: 'CAF Champions League', region: 'africa', priority: 1 },
  { id: 21, name: 'CAF Confederation Cup', region: 'africa', priority: 2 },
  { id: 6, name: 'AFCON', region: 'africa', priority: 1 },
  { id: 36, name: 'Africa Cup of Nations Qualifiers', region: 'africa', priority: 2 },
];

export const TOTAL_LEAGUES = LEAGUES.length;

// Get leagues by priority tier
export const getTier1Leagues = () => LEAGUES.filter(l => l.priority === 1);
export const getTier2Leagues = () => LEAGUES.filter(l => l.priority <= 2);
export const getAllLeagues = () => LEAGUES;

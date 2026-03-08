// Support both dot and underscore formats from different data sources
export type BetMarket = 
  | 'over_2.5_goals' | 'over_2_5_goals' 
  | 'over_9.5_corners' | 'over_9_5_corners' | 'over_8_5_corners' | 'over_8.5_corners'
  | 'over_3.5_cards' | 'over_3_5_cards' | 'over_2.5_cards' | 'over_2_5_cards'
  | 'btts';

export type Region = 'all' | 'uk' | 'european' | 'asia' | 'americas';

// Bookmaker logos for UI display
export const BOOKMAKER_LOGOS: Record<string, string> = {
  bet365: 'https://cdn.freebiesupply.com/logos/large/2x/bet365-logo-png-transparent.png',
  williamhill: 'https://cdn.freebiesupply.com/logos/large/2x/william-hill-logo-png-transparent.png',
  paddypower: 'https://upload.wikimedia.org/wikipedia/en/d/d8/Paddy_Power_logo.svg',
  betfair: 'https://cdn.freebiesupply.com/logos/large/2x/betfair-logo-png-transparent.png',
  skybet: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/50/Sky_Bet_logo.svg/320px-Sky_Bet_logo.svg.png',
  unibet: 'https://cdn.freebiesupply.com/logos/large/2x/unibet-logo-png-transparent.png',
  betway: 'https://cdn.freebiesupply.com/logos/large/2x/betway-logo-png-transparent.png',
  ladbrokes: 'https://cdn.freebiesupply.com/logos/large/2x/ladbrokes-logo-png-transparent.png',
  coral: 'https://upload.wikimedia.org/wikipedia/en/c/c9/Coral_%28bookmaker%29_logo.svg',
  betvictor: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/95/BetVictor_logo.svg/320px-BetVictor_logo.svg.png',
  '888sport': 'https://cdn.freebiesupply.com/logos/large/2x/888-sport-logo-png-transparent.png',
  pinnacle: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Pinnacle_Sports_logo.png',
};

export interface BookmakerInfo {
  key: string;
  title: string;
  logo?: string;
  lastUpdate?: string;
}

export interface GoldenBet {
  id: string;
  fixtureId?: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  market: BetMarket;
  mlConfidence: number;
  bookmakerOdds: number;
  impliedProbability: number;
  valueEdge: number;
  gafferReasoning?: string;
  status: 'pending' | 'won' | 'lost' | 'void';
  stake?: number;
  result?: string;
  profitLoss?: number;
  bookmaker?: BookmakerInfo;
}

export interface DailyResult {
  date: string;
  bets: GoldenBet[];
  totalStake: number;
  totalReturn: number;
  profit: number;
  roi: number;
}

export interface PLStats {
  totalBets: number;
  wins: number;
  losses: number;
  winRate: number;
  totalStaked: number;
  totalReturns: number;
  netProfit: number;
  roi: number;
}

// Form Tables Types
export type StatCategory = 'goals' | 'corners' | 'cards' | 'btts';

export interface TeamFormStats {
  id: string;
  team: string;
  league: string;
  region: Region;
  played: number;
  over_0_5: number;
  over_1_5: number;
  over_2_5: number;
  over_3_5: number;
  under_0_5: number;
  under_1_5: number;
  under_2_5: number;
  under_3_5: number;
}

export interface TeamCornerStats {
  id: string;
  team: string;
  league: string;
  region: Region;
  played: number;
  over_7_5: number;
  over_8_5: number;
  over_9_5: number;
  over_10_5: number;
  under_7_5: number;
  under_8_5: number;
  under_9_5: number;
  under_10_5: number;
  avgCorners: number;
}

export interface TeamCardStats {
  id: string;
  team: string;
  league: string;
  region: Region;
  played: number;
  over_2_5: number;
  over_3_5: number;
  over_4_5: number;
  over_5_5: number;
  under_2_5: number;
  under_3_5: number;
  under_4_5: number;
  under_5_5: number;
  avgCards: number;
}

export interface TeamBTTSStats {
  id: string;
  team: string;
  league: string;
  region: Region;
  played: number;
  btts_yes: number;
  btts_no: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
}

export interface SavedTeam {
  id: string;
  teamName: string;
  league: string;
  region: Region;
  betType: StatCategory;
  market: string;
  createdAt: string;
}

export interface SavedFixture {
  id: string;
  savedTeamId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  betType: StatCategory;
  market: string;
  odds?: number;
  status: 'upcoming' | 'live' | 'completed';
  createdAt: string;
}

export interface TeamFixture {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  odds?: number;
}

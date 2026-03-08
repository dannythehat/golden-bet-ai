import { GoldenBet, DailyResult, PLStats, BetMarket } from '@/types/betting';

export const todaysGoldenBets: GoldenBet[] = [
  {
    id: '1',
    homeTeam: 'Manchester City',
    awayTeam: 'Liverpool',
    league: 'Premier League',
    kickoff: '2024-01-15T15:00:00Z',
    market: 'over_2.5_goals',
    mlConfidence: 0.82,
    bookmakerOdds: 1.65,
    impliedProbability: 0.606,
    valueEdge: 0.214,
    status: 'pending',
    stake: 10,
  },
  {
    id: '2',
    homeTeam: 'Barcelona',
    awayTeam: 'Real Madrid',
    league: 'La Liga',
    kickoff: '2024-01-15T20:00:00Z',
    market: 'over_9.5_corners',
    mlConfidence: 0.78,
    bookmakerOdds: 1.80,
    impliedProbability: 0.556,
    valueEdge: 0.224,
    status: 'pending',
    stake: 10,
  },
  {
    id: '3',
    homeTeam: 'AC Milan',
    awayTeam: 'Inter Milan',
    league: 'Serie A',
    kickoff: '2024-01-15T17:30:00Z',
    market: 'btts',
    mlConfidence: 0.85,
    bookmakerOdds: 1.75,
    impliedProbability: 0.571,
    valueEdge: 0.279,
    status: 'pending',
    stake: 10,
  },
];

export const recentResults: GoldenBet[] = [
  {
    id: '4',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    league: 'Premier League',
    kickoff: '2024-01-14T15:00:00Z',
    market: 'over_2.5_goals',
    mlConfidence: 0.76,
    bookmakerOdds: 1.72,
    impliedProbability: 0.581,
    valueEdge: 0.179,
    status: 'won',
    stake: 10,
    result: '3-1',
  },
  {
    id: '5',
    homeTeam: 'Bayern Munich',
    awayTeam: 'Dortmund',
    league: 'Bundesliga',
    kickoff: '2024-01-14T17:30:00Z',
    market: 'over_9.5_corners',
    mlConfidence: 0.81,
    bookmakerOdds: 1.85,
    impliedProbability: 0.541,
    valueEdge: 0.269,
    status: 'won',
    stake: 10,
    result: '12 corners',
  },
  {
    id: '6',
    homeTeam: 'PSG',
    awayTeam: 'Lyon',
    league: 'Ligue 1',
    kickoff: '2024-01-14T20:00:00Z',
    market: 'btts',
    mlConfidence: 0.74,
    bookmakerOdds: 1.65,
    impliedProbability: 0.606,
    valueEdge: 0.134,
    status: 'lost',
    stake: 10,
    result: '2-0',
  },
];

export const weeklyStats: PLStats = {
  totalBets: 21,
  wins: 15,
  losses: 6,
  winRate: 71.4,
  totalStaked: 210,
  totalReturns: 287.50,
  netProfit: 77.50,
  roi: 36.9,
};

export const monthlyStats: PLStats = {
  totalBets: 84,
  wins: 58,
  losses: 26,
  winRate: 69.0,
  totalStaked: 840,
  totalReturns: 1156.80,
  netProfit: 316.80,
  roi: 37.7,
};

export const yearlyStats: PLStats = {
  totalBets: 1024,
  wins: 712,
  losses: 312,
  winRate: 69.5,
  totalStaked: 10240,
  totalReturns: 14336,
  netProfit: 4096,
  roi: 40.0,
};

// Support both dot and underscore formats
export const marketLabels: Record<string, string> = {
  // Goals markets
  'over_2.5_goals': 'Over 2.5 Goals',
  'over_2_5_goals': 'Over 2.5 Goals',
  'over_25_goals': 'Over 2.5 Goals',
  // Corners markets
  'over_9.5_corners': 'Over 9.5 Corners',
  'over_9_5_corners': 'Over 9.5 Corners',
  'over_95_corners': 'Over 9.5 Corners',
  'over_8.5_corners': 'Over 8.5 Corners',
  'over_8_5_corners': 'Over 8.5 Corners',
  'over_85_corners': 'Over 8.5 Corners',
  // Cards markets
  'over_3.5_cards': 'Over 3.5 Cards',
  'over_3_5_cards': 'Over 3.5 Cards',
  'over_35_cards': 'Over 3.5 Cards',
  'over_2.5_cards': 'Over 2.5 Cards',
  'over_2_5_cards': 'Over 2.5 Cards',
  'over_25_cards': 'Over 2.5 Cards',
  // BTTS
  'btts': 'BTTS Yes',
  'btts_yes': 'BTTS Yes',
};

export const marketIcons: Record<string, string> = {
  // Goals markets
  'over_2.5_goals': '⚽',
  'over_2_5_goals': '⚽',
  'over_25_goals': '⚽',
  // Corners markets
  'over_9.5_corners': '🚩',
  'over_9_5_corners': '🚩',
  'over_95_corners': '🚩',
  'over_8.5_corners': '🚩',
  'over_8_5_corners': '🚩',
  'over_85_corners': '🚩',
  // Cards markets
  'over_3.5_cards': '🟨',
  'over_3_5_cards': '🟨',
  'over_35_cards': '🟨',
  'over_2.5_cards': '🟨',
  'over_2_5_cards': '🟨',
  'over_25_cards': '🟨',
  // BTTS
  'btts': '⚔️',
  'btts_yes': '⚔️',
};

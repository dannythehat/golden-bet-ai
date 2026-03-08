/**
 * MongoDB Database Schema for Football Stats
 * 
 * Collections:
 * 1. leagues - All major leagues
 * 2. teams - All teams with metadata
 * 3. team_stats - Calculated stats per team (updated daily)
 * 4. fixtures - Today's fixtures
 * 5. last_update - Tracking last data refresh
 */

export interface League {
  _id: string;
  league_id: number;
  name: string;
  country: string;
  region: 'uk' | 'european' | 'asia' | 'americas' | 'other';
  season: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Team {
  _id: string;
  team_id: number;
  name: string;
  league_id: number;
  league_name: string;
  country: string;
  region: 'uk' | 'european' | 'asia' | 'americas' | 'other';
  logo: string;
  created_at: Date;
  updated_at: Date;
}

export interface TeamStats {
  _id: string;
  team_id: number;
  team_name: string;
  league_id: number;
  league_name: string;
  region: 'uk' | 'european' | 'asia' | 'americas' | 'other';
  season: number;
  games_analyzed: number; // Should be 20 (last 20 games)
  
  // Goals Stats
  goals: {
    over_0_5: number;  // Percentage
    over_1_5: number;
    over_2_5: number;
    over_3_5: number;
    under_0_5: number;
    under_1_5: number;
    under_2_5: number;
    under_3_5: number;
    avg_goals: number;
  };
  
  // Corners Stats
  corners: {
    over_7_5: number;
    over_8_5: number;
    over_9_5: number;
    over_10_5: number;
    under_7_5: number;
    under_8_5: number;
    under_9_5: number;
    under_10_5: number;
    avg_corners: number;
  };
  
  // Cards Stats
  cards: {
    over_2_5: number;
    over_3_5: number;
    over_4_5: number;
    over_5_5: number;
    under_2_5: number;
    under_3_5: number;
    under_4_5: number;
    under_5_5: number;
    avg_cards: number;
  };
  
  // BTTS Stats
  btts: {
    yes: number;  // Percentage
    no: number;
    avg_goals_scored: number;
    avg_goals_conceded: number;
  };
  
  last_updated: Date;
  created_at: Date;
}

export interface TodaysFixture {
  _id: string;
  fixture_id: number;
  date: string;
  time: string;
  home_team_id: number;
  home_team_name: string;
  away_team_id: number;
  away_team_name: string;
  league_id: number;
  league_name: string;
  region: 'uk' | 'european' | 'asia' | 'americas' | 'other';
  status: string;
  
  // Stats will be populated from team_stats collection
  home_stats?: TeamStats;
  away_stats?: TeamStats;
  
  created_at: Date;
}

export interface LastUpdate {
  _id: string;
  collection_name: 'leagues' | 'teams' | 'team_stats' | 'fixtures';
  last_update: Date;
  status: 'success' | 'failed' | 'in_progress';
  records_updated: number;
  error_message?: string;
}

/**
 * MongoDB Indexes for Performance
 */
export const INDEXES = {
  leagues: [
    { league_id: 1 },
    { region: 1, is_active: 1 },
  ],
  teams: [
    { team_id: 1 },
    { league_id: 1 },
    { region: 1 },
  ],
  team_stats: [
    { team_id: 1 },
    { league_id: 1 },
    { region: 1 },
    // Compound indexes for filtering
    { region: 1, 'goals.over_2_5': -1 },
    { region: 1, 'corners.over_9_5': -1 },
    { region: 1, 'cards.over_3_5': -1 },
    { region: 1, 'btts.yes': -1 },
  ],
  fixtures: [
    { fixture_id: 1 },
    { date: 1 },
    { home_team_id: 1 },
    { away_team_id: 1 },
    { region: 1 },
  ],
  last_update: [
    { collection_name: 1 },
  ],
};

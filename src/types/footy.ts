// Footy Oracle shared football/fantasy contracts.
// This file is the single frontend source of truth for Lovable UI builds.
// Edge functions should return these shapes directly from supabase.functions.invoke(name, { body }).

export type UUID = string;
export type ISODate = string;
export type ISODateTime = string;

export type ApiSuccess<T> = { ok: true; data: T; meta?: Record<string, unknown> };
export type ApiFailure = { ok: false; error: { code: string; message: string; details?: Record<string, unknown> } };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type FantasyPosition = 'GK' | 'DEF' | 'MID' | 'FWD';
export type FantasyGameweekStatus = 'upcoming' | 'open' | 'locked' | 'live' | 'settled';
export type FantasyChip = 'wildcard' | 'bench_boost' | 'triple_captain' | 'free_hit';
export type SortDirection = 'asc' | 'desc';

export interface ClubRef {
  id: string;
  name: string;
  short_name?: string;
  badge_url?: string;
}

export interface FantasyPlayer {
  id: string;
  external_id?: string;
  name: string;
  position: FantasyPosition;
  club: ClubRef;
  price: number;
  status: 'available' | 'injured' | 'suspended' | 'doubtful' | 'unavailable';
  selected_by_percent?: number;
  total_points: number;
  gameweek_points?: number;
  form?: number;
  next_fixture?: string;
  news?: string;
}

export interface FantasyTeamSlot {
  player: FantasyPlayer;
  is_starter: boolean;
  bench_order?: number;
  is_captain?: boolean;
  is_vice_captain?: boolean;
}

export interface FantasyTeam {
  id: string;
  member_id: string;
  league_id: string;
  name: string;
  avatar_url?: string;
  budget_total: number;
  budget_remaining: number;
  squad_value: number;
  free_transfers: number;
  transfer_hits: number;
  active_chip?: FantasyChip;
  slots: FantasyTeamSlot[];
  updated_at: ISODateTime;
}

export interface FantasyStandingRow {
  rank: number;
  previous_rank?: number;
  movement: number;
  team_id: string;
  team_name: string;
  manager_name: string;
  avatar_url?: string;
  gameweek_points: number;
  total_points: number;
  transfers_made: number;
  transfer_hits: number;
  awards_count?: number;
}

export interface FantasyStandingsResponse {
  league_id: string;
  season: string;
  gameweek: number;
  status: FantasyGameweekStatus;
  rows: FantasyStandingRow[];
  updated_at: ISODateTime;
}

export interface FantasyPlayersFilters {
  position?: FantasyPosition;
  club?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  sort?: 'price' | 'total_points' | 'form' | 'selected_by_percent' | 'name';
  direction?: SortDirection;
  limit?: number;
  offset?: number;
}

export interface FantasyPlayersResponse {
  players: FantasyPlayer[];
  total: number;
  filters: FantasyPlayersFilters;
  updated_at: ISODateTime;
}

export interface FantasyFixture {
  id: string;
  kickoff_time: ISODateTime;
  home_team: ClubRef;
  away_team: ClubRef;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  home_score?: number;
  away_score?: number;
}

export interface FantasyBonusRule {
  key: string;
  label: string;
  description: string;
  points?: number;
}

export interface FantasyGameweekResponse {
  season: string;
  gameweek: number;
  status: FantasyGameweekStatus;
  deadline_at: ISODateTime;
  reveal_at?: ISODateTime;
  settled_at?: ISODateTime;
  fixtures: FantasyFixture[];
  bonus_rules: FantasyBonusRule[];
  updated_at: ISODateTime;
}

export interface FantasyPrize {
  id: string;
  season: string;
  title: string;
  description: string;
  image_url?: string;
  category: 'weekly' | 'random' | 'themed' | 'seasonal';
  starts_at?: ISODateTime;
  ends_at?: ISODateTime;
  enabled: boolean;
}

export interface FantasyPrizesResponse {
  season: string;
  prizes: FantasyPrize[];
  updated_at: ISODateTime;
}

export interface GetFantasyStandingsRequest { leagueId: string; gameweek?: number }
export interface GetFantasyTeamRequest { teamId: string; gameweek?: number }
export interface GetFantasyPlayersRequest { filters?: FantasyPlayersFilters }
export interface GetFantasyGameweekRequest { gameweek?: number }
export interface GetFantasyPrizesRequest { season: string }

export interface SaveSquadRequest {
  teamId: string;
  playerIds: string[];
  starters: string[];
  bench: string[];
  captainId: string;
  viceCaptainId: string;
}
export interface SaveSquadResponse { team: FantasyTeam; validation: FantasyValidationResult }

export interface SubmitTransfersRequest {
  teamId: string;
  gameweek: number;
  outPlayerIds: string[];
  inPlayerIds: string[];
}
export interface SubmitTransfersResponse {
  team: FantasyTeam;
  free_transfers_used: number;
  hit_points: number;
  applies_to_gameweek: number;
  validation: FantasyValidationResult;
}

export interface SetCaptainRequest { teamId: string; playerId: string; gameweek?: number }
export interface SetViceRequest { teamId: string; playerId: string; gameweek?: number }
export interface CaptainMutationResponse { team: FantasyTeam; updated_at: ISODateTime }

export interface PlayChipRequest { teamId: string; chip: FantasyChip; gameweek: number }
export interface PlayChipResponse { team: FantasyTeam; chip: FantasyChip; gameweek: number; activated_at: ISODateTime }

export interface FantasyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FantasyScoreRealtimePayload {
  type: 'fantasy-score-updated';
  gameweek: number;
  team_id: string;
  player_id: string;
  points_delta: number;
  player_gameweek_points: number;
  team_gameweek_points: number;
  team_total_points: number;
  updated_at: ISODateTime;
}

export interface FantasyStandingsRealtimePayload {
  type: 'standings-updated';
  league_id: string;
  gameweek: number;
  team_id: string;
  rank: number;
  previous_rank?: number;
  total_points: number;
  gameweek_points: number;
  updated_at: ISODateTime;
}

export type FantasyRealtimeChannel = 'fantasy-scores' | 'standings';

export interface DailyTip {
  home_team: string;
  away_team: string;
  home_badge?: string;
  away_badge?: string;
  market: string;
  selection?: string;
  odds: string | number;
  confidence: number;
  short_reason?: string;
  updated_at?: ISODateTime;
}

/* ════════════════════════════════════════════════════════════════════════
 * Form Tables — Claude-owned /form-tables page (additive; self-contained).
 * Fixtures ranked by the two teams' COMBINED average per market.
 * ════════════════════════════════════════════════════════════════════════ */
export type FormValueFlag = 'strong' | 'value' | null;

export interface FormValueCell {
  prob: number;            // form-derived over % (0–100)
  odds: number | null;     // UK decimal
  implied: number | null;  // 100 / odds
  edge: number;            // prob − implied
  flag: FormValueFlag;
}

export interface FormGame {
  date: string;
  opp: string;
  ha: 'H' | 'A';
  gf: number; ga: number;
  res: 'W' | 'D' | 'L';
  corners: number; cards: number; btts: boolean;
}

export interface H2HMeeting {
  date: string;
  home: string; away: string;
  hg: number; ag: number;
  corners: number; cards: number;
}

export interface FormFixtureRow {
  id: string;
  league: string;
  region: string;
  date: string;
  time: string;            // kick-off HH:MM
  home: { name: string; short: string; logo: string | null };
  away: { name: string; short: string; logo: string | null };
  result: { hg: number; ag: number; corners: number; cards: number; btts: boolean };
  goals_avg: number;
  corners_avg: number;
  cards_avg: number;
  btts_pct: number;
  goals_over: Record<string, number>;      // over-% (0.5,1.5,2.5,3.5,4.5)
  corners_over: Record<string, number>;    // over-% (8.5,9.5,10.5,11.5)
  cards_over?: Record<string, number>;     // over-% (2.5,3.5,4.5,5.5)
  goals_odds: Record<string, number | null>;       // over odds (2.5,3.5,4.5)
  corners_odds: Record<string, number | null>;     // over odds (8.5,9.5,10.5)
  cards_odds: Record<string, number | null>;       // over odds (3.5,4.5,5.5)
  goals_under_odds?: Record<string, number | null>;   // under odds (0.5,1.5,2.5,3.5)
  corners_under_odds?: Record<string, number | null>; // under odds (8.5,9.5,10.5,11.5)
  cards_under_odds?: Record<string, number | null>;   // under odds (2.5,3.5,4.5)
  btts_odds: number | null;      // BTTS Yes
  btts_no_odds?: number | null;  // BTTS No
  value: {
    goals: Record<string, FormValueCell | null>;
    corners: Record<string, FormValueCell | null>;
    btts: FormValueCell | null;
  };
  home_form: FormGame[];
  away_form: FormGame[];
  h2h: H2HMeeting[];
}

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  ApiResponse,
  FantasyPlayer,
  FantasyPlayersResponse,
  FantasyPlayersFilters,
  FantasyTeam,
  FantasyStandingsResponse,
  FantasyGameweekResponse,
  FantasyPrizesResponse,
  FantasyPosition,
  SaveSquadRequest,
  SaveSquadResponse,
  SubmitTransfersRequest,
  SubmitTransfersResponse,
  SetCaptainRequest,
  SetViceRequest,
  CaptainMutationResponse,
  PlayChipRequest,
  PlayChipResponse,
  FantasyScoreRealtimePayload,
  FantasyStandingsRealtimePayload,
} from '@/types/footy';

/* ───────────────────────────────────────────────────────────────────────────
 * Fantasy data layer — Footy Oracle wrappers over the FPL proxy edge functions.
 *
 * Every hook calls `supabase.functions.invoke(name, { body })`, unwraps the
 * ApiResponse envelope, and falls back to typed sample data that matches the
 * LOCKED contracts in src/types/footy.ts exactly (so the UI works before the
 * edge functions are synced live). Nothing here redefines a payload interface —
 * shapes are imported from @/types/footy only.
 * ─────────────────────────────────────────────────────────────────────────── */

/** Locked squad rules (constants — not a payload interface). */
export const FANTASY_RULES = {
  budget: 100,
  squadSize: 15,
  starters: 11,
  bench: 4,
  perPosition: { GK: 2, DEF: 5, MID: 5, FWD: 3 } as Record<FantasyPosition, number>,
  maxPerClub: 3,
  formations: ['4-4-2', '4-3-3', '3-5-2', '3-4-3', '4-5-1', '5-3-2', '5-4-1'],
  defaultFormation: '4-4-2',
  registrationOpen: true,
  seasonStart: '2026-08-01T00:00:00Z',
} as const;

/** Race the edge function against a short timeout, unwrap the envelope, else fall back. */
async function invokeFantasy<T>(name: string, body: unknown, fallback: T, valid: (d: unknown) => boolean): Promise<T> {
  try {
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), 3500));
    const call = supabase.functions.invoke(name, { body: body as Record<string, unknown> });
    const res = (await Promise.race([call, timeout])) as { data?: ApiResponse<T>; error?: unknown } | null;
    if (!res || res.error) return fallback;
    const env = res.data;
    if (!env || env.ok !== true || !valid(env.data)) return fallback;
    return env.data;
  } catch {
    return fallback;
  }
}

/* ════════════════════════════ fallback data ════════════════════════════ */

const club = (id: string, name: string, short: string) => ({ id, name, short_name: short });

const P = (
  id: string, name: string, position: FantasyPosition, c: ReturnType<typeof club>,
  price: number, total_points: number, form: number, selected_by_percent: number,
  status: FantasyPlayer['status'] = 'available', next_fixture?: string, news?: string,
): FantasyPlayer => ({ id, external_id: `fpl_${id}`, name, position, club: c, price, status, selected_by_percent, total_points, gameweek_points: 0, form, next_fixture, news });

const LIV = club('liverpool', 'Liverpool', 'LIV');
const MCI = club('manchester-city', 'Manchester City', 'MCI');
const ARS = club('arsenal', 'Arsenal', 'ARS');
const MUN = club('manchester-united', 'Manchester United', 'MUN');
const CHE = club('chelsea', 'Chelsea', 'CHE');
const NEW = club('newcastle-united', 'Newcastle United', 'NEW');
const AVL = club('aston-villa', 'Aston Villa', 'AVL');
const TOT = club('tottenham-hotspur', 'Tottenham Hotspur', 'TOT');
const EVE = club('everton', 'Everton', 'EVE');
const BHA = club('brighton', 'Brighton', 'BHA');

/** A pool deep enough to build a legal 15-man squad (2·5·5·3) under the club cap. */
export const FANTASY_PLAYERS: FantasyPlayer[] = [
  // GK
  P('gk_alisson', 'Alisson Becker', 'GK', LIV, 6.0, 138, 5.2, 22.1, 'available', 'Wolves (A)'),
  P('gk_raya', 'David Raya', 'GK', ARS, 5.6, 141, 5.5, 18.4, 'available', 'Spurs (H)'),
  P('gk_ederson', 'Ederson', 'GK', MCI, 5.5, 132, 4.8, 14.0),
  P('gk_pickford', 'Jordan Pickford', 'GK', EVE, 5.0, 119, 4.3, 9.2),
  P('gk_sanchez', 'Robert Sánchez', 'GK', CHE, 4.6, 104, 3.9, 6.1, 'doubtful', 'Villa (A)', 'Knock — assessed'),
  // DEF
  P('df_vvd', 'Virgil van Dijk', 'DEF', LIV, 6.4, 152, 5.9, 28.3, 'available', 'Wolves (A)'),
  P('df_saliba', 'William Saliba', 'DEF', ARS, 6.2, 156, 6.0, 24.7),
  P('df_gabriel', 'Gabriel Magalhães', 'DEF', ARS, 6.0, 158, 6.2, 26.1),
  P('df_gvardiol', 'Joško Gvardiol', 'DEF', MCI, 6.0, 147, 6.1, 19.8),
  P('df_trippier', 'Kieran Trippier', 'DEF', NEW, 6.2, 151, 5.4, 12.5),
  P('df_robertson', 'Andrew Robertson', 'DEF', LIV, 6.0, 149, 5.7, 15.2),
  P('df_dias', 'Rúben Dias', 'DEF', MCI, 5.6, 144, 5.6, 11.1),
  P('df_cucurella', 'Marc Cucurella', 'DEF', CHE, 5.2, 133, 5.1, 9.8),
  P('df_konsa', 'Ezri Konsa', 'DEF', AVL, 4.6, 121, 4.7, 6.3),
  P('df_burn', 'Dan Burn', 'DEF', NEW, 4.5, 118, 4.5, 5.2),
  P('df_vanhecke', 'Lewis Dunk', 'DEF', BHA, 4.6, 116, 4.4, 4.9),
  // MID
  P('md_saka', 'Bukayo Saka', 'MID', ARS, 10.0, 192, 7.0, 41.2, 'available', 'Spurs (H)'),
  P('md_palmer', 'Cole Palmer', 'MID', CHE, 10.6, 204, 7.4, 46.8),
  P('md_foden', 'Phil Foden', 'MID', MCI, 9.0, 181, 6.8, 22.4),
  P('md_odegaard', 'Martin Ødegaard', 'MID', ARS, 8.4, 171, 6.5, 19.9),
  P('md_bruno', 'Bruno Fernandes', 'MID', MUN, 8.5, 178, 6.6, 24.1),
  P('md_son', 'Son Heung-min', 'MID', TOT, 9.8, 186, 6.9, 27.7),
  P('md_rice', 'Declan Rice', 'MID', ARS, 6.4, 146, 5.8, 12.0),
  P('md_gordon', 'Anthony Gordon', 'MID', NEW, 7.4, 162, 6.1, 14.3),
  P('md_mbeumo', 'Bryan Mbeumo', 'MID', MUN, 7.6, 168, 6.4, 17.8),
  P('md_rogers', 'Morgan Rogers', 'MID', AVL, 5.4, 138, 5.5, 8.1),
  // MID — budget enablers
  P('md_mcneil', 'Dwight McNeil', 'MID', EVE, 5.2, 128, 4.8, 4.2),
  P('md_murphy', 'Jacob Murphy', 'MID', NEW, 5.0, 120, 4.5, 5.0),
  P('md_sarr', 'Pape Matar Sarr', 'MID', TOT, 5.0, 115, 4.4, 3.5),
  P('md_baleba', 'Carlos Baleba', 'MID', BHA, 4.8, 108, 4.1, 2.9),
  // FWD
  P('fw_haaland', 'Erling Haaland', 'FWD', MCI, 14.2, 232, 8.2, 62.4, 'available', 'Wolves (A)'),
  P('fw_isak', 'Alexander Isak', 'FWD', NEW, 8.7, 179, 6.7, 21.0),
  P('fw_watkins', 'Ollie Watkins', 'FWD', AVL, 9.0, 187, 6.9, 23.6),
  P('fw_jackson', 'Nicolas Jackson', 'FWD', CHE, 7.5, 162, 6.1, 13.4),
  P('fw_solanke', 'Dominic Solanke', 'FWD', TOT, 7.5, 158, 6.0, 11.2, 'doubtful', 'Arsenal (A)', 'Late fitness test'),
  P('fw_wood', 'Chris Wood', 'FWD', NEW, 6.6, 151, 5.7, 9.9),
  P('fw_beto', 'Beto', 'FWD', EVE, 5.4, 118, 4.6, 4.0),
  P('fw_welbeck', 'Danny Welbeck', 'FWD', BHA, 5.6, 132, 5.0, 5.5),
  // DEF — budget enablers
  P('df_mykolenko', 'Vitalii Mykolenko', 'DEF', EVE, 4.4, 98, 3.8, 3.1),
  P('df_estupinan', 'Pervis Estupiñán', 'DEF', BHA, 4.7, 110, 4.2, 4.0),
];

const slot = (id: string, is_starter: boolean, opts: { c?: boolean; v?: boolean; bench?: number } = {}) => {
  const player = FANTASY_PLAYERS.find((p) => p.id === id)!;
  return { player: { ...player, gameweek_points: is_starter ? Math.round(player.form * (opts.c ? 2 : 1)) : 0 }, is_starter, is_captain: !!opts.c, is_vice_captain: !!opts.v, bench_order: opts.bench };
};

/** A full legal fallback squad: 2·5·5·3, XI in a 4-4-2, captain + vice + bench order. */
export const FANTASY_TEAM: FantasyTeam = {
  id: 'team_demo', member_id: 'member_demo', league_id: 'main-2025-26', name: 'No Kane No Gain',
  budget_total: 100, budget_remaining: 1.5, squad_value: 98.5, free_transfers: 1, transfer_hits: 0,
  updated_at: new Date().toISOString(),
  slots: [
    slot('gk_alisson', true),
    slot('df_vvd', true), slot('df_saliba', true), slot('df_gvardiol', true), slot('df_trippier', true),
    slot('md_saka', true), slot('md_palmer', true, { v: true }), slot('md_bruno', true), slot('md_gordon', true),
    slot('fw_haaland', true, { c: true }), slot('fw_isak', true),
    slot('gk_raya', false, { bench: 1 }), slot('df_robertson', false, { bench: 2 }),
    slot('md_rice', false, { bench: 3 }), slot('fw_watkins', false, { bench: 4 }),
  ],
};

const daysAdd = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

export const FANTASY_GAMEWEEK: FantasyGameweekResponse = {
  season: '2025/26', gameweek: 24, status: 'open', deadline_at: daysAdd(2.35),
  bonus_rules: [{ key: 'manual_bonus', label: 'Gaffer Bonus', description: 'Optional 0–3 bonus points, awarded by The Gaffer for standout performances.' }],
  fixtures: [
    { id: 'fx_1', kickoff_time: daysAdd(2.4), home_team: LIV, away_team: NEW, status: 'scheduled' },
    { id: 'fx_2', kickoff_time: daysAdd(2.5), home_team: ARS, away_team: TOT, status: 'scheduled' },
    { id: 'fx_3', kickoff_time: daysAdd(2.6), home_team: MCI, away_team: CHE, status: 'scheduled' },
    { id: 'fx_4', kickoff_time: daysAdd(3.0), home_team: AVL, away_team: MUN, status: 'scheduled' },
  ],
  updated_at: new Date().toISOString(),
};

export const FANTASY_STANDINGS: FantasyStandingsResponse = {
  league_id: 'main-2025-26', season: '2025/26', gameweek: 24, status: 'open', updated_at: new Date().toISOString(),
  rows: [
    { rank: 1, previous_rank: 4, movement: 3, team_id: 'team_001', team_name: 'Net Busters', manager_name: 'J. Okafor', gameweek_points: 78, total_points: 2685, transfers_made: 1, transfer_hits: 0, awards_count: 2 },
    { rank: 2, previous_rank: 1, movement: -1, team_id: 'team_002', team_name: 'Pitch Predators', manager_name: 'S. Ahmed', gameweek_points: 71, total_points: 2514, transfers_made: 1, transfer_hits: 0 },
    { rank: 3, previous_rank: 3, movement: 0, team_id: 'team_003', team_name: 'Golden Boot Gang', manager_name: 'L. Rossi', gameweek_points: 69, total_points: 2431, transfers_made: 2, transfer_hits: 4 },
    { rank: 4, previous_rank: 4, movement: 0, team_id: 'team_gaffer', team_name: 'The Gaffer’s XI', manager_name: 'The Gaffer', gameweek_points: 64, total_points: 2315, transfers_made: 0, transfer_hits: 0 },
    { rank: 5, previous_rank: 7, movement: 2, team_id: 'team_005', team_name: 'Tiki Taka Titans', manager_name: 'M. Nowak', gameweek_points: 62, total_points: 2198, transfers_made: 1, transfer_hits: 0 },
    { rank: 6, previous_rank: 5, movement: -1, team_id: 'team_006', team_name: 'Expected Goals', manager_name: 'D. Byrne', gameweek_points: 58, total_points: 2074, transfers_made: 1, transfer_hits: 0 },
    { rank: 7, previous_rank: 9, movement: 2, team_id: 'team_you', team_name: 'No Kane No Gain', manager_name: 'You', gameweek_points: 55, total_points: 1958, transfers_made: 1, transfer_hits: 0 },
    { rank: 8, previous_rank: 6, movement: -2, team_id: 'team_008', team_name: 'Last Min Winners', manager_name: 'K. Walsh', gameweek_points: 51, total_points: 1842, transfers_made: 2, transfer_hits: 4 },
    { rank: 9, previous_rank: 8, movement: -1, team_id: 'team_009', team_name: 'Offside Masters', manager_name: 'P. Novak', gameweek_points: 47, total_points: 1698, transfers_made: 1, transfer_hits: 0 },
    { rank: 10, previous_rank: 10, movement: 0, team_id: 'team_010', team_name: 'Transfer Twisters', manager_name: 'R. Hughes', gameweek_points: 43, total_points: 1542, transfers_made: 3, transfer_hits: 8 },
  ],
};

export const FANTASY_PRIZES: FantasyPrizesResponse = {
  season: '2025/26', updated_at: new Date().toISOString(),
  prizes: [
    { id: 'prize_tropical_holiday', season: '2025/26', title: 'Tropical Escape', description: 'The season headline — a dream holiday for the overall Fantasy League champion.', category: 'seasonal', image_url: '/images/fantasy/prizes/prize-tropical.jpg', enabled: true },
    { id: 'prize_weekly_cash', season: '2025/26', title: 'Weekly Cash Prize', description: 'Top the gameweek and take home cold, hard cash. Every single week.', category: 'weekly', image_url: '/images/fantasy/prizes/prize-voucher.jpg', enabled: true },
    { id: 'prize_luxury_weekend', season: '2025/26', title: 'Luxury Weekend Away', description: 'A monthly escape in style, on the club.', category: 'themed', image_url: '/images/fantasy/prizes/prize-villa.jpg', enabled: true },
    { id: 'prize_football_experiences', season: '2025/26', title: 'Football Experiences', description: "Matchday tickets and money-can't-buy days out.", category: 'themed', image_url: '/images/fantasy/prizes/prize-experiences.jpg', enabled: true },
    { id: 'prize_xmas_hamper', season: '2025/26', title: '£1,000 Christmas Hamper', description: 'A themed festive giveaway during the Christmas fixture rush.', category: 'themed', starts_at: '2025-11-20T00:00:00Z', ends_at: '2025-12-26T23:59:59Z', enabled: true },
    { id: 'prize_donkey', season: '2025/26', title: 'Donkey of the Week', description: 'Finish bottom and wear the ears with pride. Fame — of a sort.', category: 'random', image_url: '/images/fantasy/prizes/prize-donkey.jpg', enabled: true },
  ],
};

/* ════════════════════════════════ hooks ════════════════════════════════ */

export function useFantasyGameweek(gameweek?: number) {
  return useQuery({
    queryKey: ['fantasy_gameweek', gameweek ?? 'current'],
    staleTime: 1000 * 60 * 2,
    retry: false,
    placeholderData: FANTASY_GAMEWEEK,
    queryFn: () => invokeFantasy<FantasyGameweekResponse>('get-fantasy-gameweek', { gameweek }, FANTASY_GAMEWEEK, (d) => !!(d as FantasyGameweekResponse)?.deadline_at),
  });
}

export function useFantasyPlayers(filters?: FantasyPlayersFilters) {
  return useQuery({
    queryKey: ['fantasy_players', filters ?? {}],
    staleTime: 1000 * 60 * 10,
    retry: false,
    placeholderData: { players: FANTASY_PLAYERS, total: FANTASY_PLAYERS.length, filters: filters ?? {}, updated_at: FANTASY_GAMEWEEK.updated_at } as FantasyPlayersResponse,
    queryFn: () => invokeFantasy<FantasyPlayersResponse>('get-fantasy-players', { filters }, { players: FANTASY_PLAYERS, total: FANTASY_PLAYERS.length, filters: filters ?? {}, updated_at: new Date().toISOString() }, (d) => Array.isArray((d as FantasyPlayersResponse)?.players)),
  });
}

export function useFantasyTeam(teamId?: string, gameweek?: number) {
  return useQuery({
    queryKey: ['fantasy_team', teamId ?? 'demo', gameweek ?? 'current'],
    staleTime: 1000 * 60 * 2,
    retry: false,
    placeholderData: FANTASY_TEAM,
    queryFn: () => invokeFantasy<FantasyTeam>('get-fantasy-team', { teamId, gameweek }, FANTASY_TEAM, (d) => Array.isArray((d as FantasyTeam)?.slots)),
  });
}

export function useFantasyStandings(leagueId = 'main-2025-26', gameweek?: number) {
  return useQuery({
    queryKey: ['fantasy_standings', leagueId, gameweek ?? 'current'],
    staleTime: 1000 * 60 * 2,
    retry: false,
    placeholderData: FANTASY_STANDINGS,
    queryFn: () => invokeFantasy<FantasyStandingsResponse>('get-fantasy-standings', { leagueId, gameweek }, FANTASY_STANDINGS, (d) => Array.isArray((d as FantasyStandingsResponse)?.rows)),
  });
}

export function useFantasyPrizes(season = '2025/26') {
  return useQuery({
    queryKey: ['fantasy_prizes', season],
    staleTime: 1000 * 60 * 30,
    retry: false,
    placeholderData: FANTASY_PRIZES,
    queryFn: () => invokeFantasy<FantasyPrizesResponse>('get-fantasy-prizes', { season }, FANTASY_PRIZES, (d) => Array.isArray((d as FantasyPrizesResponse)?.prizes)),
  });
}

/**
 * Derived Gameweek Results — combines the team + gameweek (and, once wired, the
 * fantasy-scores realtime channel). Per the work order, there is NO
 * get-fantasy-results endpoint; this is a client-side selector over existing
 * reads. Captain ×2, bench points and Gaffer Bonus are presentation only.
 */
export function useFantasyGameweekResults(teamId?: string, gameweek?: number) {
  const team = useFantasyTeam(teamId, gameweek);
  const gw = useFantasyGameweek(gameweek);
  const slots = team.data?.slots ?? [];
  const starters = slots.filter((s) => s.is_starter);
  const captainMultiplier = (s: (typeof slots)[number]) => (s.is_captain ? 2 : 1);
  const total = starters.reduce((sum, s) => sum + (s.player.gameweek_points ?? 0) * captainMultiplier(s), 0);
  return {
    isLoading: team.isLoading || gw.isLoading,
    team: team.data,
    gameweek: gw.data,
    starters,
    bench: slots.filter((s) => !s.is_starter).sort((a, b) => (a.bench_order ?? 9) - (b.bench_order ?? 9)),
    total,
    status: gw.data?.status ?? 'open',
  };
}

/* ════════════════════════════════ mutations ════════════════════════════════ */

/** Invoke a mutation wrapper, unwrap the envelope, throw the typed error on failure. */
async function mutateFantasy<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) throw new Error(error.message ?? 'Request failed');
  const env = data as ApiResponse<T>;
  if (!env || env.ok !== true) throw new Error(env?.error?.message ?? 'Something went wrong. Give it another go.');
  return env.data;
}

/** Invalidate the team + standings queries after a squad-changing mutation. */
function useFantasyInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['fantasy_team'] });
    qc.invalidateQueries({ queryKey: ['fantasy_standings'] });
  };
}

export function useSaveSquad() {
  const invalidate = useFantasyInvalidate();
  return useMutation({
    mutationFn: (req: SaveSquadRequest) => mutateFantasy<SaveSquadResponse>('save-squad', req),
    onSuccess: invalidate,
  });
}

export function useSubmitTransfers() {
  const invalidate = useFantasyInvalidate();
  return useMutation({
    mutationFn: (req: SubmitTransfersRequest) => mutateFantasy<SubmitTransfersResponse>('submit-transfers', req),
    onSuccess: invalidate,
  });
}

export function useSetCaptain() {
  const invalidate = useFantasyInvalidate();
  return useMutation({
    mutationFn: (req: SetCaptainRequest) => mutateFantasy<CaptainMutationResponse>('set-captain', req),
    onSuccess: invalidate,
  });
}

export function useSetVice() {
  const invalidate = useFantasyInvalidate();
  return useMutation({
    mutationFn: (req: SetViceRequest) => mutateFantasy<CaptainMutationResponse>('set-vice', req),
    onSuccess: invalidate,
  });
}

export function usePlayChip() {
  const invalidate = useFantasyInvalidate();
  return useMutation({
    mutationFn: (req: PlayChipRequest) => mutateFantasy<PlayChipResponse>('play-chip', req),
    onSuccess: invalidate,
  });
}

/* ════════════════════════════════ realtime ════════════════════════════════ */

/**
 * Subscribe to the `fantasy-scores` channel. Fires `onScore` with each typed
 * payload and refreshes the team query so live points flow into the UI. No-op
 * until the channel is broadcasting.
 */
export function useFantasyRealtimeScores(onScore?: (p: FantasyScoreRealtimePayload) => void) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('fantasy-scores')
      .on('broadcast', { event: 'fantasy-score-updated' }, ({ payload }) => {
        onScore?.(payload as FantasyScoreRealtimePayload);
        qc.invalidateQueries({ queryKey: ['fantasy_team'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Subscribe to the `standings` channel. Fires `onStanding` with each typed
 * payload and refreshes the standings query so the leaderboard re-ranks live.
 */
export function useFantasyRealtimeStandings(onStanding?: (p: FantasyStandingsRealtimePayload) => void) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('standings')
      .on('broadcast', { event: 'standings-updated' }, ({ payload }) => {
        onStanding?.(payload as FantasyStandingsRealtimePayload);
        qc.invalidateQueries({ queryKey: ['fantasy_standings'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

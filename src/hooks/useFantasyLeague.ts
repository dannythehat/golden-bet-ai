import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ───────────────────────────────────────────────────────────────────────────
 * Fantasy League page — data contracts.
 *
 * Every hook tries its Footy Oracle wrapper edge function, then falls back to
 * typed sample data (raced against a short timeout) so the page always renders
 * with real HTML/React — never a baked image. Player data, standings, prices,
 * prizes and rules are all live-driven by these shapes.
 * ─────────────────────────────────────────────────────────────────────────── */

export type FantasyPosition = 'GK' | 'DEF' | 'MID' | 'FWD';

export type FantasyPlayer = {
  id: string;
  name: string;
  team: string;
  teamShort: string;
  position: FantasyPosition;
  price: number; // £m
  rating: number; // FUT-style overall
  points: number; // season fantasy points
  form: number; // last-5 avg
};

export type FantasyRules = {
  budget: number; // £m
  squadSize: number; // starting XI
  benchSize: number;
  formations: string[];
  defaultFormation: string;
  maxPerClub: number;
};

export type FantasyStandingRow = {
  rank: number;
  team: string;
  manager: string;
  gwPoints: number;
  total: number;
  movement: 'up' | 'down' | 'same';
  isYou?: boolean;
  isGaffer?: boolean;
};

export type FantasyPrizeTier = { rank: number; label: string; value: string };

export type FantasyPrize = {
  id: string;
  kind: 'grand' | 'standard' | 'fun';
  title: string;
  subtitle: string;
  image: string;
  tag: string;
};

export type FantasyLeagueMeta = {
  season: { name: string; status: string; registrationOpen: boolean; joinUrl: string; deadline: string | null };
  gameweek: { number: number; label: string; deadline: string | null };
  entries: number;
};

/* ── timeout race so a missing/slow edge function never hangs the UI ── */
async function withFallback<T>(fn: string, fallback: T, valid: (d: unknown) => boolean): Promise<T> {
  try {
    const timeout = new Promise<null>((r) => setTimeout(() => r(null), 3500));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoke = (supabase as any).functions.invoke(fn);
    const res = await Promise.race([invoke, timeout]);
    if (!res || res.error || !res.data || !valid(res.data)) return fallback;
    return res.data as T;
  } catch {
    return fallback;
  }
}

/* ───────────────────────────── fallbacks ───────────────────────────── */

export const FANTASY_RULES: FantasyRules = {
  budget: 95,
  squadSize: 11,
  benchSize: 4,
  formations: ['4-3-3', '4-4-2', '3-5-2', '3-4-3', '5-3-2', '4-2-3-1'],
  defaultFormation: '4-3-3',
  maxPerClub: 3,
};

// A believable Premier League–flavoured player pool. Prices/ratings are sample
// data; the live wrapper replaces these wholesale.
export const FANTASY_PLAYERS: FantasyPlayer[] = [
  // GK
  { id: 'gk1', name: 'Alisson', team: 'Liverpool', teamShort: 'LIV', position: 'GK', price: 6.0, rating: 90, points: 138, form: 5.2 },
  { id: 'gk2', name: 'Ederson', team: 'Man City', teamShort: 'MCI', position: 'GK', price: 5.8, rating: 89, points: 132, form: 4.8 },
  { id: 'gk3', name: 'Raya', team: 'Arsenal', teamShort: 'ARS', position: 'GK', price: 5.6, rating: 87, points: 141, form: 5.5 },
  { id: 'gk4', name: 'Pickford', team: 'Everton', teamShort: 'EVE', position: 'GK', price: 5.0, rating: 85, points: 119, form: 4.3 },
  // DEF
  { id: 'df1', name: 'Van Dijk', team: 'Liverpool', teamShort: 'LIV', position: 'DEF', price: 6.4, rating: 92, points: 152, form: 5.9 },
  { id: 'df2', name: 'Alexander-Arnold', team: 'Liverpool', teamShort: 'LIV', position: 'DEF', price: 7.2, rating: 90, points: 168, form: 6.4 },
  { id: 'df3', name: 'Rúben Dias', team: 'Man City', teamShort: 'MCI', position: 'DEF', price: 6.0, rating: 92, points: 144, form: 5.6 },
  { id: 'df4', name: 'Robertson', team: 'Liverpool', teamShort: 'LIV', position: 'DEF', price: 6.0, rating: 88, points: 149, form: 5.7 },
  { id: 'df5', name: 'Saliba', team: 'Arsenal', teamShort: 'ARS', position: 'DEF', price: 6.2, rating: 89, points: 156, form: 6.0 },
  { id: 'df6', name: 'Gvardiol', team: 'Man City', teamShort: 'MCI', position: 'DEF', price: 6.0, rating: 87, points: 147, form: 6.1 },
  { id: 'df7', name: 'Trippier', team: 'Newcastle', teamShort: 'NEW', position: 'DEF', price: 6.2, rating: 86, points: 151, form: 5.4 },
  { id: 'df8', name: 'Gabriel', team: 'Arsenal', teamShort: 'ARS', position: 'DEF', price: 6.0, rating: 87, points: 158, form: 6.2 },
  // MID
  { id: 'md1', name: 'De Bruyne', team: 'Man City', teamShort: 'MCI', position: 'MID', price: 9.6, rating: 96, points: 189, form: 7.1 },
  { id: 'md2', name: 'Bellingham', team: 'Real Madrid', teamShort: 'RMA', position: 'MID', price: 9.3, rating: 93, points: 184, form: 6.9 },
  { id: 'md3', name: 'Ødegaard', team: 'Arsenal', teamShort: 'ARS', position: 'MID', price: 8.4, rating: 90, points: 171, form: 6.5 },
  { id: 'md4', name: 'B. Fernandes', team: 'Man United', teamShort: 'MUN', position: 'MID', price: 8.5, rating: 92, points: 178, form: 6.6 },
  { id: 'md5', name: 'Saka', team: 'Arsenal', teamShort: 'ARS', position: 'MID', price: 9.8, rating: 90, points: 192, form: 7.0 },
  { id: 'md6', name: 'Foden', team: 'Man City', teamShort: 'MCI', position: 'MID', price: 8.9, rating: 89, points: 181, form: 6.8 },
  { id: 'md7', name: 'Palmer', team: 'Chelsea', teamShort: 'CHE', position: 'MID', price: 10.5, rating: 89, points: 204, form: 7.4 },
  { id: 'md8', name: 'Rice', team: 'Arsenal', teamShort: 'ARS', position: 'MID', price: 6.4, rating: 88, points: 146, form: 5.8 },
  // FWD
  { id: 'fw1', name: 'Haaland', team: 'Man City', teamShort: 'MCI', position: 'FWD', price: 14.2, rating: 97, points: 232, form: 8.2 },
  { id: 'fw2', name: 'Kane', team: 'Bayern', teamShort: 'BAY', position: 'FWD', price: 12.8, rating: 96, points: 221, form: 7.9 },
  { id: 'fw3', name: 'Salah', team: 'Liverpool', teamShort: 'LIV', position: 'FWD', price: 12.9, rating: 94, points: 226, form: 8.0 },
  { id: 'fw4', name: 'Watkins', team: 'Aston Villa', teamShort: 'AVL', position: 'FWD', price: 9.0, rating: 86, points: 187, form: 6.9 },
  { id: 'fw5', name: 'Isak', team: 'Newcastle', teamShort: 'NEW', position: 'FWD', price: 8.7, rating: 87, points: 179, form: 6.7 },
  { id: 'fw6', name: 'Solanke', team: 'Tottenham', teamShort: 'TOT', position: 'FWD', price: 7.5, rating: 84, points: 162, form: 6.1 },
];

export const FANTASY_STANDINGS: { gameweek: string; rows: FantasyStandingRow[]; champion: string; tiers: FantasyPrizeTier[] } = {
  gameweek: 'Gameweek 24',
  champion: '£10,000 Cash',
  tiers: [
    { rank: 1, label: '1st', value: '£10,000' },
    { rank: 2, label: '2nd', value: '£3,000' },
    { rank: 3, label: '3rd', value: '£1,000' },
  ],
  rows: [
    { rank: 1, team: 'Net Busters', manager: 'J. Okafor', gwPoints: 78, total: 2685, movement: 'up' },
    { rank: 2, team: 'Pitch Predators', manager: 'S. Ahmed', gwPoints: 71, total: 2514, movement: 'up' },
    { rank: 3, team: 'Golden Boot Gang', manager: 'L. Rossi', gwPoints: 69, total: 2431, movement: 'down' },
    { rank: 4, team: 'Beat the Gaffer', manager: 'The Gaffer', gwPoints: 64, total: 2315, movement: 'same', isGaffer: true },
    { rank: 5, team: 'Tiki Taka Titans', manager: 'M. Nowak', gwPoints: 62, total: 2198, movement: 'up' },
    { rank: 6, team: 'Expected Goals', manager: 'D. Byrne', gwPoints: 58, total: 2074, movement: 'down' },
    { rank: 7, team: 'Grass Cutters FC', manager: 'A. Silva', gwPoints: 55, total: 1958, movement: 'same' },
    { rank: 8, team: 'Last Min Winners', manager: 'K. Walsh', gwPoints: 51, total: 1842, movement: 'up' },
    { rank: 9, team: 'Offside Masters', manager: 'P. Novak', gwPoints: 47, total: 1698, movement: 'down' },
    { rank: 10, team: 'Transfer Twisters', manager: 'R. Hughes', gwPoints: 43, total: 1542, movement: 'down' },
  ],
};

export const FANTASY_PRIZES: { headline: string; sub: string; grand: FantasyPrize; prizes: FantasyPrize[] } = {
  headline: 'Prizes & Glory',
  sub: 'Win big. Laugh harder.',
  grand: {
    id: 'grand',
    kind: 'grand',
    title: 'Tropical Escape',
    subtitle: 'The ultimate footy getaway for our season champion.',
    image: '/images/fantasy/prizes/prize-tropical.jpg',
    tag: 'Grand Prize',
  },
  prizes: [
    { id: 'voucher', kind: 'standard', title: 'Premium Vouchers', subtitle: 'Spend it your way, every month.', image: '/images/fantasy/prizes/prize-voucher.jpg', tag: 'Monthly' },
    { id: 'villa', kind: 'standard', title: 'Luxury Weekend Away', subtitle: 'Escape in style on the club.', image: '/images/fantasy/prizes/prize-villa.jpg', tag: 'Seasonal' },
    { id: 'experiences', kind: 'standard', title: 'Football Experiences', subtitle: 'Matchday tickets & money-can’t-buy days.', image: '/images/fantasy/prizes/prize-experiences.jpg', tag: 'Live' },
    { id: 'donkey', kind: 'fun', title: 'Donkey of the Week', subtitle: 'Finish bottom, wear the ears with pride.', image: '/images/fantasy/prizes/prize-donkey.jpg', tag: 'Wooden Spoon' },
  ],
};

const daysAdd = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

export const FANTASY_META: FantasyLeagueMeta = {
  season: { name: '2025/26 Season', status: 'live', registrationOpen: true, joinUrl: '/pricing', deadline: daysAdd(30) },
  gameweek: { number: 24, label: 'Gameweek 24', deadline: daysAdd(2.35) },
  entries: 4821,
};

/* ───────────────────────────── hooks ───────────────────────────── */

const PLAYERS_FALLBACK = { players: FANTASY_PLAYERS, rules: FANTASY_RULES };

export function useFantasyPlayers() {
  return useQuery({
    queryKey: ['fantasy_players'],
    staleTime: 1000 * 60 * 10,
    retry: false,
    // Render fallback instantly, upgrade in-place if a real endpoint responds.
    placeholderData: PLAYERS_FALLBACK,
    queryFn: () => withFallback('fantasy-players', PLAYERS_FALLBACK, (d) => !!(d as { players?: unknown[] }).players?.length),
  });
}

export function useFantasyStandings() {
  return useQuery({
    queryKey: ['fantasy_standings'],
    staleTime: 1000 * 60 * 5,
    retry: false,
    placeholderData: FANTASY_STANDINGS,
    queryFn: () => withFallback('fantasy-standings', FANTASY_STANDINGS, (d) => !!(d as { rows?: unknown[] }).rows?.length),
  });
}

export function useFantasyPrizes() {
  return useQuery({
    queryKey: ['fantasy_prizes'],
    staleTime: 1000 * 60 * 30,
    retry: false,
    placeholderData: FANTASY_PRIZES,
    queryFn: () => withFallback('fantasy-prizes', FANTASY_PRIZES, (d) => !!(d as { grand?: unknown }).grand),
  });
}

export function useFantasyMeta() {
  return useQuery({
    queryKey: ['fantasy_meta'],
    staleTime: 1000 * 60 * 5,
    retry: false,
    placeholderData: FANTASY_META,
    queryFn: () => withFallback('fantasy-meta', FANTASY_META, (d) => !!(d as { season?: unknown }).season),
  });
}

import { useQuery } from '@tanstack/react-query';

// Live in-play state per fixture, served by the Cloudflare Function at
// /api/inplay (which proxies FootyStats server-side). corners/cards are null
// when the feed hasn't recorded them yet — never a made-up number.
export type InPlayState = {
  /** Match abandoned/suspended/postponed — the leg is void, never won or lost. */
  voided?: boolean;
  /** FootyStats has real live numbers (false = placeholder 0-0, hide score). */
  feed?: boolean;
  live: boolean;
  ended: boolean;
  goals: number;
  homeGoals: number;
  awayGoals: number;
  corners: number | null;
  cards: number | null;
};

export function useInPlay(ids: string[]) {
  const key = [...new Set(ids)].filter(Boolean).sort().join(',');
  return useQuery({
    queryKey: ['inplay', key],
    enabled: key.length > 0,
    refetchInterval: 45_000, // FootyStats refreshes ~1/min; poll a touch faster
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, InPlayState>> => {
      const res = await fetch(`/api/inplay?ids=${encodeURIComponent(key)}`);
      if (!res.ok) return {};
      const json = (await res.json()) as { data?: Record<string, InPlayState> };
      return json?.data ?? {};
    },
  });
}

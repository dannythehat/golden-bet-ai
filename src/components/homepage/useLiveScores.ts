import { useQuery } from '@tanstack/react-query';

// Live scores from API-Football (via /api/live). Enabled only when a pick is
// actually in its match window, and polled slowly, to respect the free-tier cap.
export type LiveScore = { home: string; away: string; gh: number; ga: number; elapsed: number | null; status: string };

export function useLiveScores(enabled: boolean) {
  return useQuery({
    queryKey: ['live-scores'],
    enabled,
    refetchInterval: enabled ? 120_000 : false,
    staleTime: 90_000,
    queryFn: async (): Promise<LiveScore[]> => {
      const res = await fetch('/api/live');
      if (!res.ok) return [];
      const j = (await res.json()) as { data?: LiveScore[] };
      return j?.data ?? [];
    },
  });
}

const norm = (s: string) => s.normalize('NFKD').replace(/[^A-Za-z0-9]/g, '').toLowerCase();

/** Match a fixture (by team names) to a live score. Names differ across feeds
 *  (e.g. "Daegu" vs "Daegu FC"), so we match on containment either way round. */
export function matchLive(home: string, away: string, list: LiveScore[] | undefined): LiveScore | undefined {
  if (!list?.length) return undefined;
  const h = norm(home), a = norm(away);
  const hit = (x: string, y: string) => x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x));
  return list.find((l) => {
    const lh = norm(l.home), la = norm(l.away);
    return (hit(lh, h) && hit(la, a)) || (hit(lh, a) && hit(la, h));
  });
}

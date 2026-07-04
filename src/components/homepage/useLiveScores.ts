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

// Diacritic-stripped, punctuation-free compact form ("ÍA" -> "ia", "Daegu FC" -> "daegufc").
const compact = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
// Word tokens, diacritics stripped ("ÍA Akranes" -> ["ia","akranes"]).
const words = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Do two team names refer to the same club across feeds? Handles "Daegu" vs
 *  "Daegu FC" (containment) AND short/abbreviated names like "ÍA" vs "ÍA
 *  Akranes" — where one side's whole name is a standalone word of the other,
 *  which the old ≥3-char containment guard wrongly rejected. */
const sameTeam = (a: string, b: string): boolean => {
  const ca = compact(a), cb = compact(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  if (ca.length >= 4 && cb.length >= 4 && (ca.includes(cb) || cb.includes(ca))) return true;
  // Short-name case: the full compact of one side appears as a whole word of the other.
  return words(a).includes(cb) || words(b).includes(ca);
};

/** Match a fixture (by team names) to a live score, either way round. */
export function matchLive(home: string, away: string, list: LiveScore[] | undefined): LiveScore | undefined {
  if (!list?.length) return undefined;
  return list.find(
    (l) =>
      (sameTeam(l.home, home) && sameTeam(l.away, away)) ||
      (sameTeam(l.home, away) && sameTeam(l.away, home)),
  );
};

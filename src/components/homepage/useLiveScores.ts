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
// Club-name furniture that carries no identity — dropped before token matching.
// (Feeds disagree wildly: our data says "Tallinna FC Flora U21", API-Football
// says "Flora II" — the only identity in either is "flora".)
const NOISE = new Set(['fc', 'fk', 'cf', 'sc', 'afc', 'ac', 'ss', 'sv', 'bk', 'if', 'sk', 'nk', 'ks', 'club', 'u21', 'u23', 'u19', 'ii', 'iii', 'b']);
// Words shared by unrelated clubs — never a basis for identity on their own.
const GENERIC = new Set(['united', 'city', 'town', 'county', 'athletic', 'atletico', 'sporting', 'racing', 'rovers', 'wanderers', 'dynamo', 'dinamo', 'real', 'inter', 'national', 'olympic', 'olimpik', 'football']);
const sigTokens = (s: string) => words(s).filter((w) => !NOISE.has(w) && !GENERIC.has(w) && w.length >= 4);

// Strict: exact / containment / whole-word abbreviation — safe on its own.
const sameTeamStrict = (a: string, b: string): boolean => {
  const ca = compact(a), cb = compact(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  if (ca.length >= 4 && cb.length >= 4 && (ca.includes(cb) || cb.includes(ca))) return true;
  // Short-name case: the full compact of one side appears as a whole word of the other.
  return words(a).includes(cb) || words(b).includes(ca);
};

// Loose: shared significant token(s) — needed for cross-feed naming like
// "Tallinna FC Flora U21" v "Flora II". Only used when no strict match exists,
// and both teams of the fixture must agree, which kills false pairs.
const sameTeamLoose = (a: string, b: string): boolean => {
  if (sameTeamStrict(a, b)) return true;
  const ta = sigTokens(a), tb = sigTokens(b);
  const shared = ta.filter((t) => tb.includes(t));
  if (!shared.length) return false;
  return shared.length >= 2 || ta.length === 1 || tb.length === 1;
};

/** Match a fixture (by team names) to a live score, either way round.
 *  Strict name rules win first; the loose token pass only runs when nothing
 *  strict matched, so a confident hit always beats a fuzzy one. */
export function matchLive(home: string, away: string, list: LiveScore[] | undefined): LiveScore | undefined {
  if (!list?.length) return undefined;
  for (const same of [sameTeamStrict, sameTeamLoose]) {
    const hits = list.filter(
      (l) =>
        (same(l.home, home) && same(l.away, away)) ||
        (same(l.home, away) && same(l.away, home)),
    );
    if (hits.length) {
      // The live feed sometimes carries duplicate entries for one match at
      // different minutes — trust the most advanced one.
      return hits.reduce((best, l) => ((l.elapsed ?? -1) > (best.elapsed ?? -1) ? l : best));
    }
  }
  return undefined;
};

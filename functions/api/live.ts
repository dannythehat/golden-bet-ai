// Cloudflare Pages Function — live scores from API-Football.
// GET /api/live  ->  { ok, data: [ { home, away, gh, ga, elapsed, status } ] }
//
// API-Football free tier is 100 req/day, so we must cache hard — BUT we must
// never cache an empty/failed upstream response (that used to get pinned at the
// edge for 15 min, so some page loads saw scores and some saw nothing). Instead
// we keep the last GOOD payload in the edge Cache API and:
//   • serve it straight back while it's fresh (< FRESH_MS) — no upstream call;
//   • refresh from upstream when stale, and only overwrite the cache on success;
//   • if upstream is empty/rate-limited/errors, serve the last-good data (even
//     if a little stale) rather than an empty list.
interface Env {
  APIFOOTBALL_KEY: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
type LiveRow = { home: string; away: string; gh: number; ga: number; elapsed: number | null; status: string };

const FRESH_MS = 120_000; // treat cached scores as fresh for 2 min (no upstream call)
const KEEP_S = 3600;      // keep last-good in the edge cache up to 1h for fallback

const jsonHeaders = (cacheControl: string) => ({
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "cache-control": cacheControl,
});

export const onRequest: PagesFunction<Env> = async (context) => {
  const key = context.env.APIFOOTBALL_KEY;
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: "missing_key" }), {
      status: 500,
      headers: jsonHeaders("no-store"),
    });
  }

  const cache = (caches as Any).default;
  // Single global-ish key (per edge location). We do our own freshness check via
  // the embedded timestamp, so store with a long max-age for fallback reuse.
  const cacheKey = new Request("https://footyoracle.internal/api/live-scores-v1");
  const now = Date.now();

  // 1. Last stored GOOD payload (may be stale).
  let stored: { ts: number; data: LiveRow[] } | null = null;
  try {
    const hit = await cache.match(cacheKey);
    if (hit) stored = (await hit.json()) as { ts: number; data: LiveRow[] };
  } catch {
    stored = null;
  }

  // 2. Fresh enough → serve immediately, no upstream call.
  if (stored && now - stored.ts < FRESH_MS) {
    return new Response(JSON.stringify({ ok: true, data: stored.data }), {
      headers: jsonHeaders("public, max-age=60"),
    });
  }

  // 3. Refresh from upstream.
  try {
    const res = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: { "x-apisports-key": key },
    });
    const body = (await res.json()) as { response?: Any[] };
    const data: LiveRow[] = (body.response || []).map((f: Any) => ({
      home: f?.teams?.home?.name ?? "",
      away: f?.teams?.away?.name ?? "",
      gh: f?.goals?.home ?? 0,
      ga: f?.goals?.away ?? 0,
      elapsed: f?.fixture?.status?.elapsed ?? null,
      status: f?.fixture?.status?.short ?? "",
    }));

    if (res.ok && data.length > 0) {
      // Only ever cache a GOOD, non-empty response.
      const payload = JSON.stringify({ ts: now, data });
      context.waitUntil(
        cache.put(cacheKey, new Response(payload, { headers: { "cache-control": `public, max-age=${KEEP_S}` } })),
      );
      return new Response(JSON.stringify({ ok: true, data }), {
        headers: jsonHeaders("public, max-age=60"),
      });
    }

    // Upstream empty / rate-limited / errored → serve last-good, never a pinned empty.
    if (stored) {
      return new Response(JSON.stringify({ ok: true, data: stored.data }), { headers: jsonHeaders("no-store") });
    }
    return new Response(JSON.stringify({ ok: true, data: [] }), { headers: jsonHeaders("no-store") });
  } catch {
    if (stored) {
      return new Response(JSON.stringify({ ok: true, data: stored.data }), { headers: jsonHeaders("no-store") });
    }
    return new Response(JSON.stringify({ ok: false, error: "fetch_failed" }), {
      status: 502,
      headers: jsonHeaders("no-store"),
    });
  }
};

// Cloudflare Pages Function — live scores from API-Football.
// GET /api/live  ->  { ok, data: [ { home, away, gh, ga, elapsed, status } ] }
//
// One upstream call returns every live fixture worldwide. Free tier is 100
// req/day, so we cache the upstream response hard at the edge (cf.cacheTtl)
// and the client only polls while a pick is actually in its match window —
// which keeps real usage far under the cap.
interface Env {
  APIFOOTBALL_KEY: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export const onRequest: PagesFunction<Env> = async (context) => {
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "cache-control": "public, max-age=120",
  };
  const key = context.env.APIFOOTBALL_KEY;
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: "missing_key" }), { status: 500, headers });
  }

  try {
    const res = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
      headers: { "x-apisports-key": key },
      // Cache the (expensive, rate-limited) upstream call at the edge for 15 min.
      cf: { cacheTtl: 900, cacheEverything: true },
    } as RequestInit);
    const body = (await res.json()) as { response?: Any[] };
    const data = (body.response || []).map((f: Any) => ({
      home: f?.teams?.home?.name ?? "",
      away: f?.teams?.away?.name ?? "",
      gh: f?.goals?.home ?? 0,
      ga: f?.goals?.away ?? 0,
      elapsed: f?.fixture?.status?.elapsed ?? null,
      status: f?.fixture?.status?.short ?? "",
    }));
    return new Response(JSON.stringify({ ok: true, data }), { headers });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "fetch_failed" }), { status: 502, headers });
  }
};

// Cloudflare Pages Function — live in-play state for the picks board.
// GET /api/inplay?ids=8464276,8419923  ->  { ok, data: { [id]: InPlay } }
// Runs server-side so the FootyStats key stays secret (Cloudflare env var).
// One upstream call per request (today's-matches carries every live number),
// so cost is flat regardless of how many selections we look up.
interface Env {
  FOOTYSTATS_KEY: string;
}

type Json = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "cache-control": "public, max-age=25",
  };
  const key = context.env.FOOTYSTATS_KEY;
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: "missing_key" }), { status: 500, headers });
  }

  const url = new URL(context.request.url);
  const ids = new Set(
    (url.searchParams.get("ids") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  let matches: Json[] = [];
  try {
    const res = await fetch(`https://api.football-data-api.com/todays-matches?key=${key}`);
    const body = (await res.json()) as { data?: Json[] };
    matches = Array.isArray(body?.data) ? body.data : [];
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "fetch_failed" }), { status: 502, headers });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const out: Record<string, unknown> = {};
  for (const m of matches) {
    const id = String(m.id ?? "");
    if (!id) continue;
    if (ids.size && !ids.has(id)) continue;

    const ko = num(m.date_unix);
    const status = String(m.status ?? "");
    const complete = status === "complete";
    const started = ko > 0 && nowSec >= ko;
    // FootyStats has no clean "live" flag; infer from kick-off + a ~150-min window.
    const live = started && !complete && nowSec < ko + 150 * 60;

    const homeGoals = num(m.homeGoalCount);
    const awayGoals = num(m.awayGoalCount);
    const cornersRaw = num(m.totalCornerCount);
    const cardsA = num(m.team_a_cards_num);
    const cardsB = num(m.team_b_cards_num);

    out[id] = {
      live,
      ended: complete,
      goals: homeGoals + awayGoals,
      homeGoals,
      awayGoals,
      // FootyStats reports -1 when a market isn't recorded (yet) — pass null so
      // the UI never shows a made-up count.
      corners: cornersRaw >= 0 ? cornersRaw : null,
      cards: cardsA >= 0 && cardsB >= 0 ? cardsA + cardsB : null,
    };
  }

  return new Response(JSON.stringify({ ok: true, data: out }), { headers });
};

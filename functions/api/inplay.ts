// Cloudflare Pages Function — match state for the picks board.
// GET /api/inplay?ids=8471638,8419923  ->  { ok, data: { [id]: MatchState } }
//
// FootyStats does NOT stream live in-play scores on this plan, but it DOES
// carry the final result once a match completes. So this returns:
//   live   — kicked off, not yet complete (client shows a time-based badge)
//   ended  — FootyStats marked it complete → goals/corners/cards are FINAL
// We fetch per match_id (the bulk /todays-matches feed omits some leagues,
// e.g. K-League 2), capped, and cache briefly so one poll serves everyone.
interface Env {
  FOOTYSTATS_KEY: string;
}

type Json = Record<string, unknown>;

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : 0;
};

// FootyStats returns /match `data` as an object; /todays-matches as an array.
function pickMatch(body: unknown): Json | null {
  const data = (body as { data?: unknown })?.data;
  if (Array.isArray(data)) return (data[0] as Json) ?? null;
  if (data && typeof data === "object") return data as Json;
  return null;
}

function shape(m: Json, nowSec: number) {
  const ko = num(m.date_unix);
  const status = String(m.status ?? "");
  const complete = status === "complete";
  const voided = ["suspended", "canceled", "cancelled", "abandoned", "postponed"].includes(status);
  const started = ko > 0 && nowSec >= ko;
  const live = started && !complete && nowSec < ko + 160 * 60;
  const homeGoals = num(m.homeGoalCount);
  const awayGoals = num(m.awayGoalCount);
  const cornersRaw = num(m.totalCornerCount);
  const cardsA = num(m.team_a_cards_num);
  const cardsB = num(m.team_b_cards_num);
  // Does FootyStats actually have a live feed for this game? Some leagues only
  // get their numbers at full time — until then the API returns a placeholder
  // 0-0 with no minute and -1 corners, which must never be shown as a score.
  const minuteRaw = m.game_minute ?? m.minute;
  const feed = complete || minuteRaw != null || cornersRaw >= 0 || homeGoals + awayGoals > 0;
  return {
    live: live && !voided,
    ended: complete,
    voided,
    feed,
    goals: homeGoals + awayGoals,
    homeGoals,
    awayGoals,
    corners: cornersRaw >= 0 ? cornersRaw : null,
    cards: cardsA >= 0 && cardsB >= 0 ? cardsA + cardsB : null,
  };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const headers = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "cache-control": "public, max-age=45",
  };
  const key = context.env.FOOTYSTATS_KEY;
  if (!key) {
    return new Response(JSON.stringify({ ok: false, error: "missing_key" }), { status: 500, headers });
  }

  const url = new URL(context.request.url);
  const ids = (url.searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const nowSec = Math.floor(Date.now() / 1000);
  const out: Record<string, unknown> = {};

  try {
    if (ids.length === 0) {
      // No ids → bulk feed (debug / everything today).
      const res = await fetch(`https://api.football-data-api.com/todays-matches?key=${key}`);
      const body = (await res.json()) as { data?: Json[] };
      for (const m of Array.isArray(body?.data) ? body.data : []) {
        const id = String(m.id ?? "");
        if (id) out[id] = shape(m, nowSec);
      }
    } else {
      // Per match_id so every pick is covered, capped to protect the rate limit.
      const list = ids.slice(0, 20);
      const fetched = await Promise.all(
        list.map((id) =>
          fetch(`https://api.football-data-api.com/match?key=${key}&match_id=${id}`)
            .then((r) => r.json())
            .then(pickMatch)
            .catch(() => null),
        ),
      );
      fetched.forEach((m, i) => {
        if (m) out[list[i]] = shape(m, nowSec);
      });
    }
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "fetch_failed" }), { status: 502, headers });
  }

  return new Response(JSON.stringify({ ok: true, data: out }), { headers });
};

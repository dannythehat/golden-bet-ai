interface Env {
  WAITLIST: KVNamespace;
}

// Lightweight first-party page-view beacon. Stores only daily counters and a
// 26h-TTL salted hash for unique-visitor dedupe — no IPs, no personal data.
const DAY = 60 * 60 * 24;

async function sha16(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// Crawlers that execute JS (Googlebot & friends) fire the beacon like real
// browsers — keep them out of the numbers.
const BOT_RE = /bot|crawl|spider|slurp|preview|fetch|headless|lighthouse|monitor|scrape|python|curl|wget/i;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const ua = request.headers.get('user-agent') ?? '';
    if (!ua || BOT_RE.test(ua)) return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });

    const today = new Date().toISOString().slice(0, 10);
    const ip = request.headers.get('cf-connecting-ip') ?? '';
    const country = (request.headers.get('cf-ipcountry') ?? '').toUpperCase() || 'XX';

    const hits = Number((await env.WAITLIST.get(`hits:${today}`)) ?? '0') + 1;
    await env.WAITLIST.put(`hits:${today}`, String(hits), { expirationTtl: DAY * 40 });

    // Unique visitor: one count per ip+ua per day (hash expires after 26h).
    const uvKey = `uv:${today}:${await sha16(ip + ua + today)}`;
    if (!(await env.WAITLIST.get(uvKey))) {
      await env.WAITLIST.put(uvKey, '1', { expirationTtl: 60 * 60 * 26 });
      const uniq = Number((await env.WAITLIST.get(`uniq:${today}`)) ?? '0') + 1;
      await env.WAITLIST.put(`uniq:${today}`, String(uniq), { expirationTtl: DAY * 40 });
      // Per-country unique counts (aggregate only — no personal data).
      const geoKey = `geo:${today}`;
      let geo: Record<string, number> = {};
      try { geo = JSON.parse((await env.WAITLIST.get(geoKey)) ?? '{}'); } catch { /* fresh */ }
      geo[country] = (geo[country] ?? 0) + 1;
      await env.WAITLIST.put(geoKey, JSON.stringify(geo), { expirationTtl: DAY * 40 });
    }
  } catch {
    // Counting must never break the site — swallow everything.
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};

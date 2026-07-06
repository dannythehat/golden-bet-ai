// Cloudflare Pages Function — private traffic stats.
//
//   GET /api/stats?key=…   -> { days: [{date, views, uniques}], waitlist }
//
// Reads the daily counters written by /api/hit plus the waitlist count.
interface Env {
  WAITLIST: KVNamespace;
  ADMIN_KEY?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') ?? request.headers.get('x-admin-key') ?? '';
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return json({ ok: false, error: 'unauthorized' }, 401);

  const days: { date: string; views: number; uniques: number; countries: Record<string, number> }[] = [];
  const now = Date.now();
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    const [views, uniques, geoRaw] = await Promise.all([
      env.WAITLIST.get(`hits:${date}`),
      env.WAITLIST.get(`uniq:${date}`),
      env.WAITLIST.get(`geo:${date}`),
    ]);
    let countries: Record<string, number> = {};
    try { countries = JSON.parse(geoRaw ?? '{}'); } catch { /* none */ }
    days.push({ date, views: Number(views ?? 0), uniques: Number(uniques ?? 0), countries });
  }

  const signups = await env.WAITLIST.list({ prefix: 'signup:', limit: 1000 });
  return json({ ok: true, days, waitlist: signups.keys.length });
};

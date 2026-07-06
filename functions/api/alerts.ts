// Cloudflare Pages Function — Value Board email alert preferences.
//
//   POST /api/alerts              { email, enabled, gafferCardOnly, ... }  -> save prefs
//   GET  /api/alerts?email=…                                              -> read own prefs
//   GET  /api/alerts?key=…                                                -> admin: list all
//
// Storage: WAITLIST KV namespace, key `alert:<email>` whose VALUE is the
// prefs JSON and whose metadata carries { email, ts, country } for cheap
// admin listing. New signups ping Telegram (best-effort, never blocking).
interface Env {
  WAITLIST: KVNamespace;
  ADMIN_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const err = (code: string, message: string, status = 400) => json({ ok: false, error: { code, message } }, status);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MARKET_RE = /^(over|under)_\d+_\d+_(goals|corners|cards)$|^btts_(yes|no)$/;

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: Record<string, unknown> = {};
  try { body = await ctx.request.json(); } catch { /* ignore */ }
  if (typeof body.hp === 'string' && body.hp.trim()) return json({ ok: true }); // honeypot

  const email = String(body.email ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) return err('invalid_email', 'That email doesn’t look right.');

  const marketKeys = Array.isArray(body.marketKeys)
    ? body.marketKeys.filter((k): k is string => typeof k === 'string' && MARKET_RE.test(k)).slice(0, 22)
    : [];
  const t = (body.timing ?? {}) as Record<string, unknown>;
  const prefs = {
    email,
    enabled: body.enabled !== false,
    gafferCardOnly: body.gafferCardOnly === true,
    allValueAlerts: body.allValueAlerts === true,
    quietDayCallback: body.quietDayCallback === true,
    marketKeys,
    timing: {
      morningScan: t.morningScan !== false,
      preKickoff: t.preKickoff === true,
      newValueAppears: t.newValueAppears === true,
    },
    updatedAt: new Date().toISOString(),
  };

  const key = `alert:${email}`;
  const isNew = (await ctx.env.WAITLIST.get(key)) == null;
  const country = (ctx.request.headers.get('cf-ipcountry') || '').toUpperCase() || undefined;
  await ctx.env.WAITLIST.put(key, JSON.stringify(prefs), { metadata: { email, ts: prefs.updatedAt, country } });

  if (isNew) ctx.waitUntil(notify(ctx.env, email, prefs, country));
  return json({ ok: true, data: prefs });
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const adminKey = url.searchParams.get('key') ?? ctx.request.headers.get('x-admin-key') ?? '';
  if (adminKey) {
    if (!ctx.env.ADMIN_KEY || adminKey !== ctx.env.ADMIN_KEY) return err('unauthorized', 'Bad admin key.', 401);
    const list = await ctx.env.WAITLIST.list({ prefix: 'alert:', limit: 1000 });
    return json({ ok: true, data: { count: list.keys.length, subscribers: list.keys.map((k) => k.metadata ?? { email: k.name.slice(6) }) } });
  }
  const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return err('invalid_email', 'Pass a valid email.');
  const raw = await ctx.env.WAITLIST.get(`alert:${email}`);
  if (!raw) return json({ ok: true, data: null });
  try { return json({ ok: true, data: JSON.parse(raw) }); } catch { return json({ ok: true, data: null }); }
};

async function notify(env: Env, email: string, prefs: { gafferCardOnly: boolean; allValueAlerts: boolean; quietDayCallback: boolean; marketKeys: string[] }, country?: string) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const scope = prefs.allValueAlerts ? 'ALL value alerts'
    : prefs.gafferCardOnly ? 'Gaffer card only'
    : prefs.marketKeys.length ? `${prefs.marketKeys.length} market(s): ${prefs.marketKeys.slice(0, 4).join(', ')}${prefs.marketKeys.length > 4 ? '…' : ''}`
    : 'default (morning scan)';
  const text = `🔔 Value Board alert signup\n${email}${country ? ` · ${country}` : ''}\nScope: ${scope}${prefs.quietDayCallback ? '\n+ quiet-day callback' : ''}`;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
    });
  } catch { /* best-effort only */ }
}

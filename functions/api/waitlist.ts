// Cloudflare Pages Function — Fantasy League waitlist.
//
//   POST /api/waitlist        { email, name?, hp? }  -> capture a signup
//   GET  /api/waitlist?key=…                          -> admin: count + list
//   GET  /api/waitlist?key=…&format=csv               -> admin: CSV export
//
// Storage: the WAITLIST KV namespace. Each signup is a key `signup:<email>`
// whose metadata carries { email, ts, country, source, name }, so the admin
// view lists everyone from a single KV list (no per-row reads). Visitors never
// see the total. On each NEW signup we ping Telegram (if configured).
interface Env {
  WAITLIST: KVNamespace;
  ADMIN_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

type Meta = { email: string; ts: string; country?: string; source?: string; name?: string };

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (s: unknown, max = 120) => (typeof s === "string" ? s.trim().slice(0, max) : "");

// ── POST: capture a signup ──────────────────────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: Record<string, unknown> = {};
  try { body = await ctx.request.json(); } catch { /* ignore */ }

  // Honeypot — bots fill hidden fields; humans don't.
  if (clean(body.hp)) return json({ ok: true });

  const email = clean(body.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) return json({ ok: false, error: "invalid_email" }, 400);
  const name = clean(body.name, 80);

  const key = `signup:${email}`;
  const existing = await ctx.env.WAITLIST.get(key);
  const country = (ctx.request.headers.get("cf-ipcountry") || "").toUpperCase() || undefined;
  const source = clean(body.source, 40) || undefined;
  const meta: Meta = { email, ts: new Date().toISOString(), country, source, name: name || undefined };

  // Keep the first-seen timestamp on a repeat submit; always store latest name.
  if (existing) {
    const prev = (await listFind(ctx.env, email)) ?? meta;
    await ctx.env.WAITLIST.put(key, "1", { metadata: { ...prev, name: name || prev.name } });
    return json({ ok: true, already: true });
  }

  await ctx.env.WAITLIST.put(key, "1", { metadata: meta });

  // Fire-and-forget Telegram ping on genuinely new signups.
  ctx.waitUntil(notify(ctx.env, meta));
  return json({ ok: true });
};

// ── GET: admin dashboard data (key-gated) ───────────────────────────────────
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const key = url.searchParams.get("key") || ctx.request.headers.get("x-admin-key") || "";
  if (!ctx.env.ADMIN_KEY || key !== ctx.env.ADMIN_KEY) return json({ ok: false, error: "unauthorized" }, 401);

  const rows: Meta[] = [];
  let cursor: string | undefined;
  do {
    const page = await ctx.env.WAITLIST.list<Meta>({ prefix: "signup:", cursor, limit: 1000 });
    for (const k of page.keys) if (k.metadata) rows.push(k.metadata as Meta);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  rows.sort((a, b) => (a.ts < b.ts ? 1 : -1)); // newest first

  if (url.searchParams.get("format") === "csv") {
    const esc = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    const csv = ["email,signed_up,country,source,name",
      ...rows.map((r) => [r.email, r.ts, r.country || "", r.source || "", r.name || ""].map(esc).join(","))].join("\n");
    return new Response(csv, {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="waitlist.csv"', "cache-control": "no-store" },
    });
  }

  return json({ ok: true, count: rows.length, signups: rows });
};

// Look up an existing row's metadata (for preserving first-seen ts on re-submit).
async function listFind(env: Env, email: string): Promise<Meta | null> {
  let cursor: string | undefined;
  do {
    const page = await env.WAITLIST.list<Meta>({ prefix: `signup:${email}`, cursor, limit: 10 });
    for (const k of page.keys) if (k.name === `signup:${email}` && k.metadata) return k.metadata as Meta;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return null;
}

// Telegram push — no-op unless both secrets are configured.
async function notify(env: Env, m: Meta): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const text = `⚽️ New Fantasy waitlist signup!\n\n📧 ${m.email}${m.name ? `\n👤 ${m.name}` : ""}${m.country ? `\n🌍 ${m.country}` : ""}${m.source ? `\n🔗 ${m.source}` : ""}`;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
    });
  } catch { /* best-effort */ }
}

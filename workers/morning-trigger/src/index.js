/**
 * footy-morning-trigger — kicks the GitHub "Daily Board + P&L" workflow on a
 * punctual Cloudflare cron. If the kick itself fails, it raises the alarm on
 * Telegram directly (the workflow can't scream if it never starts).
 *
 * Secrets: GITHUB_TOKEN (fine-grained PAT, Actions read/write on the repo),
 * ADMIN_KEY (manual-trigger gate), TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID.
 */
const DISPATCH_URL =
  'https://api.github.com/repos/dannythehat/golden-bet-ai/actions/workflows/daily-update.yml/dispatches';

// Secrets piped in from files can carry a trailing newline — always compare
// and transmit them trimmed.
const clean = (v) => (v ?? '').trim();

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(kick(env));
  },
  // Manual trigger for testing: GET /?key=<ADMIN_KEY>
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!clean(env.ADMIN_KEY) || url.searchParams.get('key') !== clean(env.ADMIN_KEY)) return new Response('not found', { status: 404 });
    const result = await kick(env);
    return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
  },
};

async function kick(env) {
  try {
    const res = await fetch(DISPATCH_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${clean(env.GITHUB_TOKEN)}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'footy-morning-trigger',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
    if (res.status === 204) return { ok: true, kicked: true };
    const detail = (await res.text()).slice(0, 140);
    await alarm(env, `🚨 Morning trigger: GitHub refused the dispatch (${res.status}). ${detail}`);
    return { ok: false, status: res.status };
  } catch (e) {
    await alarm(env, `🚨 Morning trigger crashed before reaching GitHub: ${e.message}`);
    return { ok: false, error: String(e) };
  }
}

async function alarm(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${clean(env.TELEGRAM_BOT_TOKEN)}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: clean(env.TELEGRAM_CHAT_ID), text }),
    });
  } catch {
    /* the alarm about the alarm failing goes nowhere — nothing else to do */
  }
}

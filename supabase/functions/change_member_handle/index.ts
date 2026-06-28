// ============================================================================
// Footy Oracle Club — change_member_handle
// Self-serve handle change for the authenticated member.
// Validates format/reservation/uniqueness, updates the handle, and records a
// MEMBER_HANDLE_CHANGED event via the canonical emit_memory_event path.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { validateHandle } from "../_shared/identity.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function emit(url: string, serviceKey: string, payload: Record<string, unknown>) {
  await fetch(`${url}/functions/v1/emit_memory_event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
    body: JSON.stringify(payload),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ ok: false, error: 'unauthorised' }, 401);
  const { data: u } = await admin.auth.getUser(token);
  if (!u?.user) return json({ ok: false, error: 'unauthorised' }, 401);

  const { data: member } = await admin.from('members')
    .select('id,handle,status').eq('user_id', u.user.id).maybeSingle();
  if (!member) return json({ ok: false, error: 'not_a_member' }, 403);
  if (member.status === 'deleted') return json({ ok: false, error: 'member_inactive' }, 403);

  let body: { handle?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }

  const v = validateHandle(body?.handle ?? '');
  if (!v.ok) return json({ ok: false, error: v.error }, 400);
  const next = v.handle!;
  if (next === member.handle) return json({ ok: true, handle: next, unchanged: true });

  // Reserved + uniqueness (validateHandle already blocks reserved; double-check DB).
  const { data: taken } = await admin.from('members')
    .select('id').eq('handle', next).neq('id', member.id).maybeSingle();
  if (taken) return json({ ok: false, error: 'handle_taken' }, 409);
  const { data: reserved } = await admin.from('reserved_handles')
    .select('handle').eq('handle', next).maybeSingle();
  if (reserved) return json({ ok: false, error: 'handle_reserved' }, 400);

  const previous = member.handle;
  const { error: upErr } = await admin.from('members')
    .update({ handle: next }).eq('id', member.id);
  if (upErr) {
    if (upErr.code === '23505') return json({ ok: false, error: 'handle_taken' }, 409);
    return json({ ok: false, error: 'update_failed', detail: upErr.message }, 500);
  }

  await emit(url, serviceKey, {
    event_type: 'MEMBER_HANDLE_CHANGED',
    subject: { member_id: member.id },
    actor: { member_id: member.id },
    payload: { from: previous, to: next },
    origin: 'automatic',
    source_system: 'identity',
    source_function: 'change_member_handle',
  });

  return json({ ok: true, handle: next, previous });
});

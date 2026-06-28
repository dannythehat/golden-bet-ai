// ============================================================================
// Footy Oracle Club — admin-member
// Admin-only member management primitives. Every mutating action records a
// memory event via the canonical emit_memory_event path.
// Auth: service-role bearer, or an authenticated club admin (app_role='admin').
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

interface AdminInput {
  action: 'list' | 'search' | 'set_role' | 'set_status' | 'redact' | 'force_handle';
  query?: string;
  member_id?: string;
  app_role?: 'member' | 'admin';
  status?: 'active' | 'paused';
  handle?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // ── Authorise: service key, or an admin member ───────────────────────────
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  let actorMemberId: string | null = null;
  let authorised = false;
  if (token && token === serviceKey) {
    authorised = true; // system actor
  } else if (token) {
    const { data: u } = await admin.auth.getUser(token);
    if (u?.user) {
      const { data: m } = await admin.from('members').select('id,app_role').eq('user_id', u.user.id).maybeSingle();
      if (m?.app_role === 'admin') { authorised = true; actorMemberId = m.id; }
    }
  }
  if (!authorised) return json({ ok: false, error: 'forbidden' }, 403);

  let input: AdminInput;
  try { input = await req.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }

  const emit = (payload: Record<string, unknown>) =>
    fetch(`${url}/functions/v1/emit_memory_event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceKey}` },
      body: JSON.stringify({ actor: actorMemberId ? { member_id: actorMemberId } : undefined, ...payload }),
    });

  switch (input.action) {
    case 'list':
    case 'search': {
      let q = admin.from('members')
        .select('id,handle,display_name,kind,app_role,status,is_founding_member,joined_at')
        .order('joined_at', { ascending: false }).limit(200);
      if (input.action === 'search' && input.query) {
        q = q.or(`handle.ilike.%${input.query}%,display_name.ilike.%${input.query}%`);
      }
      const { data, error } = await q;
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, members: data });
    }

    case 'set_role': {
      if (!input.member_id || !input.app_role) return json({ ok: false, error: 'member_id_and_role_required' }, 400);
      const { error } = await admin.from('members').update({ app_role: input.app_role }).eq('id', input.member_id);
      if (error) return json({ ok: false, error: error.message }, 500);
      await emit({ event_type: 'MODERATION_ACTION', subject: { member_id: input.member_id },
        payload: { action: 'set_role', app_role: input.app_role }, origin: 'admin_triggered', source_function: 'admin-member' });
      return json({ ok: true });
    }

    case 'set_status': {
      if (!input.member_id || !input.status) return json({ ok: false, error: 'member_id_and_status_required' }, 400);
      const { error } = await admin.from('members').update({ status: input.status }).eq('id', input.member_id);
      if (error) return json({ ok: false, error: error.message }, 500);
      await emit({ event_type: 'MODERATION_ACTION', subject: { member_id: input.member_id },
        payload: { action: 'set_status', status: input.status }, origin: 'admin_triggered', source_function: 'admin-member' });
      return json({ ok: true });
    }

    case 'redact': {
      if (!input.member_id) return json({ ok: false, error: 'member_id_required' }, 400);
      // Anonymise identity; keep the event log intact (anonymise-not-delete).
      await admin.from('members').update({ display_name: 'Former Member', status: 'deleted', avatar_url: null }).eq('id', input.member_id);
      await admin.from('member_profiles').update({ bio: null, favourite_team: null, location: null, social_handles: {} }).eq('member_id', input.member_id);
      await admin.from('member_settings').update({ allow_public_mentions: false, allow_gaffer_roasts: false }).eq('member_id', input.member_id);
      await emit({ event_type: 'MEMBER_REDACTED', subject: { member_id: input.member_id },
        payload: { action: 'redact' }, origin: 'admin_triggered', source_function: 'admin-member' });
      return json({ ok: true });
    }

    case 'force_handle': {
      if (!input.member_id || !input.handle) return json({ ok: false, error: 'member_id_and_handle_required' }, 400);
      const v = validateHandle(input.handle);
      if (!v.ok) return json({ ok: false, error: v.error }, 400);
      const { data: prev } = await admin.from('members').select('handle').eq('id', input.member_id).maybeSingle();
      const { error } = await admin.from('members').update({ handle: v.handle }).eq('id', input.member_id);
      if (error) {
        if (error.code === '23505') return json({ ok: false, error: 'handle_taken' }, 409);
        return json({ ok: false, error: error.message }, 500);
      }
      await emit({ event_type: 'MEMBER_HANDLE_CHANGED', subject: { member_id: input.member_id },
        payload: { from: prev?.handle ?? null, to: v.handle, forced: true }, origin: 'admin_triggered', source_function: 'admin-member' });
      return json({ ok: true, handle: v.handle });
    }

    default:
      return json({ ok: false, error: 'unknown_action' }, 400);
  }
});

// ============================================================================
// Footy Oracle Club — emit_memory_event
// The ONLY write path into the immutable memory log.
// Auth: service-role bearer (backend systems) OR an authenticated club admin.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  applySensitivityFloor, contentHash, type EventTypeRow, type Tone, type Visibility, type Origin,
} from "../_shared/memory.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmitInput {
  event_type: string;
  subject?: { member_id?: string; handle?: string };
  actor?: { member_id?: string; handle?: string };
  season_id?: string;
  gameweek_id?: string;
  payload?: Record<string, unknown>;
  visibility?: Visibility;
  salience?: number;
  tone_hint?: Tone;
  occurred_at?: string;
  reveal_at?: string;
  origin?: Origin;
  source_system?: string;
  source_function?: string;
  source_ref?: Record<string, unknown>;
  dedupe_key?: string;
  corrects_event_id?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // ── Authorise caller: service-role key, or an admin member's JWT ──────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  let authorised = false;
  if (token && token === serviceKey) {
    authorised = true;
  } else if (token) {
    const { data: u } = await admin.auth.getUser(token);
    if (u?.user) {
      const { data: m } = await admin.from('members')
        .select('app_role').eq('user_id', u.user.id).maybeSingle();
      authorised = m?.app_role === 'admin';
    }
  }
  if (!authorised) return json({ ok: false, error: 'unauthorised' }, 401);

  let input: EmitInput;
  try { input = await req.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }
  if (!input?.event_type) return json({ ok: false, error: 'event_type_required' }, 400);

  // ── Load event type + defaults ────────────────────────────────────────────
  const { data: typeRow, error: typeErr } = await admin.from('event_types')
    .select('key,category,default_visibility,default_salience,default_tone,is_sensitive,payload_schema')
    .eq('key', input.event_type).maybeSingle();
  if (typeErr) return json({ ok: false, error: 'type_lookup_failed', detail: typeErr.message }, 500);
  if (!typeRow) return json({ ok: false, error: 'unknown_event_type' }, 400);
  const type = typeRow as EventTypeRow;

  // ── Resolve subject / actor (id or handle) ───────────────────────────────
  const resolveMember = async (ref?: { member_id?: string; handle?: string }) => {
    if (!ref) return null;
    if (ref.member_id) return ref.member_id;
    if (ref.handle) {
      const { data } = await admin.from('members').select('id').eq('handle', ref.handle).maybeSingle();
      return data?.id ?? null;
    }
    return null;
  };
  const subject_member_id = await resolveMember(input.subject);
  const actor_member_id = await resolveMember(input.actor);
  if (input.subject && !subject_member_id) return json({ ok: false, error: 'subject_not_found' }, 400);

  // ── Apply defaults + sensitivity floor (Refinement B) ────────────────────
  let visibility: Visibility = input.visibility ?? type.default_visibility;
  let tone: Tone = input.tone_hint ?? type.default_tone;
  ({ visibility, tone } = applySensitivityFloor(type, visibility, tone));
  const salience = Math.max(0, Math.min(100, input.salience ?? type.default_salience));
  const occurred_at = input.occurred_at ?? new Date().toISOString();
  const payload = input.payload ?? {};

  // ── content_hash over the fact-defining fields ───────────────────────────
  const content_hash = await contentHash({
    event_type: input.event_type, subject_member_id, gameweek_id: input.gameweek_id ?? null,
    occurred_at, payload,
  });

  // ── Idempotency: return existing row on dedupe_key collision ──────────────
  if (input.dedupe_key) {
    const { data: existing } = await admin.from('member_events')
      .select('*').eq('dedupe_key', input.dedupe_key).maybeSingle();
    if (existing) return json({ ok: true, event: existing, deduped: true });
  }

  const { data: inserted, error: insErr } = await admin.from('member_events').insert({
    season_id: input.season_id ?? null,
    gameweek_id: input.gameweek_id ?? null,
    subject_member_id,
    actor_member_id,
    event_type: input.event_type,
    payload,
    visibility,
    salience,
    tone_hint: tone,
    occurred_at,
    reveal_at: input.reveal_at ?? null,
    origin: input.origin ?? 'automatic',
    source_system: input.source_system ?? null,
    source_function: input.source_function ?? null,
    source_ref: input.source_ref ?? null,
    dedupe_key: input.dedupe_key ?? null,
    content_hash,
    corrects_event_id: input.corrects_event_id ?? null,
  }).select('*').single();

  if (insErr) {
    // Unique race on dedupe_key → fetch and return existing (still idempotent).
    if (input.dedupe_key && insErr.code === '23505') {
      const { data: existing } = await admin.from('member_events')
        .select('*').eq('dedupe_key', input.dedupe_key).maybeSingle();
      if (existing) return json({ ok: true, event: existing, deduped: true });
    }
    return json({ ok: false, error: 'insert_failed', detail: insErr.message }, 500);
  }

  return json({ ok: true, event: inserted, deduped: false });
});

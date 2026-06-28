// ============================================================================
// Footy Oracle Club — memory_query
// Returns a vetted GafferMemoryBundle. The Gaffer NEVER receives raw memory.
// Applies: visibility scope, narration eligibility, reveal embargo, consent
// capping, and salience/tone overrides. Read-only.
// ============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  capToneForMember, effectiveSalience, effectiveTone, visibilityWithinScope,
  type GafferMemoryBundle, type MemorySettings, type NarratableEvent,
  type Tone, type Visibility,
} from "../_shared/memory.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface QueryInput {
  selector: 'weekly_headlines' | 'member_story' | 'gaffer_article' | 'homepage' | 'facebook_reply';
  visibility_scope: Visibility;
  season_id?: string;
  gameweek_id?: string;
  member_id?: string;
  limits?: { headlines?: number; spotlights?: number };
}

const DEFAULT_SETTINGS: MemorySettings = {
  allow_public_mentions: true, allow_gaffer_roasts: true, preferred_roast_level: 'light',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let input: QueryInput;
  try { input = await req.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }
  const requested: Visibility = input?.visibility_scope ?? 'public';

  // ── Determine the caller's maximum allowed scope ──────────────────────────
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  let maxScope: Visibility = 'public';
  if (token && token === serviceKey) {
    maxScope = 'admin';
  } else if (token) {
    const { data: u } = await admin.auth.getUser(token);
    if (u?.user) {
      const { data: m } = await admin.from('members').select('app_role').eq('user_id', u.user.id).maybeSingle();
      maxScope = m?.app_role === 'admin' ? 'admin' : m ? 'members' : 'public';
    }
  }
  // Clamp requested scope to what the caller may see.
  const rank: Record<Visibility, number> = { public: 0, members: 1, private: 2, admin: 3 };
  const scope: Visibility = rank[requested] <= rank[maxScope] ? requested : maxScope;

  const headlineLimit = Math.min(input.limits?.headlines ?? 12, 50);
  const spotlightLimit = Math.min(input.limits?.spotlights ?? 6, 20);

  // ── Resolve season (explicit or current) + gameweek ──────────────────────
  let seasonRow: Record<string, unknown> | null = null;
  if (input.season_id) {
    ({ data: seasonRow } = await admin.from('seasons').select('*').eq('id', input.season_id).maybeSingle());
  } else {
    ({ data: seasonRow } = await admin.from('seasons').select('*').eq('is_current', true).maybeSingle());
  }
  const seasonId = (seasonRow?.id as string) ?? null;

  let gameweekRow: Record<string, unknown> | null = null;
  if (input.gameweek_id) {
    ({ data: gameweekRow } = await admin.from('gameweeks').select('*').eq('id', input.gameweek_id).maybeSingle());
  }

  // ── Consent + identity lookups (settings keyed by member) ────────────────
  const { data: memberRows } = await admin.from('members')
    .select('id,handle,display_name,kind,status');
  const memberById = new Map<string, Record<string, unknown>>();
  for (const m of memberRows ?? []) memberById.set(m.id as string, m);

  const { data: settingsRows } = await admin.from('member_settings')
    .select('member_id,allow_public_mentions,allow_gaffer_roasts,preferred_roast_level');
  const settingsByMember = new Map<string, MemorySettings>();
  for (const s of settingsRows ?? []) {
    settingsByMember.set(s.member_id as string, {
      allow_public_mentions: s.allow_public_mentions as boolean,
      allow_gaffer_roasts: s.allow_gaffer_roasts as boolean,
      preferred_roast_level: s.preferred_roast_level as MemorySettings['preferred_roast_level'],
    });
  }

  const doNotMentionIds = new Set<string>();
  const doNotMentionReasons: string[] = [];
  for (const [id, m] of memberById) {
    if ((m.status as string) === 'deleted') {
      doNotMentionIds.add(id); doNotMentionReasons.push(`${id}:redacted`);
    } else if (settingsByMember.get(id)?.allow_public_mentions === false) {
      doNotMentionIds.add(id); doNotMentionReasons.push(`${id}:opted_out`);
    }
  }

  // ── Pull candidate events, then apply narration governance in code ───────
  let q = admin.from('member_events')
    .select(`id,event_type,occurred_at,reveal_at,visibility,salience,tone_hint,
             subject_member_id,payload,
             event_narration_control(eligible_for_narration,salience_override,tone_override)`)
    .order('salience', { ascending: false })
    .limit(400);
  if (seasonId) q = q.eq('season_id', seasonId);
  if (input.gameweek_id) q = q.eq('gameweek_id', input.gameweek_id);
  if (input.selector === 'member_story' && input.member_id) q = q.eq('subject_member_id', input.member_id);

  const { data: rawEvents, error: evErr } = await q;
  if (evErr) return json({ ok: false, error: 'event_query_failed', detail: evErr.message }, 500);

  const now = Date.now();
  const referenced = new Set<string>();

  const toNarratable = (e: Record<string, unknown>): NarratableEvent | null => {
    // Visibility scope
    if (!visibilityWithinScope(e.visibility as Visibility, scope)) return null;
    // Embargo
    if (e.reveal_at && new Date(e.reveal_at as string).getTime() > now) return null;
    // Narration governance (control row may be null)
    const ctlRaw = e.event_narration_control as unknown;
    const ctl = Array.isArray(ctlRaw) ? ctlRaw[0] : ctlRaw;
    if (ctl && ctl.eligible_for_narration === false) return null;

    const subjectId = (e.subject_member_id as string) ?? null;
    let tone = effectiveTone(e.tone_hint as Tone, ctl?.tone_override as Tone | undefined);

    // Consent capping for subject member (admin scope bypasses for audit views)
    if (subjectId && scope !== 'admin') {
      if (doNotMentionIds.has(subjectId)) return null;
      const settings = settingsByMember.get(subjectId) ?? DEFAULT_SETTINGS;
      const capped = capToneForMember(tone, settings);
      if (capped === null) return null;
      tone = capped;
    }

    const subject = subjectId ? memberById.get(subjectId) : null;
    return {
      id: e.id as string,
      event_type: e.event_type as string,
      occurred_at: e.occurred_at as string,
      subject_member_id: subjectId,
      subject_handle: (subject?.handle as string) ?? null,
      tone,
      salience: effectiveSalience(e.salience as number, ctl?.salience_override as number | undefined),
      facts: (e.payload as Record<string, unknown>) ?? {},
    };
  };

  const narratable = (rawEvents ?? [])
    .map(toNarratable).filter((x): x is NarratableEvent => x !== null)
    .sort((a, b) => b.salience - a.salience);
  narratable.forEach((e) => referenced.add(e.id));

  const headline_events = narratable.slice(0, headlineLimit);

  // ── Member spotlights (group highest-salience events per subject) ─────────
  const bySubject = new Map<string, NarratableEvent[]>();
  for (const e of narratable) {
    if (!e.subject_member_id) continue;
    const arr = bySubject.get(e.subject_member_id) ?? [];
    arr.push(e); bySubject.set(e.subject_member_id, arr);
  }
  const { data: statsRows } = seasonId
    ? await admin.from('member_season_stats').select('*').eq('season_id', seasonId)
    : { data: [] as Record<string, unknown>[] };
  const statsByMember = new Map<string, unknown>();
  for (const s of statsRows ?? []) statsByMember.set(s.member_id as string, s);

  const gafferMember = (memberRows ?? []).find((m) => m.kind === 'gaffer');
  const member_spotlights = [...bySubject.entries()]
    .filter(([id]) => id !== gafferMember?.id)
    .slice(0, spotlightLimit)
    .map(([id, events]) => ({
      member: memberById.get(id) ?? { id },
      events: events.slice(0, 5),
      season_stats: statsByMember.get(id) ?? null,
    }));

  const gaffer_own_team = gafferMember
    ? {
        events: (bySubject.get(gafferMember.id as string) ?? []).slice(0, 5),
        season_stats: statsByMember.get(gafferMember.id as string) ?? null,
      }
    : null;

  // ── Awards, rivalries, running jokes ─────────────────────────────────────
  let awardsQ = admin.from('award_grants')
    .select('id,award_key,member_id,reason,granted_at,gameweek_id,season_id')
    .order('granted_at', { ascending: false }).limit(20);
  if (seasonId) awardsQ = awardsQ.eq('season_id', seasonId);
  if (input.gameweek_id) awardsQ = awardsQ.eq('gameweek_id', input.gameweek_id);
  const { data: awards } = await awardsQ;

  const { data: rivalries } = await admin.from('rivalries')
    .select('*').eq('status', 'active').order('intensity', { ascending: false }).limit(10);

  // Running jokes "due a callback": active, least-recently referenced first.
  const { data: running_jokes } = await admin.from('running_jokes')
    .select('*').eq('status', 'active')
    .order('last_referenced_at', { ascending: true, nullsFirst: true }).limit(8);

  const bundle: GafferMemoryBundle = {
    visibility_scope: scope,
    club_context: {
      season: seasonRow,
      active_competitions: [],
      theme: (seasonRow?.theme as unknown) ?? {},
    },
    gameweek_context: gameweekRow ? { gameweek: gameweekRow, status: gameweekRow.status as string } : null,
    headline_events,
    member_spotlights,
    awards: awards ?? [],
    gaffer_own_team,
    rivalries: rivalries ?? [],
    running_jokes: running_jokes ?? [],
    do_not_mention: { member_ids: [...doNotMentionIds], reasons: doNotMentionReasons },
    referenced_event_ids: [...referenced],
  };

  return json({ ok: true, bundle });
});

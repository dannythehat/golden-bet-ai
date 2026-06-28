// ============================================================================
// Footy Oracle Club — Memory Engine frontend types (v1).
// Mirrors the memory_engine_v1 migration. Authoritative DB types are
// regenerated into src/integrations/supabase/types.ts after the migration runs;
// these are the hand-written domain types used across the app + edge contracts.
// ============================================================================

export type Visibility = 'public' | 'members' | 'private' | 'admin';
export type Tone =
  | 'celebrate' | 'neutral' | 'tease' | 'roast_light' | 'roast_medium' | 'do_not_roast';
export type RoastLevel = 'none' | 'light' | 'standard';
export type Origin = 'automatic' | 'admin_triggered' | 'import' | 'correction' | 'system';
export type EventCategory =
  | 'fantasy' | 'award' | 'gaffer' | 'social' | 'club' | 'member' | 'system';

export interface Season {
  id: string;
  slug: string;
  name: string;
  status: 'upcoming' | 'active' | 'completed' | 'archived';
  starts_at: string | null;
  ends_at: string | null;
  theme: Record<string, unknown>;
  is_current: boolean;
}

export interface Gameweek {
  id: string;
  season_id: string;
  number: number;
  status: 'upcoming' | 'open' | 'locked' | 'live' | 'settled';
  opens_at: string | null;
  deadline_at: string | null;
  settles_at: string | null;
  reveal_at: string | null;
}

export interface Member {
  id: string;
  user_id: string | null;
  kind: 'human' | 'gaffer' | 'system';
  app_role: 'member' | 'admin';
  handle: string;
  display_name: string;
  status: 'active' | 'paused' | 'deleted';
  is_founding_member: boolean;
  avatar_url: string | null;
  joined_at: string;
}

export interface MemberProfile {
  id: string;
  member_id: string;
  bio: string | null;
  favourite_team: string | null;
  location: string | null;
  social_handles: Record<string, unknown>;
  visibility_default: 'public' | 'members';
}

export interface MemberSettings {
  id: string;
  member_id: string;
  allow_public_mentions: boolean;
  allow_gaffer_roasts: boolean;
  preferred_roast_level: RoastLevel;
}

export interface EventType {
  key: string;
  category: EventCategory;
  label: string;
  description: string | null;
  default_visibility: Visibility;
  default_salience: number;
  default_tone: Tone;
  payload_schema: Record<string, unknown>;
  is_sensitive: boolean;
}

export interface MemberEvent {
  id: string;
  season_id: string | null;
  gameweek_id: string | null;
  subject_member_id: string | null;
  actor_member_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  visibility: Visibility;
  salience: number;
  tone_hint: Tone;
  occurred_at: string;
  recorded_at: string;
  reveal_at: string | null;
  origin: Origin;
  source_system: string | null;
  source_function: string | null;
  source_ref: Record<string, unknown> | null;
  dedupe_key: string | null;
  content_hash: string;
  corrects_event_id: string | null;
}

export interface EventNarrationControl {
  event_id: string;
  eligible_for_narration: boolean;
  salience_override: number | null;
  tone_override: Tone | null;
  suppressed_reason: string | null;
  suppressed_by: string | null;
  suppressed_at: string | null;
}

export interface Award {
  key: string;
  name: string;
  description: string | null;
  cadence: 'weekly' | 'seasonal' | 'one_off';
  is_positive: boolean;
  icon: string | null;
  default_visibility: 'public' | 'members';
}

export interface AwardGrant {
  id: string;
  award_key: string;
  member_id: string;
  season_id: string | null;
  gameweek_id: string | null;
  reason: string | null;
  evidence_event_ids: string[];
  granted_by: string;
  granted_at: string;
}

export interface Rivalry {
  id: string;
  member_a_id: string;
  member_b_id: string;
  status: 'active' | 'dormant' | 'settled';
  intensity: number;
  origin_event_id: string | null;
  summary: string | null;
  started_at: string;
  last_event_at: string | null;
}

export interface RunningJoke {
  id: string;
  key: string;
  member_id: string | null;
  title: string;
  description: string | null;
  origin_event_id: string | null;
  status: 'active' | 'retired';
  reference_count: number;
  last_referenced_at: string | null;
}

export interface MemberSeasonStats {
  id: string;
  member_id: string;
  season_id: string;
  total_points: number;
  best_gameweek: number | null;
  best_gameweek_points: number | null;
  current_rank: number | null;
  awards_count: number;
  donkey_count: number;
  biggest_climb: number | null;
  rebuilt_at: string;
}

// ── Edge function I/O contracts ────────────────────────────────────────────
export interface EmitMemoryEventInput {
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

export interface NarratableEvent {
  id: string;
  event_type: string;
  occurred_at: string;
  subject_member_id: string | null;
  subject_handle: string | null;
  tone: Tone;
  salience: number;
  facts: Record<string, unknown>;
}

export interface GafferMemoryBundle {
  visibility_scope: Visibility;
  club_context: { season: Season | null; active_competitions: string[]; theme: unknown };
  gameweek_context: { gameweek: Gameweek; status: string } | null;
  headline_events: NarratableEvent[];
  member_spotlights: { member: Member; events: NarratableEvent[]; season_stats: MemberSeasonStats | null }[];
  awards: AwardGrant[];
  gaffer_own_team: { events: NarratableEvent[]; season_stats: MemberSeasonStats | null } | null;
  rivalries: Rivalry[];
  running_jokes: RunningJoke[];
  do_not_mention: { member_ids: string[]; reasons: string[] };
  referenced_event_ids: string[];
}

export interface MemoryQueryInput {
  selector: 'weekly_headlines' | 'member_story' | 'gaffer_article' | 'homepage' | 'facebook_reply';
  visibility_scope: Visibility;
  season_id?: string;
  gameweek_id?: string;
  member_id?: string;
  limits?: { headlines?: number; spotlights?: number };
}

// ============================================================================
// Footy Oracle Club — Memory Engine shared types + PURE helpers.
// Pure functions here are unit-tested in memory.test.ts (no DB required).
// ============================================================================

export type Visibility = 'public' | 'members' | 'private' | 'admin';
export type Tone =
  | 'celebrate' | 'neutral' | 'tease' | 'roast_light' | 'roast_medium' | 'do_not_roast';
export type RoastLevel = 'none' | 'light' | 'standard';
export type Origin = 'automatic' | 'admin_triggered' | 'import' | 'correction' | 'system';

export interface EventTypeRow {
  key: string;
  category: 'fantasy' | 'award' | 'gaffer' | 'social' | 'club' | 'member' | 'system';
  default_visibility: Visibility;
  default_salience: number;
  default_tone: Tone;
  is_sensitive: boolean;
  payload_schema: Record<string, unknown>;
}

export interface MemorySettings {
  allow_public_mentions: boolean;
  allow_gaffer_roasts: boolean;
  preferred_roast_level: RoastLevel;
}

// ── Ordering of tones by "roastiness" ──────────────────────────────────────
export const TONE_RANK: Record<Tone, number> = {
  celebrate: 0,
  neutral: 1,
  tease: 2,
  roast_light: 3,
  roast_medium: 4,
  do_not_roast: -1, // directive, not a roast level
};

const VISIBILITY_RANK: Record<Visibility, number> = {
  public: 0, members: 1, private: 2, admin: 3,
};

/** Is `tier` readable by an audience scoped at `scope`? (public ≤ members ≤ admin) */
export function visibilityWithinScope(tier: Visibility, scope: Visibility): boolean {
  return VISIBILITY_RANK[tier] <= VISIBILITY_RANK[scope];
}

/**
 * Refinement B: enforce the sensitivity floor.
 * Sensitive event types are forced to do_not_roast and never above 'private'.
 */
export function applySensitivityFloor(
  type: EventTypeRow,
  visibility: Visibility,
  tone: Tone,
): { visibility: Visibility; tone: Tone } {
  if (!type.is_sensitive) return { visibility, tone };
  const floored: Visibility =
    VISIBILITY_RANK[visibility] >= VISIBILITY_RANK['private'] ? visibility : 'private';
  return { visibility: floored, tone: 'do_not_roast' };
}

/**
 * Refinement C: cap an event's tone to a member's consent settings.
 * Returns the allowed tone, or null if the event must not be narrated about them.
 */
export function capToneForMember(tone: Tone, settings: MemorySettings): Tone | null {
  if (!settings.allow_public_mentions) return null;
  if (tone === 'do_not_roast') return 'do_not_roast';
  if (tone === 'celebrate' || tone === 'neutral') return tone;

  // tease / roast_* are "banter" tones gated by consent.
  if (!settings.allow_gaffer_roasts) return 'neutral';
  const maxRank =
    settings.preferred_roast_level === 'none' ? TONE_RANK.neutral :
    settings.preferred_roast_level === 'light' ? TONE_RANK.roast_light :
    TONE_RANK.roast_medium;
  if (TONE_RANK[tone] <= maxRank) return tone;
  // Downgrade to the highest allowed banter tone.
  const downgrade: Tone[] = ['roast_light', 'tease', 'neutral'];
  for (const t of downgrade) if (TONE_RANK[t] <= maxRank) return t;
  return 'neutral';
}

export const effectiveSalience = (base: number, override: number | null | undefined): number =>
  override === null || override === undefined ? base : override;

export const effectiveTone = (base: Tone, override: Tone | null | undefined): Tone =>
  override ?? base;

/**
 * Deterministic canonical JSON: object keys sorted recursively.
 * Used for content_hash so identical facts always hash identically.
 */
export function canonicalJSON(value: unknown): string {
  const seen = new WeakSet();
  const norm = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v as object)) throw new Error('circular reference in payload');
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(norm);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = norm((v as Record<string, unknown>)[k]);
    }
    return out;
  };
  return JSON.stringify(norm(value));
}

/** sha256 hex of the canonical representation of the fact-defining fields. */
export async function contentHash(fields: {
  event_type: string;
  subject_member_id: string | null;
  gameweek_id: string | null;
  occurred_at: string;
  payload: Record<string, unknown>;
}): Promise<string> {
  const canonical = canonicalJSON(fields);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Consumption contract (Refinement D) ────────────────────────────────────
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
  club_context: { season: unknown; active_competitions: string[]; theme: unknown };
  gameweek_context: { gameweek: unknown; status: string } | null;
  headline_events: NarratableEvent[];
  member_spotlights: { member: unknown; events: NarratableEvent[]; season_stats: unknown }[];
  awards: unknown[];
  gaffer_own_team: { events: NarratableEvent[]; season_stats: unknown } | null;
  rivalries: unknown[];
  running_jokes: unknown[];
  do_not_mention: { member_ids: string[]; reasons: string[] };
  referenced_event_ids: string[];
}

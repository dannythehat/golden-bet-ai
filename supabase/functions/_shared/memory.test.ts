// Deno unit tests for the Memory Engine pure helpers (no DB required).
// Run: deno test supabase/functions/_shared/memory.test.ts
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applySensitivityFloor, canonicalJSON, capToneForMember, contentHash,
  effectiveSalience, effectiveTone, visibilityWithinScope,
  type EventTypeRow, type MemorySettings,
} from "./memory.ts";

const sensitiveType: EventTypeRow = {
  key: 'MEMBER_REDACTED', category: 'member', default_visibility: 'admin',
  default_salience: 10, default_tone: 'do_not_roast', is_sensitive: true, payload_schema: {},
};
const normalType: EventTypeRow = {
  key: 'CAPTAIN_BLANK', category: 'fantasy', default_visibility: 'members',
  default_salience: 65, default_tone: 'roast_light', is_sensitive: false, payload_schema: {},
};

Deno.test("sensitivity floor forces do_not_roast + private floor", () => {
  const r = applySensitivityFloor(sensitiveType, 'public', 'roast_medium');
  assertEquals(r.tone, 'do_not_roast');
  assertEquals(r.visibility, 'private'); // floored up from public
});

Deno.test("sensitivity floor keeps admin visibility (already >= private)", () => {
  const r = applySensitivityFloor(sensitiveType, 'admin', 'celebrate');
  assertEquals(r.visibility, 'admin');
  assertEquals(r.tone, 'do_not_roast');
});

Deno.test("non-sensitive type is untouched by the floor", () => {
  const r = applySensitivityFloor(normalType, 'members', 'roast_light');
  assertEquals(r, { visibility: 'members', tone: 'roast_light' });
});

Deno.test("consent: opted-out of public mentions => excluded", () => {
  const s: MemorySettings = { allow_public_mentions: false, allow_gaffer_roasts: true, preferred_roast_level: 'standard' };
  assertEquals(capToneForMember('celebrate', s), null);
});

Deno.test("consent: roasts disabled => banter downgraded to neutral", () => {
  const s: MemorySettings = { allow_public_mentions: true, allow_gaffer_roasts: false, preferred_roast_level: 'standard' };
  assertEquals(capToneForMember('roast_medium', s), 'neutral');
  assertEquals(capToneForMember('tease', s), 'neutral');
  assertEquals(capToneForMember('celebrate', s), 'celebrate'); // positive tones always fine
});

Deno.test("consent: 'light' caps roast_medium down to roast_light", () => {
  const s: MemorySettings = { allow_public_mentions: true, allow_gaffer_roasts: true, preferred_roast_level: 'light' };
  assertEquals(capToneForMember('roast_medium', s), 'roast_light');
  assertEquals(capToneForMember('roast_light', s), 'roast_light');
  assertEquals(capToneForMember('tease', s), 'tease');
});

Deno.test("consent: 'standard' allows roast_medium", () => {
  const s: MemorySettings = { allow_public_mentions: true, allow_gaffer_roasts: true, preferred_roast_level: 'standard' };
  assertEquals(capToneForMember('roast_medium', s), 'roast_medium');
});

Deno.test("consent: do_not_roast always passes through as a directive", () => {
  const s: MemorySettings = { allow_public_mentions: true, allow_gaffer_roasts: true, preferred_roast_level: 'standard' };
  assertEquals(capToneForMember('do_not_roast', s), 'do_not_roast');
});

Deno.test("visibility scope ordering", () => {
  assert(visibilityWithinScope('public', 'members'));
  assert(visibilityWithinScope('members', 'members'));
  assert(!visibilityWithinScope('private', 'members'));
  assert(!visibilityWithinScope('admin', 'members'));
  assert(visibilityWithinScope('admin', 'admin'));
});

Deno.test("overrides win when present", () => {
  assertEquals(effectiveSalience(50, 90), 90);
  assertEquals(effectiveSalience(50, null), 50);
  assertEquals(effectiveTone('neutral', 'celebrate'), 'celebrate');
  assertEquals(effectiveTone('neutral', null), 'neutral');
});

Deno.test("canonicalJSON sorts keys deterministically", () => {
  const a = canonicalJSON({ b: 1, a: { d: 4, c: 3 } });
  const b = canonicalJSON({ a: { c: 3, d: 4 }, b: 1 });
  assertEquals(a, b);
  assertEquals(a, '{"a":{"c":3,"d":4},"b":1}');
});

Deno.test("contentHash is deterministic and payload-sensitive", async () => {
  const base = {
    event_type: 'GAMEWEEK_SCORED', subject_member_id: 'm1', gameweek_id: 'gw1',
    occurred_at: '2026-01-01T00:00:00.000Z', payload: { points: 64 },
  };
  const h1 = await contentHash(base);
  const h2 = await contentHash({ ...base, payload: { points: 64 } });
  const h3 = await contentHash({ ...base, payload: { points: 65 } });
  assertEquals(h1, h2);
  assert(h1 !== h3);
  assertEquals(h1.length, 64); // sha256 hex
});

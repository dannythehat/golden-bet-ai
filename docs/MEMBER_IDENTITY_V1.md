# Footy Oracle Club — Member Identity + Backfill v1 (Design / Spec)

> Status: **DRAFT — awaiting Chat's review. No code until approved.**
> Builds on Memory Engine v1 (the `members` / `member_profiles` / `member_settings`
> tables already exist). Scope is deliberately tight: make member identity reliable
> enough to carry Fantasy Football next. **Not** the full profile/social product.

---

## 0. What already exists vs what this pillar adds

Memory Engine v1 already shipped: `members`, `member_profiles`, `member_settings`, the
`members_public` view, RLS, a `handle_new_member` signup trigger, and the `MEMBER_JOINED` /
`FOUNDING_MEMBER` / `MEMBER_REDACTED` event types.

This pillar adds the **missing reliability layer**:
- **Backfill** every existing `auth.users` row into the member tables (no ghosts).
- **Human-friendly, unique handle generation** (replacing the placeholder `@user_<uuid>`).
- **Founding-member assignment**.
- A tight **member settings surface** (identity + consent only).
- **Admin member management** primitives.
- Clear **public display** and **subscription/fantasy linkage** rules.

---

## 1. Existing user backfill strategy

Idempotent, set-based **SQL migration** (runs as superuser → bypasses RLS, atomic):

1. For each `auth.users` row **without** a `members` row, insert `members` +
   `member_profiles` + `member_settings` (defaults: roast level `light`,
   mentions+roasts on).
2. Handle via `generate_unique_handle()` (§2–3), seeded from display name / email local part.
3. `joined_at = auth.users.created_at` (honest history, not backfill time).
4. **Founding member** set per cutoff (§6).
5. Emit memory events with `origin='import'`:
   - `MEMBER_JOINED` — `occurred_at = created_at`, `dedupe_key = 'member_joined:'||user_id`.
   - `FOUNDING_MEMBER` — only if founding; `dedupe_key = 'founding:'||user_id`.
   - `content_hash` computed in SQL via `pgcrypto` `digest(...,'sha256')` over a canonical
     string (import events may use SQL-side hashing; documented divergence from the TS path).
6. **Idempotent:** every step is `on conflict do nothing` / dedupe-keyed, so re-running the
   migration (or running it after the trigger has already created some rows) is safe.

> Batch/￼performance: a single `insert ... select` handles realistic club sizes (hundreds–
> low thousands). If the user base is very large, wrap in a `LIMIT`/loop; flagged, not built.

## 2. How handles are generated

`generate_unique_handle(seed text) returns text` (plpgsql):
- Slugify `seed`: lowercase, ASCII, strip non-`[a-z0-9_]`, collapse repeats.
- Derive `seed` from `display_name` if present, else the **email local part only** (never the
  domain → no email address leakage).
- Enforce: starts with a letter, length 3–20, prefix `@`. Fallback base `member` if empty.
- Check against existing handles **and** a reserved list (§3); resolve collisions (§3).

## 3. How handle conflicts are resolved

- **Reserved handles** (never auto-assigned): `@thegaffer`, `@system`, `@admin`, `@gaffer`,
  `@footyoracle`, `@mod`, `@support`. Stored in a small `reserved_handles` table.
- On collision: append an incrementing suffix `-2`, `-3`, … until free (cap ~50 tries, then
  fall back to a short random base36 suffix).
- Uniqueness guaranteed by the existing `members.handle UNIQUE` constraint; the generator
  loops until the insert would not conflict (advisory check + constraint as backstop).
- **User-initiated handle changes** go through an edge function (`change_member_handle`) that
  re-validates format + reservation + uniqueness, and emits `MEMBER_HANDLE_CHANGED`
  (new event type, members-visible, low salience) for transparency.

## 4. Member profile fields (v1 — tight)

Already on `member_profiles`: `bio`, `favourite_team`, `location`, `social_handles`,
`visibility_default`. v1 surfaces only: **`display_name`** (on `members`), **`handle`**,
**`avatar_url`**, **`bio`**, **`favourite_team`**, **`visibility_default`**.
`location` + `social_handles` exist but are **hidden in v1 UI** (kept for later). No new
profile columns needed.

## 5. Member settings page requirements (frontend)

Reuse the existing `SettingsSection.tsx`. Two tight panels, authenticated members only:

- **Identity:** edit `display_name`, `avatar_url`, `bio`, `favourite_team`,
  `handle` (with live availability check via `change_member_handle`),
  profile `visibility_default` (public/members). Read-only badges: **Founding Member**,
  **Subscription status** (from existing `useSubscription()`), member since `joined_at`.
- **Privacy & Banter (consent):** `allow_public_mentions` (toggle),
  `allow_gaffer_roasts` (toggle), `preferred_roast_level` (none/light/standard).
  Copy explains: *"Controls how The Gaffer can mention you. Banter, never harassment."*

Writes use existing RLS (members update own `member_profiles` / `member_settings`); handle
change uses the edge function. **No** social graph, following, or messaging in v1.

## 6. Founding member logic

- A single configurable cutoff: `club_config.founding_cutoff_at` (new one-row
  `club_config` table, or a season `theme` key — propose `club_config`).
- `is_founding_member = (auth.users.created_at < founding_cutoff_at)`.
- **Default for v1:** set `founding_cutoff_at = ` the backfill timestamp, so **everyone who
  existed before the Club launched is a founding member**. This matches the brief's
  "everyone here before the Club is a founder" spirit. The exact cutoff and any perks remain
  a **commercial decision (Chat)** — the mechanism is built; the value is config.
- Applied in backfill **and** in the signup trigger (new signups after cutoff are not
  founders).

## 7. Public member display rules

- **Public (anon + members):** `handle`, `display_name`, `avatar_url`, founding badge
  (via `members_public` view). Plus `bio` / `favourite_team` **only if**
  `visibility_default='public'`.
- **Members-only:** the above for any active member regardless of their public flag.
- **Private (self/admin):** `email` (never exposed via members tables — lives in
  `auth.users`), `location`, `social_handles`, all `member_settings`, subscription status.
- **Redacted members** (`status='deleted'`) are excluded from `members_public` and never
  identified in narration (already enforced by `memory_query`).

## 8. Privacy / roast consent controls

- Lives on `member_settings` (already private RLS): `allow_public_mentions`,
  `allow_gaffer_roasts`, `preferred_roast_level` (default `light`).
- Enforced centrally in `memory_query` (already built: `capToneForMember`), so **every**
  Gaffer/Facebook/homepage consumer inherits consent automatically — identity v1 just exposes
  the toggles in the UI. No new enforcement code.

## 9. Admin member management (primitives, tight)

Admin (`members.app_role='admin'`) can, via an `admin-member` edge function (service role):
- **List/search** members (handle, name, status, subscription, founding).
- **Set `app_role`** (promote/demote admin) → emits `MODERATION_ACTION` (sensitive).
- **Pause / reactivate** a member (`status`) → `MODERATION_ACTION`.
- **Redact** a member (GDPR §15/Memory §5): anonymise `members.display_name='Former Member'`,
  clear `member_profiles` PII + `member_settings`, set `status='deleted'`, append
  `MEMBER_REDACTED`. Event log itself stays intact.
- **Force handle change** (abuse) → `MEMBER_HANDLE_CHANGED`.

No bulk tools, no analytics dashboards in v1 — just the safe primitives. Legacy unauth
`/admin` page remains a **separate hardening task**.

## 10. How member identity connects to active subscriptions

- **Identity ≠ entitlement.** `members` is identity; billing stays in `subscriptions`.
- Linkage is `members.user_id → auth.users.id`, and `subscriptions.user_id → auth.users.id`.
- Derived helper `member_is_subscriber(member_id)` wraps existing
  `has_active_subscription(user_id, env)`. Members with no `user_id` (gaffer/system) are
  never subscribers.
- The `members` visibility tier means *authenticated club member*, **not** *paying*. Premium
  paywall gating stays at the feature layer (`useSubscription()`), unchanged. **No pricing
  changes** (per ruling).

## 11. How member identity connects to future fantasy teams

- `members.id` is the **canonical entrant id**. Future `fantasy_teams.member_id → members.id`
  (one member = one entry in v1).
- The **Gaffer fields a team** through his `kind='gaffer'` member row — no scoring privilege.
- The **system** member never fields a team.
- Fantasy events (`SQUAD_SUBMITTED`, `CAPTAIN_PICKED`, `GAMEWEEK_SCORED`, …) will reference
  `subject_member_id = members.id`, so a solid identity layer now means fantasy "just works"
  next.

## 12. What events are emitted into Memory

- `MEMBER_JOINED` — on creation (signup live; backfill `origin='import'`, historical
  `occurred_at`).
- `FOUNDING_MEMBER` — when founding.
- `MEMBER_HANDLE_CHANGED` — **new event type** (member category, members visibility,
  salience ~20, tone neutral) on handle change.
- `MEMBER_REDACTED`, `MODERATION_ACTION` — admin actions (sensitive, already seeded).
- Profile/settings edits are **not** narrated in v1 (low narrative value, avoids noise) —
  they're still audited by Postgres but don't emit events.

## 13. Migration / edge-function requirements

**Migration (`..._member_identity_v1.sql`, additive):**
- `reserved_handles` table + seed; `club_config` one-row table (`founding_cutoff_at`).
- `generate_unique_handle(seed text)` function; reserved-handle awareness.
- Replace `handle_new_member` body to use `generate_unique_handle` + founding logic.
- One-off **backfill** block (members/profiles/settings + `MEMBER_JOINED`/`FOUNDING_MEMBER`
  events, idempotent, dedupe-keyed). Enable `pgcrypto` if not present (for SQL hashing).
- Seed new event type `MEMBER_HANDLE_CHANGED`.

**Edge functions:**
- `change_member_handle` (member self-serve; validates + emits `MEMBER_HANDLE_CHANGED`).
- `admin-member` (admin-only; list/search + role/pause/redact/force-handle, each emits the
  right event via `emit_memory_event`).
- Profile/settings edits need **no** new function (existing RLS direct updates).

## 14. Test plan

1. **Backfill idempotency** — run twice → no duplicate members/events.
2. **Handle generation** — slugify, length/format, email-domain never leaks.
3. **Conflict resolution** — duplicate seeds get `-2`/`-3`; reserved handles refused.
4. **Founding flag** — pre-cutoff users founding, post-cutoff not; events match.
5. **Event emission** — `MEMBER_JOINED` (import, historical `occurred_at`) +
   `FOUNDING_MEMBER` present, dedupe-keyed.
6. **Signup trigger** — new signup gets a clean handle + correct founding state.
7. **Self-serve settings** — member can update own profile/settings, not others' (RLS).
8. **Handle change** — uniqueness enforced, `MEMBER_HANDLE_CHANGED` emitted.
9. **Redaction** — anonymises identity, emits `MEMBER_REDACTED`, `memory_query` hides them.
10. **Subscription linkage** — `member_is_subscriber` matches `has_active_subscription`;
    gaffer/system never subscribers.
11. **Public display** — `members_public` exposes only safe columns; private fields hidden.

(Deno unit tests for the handle slugifier as a pure helper + SQL/staging tests for the rest —
same split as Memory Engine v1. Staging-applied per the production gate.)

## 15. Risks

- **Handle quality/PII** — deriving from email could embed names; mitigated by local-part-only
  + user-editable handles. Flag for Chat: acceptable default?
- **Founding cutoff is commercial** — mechanism built, value is config; needs Chat's number.
- **Backfill scale** — large user bases may need batching; flagged.
- **Trigger ↔ backfill overlap** — both idempotent + dedupe-keyed, so safe, but must run
  backfill *after* the trigger update so handles are consistent.
- **Existing display names** with emoji/odd characters — slugifier must degrade gracefully.
- **Email exposure** — never surfaced through member tables; lives only in `auth.users`.
- **GDPR** — redaction is anonymise-not-delete (ratified); legal-assumption caveat stands.

---

### Open questions for Chat
1. **Founding cutoff = backfill time** (everyone existing becomes a founding member) — agreed,
   or supply a specific date?
2. **Handle seed = display name, else email local part** — acceptable, or always force
   `@member-xxxx` and let users opt into a custom handle?
3. v1 hides `location` + `social_handles` in the UI — confirm that's the right tight scope?
4. Confirm v1 ships **two** edge functions (`change_member_handle`, `admin-member`) — or defer
   `admin-member` to a later admin pillar and keep identity v1 to backfill + self-serve only?

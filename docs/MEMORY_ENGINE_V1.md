# Footy Oracle Club — Memory Engine v1 (Design / Spec)

> Status: **DRAFT — awaiting Chat's review. No code until approved.**
> Principle: **The LLM does not remember. The database remembers. The Gaffer narrates.**

---

## 0. Core idea (read this first)

The Memory Engine is **two layers**:

1. **Structure & identity** — the containers and people the story happens to:
   `seasons`, `gameweeks`, `members`, `member_profiles`, `gaffer_identity`.
2. **The immutable event log** — `member_events`: an **append-only, timestamped,
   tamper-evident** record of *everything that happened*. Plus the narrative tables
   that hang off it: `awards` / `award_grants`, `rivalries`, `running_jokes`, and a
   data-driven `event_types` registry.

Everything else in the platform (fantasy engine, awards engine, the Gaffer, Facebook,
the living homepage) **writes events in** and **reads facts out**. They never write prose
*as* memory. Prose is always generated *from* memory, at narration time, with provenance.

The football/player stats provider (Ruling 2) lives **outside** the Memory Engine. The
fantasy engine consumes that provider, then **emits events** (e.g. `GAMEWEEK_SCORED`).
The Memory Engine never touches raw football data — it only stores what happened to
**people and the Gaffer**. This keeps memory provider-agnostic forever.

---

## 1. Purpose

- Be the **single source of narrative truth** for the Club.
- Guarantee **trust**: every memory is timestamped, never rewritten, tamper-evident.
  Corrections are *new events*, not edits — so "the Gaffer owns his mistakes" is
  structural, not a promise.
- Give the Gaffer (and Facebook, and the homepage) a **clean, queryable feed of facts**
  so narration is grounded and never hallucinated.
- Make member life **legible**: captain picks, climbs, donkey weeks, rivalries, in-jokes
  — all recallable months later.

## 2. User experience (what members/Gaffer feel — no UI built in v1)

- A member opens their profile and sees **their story**: "Joined GW3 · 2× Manager of the
  Week · 1× Donkey · Best week GW11 (94 pts) · Rivalry with @dave since GW7."
- The Gaffer's Monday article references **real specifics** from last week: who hauled,
  who captained a blank, who climbed most — all pulled from events, all true.
- Nobody is anonymous: when the Gaffer roasts "@dave's £4m goalkeeper punt," that punt is
  a stored `TRANSFER_MADE` event with a timestamp.
- Members trust it because **nothing is quietly edited** — a correction shows as a
  correction.

> v1 ships the **engine + contracts only**. Profile pages, award screens, and the living
> homepage are later pillars that *read* this engine.

## 3. Tables / schema

All tables: `id uuid PK default gen_random_uuid()`, `created_at TIMESTAMPTZ default now()`.
Identifiers and conventions match the existing repo (Supabase Postgres, `auth.uid()` RLS).

### 3.1 `seasons`
The top-level time container (a football season).
- `slug` (e.g. `2025-26`), `name`, `status` (`upcoming|active|completed|archived`)
- `starts_at`, `ends_at` (TIMESTAMPTZ)
- `theme` (jsonb — e.g. Christmas/transfer-window theming for the homepage)
- `is_current` (bool; exactly one true, enforced by partial unique index)

### 3.2 `gameweeks`
Subdivision of a season; the heartbeat of the Club.
- `season_id` → seasons
- `number` (int, unique per season)
- `status` (`upcoming|open|locked|live|settled`)
- `opens_at`, `deadline_at` (= lock time, **before first kickoff** — buffer applied),
  `settles_at`
- `reveal_at` (when locked picks become publicly narratable)
- UNIQUE(`season_id`,`number`)

### 3.3 `members`
Club identity. **The Gaffer is also a member row** so his picks/awards/events reuse the
same plumbing.
- `user_id` → `auth.users` (nullable: the Gaffer/system have none)
- `kind` (`human|gaffer|system`)
- `handle` (unique, public, e.g. `@dave`), `display_name`
- `status` (`active|paused|deleted`)
- `joined_at`, `is_founding_member` (bool)
- `avatar_url`
- One-to-one with `member_profiles`.

### 3.4 `member_profiles`
Richer, mostly-public profile (kept separate from core identity so identity stays lean).
- `member_id` → members (unique)
- `bio`, `favourite_team`, `location`, `social_handles` (jsonb)
- `visibility_default` (`public|members`)
- Cached narrative stats are **not** stored here — see `member_season_stats` (derived).

### 3.5 `gaffer_identity`
The Gaffer's persona config — **versioned**, so his voice can evolve transparently.
- `member_id` → the `kind='gaffer'` member
- `version` (int), `is_active` (bool)
- `voice` (jsonb: tone, catchphrases, do/don't), `bio`, `backstory`
- `created_at` (immutable). New persona = new row, old kept for audit.

### 3.6 `event_types` (registry — data-driven taxonomy)
So new event kinds are config, not migrations, and everyone agrees what each means.
- `key` (PK, e.g. `CAPTAIN_PICKED`), `category`
  (`fantasy|award|gaffer|social|club|member|system`)
- `label`, `description`
- `default_visibility` (`public|members|private|admin`)
- `payload_schema` (jsonb — JSON Schema documenting/validating the payload)
- `default_salience` (int 0–100 — narrative weight hint)

### 3.7 `member_events` — **the immutable log (centre of everything)**
Append-only. No client writes. No updates. No deletes.
- `season_id`, `gameweek_id` (nullable for club-wide/timeless)
- `subject_member_id` → members (who it's *about*; null = club-wide)
- `actor_member_id` → members (who *caused* it; e.g. admin, the Gaffer, the system)
- `event_type` → `event_types.key`
- `payload` (jsonb — typed per event_type)
- `visibility` (`public|members|private|admin`)
- `salience` (int 0–100 — how "headline-worthy"; drives what the Gaffer surfaces)
- `occurred_at` (TIMESTAMPTZ — when it happened in football time; may be backfilled)
- `recorded_at` (TIMESTAMPTZ default now() — when we wrote it; **never changes**)
- `reveal_at` (nullable — embargo; not narratable before this)
- `source` (`fantasy_engine|awards_engine|gaffer|admin|facebook|system|import`)
- `dedupe_key` (text, UNIQUE — idempotency for retried emitters)
- `content_hash` (text — sha256 of canonical {type,subject,gameweek,payload,occurred_at})
- `corrects_event_id` (nullable → member_events — a correction/retraction *appends*,
  never edits the original)
- Indexes: (`subject_member_id`,`occurred_at`), (`gameweek_id`), (`event_type`),
  (`visibility`,`occurred_at`), (`salience`).

### 3.8 `awards` (catalog)
Definitions of the traditions.
- `key` (e.g. `MANAGER_OF_THE_WEEK`, `DONKEY_OF_THE_WEEK`, `JAMMY_GIT`,
  `MONDAY_TEA`, `BIGGEST_CLIMBER`, `CAPTAIN_COURAGEOUS`, `TRANSFER_DISASTER`,
  `HOT_STREAK`, `CHRISTMAS_CHAMPION`, `KING_OF_THE_CLUB`)
- `name`, `description`, `cadence` (`weekly|seasonal|one_off`)
- `is_positive` (bool — celebrate vs roast), `icon`, `default_visibility`

### 3.9 `award_grants` (immutable instances)
- `award_key` → awards
- `member_id` → recipient
- `season_id`, `gameweek_id` (nullable)
- `reason` (text — the factual citation, e.g. "94 pts, highest in the club")
- `evidence_event_ids` (uuid[] — which events justify it → auditable)
- `granted_at` (immutable), `granted_by` (`system|admin member_id`)
- Emitting a grant **also appends** an `AWARD_GRANTED` event (salience high).
- UNIQUE(`award_key`,`season_id`,`gameweek_id`,`member_id`) where applicable.

### 3.10 `rivalries`
A living relationship (mutable summary, but every beat is an event).
- `member_a_id`, `member_b_id` (members; one may be the Gaffer)
- `status` (`active|dormant|settled`), `intensity` (int)
- `origin_event_id` → member_events, `started_at`
- `summary` (text — Gaffer-maintained one-liner), `last_event_at`

### 3.11 `running_jokes`
In-jokes the Gaffer can call back to.
- `key`, `member_id` (nullable — club-wide jokes exist), `title`, `description`
- `origin_event_id`, `status` (`active|retired`)
- `reference_count` (int), `last_referenced_at`
- Each callback appends a `JOKE_REFERENCED` event (keeps usage auditable & paced).

### 3.12 `member_season_stats` (DERIVED cache — not authoritative)
Fast aggregates for homepage/profiles/Gaffer quick-facts. Rebuildable from the log at any
time; clearly marked non-canonical.
- `member_id`, `season_id`
- `total_points`, `best_gameweek`, `best_gameweek_points`, `current_rank`,
  `awards_count`, `donkey_count`, `biggest_climb`
- `rebuilt_at`

## 4. Key workflows

1. **Emit an event** (the only write path): a trusted edge function (fantasy/awards/
   gaffer/admin) validates payload against `event_types.payload_schema`, computes
   `content_hash`, sets `dedupe_key`, inserts. Clients **never** insert directly.
2. **Grant an award**: awards engine evaluates a settled gameweek → writes `award_grants`
   (+ `AWARD_GRANTED` event) → updates derived stats.
3. **Gaffer writes the Monday article**: `memory-query` returns a ranked **memory bundle**
   for the gameweek → prompt the LLM with *facts only* → store article (existing
   `blog_posts`) → append `GAFFER_ARTICLE_PUBLISHED` recording `referenced_event_ids`
   (provenance).
4. **The Gaffer makes a mistake**: append a `GAFFER_MISTAKE_OWNED` event that
   `corrects_event_id` the original. Original stays visible. Trust preserved.
5. **Gameweek lock**: at `deadline_at`, picks lock; events with `reveal_at` stay embargoed
   until `reveal_at`. The Gaffer cannot narrate hidden picks.
6. **Rebuild derived stats**: nightly job recomputes `member_season_stats` from the log.

## 5. Edge cases

- **GDPR / right-to-erasure vs immutability** — we never hard-delete history (it would
  break the trust chain). On erasure: set `members.status='deleted'`, anonymise
  `member_profiles` and PII inside payloads (pseudonymise to "a former member"), and
  **append a `MEMBER_REDACTED` event** documenting the redaction. This tension is called
  out explicitly — Chat should ratify the policy.
- **Backfilling past seasons** — `occurred_at` (then) vs `recorded_at` (now) lets us import
  history honestly without faking timestamps; `source='import'`.
- **Idempotent emitters** — `dedupe_key` UNIQUE prevents double-inserts on retry
  (e.g. `GAMEWEEK_SCORED:gw11:member42`).
- **Embargo** — locked-but-secret picks use `reveal_at`; narration queries exclude
  not-yet-revealed events so nothing leaks pre-deadline.
- **Mid-season joiners / tiny fields** — awards engine guards minimum-participant rules;
  joiners get a `MEMBER_JOINED` event with the real gameweek.
- **Timezones** — all TIMESTAMPTZ UTC; deadlines unambiguous; lock = first kickoff − buffer.
- **Payload drift** — jsonb is flexible but each type has a `payload_schema`; the emitting
  function validates, so the log stays coherent.

## 6. Security / RLS assumptions

- **Write path is backend-only.** No client INSERT/UPDATE/DELETE on `member_events`,
  `award_grants`, `rivalries`, `running_jokes`. Only edge functions using the service role
  write. This is the integrity guarantee.
- **No UPDATE/DELETE at all** on `member_events` / `award_grants` (append-only) — enforced
  by omitting those policies *and* a trigger that raises on UPDATE/DELETE.
- **Read by visibility:**
  - `public` → readable by `anon` + `authenticated` (SEO/marketing surfaces).
  - `members` → `authenticated` members only.
  - `private` → only the `subject_member_id`'s own user.
  - `admin` → service role / admin only.
- `members`: read own row + others' public fields; write own profile only (via function).
- All **admin writes are themselves events** (`actor_member_id`=admin) → admin actions are
  auditable too.
- `content_hash` + immutable `recorded_at` make tampering detectable, backing the public
  "timestamped, nothing rewritten" claim.

## 7. Admin implications

A future admin surface (not built in v1) needs to:
- Open/lock/settle gameweeks; create/activate seasons & themes.
- Define `awards` and `event_types` (data-driven, no migration).
- Manually grant an award or emit a `club` event (logged with the admin as actor).
- **Correct** via appended correction events — never hard delete.
- Manage rivalries/jokes lifecycle and visibility.
- View the raw event stream as an **audit log**.

## 8. What writes to Memory (event taxonomy — representative, extensible)

- **fantasy** (emitted by the fantasy engine after it consumes the data provider):
  `SQUAD_SUBMITTED`, `CAPTAIN_PICKED`, `TRANSFER_MADE`, `GAMEWEEK_SCORED`,
  `RANK_CHANGED`, `BIGGEST_CLIMB`, `BIGGEST_FALL`, `CAPTAIN_HAUL`, `CAPTAIN_BLANK`.
- **award**: `AWARD_GRANTED`.
- **gaffer**: `GAFFER_TEAM_SUBMITTED`, `GAFFER_PICK_LOCKED`, `GAFFER_RESULT`,
  `GAFFER_MISTAKE_OWNED`, `GAFFER_ARTICLE_PUBLISHED`.
- **social**: `MEMBER_SHOUTOUT`, `RIVALRY_STARTED`, `JOKE_REFERENCED`,
  `FACEBOOK_MENTION` (inbound interactions logged so the Gaffer "remembers" them).
- **club**: `SEASON_STARTED`, `GAMEWEEK_OPENED`, `GAMEWEEK_LOCKED`,
  `COMPETITION_STARTED`, `CHRISTMAS_CHAMPION_CROWNED`.
- **member**: `MEMBER_JOINED`, `FOUNDING_MEMBER`, `MEMBER_MILESTONE`, `MEMBER_REDACTED`.

> The existing transparency assets (predictions P&L, bet proofs) can later emit
> `gaffer` events too, so the betting side becomes part of the same narrative spine.

## 9. What the Gaffer can later use (consumption contract)

A single read layer — `memory-query` (Supabase RPC / edge function) — returns ranked,
visibility-scoped **memory bundles**. No raw SQL in the LLM path; the LLM only ever
receives vetted facts.

Selectors v1 should support:
- **This week's headlines** — top-salience public/members events for a gameweek.
- **A member's story** — that member's events + awards + rivalries + jokes (respecting
  privacy).
- **Active rivalries** and **running jokes due a callback** (paced by `last_referenced_at`).
- **Season arcs** — climbs, streaks, donkey counts from `member_season_stats`.

Narration rule baked into prompts: *"Use only the provided facts. If it isn't in the
bundle, it didn't happen."* Each generated article/post stores its
`referenced_event_ids` → narration itself is auditable.

**Facebook** uses the exact same `memory-query` layer: the Gaffer drafts grounded
posts/replies; inbound mentions are logged as `FACEBOOK_MENTION` events so future
narration can reference real member interactions. (Wiring reuses the repo's existing
`publish-to-social` function in a later pillar.)

## 10. Risks / trade-offs

- **Immutability vs GDPR** — resolved by anonymise-not-delete + redaction events; needs
  Chat's sign-off (§5).
- **jsonb flexibility vs queryability** — mitigated by typed columns for hot dimensions
  (subject, gameweek, type, time, visibility, salience) + `payload_schema` validation.
- **Tamper-evidence depth** — v1 ships `content_hash` per event; a full **hash-chain**
  (`prev_hash`) is deferred to phase 2 unless Chat wants maximum trust on day one.
- **Single big event table** — fine at club scale for years; well-indexed; partition by
  season later if needed.
- **Salience tuning** — getting "what's headline-worthy" right is iterative; it's a number
  we can adjust without schema change.
- **Scope discipline** — v1 is engine + contracts only. Fantasy scoring, award evaluation
  logic, profile UI, and the living homepage are explicitly *later* pillars that build on
  this.

---

### Proposed v1 table list (for the build, once approved)
`seasons`, `gameweeks`, `members`, `member_profiles`, `gaffer_identity`,
`event_types`, `member_events`, `awards`, `award_grants`, `rivalries`,
`running_jokes`, `member_season_stats` (derived).

### Open questions for Chat
1. Ratify the **GDPR anonymise-not-delete** policy (§5/§10)?
2. **Hash-chain** in v1, or `content_hash` now + chain in phase 2?
3. Is the **Gaffer-as-a-member-row** (`kind='gaffer'`) model agreed, so his team/awards/
   events reuse member plumbing?
4. Confirm the **four visibility tiers** (`public|members|private|admin`) are right for the
   Club.

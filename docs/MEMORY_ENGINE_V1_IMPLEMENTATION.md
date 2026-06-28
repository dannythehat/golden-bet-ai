# Footy Oracle Club — Memory Engine v1 (Implementation Spec)

> Status: **DRAFT — awaiting Chat's review. No code applied until approved.**
> Builds on the approved `MEMORY_ENGINE_V1.md`. Incorporates Chat's rulings (1–4) and
> refinements (A–F). Conventions match the existing repo: lowercase SQL, `gen_random_uuid()`,
> `update_updated_at_column()`, `service_role` gets `all`, RLS via `auth.uid()`,
> functions `security definer set search_path = public`.

---

## Key architectural decision driven by the review

Two refinements — **F (suppress from narration)** and **adjust salience** — require *changing*
an event. That conflicts with append-only immutability. Resolution:

- **`member_events`** = the **immutable factual log**. Append-only. No UPDATE/DELETE, ever.
  Holds provenance, original `salience`, original `tone_hint`, `content_hash`.
- **`event_narration_control`** = a **separate, mutable governance row** keyed by `event_id`.
  Holds `eligible_for_narration`, `salience_override`, `tone_override`, `suppressed_*`.
  The factual record never changes; only its *narrative treatment* does — and every change
  here **also appends an admin `member_event`**, so governance is itself auditable.

`memory_query` reads facts from `member_events` LEFT JOIN `event_narration_control` and
applies `coalesce(override, original)`.

---

## 1. Exact migration / table definitions

Single migration file (proposed name `..._memory_engine_v1.sql`). Order respects FK deps.

### 1.1 Helper functions & en um-style checks

```sql
-- Reuses existing public.update_updated_at_column() (already in repo).

-- Map the current auth user to their club member id.
create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid() limit 1;
$$;

-- Club admin check (app_role lives on members).
create or replace function public.is_club_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members
                 where user_id = auth.uid() and app_role = 'admin');
$$;

-- Append-only guard for immutable tables.
create or replace function public.prevent_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Table %.% is append-only; % is not permitted',
    tg_table_schema, tg_table_name, tg_op;
end; $$;
```

### 1.2 Structure & identity

```sql
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                 -- '2025-26'
  name text not null,
  status text not null default 'upcoming'
    check (status in ('upcoming','active','completed','archived')),
  starts_at timestamptz,
  ends_at   timestamptz,
  theme jsonb not null default '{}',         -- homepage theming (xmas / transfer window)
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index uq_seasons_one_current on public.seasons (is_current) where is_current;

create table public.gameweeks (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  number int not null,
  status text not null default 'upcoming'
    check (status in ('upcoming','open','locked','live','settled')),
  opens_at    timestamptz,
  deadline_at timestamptz,                   -- lock; BEFORE first kickoff (− buffer)
  settles_at  timestamptz,
  reveal_at   timestamptz,                   -- when locked picks become narratable
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, number)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null, -- null = gaffer/system
  kind text not null default 'human' check (kind in ('human','gaffer','system')),
  app_role text not null default 'member' check (app_role in ('member','admin')),
  handle text not null unique,               -- '@dave'
  display_name text not null,
  status text not null default 'active' check (status in ('active','paused','deleted')),
  is_founding_member boolean not null default false,
  avatar_url text,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.member_profiles (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members(id) on delete cascade,
  bio text,
  favourite_team text,
  location text,
  social_handles jsonb not null default '{}',
  visibility_default text not null default 'members'
    check (visibility_default in ('public','members')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Refinement C: member safety / consent (private to the member + admin).
create table public.member_settings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members(id) on delete cascade,
  allow_public_mentions boolean not null default true,
  allow_gaffer_roasts   boolean not null default true,
  preferred_roast_level text not null default 'light'
    check (preferred_roast_level in ('none','light','standard')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ruling 3: Gaffer persona (versioned), attached to the kind='gaffer' member.
create table public.gaffer_identity (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  version int not null,
  is_active boolean not null default false,
  bio text,
  backstory text,
  voice jsonb not null default '{}',         -- tone, catchphrases, do/don't
  created_at timestamptz not null default now(),
  unique (member_id, version)
);
create unique index uq_gaffer_one_active on public.gaffer_identity (member_id)
  where is_active;
```

### 1.3 Event taxonomy registry

```sql
create table public.event_types (
  key text primary key,                      -- 'CAPTAIN_PICKED'
  category text not null
    check (category in ('fantasy','award','gaffer','social','club','member','system')),
  label text not null,
  description text,
  default_visibility text not null default 'members'
    check (default_visibility in ('public','members','private','admin')),
  default_salience int not null default 50 check (default_salience between 0 and 100),
  default_tone text not null default 'neutral'
    check (default_tone in
      ('celebrate','neutral','tease','roast_light','roast_medium','do_not_roast')),
  payload_schema jsonb not null default '{}', -- JSON Schema (doc + validation)
  is_sensitive boolean not null default false, -- forces do_not_roast + private/admin floor
  created_at timestamptz not null default now()
);
```

### 1.4 The immutable factual log + mutable governance

```sql
create table public.member_events (
  id uuid primary key default gen_random_uuid(),
  season_id   uuid references public.seasons(id),
  gameweek_id uuid references public.gameweeks(id),
  subject_member_id uuid references public.members(id),  -- who it's ABOUT (null=club-wide)
  actor_member_id   uuid references public.members(id),  -- who CAUSED it
  event_type text not null references public.event_types(key),
  payload jsonb not null default '{}',
  visibility text not null default 'members'
    check (visibility in ('public','members','private','admin')),
  salience int not null default 50 check (salience between 0 and 100),
  tone_hint text not null default 'neutral'
    check (tone_hint in
      ('celebrate','neutral','tease','roast_light','roast_medium','do_not_roast')),
  occurred_at timestamptz not null,          -- football time (may be backfilled)
  recorded_at timestamptz not null default now(),  -- write time; NEVER changes
  reveal_at   timestamptz,                   -- embargo; not narratable before this
  -- Refinement A: provenance
  origin text not null default 'automatic'
    check (origin in ('automatic','admin_triggered','import','correction','system')),
  source_system text,                        -- 'fantasy_engine','awards_engine','gaffer',...
  source_function text,                      -- emitting edge fn / job name
  source_ref jsonb,                          -- {"table":"...","id":"..."}
  dedupe_key text unique,                    -- idempotency
  content_hash text not null,                -- sha256 of canonical fields
  corrects_event_id uuid references public.member_events(id),
  created_at timestamptz not null default now()
);
create index idx_me_subject_time on public.member_events (subject_member_id, occurred_at desc);
create index idx_me_gameweek on public.member_events (gameweek_id);
create index idx_me_type on public.member_events (event_type);
create index idx_me_vis_time on public.member_events (visibility, occurred_at desc);
create index idx_me_salience on public.member_events (salience desc);

create trigger trg_member_events_immutable
  before update or delete on public.member_events
  for each row execute function public.prevent_mutation();

-- Refinement F + "adjust salience": mutable narrative governance, separate from facts.
create table public.event_narration_control (
  event_id uuid primary key references public.member_events(id) on delete restrict,
  eligible_for_narration boolean not null default true,
  salience_override int check (salience_override between 0 and 100),
  tone_override text
    check (tone_override in
      ('celebrate','neutral','tease','roast_light','roast_medium','do_not_roast')),
  suppressed_reason text,
  suppressed_by uuid references public.members(id),
  suppressed_at timestamptz,
  updated_at timestamptz not null default now()
);
```

### 1.5 Awards, rivalries, running jokes, derived stats

```sql
create table public.awards (
  key text primary key,                      -- 'MANAGER_OF_THE_WEEK'
  name text not null,
  description text,
  cadence text not null default 'weekly' check (cadence in ('weekly','seasonal','one_off')),
  is_positive boolean not null default true, -- celebrate vs roast
  icon text,
  default_visibility text not null default 'members'
    check (default_visibility in ('public','members')),
  created_at timestamptz not null default now()
);

create table public.award_grants (
  id uuid primary key default gen_random_uuid(),
  award_key text not null references public.awards(key),
  member_id uuid not null references public.members(id),
  season_id uuid references public.seasons(id),
  gameweek_id uuid references public.gameweeks(id),
  reason text,                               -- factual citation
  evidence_event_ids uuid[] not null default '{}',
  granted_by text not null default 'system', -- 'system' | admin member id
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (award_key, season_id, gameweek_id, member_id)
);
create trigger trg_award_grants_immutable
  before update or delete on public.award_grants
  for each row execute function public.prevent_mutation();

create table public.rivalries (
  id uuid primary key default gen_random_uuid(),
  member_a_id uuid not null references public.members(id),
  member_b_id uuid not null references public.members(id),
  status text not null default 'active' check (status in ('active','dormant','settled')),
  intensity int not null default 1,
  origin_event_id uuid references public.member_events(id),
  summary text,
  started_at timestamptz not null default now(),
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (member_a_id <> member_b_id)
);

create table public.running_jokes (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  member_id uuid references public.members(id),  -- null = club-wide
  title text not null,
  description text,
  origin_event_id uuid references public.member_events(id),
  status text not null default 'active' check (status in ('active','retired')),
  reference_count int not null default 0,
  last_referenced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Derived cache (non-authoritative; rebuildable from the log).
create table public.member_season_stats (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  total_points int not null default 0,
  best_gameweek int,
  best_gameweek_points int,
  current_rank int,
  awards_count int not null default 0,
  donkey_count int not null default 0,
  biggest_climb int,
  rebuilt_at timestamptz not null default now(),
  unique (member_id, season_id)
);
```

`updated_at` triggers (`update_updated_at_column()`) attach to every table that has the
column **except** the two immutable logs.

---

## 2. RLS policies

Pattern (per repo): `grant select to authenticated`, `grant all to service_role`,
`enable row level security`, explicit policies. **All writes to memory tables are
service-role only** (edge functions) — clients never insert events directly.

```sql
alter table public.member_events enable row level security;
grant select on public.member_events to anon, authenticated;
grant all on public.member_events to service_role;

-- Read by visibility tier (Ruling 4 + conservative-default rule).
create policy me_read_public on public.member_events
  for select to anon, authenticated using (visibility = 'public');

create policy me_read_members on public.member_events
  for select to authenticated
  using (visibility in ('public','members') and public.current_member_id() is not null);

create policy me_read_own_private on public.member_events
  for select to authenticated
  using (visibility = 'private' and subject_member_id = public.current_member_id());

create policy me_admin_all on public.member_events
  for select to authenticated using (public.is_club_admin());

create policy me_service_write on public.member_events
  for all to service_role using (true) with check (true);
-- NOTE: deliberately no INSERT/UPDATE/DELETE policy for anon/authenticated.
-- Plus trg_member_events_immutable blocks UPDATE/DELETE even for service_role.
```

- `award_grants`: same read-by-visibility (joins `awards.default_visibility`); writes
  service-role only; immutable trigger.
- `members`: read own row fully; read others' **public-safe** columns
  (`handle, display_name, kind, avatar_url, is_founding_member`) — enforced by exposing a
  `public.members_public` view rather than the base table to `authenticated`; write own
  non-identity fields via function only.
- `member_profiles`: select where `visibility_default='public'` OR own row OR admin.
- `member_settings`: **private** — select/update own row only (`member_id = current_member_id()`),
  admin read; this is the conservative-default surface (consent/billing-adjacent).
- `event_narration_control`, `seasons`, `gameweeks`, `awards`, `event_types`,
  `rivalries`, `running_jokes`, `member_season_stats`: read for `authenticated`
  (public catalogs); **write service-role/admin only**.

**Conservative-default rule (Chat):** `event_types.default_visibility` and
`awards.default_visibility` ship so that prizes / public awards / Gaffer articles / league
movement default to `public`/`members`, while profile detail / billing / moderation /
redaction / admin actions default to `private`/`admin`. `is_sensitive=true` types are
floored to `private`+`do_not_roast` regardless of caller input.

---

## 3. Immutable triggers

- `trg_member_events_immutable` and `trg_award_grants_immutable` (above) call
  `prevent_mutation()` → any UPDATE/DELETE raises, including via service role. Corrections
  and redactions are **new appended events**, never edits.
- `event_narration_control` is intentionally **not** immutable (it's governance, not fact),
  but every write to it is mirrored by an appended admin `member_event` (done in the admin
  edge function — see §5/E).

---

## 4. Seed data

### 4.1 `event_types` (representative; extensible without migration)

| key | category | default_visibility | salience | default_tone | sensitive |
|---|---|---|---|---|---|
| SQUAD_SUBMITTED | fantasy | members | 30 | neutral | f |
| CAPTAIN_PICKED | fantasy | members | 40 | neutral | f |
| TRANSFER_MADE | fantasy | members | 45 | tease | f |
| GAMEWEEK_SCORED | fantasy | members | 50 | neutral | f |
| RANK_CHANGED | fantasy | members | 45 | neutral | f |
| BIGGEST_CLIMB | fantasy | public | 80 | celebrate | f |
| BIGGEST_FALL | fantasy | members | 70 | roast_light | f |
| CAPTAIN_HAUL | fantasy | public | 75 | celebrate | f |
| CAPTAIN_BLANK | fantasy | members | 65 | roast_light | f |
| AWARD_GRANTED | award | public | 85 | celebrate | f |
| GAFFER_TEAM_SUBMITTED | gaffer | members | 40 | neutral | f |
| GAFFER_PICK_LOCKED | gaffer | members | 50 | neutral | f |
| GAFFER_RESULT | gaffer | public | 70 | neutral | f |
| GAFFER_MISTAKE_OWNED | gaffer | public | 75 | neutral | f |
| GAFFER_ARTICLE_PUBLISHED | gaffer | public | 60 | neutral | f |
| MEMBER_SHOUTOUT | social | members | 60 | celebrate | f |
| RIVALRY_STARTED | social | members | 65 | tease | f |
| JOKE_REFERENCED | social | members | 55 | tease | f |
| FACEBOOK_MENTION | social | members | 40 | neutral | f |
| SEASON_STARTED | club | public | 70 | celebrate | f |
| GAMEWEEK_OPENED | club | members | 30 | neutral | f |
| GAMEWEEK_LOCKED | club | members | 30 | neutral | f |
| COMPETITION_STARTED | club | public | 70 | celebrate | f |
| CHRISTMAS_CHAMPION_CROWNED | club | public | 90 | celebrate | f |
| MEMBER_JOINED | member | members | 40 | celebrate | f |
| FOUNDING_MEMBER | member | members | 50 | celebrate | f |
| MEMBER_MILESTONE | member | members | 55 | celebrate | f |
| MEMBER_REDACTED | member | admin | 10 | do_not_roast | **t** |
| BILLING_EVENT | system | admin | 10 | do_not_roast | **t** |
| MODERATION_ACTION | system | admin | 10 | do_not_roast | **t** |
| ADMIN_CORRECTION | system | admin | 20 | do_not_roast | **t** |
| EVENT_SUPPRESSED | system | admin | 10 | do_not_roast | **t** |
| SALIENCE_ADJUSTED | system | admin | 10 | do_not_roast | **t** |

### 4.2 `awards`

`MANAGER_OF_THE_WEEK` (weekly, +), `DONKEY_OF_THE_WEEK` (weekly, roast),
`MONDAY_TEA` (weekly, +), `BIGGEST_CLIMBER` (weekly, +), `CAPTAIN_COURAGEOUS` (weekly, +),
`TRANSFER_DISASTER` (weekly, roast), `JAMMY_GIT` (weekly, tease), `HOT_STREAK` (seasonal, +),
`CHRISTMAS_CHAMPION` (one_off, +), `KING_OF_THE_CLUB` (seasonal, +).

Plus: seed one `members` row `kind='gaffer'`, its `gaffer_identity` v1 (`is_active`), and a
`kind='system'` member used as `actor` for automated events.

---

## 5. Edge function contract — `emit_memory_event` (the only write path)

**Auth:** service role, or an `admin` member (for manual events). No public access.

**Request:**
```ts
interface EmitMemoryEventInput {
  event_type: string;                       // must exist in event_types
  subject?: { member_id?: string; handle?: string }; // resolved to member
  actor?: { member_id?: string; handle?: string };
  season_id?: string; gameweek_id?: string;
  payload?: Record<string, unknown>;
  visibility?: 'public'|'members'|'private'|'admin'; // capped by sensitivity floor
  salience?: number;                        // 0–100; else type default
  tone_hint?: 'celebrate'|'neutral'|'tease'|'roast_light'|'roast_medium'|'do_not_roast';
  occurred_at?: string;                     // default now()
  reveal_at?: string;
  origin?: 'automatic'|'admin_triggered'|'import'|'correction'|'system';
  source_system?: string; source_function?: string; source_ref?: Record<string, unknown>;
  dedupe_key?: string;
  corrects_event_id?: string;
}
```

**Processing rules:**
1. Look up `event_types[event_type]`; apply defaults for missing `visibility/salience/tone`.
2. **Sensitivity floor:** if `is_sensitive`, force `tone_hint='do_not_roast'` and
   `visibility >= private` (never public/members) regardless of input.
3. Validate `payload` against `payload_schema`.
4. Resolve subject/actor handles → member ids.
5. Compute `content_hash = sha256(canonicalJSON({event_type, subject_member_id,
   gameweek_id, occurred_at, payload}))` — keys sorted, stable. (Phase-2 hash-chain will add
   `prev_hash`; schema already leaves room.)
6. Insert. On `dedupe_key` unique conflict → **return existing row** (idempotent), no error.
7. Return the inserted/existing event.

**Response:** `{ ok: true, event: MemoryEvent, deduped: boolean }`.

---

## 6. RPC / edge contract — `memory_query` → returns a `GafferMemoryBundle`

The Gaffer (and Facebook, and the homepage) **never** get raw memory — only a vetted bundle.

**Request:**
```ts
interface MemoryQueryInput {
  selector: 'weekly_headlines'|'member_story'|'gaffer_article'|'homepage'|'facebook_reply';
  visibility_scope: 'public'|'members'|'admin';  // caller's audience
  season_id?: string; gameweek_id?: string;
  member_id?: string;                            // for member_story / spotlight
  limits?: { headlines?: number; spotlights?: number };
}
```

**Server-side filtering (always applied):**
- Visibility ≤ `visibility_scope`.
- `eligible_for_narration` (from control) is true; `reveal_at is null or reveal_at <= now()`.
- **Consent (C):** exclude/guard members where `allow_public_mentions=false`; cap roast tone
  to each subject's `preferred_roast_level`; if `allow_gaffer_roasts=false` downgrade any
  `roast_*` to `neutral`. Redacted members (`status='deleted'`) → never identified.
- Effective `salience = coalesce(salience_override, salience)`,
  effective `tone = coalesce(tone_override, tone_hint)`; rank by effective salience.

**Response — the contract (Refinement D):**
```ts
interface GafferMemoryBundle {
  visibility_scope: 'public'|'members'|'admin';
  club_context:     { season: SeasonBrief; active_competitions: string[]; theme: Json };
  gameweek_context: { gameweek: GameweekBrief; status: string } | null;
  headline_events:  NarratableEvent[];   // top salience, tone-capped
  member_spotlights:{ member: MemberBrief; events: NarratableEvent[];
                      season_stats: MemberSeasonStats }[];
  awards:           AwardGrantBrief[];
  gaffer_own_team:  { events: NarratableEvent[]; season_stats: MemberSeasonStats } | null;
  rivalries:        RivalryBrief[];
  running_jokes:    RunningJokeBrief[];   // only those "due a callback"
  do_not_mention:   { member_ids: string[]; reasons: string[] }; // consent/redaction
  referenced_event_ids: string[];         // provenance for the generated output
}
interface NarratableEvent {
  id: string; event_type: string; occurred_at: string;
  subject?: MemberBrief; tone: string; salience: number;
  facts: Record<string, unknown>;        // sanitised payload (no PII beyond handle)
}
```

Narration prompt rule (unchanged): *"Use only the provided facts. If it isn't in the bundle,
it didn't happen."* Generators persist `referenced_event_ids` and emit
`GAFFER_ARTICLE_PUBLISHED`.

---

## 7. TypeScript types

Add `src/types/memory.ts` mirroring the tables (`MemoryEvent`, `EventType`, `Member`,
`MemberProfile`, `MemberSettings`, `Season`, `Gameweek`, `Award`, `AwardGrant`, `Rivalry`,
`RunningJoke`, `MemberSeasonStats`, `GafferMemoryBundle`, plus the `emit`/`query` I/O
interfaces above). After the migration is applied, regenerate
`src/integrations/supabase/types.ts` so the new tables are typed end-to-end (existing repo
pattern). Edge functions import shared types from `supabase/functions/_shared/memory.ts`.

---

## 8. Test plan

1. **Immutability:** UPDATE/DELETE on `member_events` & `award_grants` raise. ✅ expected fail.
2. **Append-only correction:** `GAFFER_MISTAKE_OWNED` with `corrects_event_id` inserts; the
   original still present and unchanged.
3. **RLS matrix:** anon sees only `public`; a member sees `public`+`members`+own `private`,
   not others' `private`; admin sees all; non-admin cannot read `admin` rows.
4. **Idempotency:** same `dedupe_key` twice → one row, `deduped:true`.
5. **Sensitivity floor:** emitting `MEMBER_REDACTED`/`BILLING_EVENT` with
   `visibility:'public'` → stored `admin` + `do_not_roast`.
6. **Suppression (F):** set `eligible_for_narration=false` → event absent from
   `memory_query` but present in raw audit; an `EVENT_SUPPRESSED` admin event was appended.
7. **Salience override:** override changes ranking in the bundle; base row unchanged.
8. **Consent (C):** member with `allow_gaffer_roasts=false` never receives `roast_*` tone;
   `allow_public_mentions=false` → on `do_not_mention`.
9. **Embargo:** event with future `reveal_at` excluded until time passes.
10. **content_hash:** deterministic for identical canonical input; differs on payload change.
11. **GDPR:** redaction clears PII, anonymises handle to "Former Member", appends
    `MEMBER_REDACTED`, and no bundle reveals prior identity.
12. **Gaffer-as-member:** Gaffer events/awards/rivalries flow through the same tables; no
    scoring privilege paths exist.

Delivered as SQL/Deno tests + a seed fixture; runnable against a local Supabase shadow DB.

## 9. Rollback plan

- Entire engine ships in **one migration**; it **adds only new objects** and touches no
  existing table → safe to reverse.
- Down migration drops in reverse FK order: triggers → policies → tables
  (`member_season_stats, running_jokes, rivalries, award_grants, awards,
  event_narration_control, member_events, event_types, gaffer_identity, member_settings,
  member_profiles, members, gameweeks, seasons`) → helper functions.
- No existing product data is migrated or mutated, so rollback cannot lose live data.
- Edge functions (`emit_memory_event`, `memory_query`) are additive and independently
  removable; nothing in the current app calls them until later pillars wire them in.

## 10. Integration with existing Supabase / auth / subscription tables

- **Auth:** `members.user_id → auth.users(id)`. On signup, an edge function (or
  `handle_new_user` trigger consistent with repo style) creates `members` + `member_profiles`
  + `member_settings`. `is_founding_member` = joined before a configured launch timestamp.
- **Subscriptions (untouched per Ruling 3 pricing):** membership "active" status reuses the
  existing `subscriptions` table / `has_active_subscription(user_uuid, env)` — the Memory
  Engine does **not** duplicate billing. The `members` visibility tier means *authenticated
  club member*; premium **paywall** gating stays at the feature layer via the existing
  `useSubscription()` hook, not in memory RLS.
- **Content:** Gaffer articles continue to live in the existing `blog_posts`; provenance is
  captured by the `GAFFER_ARTICLE_PUBLISHED` event's `referenced_event_ids` (no `blog_posts`
  schema change required in v1).
- **Social:** `FACEBOOK_MENTION` ingestion and Gaffer replies reuse the existing
  `publish-to-social` / social-card functions in a later pillar.
- **Existing seeds of memory** (`gaffer_learning_log`, `challenge_log`, `sweepstake_signups`)
  are left in place; a later optional backfill can import relevant history as
  `origin='import'` events. No existing table is renamed or altered.
- **Admin:** the current unauthenticated `/admin` page is **out of scope** here but flagged —
  Club admin actions in this engine require `is_club_admin()`, and securing the legacy admin
  surface is a separate follow-up.

---

### Open items for Chat to confirm before coding
1. Default **`preferred_roast_level`** = `light` (members can opt up to `standard`) — OK, or
   default `standard`?
2. Confirm membership "active" should reuse **`has_active_subscription`** rather than a new
   flag.
3. OK to introduce **`members.app_role='admin'`** as the Club admin mechanism (and secure the
   legacy `/admin` page separately)?
4. Confirm v1 ships **`emit_memory_event` + `memory_query`** as the only two edge functions
   (everything else — fantasy scoring, awards evaluation, Gaffer generation — is a later
   pillar that calls these).

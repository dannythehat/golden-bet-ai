-- ============================================================================
-- Footy Oracle Club — Memory Engine v1
-- Additive migration. Adds only NEW objects. Touches no existing table.
-- Principle: the database remembers; the Gaffer narrates.
--   - member_events        = immutable factual log (append-only)
--   - event_narration_control = mutable narrative governance (auditable)
-- ============================================================================

-- ── Helper: append-only guard ──────────────────────────────────────────────
create or replace function public.prevent_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Table %.% is append-only; % is not permitted',
    tg_table_schema, tg_table_name, tg_op;
end; $$;

-- ── 1. Structure & identity ────────────────────────────────────────────────
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'upcoming'
    check (status in ('upcoming','active','completed','archived')),
  starts_at timestamptz,
  ends_at   timestamptz,
  theme jsonb not null default '{}',
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
  deadline_at timestamptz,
  settles_at  timestamptz,
  reveal_at   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, number)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  kind text not null default 'human' check (kind in ('human','gaffer','system')),
  app_role text not null default 'member' check (app_role in ('member','admin')),
  handle text not null unique,
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
  voice jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (member_id, version)
);
create unique index uq_gaffer_one_active on public.gaffer_identity (member_id) where is_active;

-- ── Identity helper functions (depend on members) ──────────────────────────
create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_club_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members
                 where user_id = auth.uid() and app_role = 'admin');
$$;

-- ── 2. Event taxonomy registry ─────────────────────────────────────────────
create table public.event_types (
  key text primary key,
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
  payload_schema jsonb not null default '{}',
  is_sensitive boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── 3. Immutable factual log ───────────────────────────────────────────────
create table public.member_events (
  id uuid primary key default gen_random_uuid(),
  season_id   uuid references public.seasons(id),
  gameweek_id uuid references public.gameweeks(id),
  subject_member_id uuid references public.members(id),
  actor_member_id   uuid references public.members(id),
  event_type text not null references public.event_types(key),
  payload jsonb not null default '{}',
  visibility text not null default 'members'
    check (visibility in ('public','members','private','admin')),
  salience int not null default 50 check (salience between 0 and 100),
  tone_hint text not null default 'neutral'
    check (tone_hint in
      ('celebrate','neutral','tease','roast_light','roast_medium','do_not_roast')),
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  reveal_at   timestamptz,
  -- Refinement A: provenance
  origin text not null default 'automatic'
    check (origin in ('automatic','admin_triggered','import','correction','system')),
  source_system text,
  source_function text,
  source_ref jsonb,
  dedupe_key text unique,
  content_hash text not null,
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

-- Refinement F + salience adjust: mutable narrative governance, separate from facts.
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

-- ── 4. Awards, rivalries, running jokes, derived stats ─────────────────────
create table public.awards (
  key text primary key,
  name text not null,
  description text,
  cadence text not null default 'weekly' check (cadence in ('weekly','seasonal','one_off')),
  is_positive boolean not null default true,
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
  reason text,
  evidence_event_ids uuid[] not null default '{}',
  granted_by text not null default 'system',
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
  member_id uuid references public.members(id),
  title text not null,
  description text,
  origin_event_id uuid references public.member_events(id),
  status text not null default 'active' check (status in ('active','retired')),
  reference_count int not null default 0,
  last_referenced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

-- ── updated_at triggers (reuses existing public.update_updated_at_column()) ─
-- (Immutable logs deliberately excluded.)
create trigger trg_seasons_updated        before update on public.seasons             for each row execute function public.update_updated_at_column();
create trigger trg_gameweeks_updated       before update on public.gameweeks           for each row execute function public.update_updated_at_column();
create trigger trg_members_updated         before update on public.members             for each row execute function public.update_updated_at_column();
create trigger trg_member_profiles_updated before update on public.member_profiles     for each row execute function public.update_updated_at_column();
create trigger trg_member_settings_updated before update on public.member_settings     for each row execute function public.update_updated_at_column();
create trigger trg_narration_ctl_updated   before update on public.event_narration_control for each row execute function public.update_updated_at_column();
create trigger trg_rivalries_updated       before update on public.rivalries           for each row execute function public.update_updated_at_column();
create trigger trg_running_jokes_updated   before update on public.running_jokes       for each row execute function public.update_updated_at_column();

-- ── Public-safe member view (only non-PII identity columns) ────────────────
create view public.members_public as
  select id, handle, display_name, kind, avatar_url, is_founding_member
  from public.members
  where status <> 'deleted';
grant select on public.members_public to authenticated;

-- ============================================================================
-- RLS
-- All memory writes are service-role only (edge functions). Clients never
-- insert events. Reads are gated by the four visibility tiers.
-- ============================================================================

-- member_events -------------------------------------------------------------
alter table public.member_events enable row level security;
grant select on public.member_events to anon, authenticated;
grant all on public.member_events to service_role;

create policy me_read_public on public.member_events
  for select to anon, authenticated using (visibility = 'public');
create policy me_read_members on public.member_events
  for select to authenticated
  using (visibility in ('public','members') and public.current_member_id() is not null);
create policy me_read_own_private on public.member_events
  for select to authenticated
  using (visibility = 'private' and subject_member_id = public.current_member_id());
create policy me_admin_read on public.member_events
  for select to authenticated using (public.is_club_admin());
create policy me_service_write on public.member_events
  for all to service_role using (true) with check (true);

-- event_narration_control (governance; admin/service writes, admin reads) ----
alter table public.event_narration_control enable row level security;
grant all on public.event_narration_control to service_role;
grant select on public.event_narration_control to authenticated;
create policy nc_admin_read on public.event_narration_control
  for select to authenticated using (public.is_club_admin());
create policy nc_service_all on public.event_narration_control
  for all to service_role using (true) with check (true);

-- award_grants --------------------------------------------------------------
alter table public.award_grants enable row level security;
grant select on public.award_grants to anon, authenticated;
grant all on public.award_grants to service_role;
create policy ag_read_by_award_visibility on public.award_grants
  for select to anon, authenticated using (
    exists (select 1 from public.awards a
            where a.key = award_grants.award_key
              and (a.default_visibility = 'public'
                   or (a.default_visibility = 'members' and public.current_member_id() is not null)))
  );
create policy ag_admin_read on public.award_grants
  for select to authenticated using (public.is_club_admin());
create policy ag_service_all on public.award_grants
  for all to service_role using (true) with check (true);

-- members -------------------------------------------------------------------
alter table public.members enable row level security;
grant select on public.members to authenticated;
grant all on public.members to service_role;
create policy members_read_own on public.members
  for select to authenticated using (user_id = auth.uid());
create policy members_admin_read on public.members
  for select to authenticated using (public.is_club_admin());
create policy members_service_all on public.members
  for all to service_role using (true) with check (true);

-- member_profiles -----------------------------------------------------------
alter table public.member_profiles enable row level security;
grant select, update on public.member_profiles to authenticated;
grant all on public.member_profiles to service_role;
create policy mp_read on public.member_profiles
  for select to authenticated using (
    visibility_default = 'public'
    or member_id = public.current_member_id()
    or public.is_club_admin()
  );
create policy mp_read_public_anon on public.member_profiles
  for select to anon using (visibility_default = 'public');
create policy mp_update_own on public.member_profiles
  for update to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());
create policy mp_service_all on public.member_profiles
  for all to service_role using (true) with check (true);

-- member_settings (private) -------------------------------------------------
alter table public.member_settings enable row level security;
grant select, update on public.member_settings to authenticated;
grant all on public.member_settings to service_role;
create policy ms_rw_own on public.member_settings
  for select to authenticated
  using (member_id = public.current_member_id() or public.is_club_admin());
create policy ms_update_own on public.member_settings
  for update to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());
create policy ms_service_all on public.member_settings
  for all to service_role using (true) with check (true);

-- Read-mostly catalogs / derived (authenticated read; service/admin write) ---
alter table public.seasons enable row level security;
alter table public.gameweeks enable row level security;
alter table public.event_types enable row level security;
alter table public.awards enable row level security;
alter table public.gaffer_identity enable row level security;
alter table public.rivalries enable row level security;
alter table public.running_jokes enable row level security;
alter table public.member_season_stats enable row level security;

grant select on public.seasons, public.gameweeks, public.event_types, public.awards,
               public.gaffer_identity, public.rivalries, public.running_jokes,
               public.member_season_stats to anon, authenticated;
grant all on public.seasons, public.gameweeks, public.event_types, public.awards,
             public.gaffer_identity, public.rivalries, public.running_jokes,
             public.member_season_stats to service_role;

create policy seasons_read on public.seasons for select to anon, authenticated using (true);
create policy seasons_service on public.seasons for all to service_role using (true) with check (true);
create policy gameweeks_read on public.gameweeks for select to anon, authenticated using (true);
create policy gameweeks_service on public.gameweeks for all to service_role using (true) with check (true);
create policy event_types_read on public.event_types for select to anon, authenticated using (true);
create policy event_types_service on public.event_types for all to service_role using (true) with check (true);
create policy awards_read on public.awards for select to anon, authenticated using (true);
create policy awards_service on public.awards for all to service_role using (true) with check (true);
create policy gaffer_identity_read on public.gaffer_identity for select to anon, authenticated using (true);
create policy gaffer_identity_service on public.gaffer_identity for all to service_role using (true) with check (true);
create policy rivalries_read on public.rivalries for select to anon, authenticated using (true);
create policy rivalries_service on public.rivalries for all to service_role using (true) with check (true);
create policy running_jokes_read on public.running_jokes for select to anon, authenticated using (true);
create policy running_jokes_service on public.running_jokes for all to service_role using (true) with check (true);
create policy mss_read on public.member_season_stats for select to anon, authenticated using (true);
create policy mss_service on public.member_season_stats for all to service_role using (true) with check (true);

-- ============================================================================
-- Seed data
-- ============================================================================

-- Event types --------------------------------------------------------------
insert into public.event_types (key, category, label, default_visibility, default_salience, default_tone, is_sensitive) values
  ('SQUAD_SUBMITTED','fantasy','Squad submitted','members',30,'neutral',false),
  ('CAPTAIN_PICKED','fantasy','Captain picked','members',40,'neutral',false),
  ('TRANSFER_MADE','fantasy','Transfer made','members',45,'tease',false),
  ('GAMEWEEK_SCORED','fantasy','Gameweek scored','members',50,'neutral',false),
  ('RANK_CHANGED','fantasy','Rank changed','members',45,'neutral',false),
  ('BIGGEST_CLIMB','fantasy','Biggest climb','public',80,'celebrate',false),
  ('BIGGEST_FALL','fantasy','Biggest fall','members',70,'roast_light',false),
  ('CAPTAIN_HAUL','fantasy','Captain haul','public',75,'celebrate',false),
  ('CAPTAIN_BLANK','fantasy','Captain blank','members',65,'roast_light',false),
  ('AWARD_GRANTED','award','Award granted','public',85,'celebrate',false),
  ('GAFFER_TEAM_SUBMITTED','gaffer','Gaffer team submitted','members',40,'neutral',false),
  ('GAFFER_PICK_LOCKED','gaffer','Gaffer pick locked','members',50,'neutral',false),
  ('GAFFER_RESULT','gaffer','Gaffer result','public',70,'neutral',false),
  ('GAFFER_MISTAKE_OWNED','gaffer','Gaffer owns a mistake','public',75,'neutral',false),
  ('GAFFER_ARTICLE_PUBLISHED','gaffer','Gaffer article published','public',60,'neutral',false),
  ('MEMBER_SHOUTOUT','social','Member shoutout','members',60,'celebrate',false),
  ('RIVALRY_STARTED','social','Rivalry started','members',65,'tease',false),
  ('JOKE_REFERENCED','social','Running joke referenced','members',55,'tease',false),
  ('FACEBOOK_MENTION','social','Facebook mention','members',40,'neutral',false),
  ('SEASON_STARTED','club','Season started','public',70,'celebrate',false),
  ('GAMEWEEK_OPENED','club','Gameweek opened','members',30,'neutral',false),
  ('GAMEWEEK_LOCKED','club','Gameweek locked','members',30,'neutral',false),
  ('COMPETITION_STARTED','club','Competition started','public',70,'celebrate',false),
  ('CHRISTMAS_CHAMPION_CROWNED','club','Christmas champion crowned','public',90,'celebrate',false),
  ('MEMBER_JOINED','member','Member joined','members',40,'celebrate',false),
  ('FOUNDING_MEMBER','member','Founding member','members',50,'celebrate',false),
  ('MEMBER_MILESTONE','member','Member milestone','members',55,'celebrate',false),
  ('MEMBER_REDACTED','member','Member redacted','admin',10,'do_not_roast',true),
  ('BILLING_EVENT','system','Billing event','admin',10,'do_not_roast',true),
  ('MODERATION_ACTION','system','Moderation action','admin',10,'do_not_roast',true),
  ('ADMIN_CORRECTION','system','Admin correction','admin',20,'do_not_roast',true),
  ('EVENT_SUPPRESSED','system','Event suppressed from narration','admin',10,'do_not_roast',true),
  ('SALIENCE_ADJUSTED','system','Salience adjusted','admin',10,'do_not_roast',true);

-- Awards --------------------------------------------------------------------
insert into public.awards (key, name, cadence, is_positive, default_visibility) values
  ('MANAGER_OF_THE_WEEK','Manager of the Week','weekly',true,'public'),
  ('DONKEY_OF_THE_WEEK','Donkey of the Week','weekly',false,'members'),
  ('MONDAY_TEA','Monday Tea Award','weekly',true,'members'),
  ('BIGGEST_CLIMBER','Biggest Climber','weekly',true,'public'),
  ('CAPTAIN_COURAGEOUS','Captain Courageous','weekly',true,'members'),
  ('TRANSFER_DISASTER','Transfer Disaster','weekly',false,'members'),
  ('JAMMY_GIT','Jammy Git Award','weekly',true,'members'),
  ('HOT_STREAK','Hot Streak','seasonal',true,'public'),
  ('CHRISTMAS_CHAMPION','Christmas Champion','one_off',true,'public'),
  ('KING_OF_THE_CLUB','King of the Club','seasonal',true,'public');

-- System + Gaffer members ---------------------------------------------------
insert into public.members (kind, app_role, handle, display_name, status)
values ('system','member','@system','System', 'active');

insert into public.members (kind, app_role, handle, display_name, status)
values ('gaffer','member','@thegaffer','The Gaffer','active');

insert into public.member_profiles (member_id, bio, visibility_default)
select id, 'The fictional manager who runs the Footy Oracle Club.', 'public'
from public.members where handle = '@thegaffer';

insert into public.member_settings (member_id, preferred_roast_level)
select id, 'standard' from public.members where handle in ('@thegaffer','@system');

insert into public.gaffer_identity (member_id, version, is_active, bio, backstory, voice)
select id, 1, true,
  'The Gaffer — straight-talking AI football manager who runs the Club.',
  'A seasoned lower-league gaffer made good; remembers every captain howler.',
  '{"tone":"warm, sharp, one-of-the-lads","catchphrases":[],"never":["mock billing, deletions, moderation or personal issues"]}'
from public.members where handle = '@thegaffer';

-- ============================================================================
-- Auto-provision a club member on signup (additive; never blocks signup).
-- ============================================================================
create or replace function public.handle_new_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_member_id uuid;
  v_handle text;
  v_name text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'display_name',
                     split_part(coalesce(new.email,'member'), '@', 1));
  v_handle := '@user_' || replace(new.id::text, '-', '');
  begin
    insert into public.members (user_id, kind, handle, display_name)
    values (new.id, 'human', left(v_handle, 40), v_name)
    on conflict (user_id) do nothing
    returning id into v_member_id;

    if v_member_id is not null then
      insert into public.member_profiles (member_id) values (v_member_id)
        on conflict (member_id) do nothing;
      insert into public.member_settings (member_id) values (v_member_id)
        on conflict (member_id) do nothing;
    end if;
  exception when others then
    -- Never let Club provisioning block account creation.
    raise warning 'handle_new_member failed for %: %', new.id, sqlerrm;
  end;
  return new;
end; $$;

create trigger trg_auth_user_new_member
  after insert on auth.users
  for each row execute function public.handle_new_member();

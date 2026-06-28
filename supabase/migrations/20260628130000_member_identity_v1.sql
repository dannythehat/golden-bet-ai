-- ============================================================================
-- Footy Oracle Club — Member Identity + Backfill v1
-- Additive. Backfills existing auth.users into the Club member tables, adds
-- human-friendly unique handle generation, founding-member logic (INTERNAL —
-- no front-facing badge), and emits MEMBER_JOINED / FOUNDING_MEMBER events.
-- Uses Postgres built-in sha256() (no pgcrypto dependency).
-- ============================================================================

-- ── Founding: keep it internal/admin-only (no public badge UX) ─────────────
update public.event_types
  set default_visibility = 'admin', default_salience = 10
  where key = 'FOUNDING_MEMBER';

-- New event type for transparency on handle changes.
insert into public.event_types (key, category, label, default_visibility, default_salience, default_tone, is_sensitive)
values ('MEMBER_HANDLE_CHANGED','member','Member handle changed','members',20,'neutral',false)
on conflict (key) do nothing;

-- ── Single-row club config (founding cutoff is configurable) ───────────────
create table public.club_config (
  id boolean primary key default true check (id),
  founding_cutoff_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into public.club_config (id) values (true) on conflict do nothing;
create trigger trg_club_config_updated before update on public.club_config
  for each row execute function public.update_updated_at_column();
alter table public.club_config enable row level security;
grant select on public.club_config to authenticated;
grant all on public.club_config to service_role;
create policy club_config_admin_read on public.club_config
  for select to authenticated using (public.is_club_admin());
create policy club_config_service on public.club_config
  for all to service_role using (true) with check (true);

-- ── Reserved handles ───────────────────────────────────────────────────────
create table public.reserved_handles (handle text primary key);
insert into public.reserved_handles (handle) values
  ('@thegaffer'),('@system'),('@admin'),('@gaffer'),('@footyoracle'),('@mod'),('@support')
on conflict do nothing;
alter table public.reserved_handles enable row level security;
grant select on public.reserved_handles to anon, authenticated;
grant all on public.reserved_handles to service_role;
create policy reserved_read on public.reserved_handles for select to anon, authenticated using (true);
create policy reserved_service on public.reserved_handles for all to service_role using (true) with check (true);

-- ── Unique, human-friendly handle generation ───────────────────────────────
create or replace function public.generate_unique_handle(seed text)
returns text language plpgsql as $$
declare base text; cand text; n int := 1;
begin
  -- slugify: lowercase, keep [a-z0-9_], must start with a letter, length 3..20
  base := regexp_replace(lower(coalesce(seed,'')), '[^a-z0-9_]+', '', 'g');
  base := regexp_replace(base, '^[^a-z]+', '');
  base := left(base, 20);
  if length(base) < 3 then base := 'member'; end if;
  cand := base;
  loop
    if not exists (select 1 from public.members where handle = '@'||cand)
       and not exists (select 1 from public.reserved_handles where handle = '@'||cand) then
      return '@'||cand;
    end if;
    n := n + 1;
    if n > 50 then
      cand := left(base, 12) || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
    else
      cand := left(base, 17) || '-' || n::text;
    end if;
  end loop;
end; $$;

-- Canonical-ish content hash for SQL-emitted (import/automatic) events.
create or replace function public.me_content_hash(p_event_type text, p_subject uuid, p_occurred timestamptz, p_payload jsonb)
returns text language sql immutable as $$
  select encode(sha256(convert_to(
    p_event_type || '|' || coalesce(p_subject::text,'') || '|' || p_occurred::text || '|' || coalesce(p_payload::text,'{}'),
    'UTF8')), 'hex');
$$;

-- ── Replace the signup trigger: friendly handle + founding + events ────────
create or replace function public.handle_new_member()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_member_id uuid;
  v_handle text;
  v_name text;
  v_founding boolean;
  v_cutoff timestamptz;
  v_system uuid;
begin
  v_name := coalesce(new.raw_user_meta_data->>'display_name',
                     split_part(coalesce(new.email,'member'), '@', 1));
  begin
    select founding_cutoff_at into v_cutoff from public.club_config limit 1;
    select id into v_system from public.members where kind = 'system' limit 1;
    v_handle := public.generate_unique_handle(v_name);
    v_founding := coalesce(new.created_at, now()) < coalesce(v_cutoff, now());

    insert into public.members (user_id, kind, handle, display_name, is_founding_member)
    values (new.id, 'human', v_handle, v_name, v_founding)
    on conflict (user_id) do nothing
    returning id into v_member_id;

    if v_member_id is not null then
      insert into public.member_profiles (member_id) values (v_member_id) on conflict (member_id) do nothing;
      insert into public.member_settings (member_id) values (v_member_id) on conflict (member_id) do nothing;

      insert into public.member_events
        (subject_member_id, actor_member_id, event_type, payload, visibility, salience, tone_hint,
         occurred_at, origin, source_function, dedupe_key, content_hash)
      values
        (v_member_id, v_system, 'MEMBER_JOINED', '{}'::jsonb, 'members', 40, 'celebrate',
         now(), 'automatic', 'handle_new_member', 'member_joined:'||new.id,
         public.me_content_hash('MEMBER_JOINED', v_member_id, now(), '{}'::jsonb))
      on conflict (dedupe_key) do nothing;

      if v_founding then
        insert into public.member_events
          (subject_member_id, actor_member_id, event_type, payload, visibility, salience, tone_hint,
           occurred_at, origin, source_function, dedupe_key, content_hash)
        values
          (v_member_id, v_system, 'FOUNDING_MEMBER', '{}'::jsonb, 'admin', 10, 'neutral',
           now(), 'automatic', 'handle_new_member', 'founding:'||new.id,
           public.me_content_hash('FOUNDING_MEMBER', v_member_id, now(), '{}'::jsonb))
        on conflict (dedupe_key) do nothing;
      end if;
    end if;
  exception when others then
    raise warning 'handle_new_member failed for %: %', new.id, sqlerrm;
  end;
  return new;
end; $$;

-- ============================================================================
-- One-off BACKFILL of existing users (idempotent; dedupe-keyed events).
-- Looped so generate_unique_handle sees prior inserts (no in-batch collisions).
-- ============================================================================
do $$
declare
  r record;
  v_member_id uuid;
  v_handle text;
  v_name text;
  v_founding boolean;
  v_cutoff timestamptz;
  v_system uuid;
begin
  select founding_cutoff_at into v_cutoff from public.club_config limit 1;
  select id into v_system from public.members where kind = 'system' limit 1;

  for r in
    select u.id, u.email, u.created_at, u.raw_user_meta_data
    from auth.users u
    left join public.members m on m.user_id = u.id
    where m.id is null
  loop
    v_name := coalesce(r.raw_user_meta_data->>'display_name',
                       split_part(coalesce(r.email,'member'), '@', 1));
    v_handle := public.generate_unique_handle(v_name);
    v_founding := coalesce(r.created_at, now()) < coalesce(v_cutoff, now());

    insert into public.members (user_id, kind, handle, display_name, joined_at, is_founding_member)
    values (r.id, 'human', v_handle, v_name, coalesce(r.created_at, now()), v_founding)
    returning id into v_member_id;

    insert into public.member_profiles (member_id) values (v_member_id) on conflict (member_id) do nothing;
    insert into public.member_settings (member_id) values (v_member_id) on conflict (member_id) do nothing;

    insert into public.member_events
      (subject_member_id, actor_member_id, event_type, payload, visibility, salience, tone_hint,
       occurred_at, origin, source_function, dedupe_key, content_hash)
    values
      (v_member_id, v_system, 'MEMBER_JOINED', jsonb_build_object('backfill', true), 'members', 40, 'celebrate',
       coalesce(r.created_at, now()), 'import', 'member_identity_v1_backfill', 'member_joined:'||r.id,
       public.me_content_hash('MEMBER_JOINED', v_member_id, coalesce(r.created_at, now()), jsonb_build_object('backfill', true)))
    on conflict (dedupe_key) do nothing;

    if v_founding then
      insert into public.member_events
        (subject_member_id, actor_member_id, event_type, payload, visibility, salience, tone_hint,
         occurred_at, origin, source_function, dedupe_key, content_hash)
      values
        (v_member_id, v_system, 'FOUNDING_MEMBER', '{}'::jsonb, 'admin', 10, 'neutral',
         coalesce(r.created_at, now()), 'import', 'member_identity_v1_backfill', 'founding:'||r.id,
         public.me_content_hash('FOUNDING_MEMBER', v_member_id, coalesce(r.created_at, now()), '{}'::jsonb))
      on conflict (dedupe_key) do nothing;
    end if;
  end loop;
end $$;

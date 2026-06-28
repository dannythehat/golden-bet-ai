-- ============================================================================
-- Footy Oracle Club — Memory Engine v1 DB smoke test (plain SQL asserts).
-- Run against a DB with the memory_engine_v1 migration applied, e.g.:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/memory_engine_test.sql
-- Wrapped in a rollback so it never persists test data.
-- ============================================================================
begin;

-- Seeds exist ---------------------------------------------------------------
do $$
begin
  assert (select count(*) from public.event_types) >= 30, 'event_types not seeded';
  assert (select count(*) from public.awards) = 10, 'awards not seeded';
  assert exists (select 1 from public.members where handle = '@thegaffer' and kind = 'gaffer'),
    'gaffer member missing';
  assert exists (select 1 from public.gaffer_identity where is_active), 'no active gaffer identity';
  assert (select is_sensitive from public.event_types where key = 'MEMBER_REDACTED') = true,
    'MEMBER_REDACTED must be sensitive';
end $$;

-- Set up a season + member to attach an event to -----------------------------
insert into public.seasons (id, slug, name, status, is_current)
values ('00000000-0000-0000-0000-0000000000aa', 'test-26', 'Test', 'active', false);

insert into public.members (id, kind, handle, display_name)
values ('00000000-0000-0000-0000-0000000000bb', 'human', '@testmember', 'Test Member');

insert into public.member_events
  (id, season_id, subject_member_id, event_type, payload, visibility, salience, tone_hint,
   occurred_at, content_hash)
values
  ('00000000-0000-0000-0000-0000000000cc',
   '00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000000bb',
   'GAMEWEEK_SCORED', '{"points":64}', 'members', 50, 'neutral',
   now(), 'deadbeef');

-- Immutability: UPDATE must raise -------------------------------------------
do $$
declare ok boolean := false;
begin
  begin
    update public.member_events set salience = 99
      where id = '00000000-0000-0000-0000-0000000000cc';
  exception when others then ok := true;
  end;
  assert ok, 'member_events UPDATE should have been blocked by prevent_mutation()';
end $$;

-- Immutability: DELETE must raise -------------------------------------------
do $$
declare ok boolean := false;
begin
  begin
    delete from public.member_events where id = '00000000-0000-0000-0000-0000000000cc';
  exception when others then ok := true;
  end;
  assert ok, 'member_events DELETE should have been blocked by prevent_mutation()';
end $$;

-- Governance is mutable (separate table) ------------------------------------
insert into public.event_narration_control (event_id, eligible_for_narration)
values ('00000000-0000-0000-0000-0000000000cc', false);
update public.event_narration_control set salience_override = 5
  where event_id = '00000000-0000-0000-0000-0000000000cc';  -- must succeed
do $$
begin
  assert (select eligible_for_narration from public.event_narration_control
          where event_id = '00000000-0000-0000-0000-0000000000cc') = false,
    'narration control row not written';
end $$;

-- dedupe_key uniqueness ------------------------------------------------------
do $$
declare ok boolean := false;
begin
  insert into public.member_events (event_type, payload, occurred_at, content_hash, dedupe_key)
  values ('MEMBER_MILESTONE', '{}', now(), 'h1', 'dup-key-1');
  begin
    insert into public.member_events (event_type, payload, occurred_at, content_hash, dedupe_key)
    values ('MEMBER_MILESTONE', '{}', now(), 'h2', 'dup-key-1');
  exception when unique_violation then ok := true;
  end;
  assert ok, 'dedupe_key uniqueness not enforced';
end $$;

rollback;  -- nothing persists
\echo 'memory_engine_test.sql: all assertions passed'

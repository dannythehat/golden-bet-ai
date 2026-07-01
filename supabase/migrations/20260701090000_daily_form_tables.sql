-- ============================================================================
-- Footy Oracle — daily_form_tables: today's assembled FORM TABLE slate.
-- Built at the 03:00 refresh from today's fixtures + last-10 form, stored as
-- one row per day so the /form-tables page reads it directly (public-read),
-- with the static snapshot as a fallback. Additive.
-- ============================================================================
create table public.daily_form_tables (
  id uuid primary key default gen_random_uuid(),
  table_date date not null,
  leagues jsonb not null default '[]',     -- { name, region }[]
  fixtures jsonb not null default '[]',    -- FormFixtureRow[] (see src/types/footy.ts)
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (table_date)
);
create index idx_daily_form_tables_date on public.daily_form_tables (table_date desc);

create trigger trg_daily_form_tables_updated before update on public.daily_form_tables
  for each row execute function public.update_updated_at_column();

-- Public read (the tables are a trust signal); writes are service-role only.
alter table public.daily_form_tables enable row level security;
grant select on public.daily_form_tables to anon, authenticated;
grant all on public.daily_form_tables to service_role;
create policy daily_form_tables_read on public.daily_form_tables for select to anon, authenticated using (true);
create policy daily_form_tables_service on public.daily_form_tables for all to service_role using (true) with check (true);

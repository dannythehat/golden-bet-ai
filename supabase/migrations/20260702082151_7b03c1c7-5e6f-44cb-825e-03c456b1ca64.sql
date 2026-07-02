create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create table if not exists public.form_tables (
  id uuid primary key default gen_random_uuid(),
  league_id integer not null, league_name text not null,
  team_id integer, team text not null,
  window_size integer not null default 10,
  stats jsonb not null default '{}',
  updated_at timestamptz not null default now(), created_at timestamptz not null default now(),
  unique (league_id, team, window_size)
);
create index if not exists idx_form_tables_league on public.form_tables (league_id);

create table if not exists public.gaffer_picks (
  id uuid primary key default gen_random_uuid(),
  pick_date date not null,
  bet_type text not null default 'none' check (bet_type in ('none','single','double')),
  stake numeric not null default 0, combined_odds numeric not null default 0,
  potential_return numeric not null default 0,
  legs jsonb not null default '[]', reasoning text, title text, gaffer_intro text,
  status text not null default 'pending' check (status in ('pending','published','live','active','won','lost','void')),
  profit_loss numeric, settled_at timestamptz,
  potential_returns numeric generated always as (potential_return) stored,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (pick_date)
);
create index if not exists idx_gaffer_picks_date on public.gaffer_picks (pick_date desc);
create index if not exists idx_gaffer_picks_status on public.gaffer_picks (status);

create table if not exists public.daily_form_tables (
  id uuid primary key default gen_random_uuid(),
  table_date date not null,
  leagues jsonb not null default '[]', fixtures jsonb not null default '[]',
  updated_at timestamptz not null default now(), created_at timestamptz not null default now(),
  unique (table_date)
);
create index if not exists idx_daily_form_tables_date on public.daily_form_tables (table_date desc);

drop trigger if exists trg_form_tables_updated on public.form_tables;
create trigger trg_form_tables_updated before update on public.form_tables for each row execute function public.update_updated_at_column();
drop trigger if exists trg_gaffer_picks_updated on public.gaffer_picks;
create trigger trg_gaffer_picks_updated before update on public.gaffer_picks for each row execute function public.update_updated_at_column();
drop trigger if exists trg_daily_form_tables_updated on public.daily_form_tables;
create trigger trg_daily_form_tables_updated before update on public.daily_form_tables for each row execute function public.update_updated_at_column();

alter table public.form_tables enable row level security;
alter table public.gaffer_picks enable row level security;
alter table public.daily_form_tables enable row level security;
grant select on public.form_tables, public.gaffer_picks, public.daily_form_tables to anon, authenticated;
grant all on public.form_tables, public.gaffer_picks, public.daily_form_tables to service_role;

drop policy if exists ft_read on public.form_tables;   create policy ft_read on public.form_tables for select to anon, authenticated using (true);
drop policy if exists ft_svc  on public.form_tables;   create policy ft_svc  on public.form_tables for all to service_role using (true) with check (true);
drop policy if exists gp_read on public.gaffer_picks;  create policy gp_read on public.gaffer_picks for select to anon, authenticated using (true);
drop policy if exists gp_svc  on public.gaffer_picks;  create policy gp_svc  on public.gaffer_picks for all to service_role using (true) with check (true);
drop policy if exists dft_read on public.daily_form_tables; create policy dft_read on public.daily_form_tables for select to anon, authenticated using (true);
drop policy if exists dft_svc  on public.daily_form_tables; create policy dft_svc  on public.daily_form_tables for all to service_role using (true) with check (true);
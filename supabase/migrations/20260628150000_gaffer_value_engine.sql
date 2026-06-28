-- ============================================================================
-- Footy Oracle — Gaffer value engine storage
-- form_tables : last-N form per team per league (powers /form-tables + engine)
-- gaffer_picks: the Gaffer's daily value picks + settlement + P&L (powers /pnl)
-- Additive. Public-read (trust signal); writes are service-role only.
-- ============================================================================

create table public.form_tables (
  id uuid primary key default gen_random_uuid(),
  league_id integer not null,            -- FootyStats season_id
  league_name text not null,
  team_id integer,
  team text not null,
  window_size integer not null default 10,
  stats jsonb not null default '{}',     -- { overPct:{market:pct}, avgGoals, avgCorners, avgCards }
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (league_id, team, window_size)
);
create index idx_form_tables_league on public.form_tables (league_id);

create table public.gaffer_picks (
  id uuid primary key default gen_random_uuid(),
  pick_date date not null,
  bet_type text not null default 'none' check (bet_type in ('none','single','double')),
  stake numeric not null default 0,
  combined_odds numeric not null default 0,
  potential_return numeric not null default 0,
  legs jsonb not null default '[]',      -- Candidate[]: market, fixture, odds, formProb, edge…
  reasoning text,
  status text not null default 'pending' check (status in ('pending','won','lost','void')),
  profit_loss numeric,                   -- null until settled
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pick_date)                     -- one selection per day
);
create index idx_gaffer_picks_date on public.gaffer_picks (pick_date desc);
create index idx_gaffer_picks_status on public.gaffer_picks (status);

create trigger trg_form_tables_updated before update on public.form_tables
  for each row execute function public.update_updated_at_column();
create trigger trg_gaffer_picks_updated before update on public.gaffer_picks
  for each row execute function public.update_updated_at_column();

-- ── RLS: public read (form tables + P&L are the trust signal); writes service-role only ──
alter table public.form_tables enable row level security;
alter table public.gaffer_picks enable row level security;
grant select on public.form_tables, public.gaffer_picks to anon, authenticated;
grant all on public.form_tables, public.gaffer_picks to service_role;

create policy form_tables_read on public.form_tables for select to anon, authenticated using (true);
create policy form_tables_service on public.form_tables for all to service_role using (true) with check (true);
create policy gaffer_picks_read on public.gaffer_picks for select to anon, authenticated using (true);
create policy gaffer_picks_service on public.gaffer_picks for all to service_role using (true) with check (true);

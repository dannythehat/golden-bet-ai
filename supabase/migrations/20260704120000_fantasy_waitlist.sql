-- Fantasy waitlist — captures "Notify me" signups for the coming-soon league.
create table if not exists public.fantasy_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,      -- stored lowercased by the edge function
  source text,                     -- e.g. 'homepage'
  created_at timestamptz not null default now()
);

-- RLS on, no public policies: rows are written only by the fantasy-waitlist
-- edge function (service role bypasses RLS) and are not readable by anon/auth
-- clients — the email list stays private.
alter table public.fantasy_waitlist enable row level security;

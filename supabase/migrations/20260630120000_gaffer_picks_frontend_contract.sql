-- ============================================================================
-- Footy Oracle — gaffer_picks: meet the homepage read contract.
-- The homepage GafferPicksBox reads columns/states the writer didn't yet emit:
--   • status must be a "show me" state ('published'/'live'/'active')
--   • title, gaffer_intro (the Gaffer's hero blurb)
--   • potential_returns (plural) — mirror of potential_return
-- All additive + backwards-compatible. Public-read stays as-is (RLS unchanged).
-- ============================================================================

-- 1) Broaden the status states. Keep the settlement states; add the published
--    "live board" states the frontend filters on.
alter table public.gaffer_picks drop constraint if exists gaffer_picks_status_check;
alter table public.gaffer_picks
  add constraint gaffer_picks_status_check
  check (status in ('pending','published','live','active','won','lost','void'));

-- 2) Hero copy the board renders (both optional; frontend has fallbacks).
alter table public.gaffer_picks add column if not exists title text;
alter table public.gaffer_picks add column if not exists gaffer_intro text;

-- 3) potential_returns (plural) — the frontend reads this name. Generated mirror
--    of potential_return so there is a single source of truth and no drift.
alter table public.gaffer_picks
  add column if not exists potential_returns numeric
  generated always as (potential_return) stored;

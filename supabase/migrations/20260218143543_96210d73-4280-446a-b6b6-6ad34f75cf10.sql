
-- Allowlist table: one row per league, populated by probe-leagues mode
CREATE TABLE IF NOT EXISTS public.referee_league_allowlist (
  league            text PRIMARY KEY,
  fixture_count     integer,           -- eligible fixtures in ml_training_data_v2
  sample_size       integer,           -- how many we probed
  ref_present_count integer,           -- probes that returned a referee name
  ref_present_rate  numeric,           -- ref_present_count / sample_size
  is_approved       boolean,           -- ref_present_rate >= 0.60
  sampled_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Service role full access; public read so loop can filter efficiently
ALTER TABLE public.referee_league_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read referee_league_allowlist"
  ON public.referee_league_allowlist FOR SELECT USING (true);

CREATE POLICY "Service manage referee_league_allowlist"
  ON public.referee_league_allowlist FOR ALL USING (true) WITH CHECK (true);

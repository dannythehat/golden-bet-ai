
-- Backfill stats run log: tracks each cron run for 24h delta + API hit rate calculation
CREATE TABLE IF NOT EXISTS public.backfill_stats_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        text NOT NULL UNIQUE,
  run_at        timestamp with time zone NOT NULL DEFAULT now(),
  mode          text NOT NULL DEFAULT 'run',
  batch_size    integer,
  targeted      integer,
  enriched      integer,
  no_data       integer,
  errors        integer,
  rate_limits   integer,
  api_hit_rate  numeric,   -- enriched / targeted * 100
  cards_total   integer,   -- v2 cards labelled after this run
  corners_total integer,   -- v2 corners labelled after this run
  from_date     text,
  to_date       text,
  leagues_hit   jsonb      -- top leagues enriched this run
);

ALTER TABLE public.backfill_stats_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service manages backfill log"
  ON public.backfill_stats_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read backfill log"
  ON public.backfill_stats_log
  FOR SELECT
  USING (true);

-- Index for fast 24h lookups
CREATE INDEX IF NOT EXISTS idx_backfill_log_run_at ON public.backfill_stats_log (run_at DESC);

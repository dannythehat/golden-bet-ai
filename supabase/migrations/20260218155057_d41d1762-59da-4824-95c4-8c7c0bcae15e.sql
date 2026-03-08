
-- Add unique constraint on run_id for UPSERT to work
ALTER TABLE public.backfill_stats_log ADD CONSTRAINT backfill_stats_log_run_id_unique UNIQUE (run_id);

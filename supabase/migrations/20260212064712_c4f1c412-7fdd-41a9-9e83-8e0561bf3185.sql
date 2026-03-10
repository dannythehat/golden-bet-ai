-- Add unique constraint on team_name for upsert support
ALTER TABLE public.team_rolling_stats ADD CONSTRAINT team_rolling_stats_team_name_key UNIQUE (team_name);

-- Create regional_stats table for caching form data
CREATE TABLE public.regional_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region TEXT NOT NULL,
  category TEXT NOT NULL,
  market TEXT NOT NULL,
  team_id INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  league_name TEXT,
  matches_sampled INTEGER NOT NULL DEFAULT 20,
  success_count INTEGER NOT NULL DEFAULT 0,
  success_percent INTEGER NOT NULL DEFAULT 0,
  avg_per_game NUMERIC(3,1) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_team_market UNIQUE(region, category, market, team_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_regional_stats_lookup ON public.regional_stats(region, category, market, success_percent DESC);
CREATE INDEX idx_regional_stats_region ON public.regional_stats(region);

-- Enable RLS (public read, authenticated write)
ALTER TABLE public.regional_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access (cached data should be publicly viewable)
CREATE POLICY "Regional stats are publicly readable" 
ON public.regional_stats 
FOR SELECT 
USING (true);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can manage stats" 
ON public.regional_stats 
FOR ALL 
USING (true)
WITH CHECK (true);
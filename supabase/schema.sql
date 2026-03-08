-- Supabase table for team statistics
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS team_stats (
  id BIGSERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  league TEXT NOT NULL,
  region TEXT NOT NULL,
  played INTEGER NOT NULL,
  
  -- Goals
  over_2_5_goals_pct INTEGER NOT NULL,
  over_2_5_goals_count INTEGER NOT NULL,
  
  -- Corners
  over_9_5_corners_pct INTEGER NOT NULL,
  over_9_5_corners_count INTEGER NOT NULL,
  avg_corners DECIMAL(3,1) NOT NULL,
  
  -- Cards
  over_3_5_cards_pct INTEGER NOT NULL,
  over_3_5_cards_count INTEGER NOT NULL,
  avg_cards DECIMAL(3,1) NOT NULL,
  
  -- BTTS
  btts_yes_pct INTEGER NOT NULL,
  btts_yes_count INTEGER NOT NULL,
  avg_goals_scored DECIMAL(3,1) NOT NULL,
  avg_goals_conceded DECIMAL(3,1) NOT NULL,
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(team_id)
);

-- Create indexes for fast queries
CREATE INDEX idx_team_stats_over_2_5_goals ON team_stats(over_2_5_goals_pct DESC);
CREATE INDEX idx_team_stats_over_9_5_corners ON team_stats(over_9_5_corners_pct DESC);
CREATE INDEX idx_team_stats_over_3_5_cards ON team_stats(over_3_5_cards_pct DESC);
CREATE INDEX idx_team_stats_btts ON team_stats(btts_yes_pct DESC);
CREATE INDEX idx_team_stats_region ON team_stats(region);

-- Enable Row Level Security
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON team_stats
  FOR SELECT
  USING (true);

-- Create policy to allow authenticated users to insert/update
CREATE POLICY "Allow authenticated insert/update" ON team_stats
  FOR ALL
  USING (auth.role() = 'authenticated');

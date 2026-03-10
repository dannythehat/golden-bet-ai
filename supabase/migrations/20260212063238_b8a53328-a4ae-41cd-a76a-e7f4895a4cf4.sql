
-- Rolling L10 stats for every team worldwide
CREATE TABLE public.team_rolling_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id INTEGER NOT NULL,
  team_name TEXT NOT NULL,
  league TEXT NOT NULL,
  league_id INTEGER,
  region TEXT NOT NULL DEFAULT 'european',
  
  -- Sample info
  matches_used INTEGER NOT NULL DEFAULT 0,
  
  -- Goals
  avg_goals_scored NUMERIC(4,2) DEFAULT 0,
  avg_goals_conceded NUMERIC(4,2) DEFAULT 0,
  avg_total_goals NUMERIC(4,2) DEFAULT 0,
  over_15_goals_pct INTEGER DEFAULT 0,
  over_25_goals_pct INTEGER DEFAULT 0,
  over_35_goals_pct INTEGER DEFAULT 0,
  
  -- BTTS
  btts_pct INTEGER DEFAULT 0,
  clean_sheet_pct INTEGER DEFAULT 0,
  failed_to_score_pct INTEGER DEFAULT 0,
  
  -- Corners
  avg_corners_for NUMERIC(4,2) DEFAULT 0,
  avg_corners_against NUMERIC(4,2) DEFAULT 0,
  avg_total_corners NUMERIC(4,2) DEFAULT 0,
  over_85_corners_pct INTEGER DEFAULT 0,
  over_95_corners_pct INTEGER DEFAULT 0,
  over_105_corners_pct INTEGER DEFAULT 0,
  
  -- Cards
  avg_cards_for NUMERIC(4,2) DEFAULT 0,
  avg_cards_against NUMERIC(4,2) DEFAULT 0,
  avg_total_cards NUMERIC(4,2) DEFAULT 0,
  over_25_cards_pct INTEGER DEFAULT 0,
  over_35_cards_pct INTEGER DEFAULT 0,
  over_45_cards_pct INTEGER DEFAULT 0,
  
  -- Shots / xG (when available)
  avg_shots_for NUMERIC(4,2) DEFAULT 0,
  avg_shots_on_target NUMERIC(4,2) DEFAULT 0,
  avg_xg_for NUMERIC(4,2) DEFAULT 0,
  avg_xg_against NUMERIC(4,2) DEFAULT 0,
  
  -- Form
  form_string TEXT DEFAULT '',          -- e.g. 'WWDLW'
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  avg_possession NUMERIC(4,1) DEFAULT 0,
  
  -- Match list (last 10 fixture IDs for audit)
  match_ids TEXT[] DEFAULT '{}',
  
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(team_id)
);

-- Indexes for fast queries
CREATE INDEX idx_rolling_region ON team_rolling_stats(region);
CREATE INDEX idx_rolling_league ON team_rolling_stats(league);
CREATE INDEX idx_rolling_over25 ON team_rolling_stats(over_25_goals_pct DESC);
CREATE INDEX idx_rolling_btts ON team_rolling_stats(btts_pct DESC);
CREATE INDEX idx_rolling_corners ON team_rolling_stats(over_95_corners_pct DESC);
CREATE INDEX idx_rolling_cards ON team_rolling_stats(over_35_cards_pct DESC);
CREATE INDEX idx_rolling_team_name ON team_rolling_stats(team_name);

-- RLS
ALTER TABLE team_rolling_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rolling stats publicly readable"
ON team_rolling_stats FOR SELECT USING (true);

CREATE POLICY "Service role manages rolling stats"
ON team_rolling_stats FOR ALL USING (true) WITH CHECK (true);


-- Daily Match Power Scores — precomputed from team_rolling_stats
CREATE TABLE public.match_power_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  kickoff TIMESTAMPTZ,
  computed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Per-market power scores (0-100)
  over_25_goals_score INTEGER DEFAULT 0,
  btts_score INTEGER DEFAULT 0,
  over_95_corners_score INTEGER DEFAULT 0,
  over_35_cards_score INTEGER DEFAULT 0,
  
  -- Best market and its score
  best_market TEXT,
  best_score INTEGER DEFAULT 0,
  
  -- Component breakdown (for transparency/debugging)
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(fixture_id, computed_date)
);

-- Indexes for fast lookup by selection engines
CREATE INDEX idx_mps_date ON match_power_scores(computed_date);
CREATE INDEX idx_mps_fixture ON match_power_scores(fixture_id);
CREATE INDEX idx_mps_goals ON match_power_scores(computed_date, over_25_goals_score DESC);
CREATE INDEX idx_mps_btts ON match_power_scores(computed_date, btts_score DESC);
CREATE INDEX idx_mps_corners ON match_power_scores(computed_date, over_95_corners_score DESC);
CREATE INDEX idx_mps_cards ON match_power_scores(computed_date, over_35_cards_score DESC);

-- Enable RLS
ALTER TABLE match_power_scores ENABLE ROW LEVEL SECURITY;

-- Public read access (scores are informational)
CREATE POLICY "Power scores are publicly readable" ON match_power_scores
  FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Service role can manage power scores" ON match_power_scores
  FOR ALL USING (true) WITH CHECK (true);

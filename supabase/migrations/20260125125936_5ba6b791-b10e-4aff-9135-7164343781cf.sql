-- ML Training Data V2 with rolling pre-match features
-- CRITICAL: All features computed from matches BEFORE fixture_date (zero data leakage)

CREATE TABLE IF NOT EXISTS public.ml_training_data_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identifiers
  fixture_id TEXT NOT NULL UNIQUE,
  fixture_date DATE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'european',
  
  -- Labels (from original match - what we're predicting)
  total_goals INTEGER,
  home_goals INTEGER,
  away_goals INTEGER,
  total_corners INTEGER,
  total_cards INTEGER,
  over_25_hit BOOLEAN,
  btts_hit BOOLEAN,
  over_95_corners_hit BOOLEAN,
  over_35_cards_hit BOOLEAN,
  
  -- ========== HOME TEAM ROLLING FEATURES (pre-match) ==========
  -- Last 5 matches
  home_goals_for_avg_5 NUMERIC(4,2),
  home_goals_against_avg_5 NUMERIC(4,2),
  home_xg_for_avg_5 NUMERIC(4,2),
  home_xg_against_avg_5 NUMERIC(4,2),
  home_shots_for_avg_5 NUMERIC(4,2),
  home_shots_on_target_avg_5 NUMERIC(4,2),
  home_corners_for_avg_5 NUMERIC(4,2),
  home_corners_against_avg_5 NUMERIC(4,2),
  home_fouls_for_avg_5 NUMERIC(4,2),
  home_cards_for_avg_5 NUMERIC(4,2),
  home_cards_against_avg_5 NUMERIC(4,2),
  
  -- Last 10 matches
  home_goals_for_avg_10 NUMERIC(4,2),
  home_goals_against_avg_10 NUMERIC(4,2),
  home_xg_for_avg_10 NUMERIC(4,2),
  home_xg_against_avg_10 NUMERIC(4,2),
  home_shots_for_avg_10 NUMERIC(4,2),
  home_shots_on_target_avg_10 NUMERIC(4,2),
  home_corners_for_avg_10 NUMERIC(4,2),
  home_corners_against_avg_10 NUMERIC(4,2),
  home_fouls_for_avg_10 NUMERIC(4,2),
  home_cards_for_avg_10 NUMERIC(4,2),
  home_cards_against_avg_10 NUMERIC(4,2),
  
  -- Last 20 matches
  home_goals_for_avg_20 NUMERIC(4,2),
  home_goals_against_avg_20 NUMERIC(4,2),
  home_xg_for_avg_20 NUMERIC(4,2),
  home_xg_against_avg_20 NUMERIC(4,2),
  home_shots_for_avg_20 NUMERIC(4,2),
  home_shots_on_target_avg_20 NUMERIC(4,2),
  home_corners_for_avg_20 NUMERIC(4,2),
  home_corners_against_avg_20 NUMERIC(4,2),
  home_fouls_for_avg_20 NUMERIC(4,2),
  home_cards_for_avg_20 NUMERIC(4,2),
  home_cards_against_avg_20 NUMERIC(4,2),
  
  -- ========== AWAY TEAM ROLLING FEATURES (pre-match) ==========
  -- Last 5 matches
  away_goals_for_avg_5 NUMERIC(4,2),
  away_goals_against_avg_5 NUMERIC(4,2),
  away_xg_for_avg_5 NUMERIC(4,2),
  away_xg_against_avg_5 NUMERIC(4,2),
  away_shots_for_avg_5 NUMERIC(4,2),
  away_shots_on_target_avg_5 NUMERIC(4,2),
  away_corners_for_avg_5 NUMERIC(4,2),
  away_corners_against_avg_5 NUMERIC(4,2),
  away_fouls_for_avg_5 NUMERIC(4,2),
  away_cards_for_avg_5 NUMERIC(4,2),
  away_cards_against_avg_5 NUMERIC(4,2),
  
  -- Last 10 matches
  away_goals_for_avg_10 NUMERIC(4,2),
  away_goals_against_avg_10 NUMERIC(4,2),
  away_xg_for_avg_10 NUMERIC(4,2),
  away_xg_against_avg_10 NUMERIC(4,2),
  away_shots_for_avg_10 NUMERIC(4,2),
  away_shots_on_target_avg_10 NUMERIC(4,2),
  away_corners_for_avg_10 NUMERIC(4,2),
  away_corners_against_avg_10 NUMERIC(4,2),
  away_fouls_for_avg_10 NUMERIC(4,2),
  away_cards_for_avg_10 NUMERIC(4,2),
  away_cards_against_avg_10 NUMERIC(4,2),
  
  -- Last 20 matches
  away_goals_for_avg_20 NUMERIC(4,2),
  away_goals_against_avg_20 NUMERIC(4,2),
  away_xg_for_avg_20 NUMERIC(4,2),
  away_xg_against_avg_20 NUMERIC(4,2),
  away_shots_for_avg_20 NUMERIC(4,2),
  away_shots_on_target_avg_20 NUMERIC(4,2),
  away_corners_for_avg_20 NUMERIC(4,2),
  away_corners_against_avg_20 NUMERIC(4,2),
  away_fouls_for_avg_20 NUMERIC(4,2),
  away_cards_for_avg_20 NUMERIC(4,2),
  away_cards_against_avg_20 NUMERIC(4,2),
  
  -- ========== LEAGUE BASELINE CONTEXT (pre-match) ==========
  league_avg_goals NUMERIC(4,2),
  league_over25_rate NUMERIC(4,2),
  league_btts_rate NUMERIC(4,2),
  league_avg_corners NUMERIC(4,2),
  league_avg_cards NUMERIC(4,2),
  
  -- ========== REFEREE FEATURES (optional) ==========
  referee_name TEXT,
  ref_avg_cards_last50 NUMERIC(4,2),
  ref_over35_cards_rate_last50 NUMERIC(4,2),
  
  -- ========== DERIVED MATCHUP FEATURES (pre-match) ==========
  combined_goals_for_10 NUMERIC(4,2),
  combined_xg_for_10 NUMERIC(4,2),
  combined_shots_10 NUMERIC(4,2),
  combined_corners_10 NUMERIC(4,2),
  combined_cards_10 NUMERIC(4,2),
  xg_diff_10 NUMERIC(4,2),
  defense_weakness_index_10 NUMERIC(4,2),
  
  -- Metadata
  features_computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  max_source_match_date DATE, -- For validation: must be < fixture_date
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_ml_v2_fixture_date ON ml_training_data_v2(fixture_date);
CREATE INDEX idx_ml_v2_league ON ml_training_data_v2(league);
CREATE INDEX idx_ml_v2_region ON ml_training_data_v2(region);
CREATE INDEX idx_ml_v2_home_team ON ml_training_data_v2(home_team);
CREATE INDEX idx_ml_v2_away_team ON ml_training_data_v2(away_team);
CREATE INDEX idx_ml_v2_over25 ON ml_training_data_v2(over_25_hit) WHERE over_25_hit IS NOT NULL;
CREATE INDEX idx_ml_v2_btts ON ml_training_data_v2(btts_hit) WHERE btts_hit IS NOT NULL;

-- Enable RLS
ALTER TABLE ml_training_data_v2 ENABLE ROW LEVEL SECURITY;

-- Service role can manage (for edge function population)
CREATE POLICY "Service manage ml_training_data_v2" ON ml_training_data_v2
  FOR ALL USING (true) WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE ml_training_data_v2 IS 'ML training data with pre-computed rolling features. All features computed from matches BEFORE fixture_date to prevent data leakage.';
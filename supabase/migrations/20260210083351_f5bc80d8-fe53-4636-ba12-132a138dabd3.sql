
-- =============================================
-- SportMonks Raw Match Data (source of truth)
-- =============================================
CREATE TABLE public.sportmonks_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  fixture_date DATE NOT NULL,
  league TEXT NOT NULL,
  league_id INTEGER,
  season_id INTEGER,
  region TEXT DEFAULT 'Unknown',
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team_id INTEGER,
  away_team_id INTEGER,
  
  -- Final scores
  home_goals INTEGER,
  away_goals INTEGER,
  
  -- xG metrics (team level)
  home_xg NUMERIC(6,4),
  away_xg NUMERIC(6,4),
  home_xga NUMERIC(6,4),   -- xG against = opponent xG
  away_xga NUMERIC(6,4),
  
  -- Advanced xG (from SportMonks type IDs)
  home_npxg NUMERIC(6,4),       -- non-penalty xG
  away_npxg NUMERIC(6,4),
  home_xgot NUMERIC(6,4),       -- expected goals on target
  away_xgot NUMERIC(6,4),
  home_xg_open_play NUMERIC(6,4),
  away_xg_open_play NUMERIC(6,4),
  home_xg_set_play NUMERIC(6,4),
  away_xg_set_play NUMERIC(6,4),
  home_xg_corners NUMERIC(6,4),
  away_xg_corners NUMERIC(6,4),
  home_xpts NUMERIC(6,4),       -- expected points
  away_xpts NUMERIC(6,4),
  home_xgd NUMERIC(6,4),        -- expected goal difference
  away_xgd NUMERIC(6,4),
  
  -- Core match stats
  home_shots INTEGER,
  away_shots INTEGER,
  home_shots_on_target INTEGER,
  away_shots_on_target INTEGER,
  home_corners INTEGER,
  away_corners INTEGER,
  home_yellow_cards INTEGER,
  away_yellow_cards INTEGER,
  home_red_cards INTEGER,
  away_red_cards INTEGER,
  home_fouls INTEGER,
  away_fouls INTEGER,
  home_possession NUMERIC(5,2),
  away_possession NUMERIC(5,2),
  
  -- Derived labels
  total_goals INTEGER GENERATED ALWAYS AS (COALESCE(home_goals, 0) + COALESCE(away_goals, 0)) STORED,
  total_corners INTEGER GENERATED ALWAYS AS (COALESCE(home_corners, 0) + COALESCE(away_corners, 0)) STORED,
  total_cards INTEGER GENERATED ALWAYS AS (COALESCE(home_yellow_cards, 0) + COALESCE(away_yellow_cards, 0) + COALESCE(home_red_cards, 0) + COALESCE(away_red_cards, 0)) STORED,
  over_25_hit BOOLEAN GENERATED ALWAYS AS (COALESCE(home_goals, 0) + COALESCE(away_goals, 0) > 2) STORED,
  btts_hit BOOLEAN GENERATED ALWAYS AS (COALESCE(home_goals, 0) > 0 AND COALESCE(away_goals, 0) > 0) STORED,
  over_95_corners_hit BOOLEAN GENERATED ALWAYS AS (COALESCE(home_corners, 0) + COALESCE(away_corners, 0) > 9) STORED,
  over_35_cards_hit BOOLEAN GENERATED ALWAYS AS (COALESCE(home_yellow_cards, 0) + COALESCE(away_yellow_cards, 0) + COALESCE(home_red_cards, 0) + COALESCE(away_red_cards, 0) > 3) STORED,
  
  -- Metadata
  sportmonks_fixture_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(fixture_id)
);

-- Indexes for rolling feature queries
CREATE INDEX idx_sm_matches_home ON sportmonks_matches(home_team, fixture_date DESC);
CREATE INDEX idx_sm_matches_away ON sportmonks_matches(away_team, fixture_date DESC);
CREATE INDEX idx_sm_matches_date ON sportmonks_matches(fixture_date DESC);
CREATE INDEX idx_sm_matches_league ON sportmonks_matches(league, fixture_date DESC);
CREATE INDEX idx_sm_fixture_id ON sportmonks_matches(sportmonks_fixture_id);

-- RLS
ALTER TABLE sportmonks_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sportmonks_matches" ON sportmonks_matches FOR SELECT USING (true);
CREATE POLICY "Service role write sportmonks_matches" ON sportmonks_matches FOR ALL USING (true);

-- =============================================
-- SportMonks ML Features (computed rolling L10)
-- =============================================
CREATE TABLE public.sportmonks_ml_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  fixture_date DATE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  region TEXT DEFAULT 'Unknown',
  
  -- Labels (from raw data)
  home_goals INTEGER,
  away_goals INTEGER,
  total_goals INTEGER,
  total_corners INTEGER,
  total_cards INTEGER,
  over_25_hit BOOLEAN,
  btts_hit BOOLEAN,
  over_95_corners_hit BOOLEAN,
  over_35_cards_hit BOOLEAN,
  
  -- HOME Rolling L10 xG features
  home_xg_l10 NUMERIC(6,4),
  home_xga_l10 NUMERIC(6,4),
  home_npxg_l10 NUMERIC(6,4),
  home_xgot_l10 NUMERIC(6,4),
  home_xg_open_play_l10 NUMERIC(6,4),
  home_xg_set_play_l10 NUMERIC(6,4),
  home_xg_corners_l10 NUMERIC(6,4),
  home_xpts_l10 NUMERIC(6,4),
  home_xgd_l10 NUMERIC(6,4),
  
  -- HOME Rolling L10 core stats
  home_goals_for_l10 NUMERIC(5,2),
  home_goals_against_l10 NUMERIC(5,2),
  home_shots_l10 NUMERIC(5,2),
  home_shots_on_target_l10 NUMERIC(5,2),
  home_corners_for_l10 NUMERIC(5,2),
  home_corners_against_l10 NUMERIC(5,2),
  home_cards_l10 NUMERIC(5,2),
  home_fouls_l10 NUMERIC(5,2),
  home_possession_l10 NUMERIC(5,2),
  
  -- AWAY Rolling L10 xG features
  away_xg_l10 NUMERIC(6,4),
  away_xga_l10 NUMERIC(6,4),
  away_npxg_l10 NUMERIC(6,4),
  away_xgot_l10 NUMERIC(6,4),
  away_xg_open_play_l10 NUMERIC(6,4),
  away_xg_set_play_l10 NUMERIC(6,4),
  away_xg_corners_l10 NUMERIC(6,4),
  away_xpts_l10 NUMERIC(6,4),
  away_xgd_l10 NUMERIC(6,4),
  
  -- AWAY Rolling L10 core stats
  away_goals_for_l10 NUMERIC(5,2),
  away_goals_against_l10 NUMERIC(5,2),
  away_shots_l10 NUMERIC(5,2),
  away_shots_on_target_l10 NUMERIC(5,2),
  away_corners_for_l10 NUMERIC(5,2),
  away_corners_against_l10 NUMERIC(5,2),
  away_cards_l10 NUMERIC(5,2),
  away_fouls_l10 NUMERIC(5,2),
  away_possession_l10 NUMERIC(5,2),
  
  -- Combined matchup features
  combined_xg_l10 NUMERIC(6,4),
  combined_npxg_l10 NUMERIC(6,4),
  combined_xgot_l10 NUMERIC(6,4),
  combined_goals_l10 NUMERIC(5,2),
  combined_shots_l10 NUMERIC(5,2),
  combined_corners_l10 NUMERIC(5,2),
  combined_cards_l10 NUMERIC(5,2),
  xg_diff_l10 NUMERIC(6,4),            -- home_xg - away_xg
  defense_weakness_xga_l10 NUMERIC(6,4), -- home_xga + away_xga
  
  -- League context
  league_avg_goals NUMERIC(5,2),
  league_avg_xg NUMERIC(6,4),
  league_over25_rate NUMERIC(5,4),
  league_btts_rate NUMERIC(5,4),
  league_avg_corners NUMERIC(5,2),
  league_avg_cards NUMERIC(5,2),
  
  -- Validation
  max_source_match_date DATE,
  features_computed_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(fixture_id)
);

CREATE INDEX idx_sm_features_date ON sportmonks_ml_features(fixture_date DESC);
CREATE INDEX idx_sm_features_league ON sportmonks_ml_features(league);

ALTER TABLE sportmonks_ml_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sportmonks_ml_features" ON sportmonks_ml_features FOR SELECT USING (true);
CREATE POLICY "Service role write sportmonks_ml_features" ON sportmonks_ml_features FOR ALL USING (true);


-- Add derived feature columns to sportmonks_ml_features
-- These are cross-market efficiency/tactical proxies computed from existing raw stats

ALTER TABLE public.sportmonks_ml_features
  -- Efficiency ratios
  ADD COLUMN IF NOT EXISTS xg_per_shot_home_l10 numeric,
  ADD COLUMN IF NOT EXISTS xg_per_shot_away_l10 numeric,
  ADD COLUMN IF NOT EXISTS shots_on_target_ratio_home_l10 numeric,
  ADD COLUMN IF NOT EXISTS shots_on_target_ratio_away_l10 numeric,
  ADD COLUMN IF NOT EXISTS shots_per_possession_home_l10 numeric,
  ADD COLUMN IF NOT EXISTS shots_per_possession_away_l10 numeric,
  -- Set-piece threat
  ADD COLUMN IF NOT EXISTS corners_per_shot_home_l10 numeric,
  ADD COLUMN IF NOT EXISTS corners_per_shot_away_l10 numeric,
  ADD COLUMN IF NOT EXISTS goals_per_corner_home_l10 numeric,
  ADD COLUMN IF NOT EXISTS goals_per_corner_away_l10 numeric,
  -- Aggression / discipline
  ADD COLUMN IF NOT EXISTS cards_per_foul_home_l10 numeric,
  ADD COLUMN IF NOT EXISTS cards_per_foul_away_l10 numeric,
  ADD COLUMN IF NOT EXISTS fouls_per_possession_home_l10 numeric,
  ADD COLUMN IF NOT EXISTS fouls_per_possession_away_l10 numeric,
  -- Odds data (from The Odds API)
  ADD COLUMN IF NOT EXISTS odds_over25 numeric,
  ADD COLUMN IF NOT EXISTS odds_under25 numeric,
  ADD COLUMN IF NOT EXISTS odds_btts_yes numeric,
  ADD COLUMN IF NOT EXISTS odds_btts_no numeric,
  ADD COLUMN IF NOT EXISTS odds_home_win numeric,
  ADD COLUMN IF NOT EXISTS odds_draw numeric,
  ADD COLUMN IF NOT EXISTS odds_away_win numeric,
  ADD COLUMN IF NOT EXISTS implied_prob_over25 numeric,
  ADD COLUMN IF NOT EXISTS implied_prob_btts numeric;

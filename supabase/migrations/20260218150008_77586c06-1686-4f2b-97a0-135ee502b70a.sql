
-- ═══════════════════════════════════════════════════════════════════════
-- POWER LAYER SCHEMA: Calibration + Edge Profile + Governance Columns
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Extend ml_models with calibration + governance proof pack columns
ALTER TABLE public.ml_models
  ADD COLUMN IF NOT EXISTS brier_score          numeric,
  ADD COLUMN IF NOT EXISTS rows_used            integer,
  ADD COLUMN IF NOT EXISTS calibration_slope    numeric,
  ADD COLUMN IF NOT EXISTS calibration_intercept numeric,
  ADD COLUMN IF NOT EXISTS reliability_bins     jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ev_vs_bookmaker      numeric,
  ADD COLUMN IF NOT EXISTS model_confidence_score numeric,
  ADD COLUMN IF NOT EXISTS calibration_method   text DEFAULT 'isotonic';

COMMENT ON COLUMN public.ml_models.brier_score IS 'Brier score — lower is better, gate: ≤0.22';
COMMENT ON COLUMN public.ml_models.rows_used IS 'Actual training rows used (excluding nulls/sentinels)';
COMMENT ON COLUMN public.ml_models.calibration_slope IS 'Platt/isotonic slope — near 1.0 = well calibrated';
COMMENT ON COLUMN public.ml_models.calibration_intercept IS 'Platt calibration intercept';
COMMENT ON COLUMN public.ml_models.reliability_bins IS 'Array of {bin_center, predicted_prob, actual_rate, count} for reliability diagram';
COMMENT ON COLUMN public.ml_models.ev_vs_bookmaker IS 'Expected value vs bookmaker implied: (model_prob * odds) - 1';
COMMENT ON COLUMN public.ml_models.model_confidence_score IS 'Composite: f(AUC, 1-brier, feature_coverage) — 0-100';
COMMENT ON COLUMN public.ml_models.calibration_method IS 'isotonic or platt';

-- 2. market_edge_profile — tracks model vs bookmaker by probability band
CREATE TABLE IF NOT EXISTS public.market_edge_profile (
  id                  uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market              text    NOT NULL,
  prob_band           text    NOT NULL,  -- e.g. '60-65', '65-70', ...
  model_prob_mid      numeric NOT NULL,  -- midpoint of band (e.g. 62.5)
  sample_count        integer NOT NULL DEFAULT 0,
  hit_count           integer NOT NULL DEFAULT 0,
  historical_hit_rate numeric,           -- hit_count / sample_count
  avg_bookmaker_implied_prob numeric,    -- mean implied prob from bookmaker odds
  avg_model_prob      numeric,           -- mean model probability in band
  roi                 numeric,           -- (returns - staked) / staked * 100
  edge_strength_score numeric,           -- derived: hist_hit_rate - avg_bk_implied (positive = real edge)
  last_updated        timestamp with time zone DEFAULT now(),
  created_at          timestamp with time zone DEFAULT now(),
  UNIQUE (market, prob_band)
);

COMMENT ON TABLE public.market_edge_profile IS 'Per-market, per-probability-band edge analysis vs bookmaker';
COMMENT ON COLUMN public.market_edge_profile.edge_strength_score IS 'Key signal: historical_hit_rate - avg_bookmaker_implied_prob (% points). Positive = model has real edge';

-- RLS for market_edge_profile
ALTER TABLE public.market_edge_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Edge profile publicly readable"
  ON public.market_edge_profile FOR SELECT USING (true);

CREATE POLICY "Service manages edge profile"
  ON public.market_edge_profile FOR ALL
  USING (true) WITH CHECK (true);

-- 3. Add derived feature columns to ml_training_data_v2 for cards/corners boost
ALTER TABLE public.ml_training_data_v2
  ADD COLUMN IF NOT EXISTS fouls_momentum_5      numeric,   -- fouls_home_5 + fouls_away_5
  ADD COLUMN IF NOT EXISTS discipline_gap_10     numeric,   -- home_cards_10 - away_cards_10
  ADD COLUMN IF NOT EXISTS shot_pressure_10      numeric,   -- shots_for_10 + shots_against_10 (both teams combined)
  ADD COLUMN IF NOT EXISTS tempo_index_10        numeric;   -- combined fouls + shots (intensity proxy)

COMMENT ON COLUMN public.ml_training_data_v2.fouls_momentum_5 IS 'Cards feature: (home_fouls_5 + away_fouls_5) — recent foul intensity';
COMMENT ON COLUMN public.ml_training_data_v2.discipline_gap_10 IS 'Cards feature: home_cards_10 - away_cards_10 (discipline imbalance)';
COMMENT ON COLUMN public.ml_training_data_v2.shot_pressure_10 IS 'Corners feature: combined shot volume L10 both teams';
COMMENT ON COLUMN public.ml_training_data_v2.tempo_index_10 IS 'Corners/cards: combined fouls + shots L10 (match tempo proxy)';

-- Add raw probability columns to golden_bet_history
ALTER TABLE golden_bet_history 
ADD COLUMN IF NOT EXISTS ml_confidence_raw numeric;

-- Add raw probability columns to bet_builder_history
ALTER TABLE bet_builder_history 
ADD COLUMN IF NOT EXISTS average_confidence_raw numeric,
ADD COLUMN IF NOT EXISTS market_confidences_raw jsonb DEFAULT '{}'::jsonb;

-- Add comments for clarity
COMMENT ON COLUMN golden_bet_history.ml_confidence_raw IS 'Raw ML probability before calibration';
COMMENT ON COLUMN golden_bet_history.ml_confidence IS 'Calibrated probability (capped at 0.78)';
COMMENT ON COLUMN bet_builder_history.average_confidence_raw IS 'Raw average ML probability before calibration';
COMMENT ON COLUMN bet_builder_history.market_confidences_raw IS 'Raw market confidences before calibration';
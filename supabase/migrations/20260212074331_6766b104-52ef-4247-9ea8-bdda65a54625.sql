-- Drop the unique constraint that's blocking model saves
ALTER TABLE ml_models DROP CONSTRAINT IF EXISTS ml_models_market_version_key;
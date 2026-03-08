-- Table to store trained ML models and their evaluation metrics
CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market TEXT NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'logistic_regression',
  
  -- Model parameters (weights for logistic regression)
  weights JSONB NOT NULL DEFAULT '{}',
  feature_names JSONB NOT NULL DEFAULT '[]',
  
  -- Proper ML Evaluation Metrics
  auc_roc NUMERIC(4,3),
  accuracy NUMERIC(4,3),
  precision_score NUMERIC(4,3),
  recall_score NUMERIC(4,3),
  f1_score NUMERIC(4,3),
  
  -- Confusion matrix
  true_positives INTEGER DEFAULT 0,
  true_negatives INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  false_negatives INTEGER DEFAULT 0,
  
  -- Training metadata
  training_samples INTEGER NOT NULL,
  test_samples INTEGER NOT NULL,
  features_used INTEGER NOT NULL,
  training_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(market, version)
);

-- Index for quick lookups
CREATE INDEX idx_ml_models_market_active ON ml_models(market, is_active);

-- RLS
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ML models are publicly readable" ON ml_models
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage models" ON ml_models
  FOR ALL USING (true) WITH CHECK (true);
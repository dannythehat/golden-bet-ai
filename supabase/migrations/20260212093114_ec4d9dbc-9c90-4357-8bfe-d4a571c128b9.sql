-- Add A/B test tracking columns to ml_model_accuracy
ALTER TABLE public.ml_model_accuracy 
  ADD COLUMN IF NOT EXISTS model_type text DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS league_cluster text DEFAULT null,
  ADD COLUMN IF NOT EXISTS ml_probability numeric DEFAULT null,
  ADD COLUMN IF NOT EXISTS odds numeric DEFAULT null;

-- Add index for A/B comparison queries
CREATE INDEX IF NOT EXISTS idx_ml_model_accuracy_ab_test 
  ON public.ml_model_accuracy(market, model_type, league_cluster);
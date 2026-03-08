-- Training history log for investor dashboard
CREATE TABLE public.ml_training_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market TEXT NOT NULL,
  model_type TEXT NOT NULL DEFAULT 'gradient_boosted_trees',
  trees_trained INTEGER NOT NULL DEFAULT 0,
  target_trees INTEGER NOT NULL DEFAULT 100,
  training_samples INTEGER NOT NULL DEFAULT 0,
  validation_samples INTEGER NOT NULL DEFAULT 0,
  total_available INTEGER NOT NULL DEFAULT 0,
  train_auc NUMERIC,
  val_auc NUMERIC,
  train_accuracy NUMERIC,
  val_accuracy NUMERIC,
  duration_ms INTEGER,
  data_source TEXT DEFAULT 'ml_training_data_v2',
  status TEXT NOT NULL DEFAULT 'in_progress',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Intelligence log for AI layer decisions
CREATE TABLE public.ml_intelligence_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  market TEXT NOT NULL,
  ml_probability NUMERIC NOT NULL,
  ai_adjusted_probability NUMERIC,
  ai_adjustment NUMERIC,
  ai_reasoning TEXT,
  ai_confidence TEXT,
  context_factors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ml_training_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_intelligence_log ENABLE ROW LEVEL SECURITY;

-- Public read, service write
CREATE POLICY "Training log publicly readable" ON public.ml_training_log FOR SELECT USING (true);
CREATE POLICY "Service manage training log" ON public.ml_training_log FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Intelligence log publicly readable" ON public.ml_intelligence_log FOR SELECT USING (true);
CREATE POLICY "Service manage intelligence log" ON public.ml_intelligence_log FOR ALL USING (true) WITH CHECK (true);

-- Index for fast queries
CREATE INDEX idx_training_log_market ON public.ml_training_log(market, created_at DESC);
CREATE INDEX idx_intelligence_log_date ON public.ml_intelligence_log(created_at DESC);
CREATE INDEX idx_intelligence_log_fixture ON public.ml_intelligence_log(fixture_id);
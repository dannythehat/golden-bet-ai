-- Create ACCA history table for tracking daily accumulators
CREATE TABLE IF NOT EXISTS public.acca_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- ACCA selections (3-5 teams)
  selections JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each selection: { teamName, league, market, successPercent, opposition, oppositionStats, kickoff }
  
  -- Combined data
  combined_odds NUMERIC NOT NULL,
  average_confidence NUMERIC NOT NULL,
  selection_count INTEGER NOT NULL DEFAULT 3,
  
  -- The Gaffer's take
  gaffer_reasoning TEXT NOT NULL,
  
  -- Betting info
  stake NUMERIC DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Results
  results JSONB DEFAULT '[]'::jsonb,
  -- Each result: { teamName, market, hit: boolean }
  
  legs_won INTEGER DEFAULT NULL,
  legs_lost INTEGER DEFAULT NULL,
  profit_loss NUMERIC DEFAULT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  settled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  UNIQUE(prediction_date)
);

-- Enable RLS
ALTER TABLE public.acca_history ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "ACCA history is publicly readable" ON public.acca_history
  FOR SELECT USING (true);

-- Service role can manage
CREATE POLICY "Service role can manage ACCA history" ON public.acca_history
  FOR ALL USING (true) WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX idx_acca_history_date ON public.acca_history(prediction_date DESC);
CREATE INDEX idx_acca_history_status ON public.acca_history(status);
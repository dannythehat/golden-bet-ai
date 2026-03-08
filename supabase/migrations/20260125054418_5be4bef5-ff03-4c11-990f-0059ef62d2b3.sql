-- Create bet_builder_history table for storing daily bet builder picks
CREATE TABLE IF NOT EXISTS public.bet_builder_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  kickoff TIMESTAMP WITH TIME ZONE NOT NULL,
  -- Markets included (array of selected markets)
  markets TEXT[] NOT NULL,
  -- Individual market confidences
  market_confidences JSONB NOT NULL DEFAULT '{}',
  -- Combined odds (multiplied)
  combined_odds NUMERIC NOT NULL,
  -- Average confidence across markets
  average_confidence NUMERIC NOT NULL,
  -- The Gaffer's reasoning for this bet builder
  gaffer_reasoning TEXT NOT NULL,
  stake NUMERIC DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Result tracking
  result TEXT,
  actual_goals_home INTEGER,
  actual_goals_away INTEGER,
  actual_corners INTEGER,
  actual_cards INTEGER,
  btts_result BOOLEAN,
  profit_loss NUMERIC,
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  settled_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(fixture_id, prediction_date)
);

-- Enable RLS
ALTER TABLE public.bet_builder_history ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Bet builder is publicly readable"
  ON public.bet_builder_history
  FOR SELECT
  USING (true);

-- Service role can manage
CREATE POLICY "Service role can manage bet builder"
  ON public.bet_builder_history
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_bet_builder_prediction_date ON public.bet_builder_history(prediction_date DESC);
CREATE INDEX idx_bet_builder_status ON public.bet_builder_history(status);
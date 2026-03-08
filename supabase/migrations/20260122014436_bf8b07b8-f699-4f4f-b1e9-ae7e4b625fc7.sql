-- Create table to store daily golden bet predictions and results
CREATE TABLE public.golden_bet_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  kickoff TIMESTAMP WITH TIME ZONE NOT NULL,
  market TEXT NOT NULL,
  ml_confidence DECIMAL(4,3) NOT NULL,
  value_edge DECIMAL(4,3) NOT NULL,
  gaffer_reasoning TEXT NOT NULL,
  bookmaker_odds DECIMAL(5,2),
  stake DECIMAL(10,2) DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  actual_goals_home INTEGER,
  actual_goals_away INTEGER,
  profit_loss DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  settled_at TIMESTAMP WITH TIME ZONE,
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Create indexes for fast P&L queries
CREATE INDEX idx_golden_bet_history_date ON public.golden_bet_history(prediction_date DESC);
CREATE INDEX idx_golden_bet_history_status ON public.golden_bet_history(status);
CREATE INDEX idx_golden_bet_history_kickoff ON public.golden_bet_history(kickoff);

-- Enable Row Level Security
ALTER TABLE public.golden_bet_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access for P&L display
CREATE POLICY "Golden bets are publicly readable" 
ON public.golden_bet_history 
FOR SELECT 
USING (true);

-- Allow service role to manage bets (for edge functions)
CREATE POLICY "Service role can manage golden bets" 
ON public.golden_bet_history 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create summary view for P&L stats
CREATE OR REPLACE VIEW public.pl_summary AS
SELECT 
  prediction_date,
  COUNT(*) as total_bets,
  COUNT(CASE WHEN status = 'won' THEN 1 END) as wins,
  COUNT(CASE WHEN status = 'lost' THEN 1 END) as losses,
  COALESCE(SUM(stake), 0) as total_staked,
  COALESCE(SUM(CASE WHEN status = 'won' THEN stake * bookmaker_odds ELSE 0 END), 0) as total_returns,
  COALESCE(SUM(profit_loss), 0) as net_profit,
  CASE 
    WHEN SUM(stake) > 0 THEN ROUND((COALESCE(SUM(profit_loss), 0) / SUM(stake)) * 100, 2)
    ELSE 0 
  END as roi
FROM public.golden_bet_history
WHERE status IN ('won', 'lost')
GROUP BY prediction_date
ORDER BY prediction_date DESC;

-- Challenge tracking table for €100 to €1000 challenge
CREATE TABLE public.challenge_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_number INTEGER NOT NULL,
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  starting_balance NUMERIC NOT NULL DEFAULT 100,
  stake_amount NUMERIC NOT NULL DEFAULT 0,
  stake_percentage NUMERIC NOT NULL DEFAULT 20,
  
  -- Bet references (links to our daily picks)
  golden_bet_ids UUID[] DEFAULT '{}',
  bet_builder_ids UUID[] DEFAULT '{}',
  acca_id UUID DEFAULT NULL,
  
  -- Results
  total_returns NUMERIC DEFAULT 0,
  profit_loss NUMERIC DEFAULT 0,
  closing_balance NUMERIC DEFAULT NULL,
  
  -- Proof screenshots
  balance_proof_url TEXT DEFAULT NULL,
  bets_proof_url TEXT DEFAULT NULL,
  results_proof_url TEXT DEFAULT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, settled
  bets_won INTEGER DEFAULT 0,
  bets_lost INTEGER DEFAULT 0,
  bets_total INTEGER DEFAULT 6,
  
  -- Article references
  morning_article_slug TEXT DEFAULT NULL,
  results_article_slug TEXT DEFAULT NULL,
  
  -- Notes
  gaffer_commentary TEXT DEFAULT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(day_number),
  UNIQUE(challenge_date)
);

-- Enable RLS
ALTER TABLE public.challenge_log ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Challenge log is publicly readable"
  ON public.challenge_log
  FOR SELECT
  USING (true);

-- Service role write
CREATE POLICY "Service role can manage challenge log"
  ON public.challenge_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Timestamp trigger
CREATE TRIGGER update_challenge_log_updated_at
  BEFORE UPDATE ON public.challenge_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint to prevent duplicate golden bets for same day/fixture/market
ALTER TABLE public.golden_bet_history 
ADD CONSTRAINT golden_bet_history_unique_daily 
UNIQUE (prediction_date, fixture_id, market);

-- If the constraint already exists, this won't cause issues
-- The onConflict in the upsert will now work correctly
-- =====================================================
-- PHASE 1: Fix saved_teams RLS policies (user-scoped)
-- =====================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all delete on saved_teams" ON saved_teams;
DROP POLICY IF EXISTS "Allow all insert on saved_teams" ON saved_teams;
DROP POLICY IF EXISTS "Allow all read access on saved_teams" ON saved_teams;

-- Create proper user-scoped policies
CREATE POLICY "Users can view own teams" ON saved_teams 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own teams" ON saved_teams 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own teams" ON saved_teams 
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own teams" ON saved_teams 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PHASE 2: Fix saved_fixtures RLS policies (user-scoped)
-- =====================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all delete on saved_fixtures" ON saved_fixtures;
DROP POLICY IF EXISTS "Allow all insert on saved_fixtures" ON saved_fixtures;
DROP POLICY IF EXISTS "Allow all read access on saved_fixtures" ON saved_fixtures;

-- Create proper user-scoped policies
CREATE POLICY "Users can view own fixtures" ON saved_fixtures 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixtures" ON saved_fixtures 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixtures" ON saved_fixtures 
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own fixtures" ON saved_fixtures 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PHASE 3: Restrict ml_training_data to service role only
-- =====================================================

-- Remove public read access - this is internal ML data
DROP POLICY IF EXISTS "Public read ml_training_data" ON ml_training_data;

-- Keep only service role management policy (already exists)

-- =====================================================
-- PHASE 4: Restrict ml_model_accuracy to service role only  
-- =====================================================

-- Remove public read access
DROP POLICY IF EXISTS "Public read ml_model_accuracy" ON ml_model_accuracy;

-- Keep only service role management policy (already exists)

-- =====================================================
-- PHASE 5: Fix pl_summary view with security_invoker
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS pl_summary;

-- Recreate with security_invoker = true (respects RLS of underlying tables)
CREATE VIEW pl_summary WITH (security_invoker = true) AS
SELECT 
  prediction_date,
  COUNT(*) as total_bets,
  COUNT(*) FILTER (WHERE status = 'won') as wins,
  COUNT(*) FILTER (WHERE status = 'lost') as losses,
  COALESCE(SUM(stake), 0) as total_staked,
  COALESCE(SUM(CASE WHEN status = 'won' THEN stake * bookmaker_odds ELSE 0 END), 0) as total_returns,
  COALESCE(SUM(profit_loss), 0) as net_profit,
  CASE 
    WHEN COALESCE(SUM(stake), 0) > 0 
    THEN ROUND((COALESCE(SUM(profit_loss), 0) / SUM(stake)) * 100, 2)
    ELSE 0 
  END as roi
FROM golden_bet_history
WHERE status IN ('won', 'lost')
GROUP BY prediction_date
ORDER BY prediction_date DESC;
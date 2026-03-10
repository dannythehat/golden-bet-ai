-- ML Training History - stores historical results for each market type
CREATE TABLE IF NOT EXISTS ml_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id TEXT NOT NULL,
  fixture_date DATE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'european',
  
  -- Pre-match stats (training inputs)
  home_over25_pct INTEGER DEFAULT 0,
  away_over25_pct INTEGER DEFAULT 0,
  home_btts_pct INTEGER DEFAULT 0,
  away_btts_pct INTEGER DEFAULT 0,
  home_over95_corners_pct INTEGER DEFAULT 0,
  away_over95_corners_pct INTEGER DEFAULT 0,
  home_over35_cards_pct INTEGER DEFAULT 0,
  away_over35_cards_pct INTEGER DEFAULT 0,
  home_avg_goals NUMERIC(3,1) DEFAULT 0,
  away_avg_goals NUMERIC(3,1) DEFAULT 0,
  home_avg_corners NUMERIC(3,1) DEFAULT 0,
  away_avg_corners NUMERIC(3,1) DEFAULT 0,
  home_avg_cards NUMERIC(3,1) DEFAULT 0,
  away_avg_cards NUMERIC(3,1) DEFAULT 0,
  home_form TEXT,
  away_form TEXT,
  
  -- Actual results (training outputs)
  total_goals INTEGER DEFAULT 0,
  home_goals INTEGER DEFAULT 0,
  away_goals INTEGER DEFAULT 0,
  total_corners INTEGER,
  total_cards INTEGER,
  btts_hit BOOLEAN DEFAULT false,
  over_25_hit BOOLEAN DEFAULT false,
  over_95_corners_hit BOOLEAN,
  over_35_cards_hit BOOLEAN,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fixture_id)
);

-- ML Model Performance Tracking
CREATE TABLE IF NOT EXISTS ml_model_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market TEXT NOT NULL, -- 'over_2.5_goals', 'btts', 'over_9.5_corners', 'over_3.5_cards'
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Predictions made
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  
  -- P&L metrics
  total_staked NUMERIC DEFAULT 0,
  total_returns NUMERIC DEFAULT 0,
  profit_loss NUMERIC DEFAULT 0,
  roi NUMERIC GENERATED ALWAYS AS (
    CASE WHEN total_staked > 0 THEN ROUND((profit_loss / total_staked) * 100, 2) ELSE 0 END
  ) STORED,
  
  -- Model stats
  avg_confidence NUMERIC(4,2) DEFAULT 0,
  win_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN total_predictions > 0 THEN ROUND((correct_predictions::NUMERIC / total_predictions) * 100, 2) ELSE 0 END
  ) STORED,
  current_streak INTEGER DEFAULT 0, -- positive = wins, negative = losses
  best_streak INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(market, date)
);

-- Gaffer Alerts - when top-30 teams meet
CREATE TABLE IF NOT EXISTS gaffer_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id TEXT NOT NULL,
  fixture_date DATE NOT NULL,
  kickoff TIMESTAMPTZ NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  
  -- Alert context
  alert_type TEXT NOT NULL, -- 'top30_clash', 'high_form_matchup'
  market TEXT NOT NULL, -- which market this alert is for
  home_success_pct INTEGER DEFAULT 0,
  away_success_pct INTEGER DEFAULT 0,
  combined_confidence INTEGER DEFAULT 0,
  
  -- Gaffer's take
  gaffer_alert_text TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Result tracking
  result TEXT, -- 'won', 'lost', 'pending'
  actual_outcome TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  UNIQUE(fixture_id, market)
);

-- Create indexes
CREATE INDEX idx_ml_training_fixture_date ON ml_training_data(fixture_date DESC);
CREATE INDEX idx_ml_training_region ON ml_training_data(region);
CREATE INDEX idx_ml_accuracy_market ON ml_model_accuracy(market, date DESC);
CREATE INDEX idx_gaffer_alerts_active ON gaffer_alerts(is_active, fixture_date);
CREATE INDEX idx_gaffer_alerts_market ON gaffer_alerts(market);

-- Enable RLS
ALTER TABLE ml_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_accuracy ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaffer_alerts ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read ml_training_data" ON ml_training_data FOR SELECT USING (true);
CREATE POLICY "Public read ml_model_accuracy" ON ml_model_accuracy FOR SELECT USING (true);
CREATE POLICY "Public read gaffer_alerts" ON gaffer_alerts FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Service manage ml_training_data" ON ml_training_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service manage ml_model_accuracy" ON ml_model_accuracy FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service manage gaffer_alerts" ON gaffer_alerts FOR ALL USING (true) WITH CHECK (true);
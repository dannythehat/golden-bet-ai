
-- League-level rolling stats: aggregated from all teams in each league
CREATE TABLE public.league_rolling_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league TEXT NOT NULL,
  league_id INTEGER,
  region TEXT NOT NULL DEFAULT 'european',
  matches_sampled INTEGER NOT NULL DEFAULT 0,

  -- Goals
  avg_home_goals NUMERIC(4,2) DEFAULT 0,
  avg_away_goals NUMERIC(4,2) DEFAULT 0,
  avg_total_goals NUMERIC(4,2) DEFAULT 0,
  over_15_goals_pct INTEGER DEFAULT 0,
  over_25_goals_pct INTEGER DEFAULT 0,
  over_35_goals_pct INTEGER DEFAULT 0,
  btts_pct INTEGER DEFAULT 0,
  clean_sheet_pct INTEGER DEFAULT 0,

  -- Corners
  avg_home_corners NUMERIC(4,2) DEFAULT 0,
  avg_away_corners NUMERIC(4,2) DEFAULT 0,
  avg_total_corners NUMERIC(4,2) DEFAULT 0,
  over_85_corners_pct INTEGER DEFAULT 0,
  over_95_corners_pct INTEGER DEFAULT 0,
  over_105_corners_pct INTEGER DEFAULT 0,

  -- Cards
  avg_home_cards NUMERIC(4,2) DEFAULT 0,
  avg_away_cards NUMERIC(4,2) DEFAULT 0,
  avg_total_cards NUMERIC(4,2) DEFAULT 0,
  over_25_cards_pct INTEGER DEFAULT 0,
  over_35_cards_pct INTEGER DEFAULT 0,
  over_45_cards_pct INTEGER DEFAULT 0,

  -- BTTS splits
  home_scored_pct INTEGER DEFAULT 0,
  away_scored_pct INTEGER DEFAULT 0,

  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(league)
);

ALTER TABLE public.league_rolling_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "League stats publicly readable"
  ON public.league_rolling_stats FOR SELECT USING (true);

CREATE POLICY "Service role manages league stats"
  ON public.league_rolling_stats FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_league_rolling_stats_league ON public.league_rolling_stats(league);
CREATE INDEX idx_league_rolling_stats_region ON public.league_rolling_stats(region);

-- Gaffer Learning Log: tracks every selection outcome for feedback
CREATE TABLE public.gaffer_learning_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fixture_id TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  market TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'golden_bet', -- golden_bet, bet_builder, acca

  -- What the gaffer predicted
  predicted_probability NUMERIC NOT NULL,
  probability_band TEXT NOT NULL, -- e.g. '60-65', '65-70', '70-75'
  bookmaker_odds NUMERIC,
  value_edge NUMERIC,

  -- What actually happened
  result TEXT, -- 'won', 'lost', 'void', NULL = pending
  actual_value NUMERIC, -- actual goals/corners/cards total
  settled_at TIMESTAMP WITH TIME ZONE,

  -- Context snapshot
  overall_pct NUMERIC,
  venue_pct NUMERIC,
  h2h_pct NUMERIC,
  derby_boost NUMERIC DEFAULT 0,
  intelligence_adj NUMERIC DEFAULT 0,
  league_avg NUMERIC, -- league average for this market

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  UNIQUE(prediction_date, fixture_id, market, source)
);

ALTER TABLE public.gaffer_learning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learning log publicly readable"
  ON public.gaffer_learning_log FOR SELECT USING (true);

CREATE POLICY "Service role manages learning log"
  ON public.gaffer_learning_log FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_gaffer_learning_market ON public.gaffer_learning_log(market);
CREATE INDEX idx_gaffer_learning_band ON public.gaffer_learning_log(probability_band);
CREATE INDEX idx_gaffer_learning_result ON public.gaffer_learning_log(result);
CREATE INDEX idx_gaffer_learning_date ON public.gaffer_learning_log(prediction_date DESC);
CREATE INDEX idx_gaffer_learning_source ON public.gaffer_learning_log(source);

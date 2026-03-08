-- First create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create match_intelligence table to store contextual data for ML and Gaffer reasoning
CREATE TABLE public.match_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  fixture_date DATE NOT NULL,
  kickoff TIMESTAMP WITH TIME ZONE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  
  -- Injuries & Suspensions
  home_injuries JSONB DEFAULT '[]'::jsonb,
  away_injuries JSONB DEFAULT '[]'::jsonb,
  home_injury_count INTEGER DEFAULT 0,
  away_injury_count INTEGER DEFAULT 0,
  home_key_players_out TEXT[] DEFAULT '{}',
  away_key_players_out TEXT[] DEFAULT '{}',
  
  -- Fatigue / Fixture Congestion
  home_days_since_last_match INTEGER,
  away_days_since_last_match INTEGER,
  home_matches_last_14_days INTEGER DEFAULT 0,
  away_matches_last_14_days INTEGER DEFAULT 0,
  home_travel_km_last_14_days INTEGER DEFAULT 0,
  away_travel_km_last_14_days INTEGER DEFAULT 0,
  home_is_fatigued BOOLEAN DEFAULT false,
  away_is_fatigued BOOLEAN DEFAULT false,
  
  -- Early Kickoff Analysis
  is_early_kickoff BOOLEAN DEFAULT false,
  kickoff_hour INTEGER,
  
  -- Manager / Coach Info
  home_manager TEXT,
  away_manager TEXT,
  home_manager_games INTEGER DEFAULT 0,
  away_manager_games INTEGER DEFAULT 0,
  home_new_manager BOOLEAN DEFAULT false,
  away_new_manager BOOLEAN DEFAULT false,
  
  -- Weather Conditions
  weather_condition TEXT,
  temperature_celsius NUMERIC,
  wind_speed_kmh NUMERIC,
  humidity_percent INTEGER,
  is_adverse_weather BOOLEAN DEFAULT false,
  
  -- Referee Analysis
  referee_name TEXT,
  referee_avg_cards NUMERIC,
  referee_avg_fouls NUMERIC,
  referee_strictness TEXT,
  
  -- Computed Risk Factors
  injury_risk_score INTEGER DEFAULT 0,
  fatigue_risk_score INTEGER DEFAULT 0,
  weather_risk_score INTEGER DEFAULT 0,
  overall_risk_score INTEGER DEFAULT 0,
  rejection_reasons TEXT[] DEFAULT '{}',
  should_avoid BOOLEAN DEFAULT false,
  
  -- Gaffer Intelligence Summary
  intelligence_summary TEXT,
  gaffer_talking_points TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(fixture_id)
);

-- Enable RLS
ALTER TABLE public.match_intelligence ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Match intelligence is publicly readable" 
ON public.match_intelligence 
FOR SELECT 
USING (true);

-- Service role can manage
CREATE POLICY "Service role can manage match intelligence" 
ON public.match_intelligence 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_match_intelligence_fixture_date ON public.match_intelligence(fixture_date);
CREATE INDEX idx_match_intelligence_should_avoid ON public.match_intelligence(should_avoid);

-- Trigger for updated_at
CREATE TRIGGER update_match_intelligence_updated_at
BEFORE UPDATE ON public.match_intelligence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
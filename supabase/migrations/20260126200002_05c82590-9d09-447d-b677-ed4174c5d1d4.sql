-- Create alert preferences table for per-bet notification settings
CREATE TABLE public.alert_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  saved_fixture_id UUID REFERENCES public.saved_fixtures(id) ON DELETE CASCADE,
  
  -- What stats to alert on
  alert_corners BOOLEAN NOT NULL DEFAULT false,
  alert_cards BOOLEAN NOT NULL DEFAULT false,
  alert_goals BOOLEAN NOT NULL DEFAULT false,
  alert_btts BOOLEAN NOT NULL DEFAULT false,
  
  -- Thresholds (optional - when to trigger)
  corners_threshold INTEGER DEFAULT NULL,
  cards_threshold INTEGER DEFAULT NULL,
  goals_threshold INTEGER DEFAULT NULL,
  
  -- Alert delivery preferences
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Status tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, saved_fixture_id)
);

-- Enable RLS
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own preferences
CREATE POLICY "Users can view own alert preferences"
  ON public.alert_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert preferences"
  ON public.alert_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert preferences"
  ON public.alert_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alert preferences"
  ON public.alert_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_alert_preferences_updated_at
  BEFORE UPDATE ON public.alert_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
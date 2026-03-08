-- Create saved_teams table for user's selected teams
CREATE TABLE public.saved_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  team_name TEXT NOT NULL,
  league TEXT NOT NULL,
  region TEXT NOT NULL,
  bet_type TEXT NOT NULL,
  market TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved_fixtures table for user's selected upcoming matches
CREATE TABLE public.saved_fixtures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  saved_team_id UUID REFERENCES public.saved_teams(id) ON DELETE CASCADE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  league TEXT NOT NULL,
  kickoff TIMESTAMP WITH TIME ZONE NOT NULL,
  bet_type TEXT NOT NULL,
  market TEXT NOT NULL,
  odds DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_fixtures ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_teams (allow all for now since no auth yet)
CREATE POLICY "Allow all read access on saved_teams" 
ON public.saved_teams 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all insert on saved_teams" 
ON public.saved_teams 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all delete on saved_teams" 
ON public.saved_teams 
FOR DELETE 
USING (true);

-- Create policies for saved_fixtures
CREATE POLICY "Allow all read access on saved_fixtures" 
ON public.saved_fixtures 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all insert on saved_fixtures" 
ON public.saved_fixtures 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all delete on saved_fixtures" 
ON public.saved_fixtures 
FOR DELETE 
USING (true);
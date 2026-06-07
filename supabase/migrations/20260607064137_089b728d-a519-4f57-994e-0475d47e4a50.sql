
CREATE TABLE public.sweepstake_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  tournament TEXT NOT NULL DEFAULT 'wc2026',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.sweepstake_signups TO anon, authenticated;
GRANT ALL ON public.sweepstake_signups TO service_role;

ALTER TABLE public.sweepstake_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register interest"
  ON public.sweepstake_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(trim(display_name)) BETWEEN 1 AND 60
    AND length(email) BETWEEN 3 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  );

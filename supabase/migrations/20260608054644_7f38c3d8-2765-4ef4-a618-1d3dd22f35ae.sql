GRANT SELECT ON public.sweepstake_signups TO anon, authenticated;

CREATE POLICY "Anyone can view signup count"
  ON public.sweepstake_signups
  FOR SELECT
  TO anon, authenticated
  USING (true);
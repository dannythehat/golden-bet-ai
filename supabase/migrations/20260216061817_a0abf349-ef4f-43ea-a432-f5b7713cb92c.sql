-- Lock down sportmonks_ml_features: remove public read, restrict to service role only
DROP POLICY IF EXISTS "Public read sportmonks_ml_features" ON public.sportmonks_ml_features;
DROP POLICY IF EXISTS "Service role write sportmonks_ml_features" ON public.sportmonks_ml_features;

CREATE POLICY "Service role only access sportmonks_ml_features"
ON public.sportmonks_ml_features
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Lock down ml_training_data: remove public access, restrict to service role only
DROP POLICY IF EXISTS "Service manage ml_training_data" ON public.ml_training_data;

CREATE POLICY "Service role only access ml_training_data"
ON public.ml_training_data
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
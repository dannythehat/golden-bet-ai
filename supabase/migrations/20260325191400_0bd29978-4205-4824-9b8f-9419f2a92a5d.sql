-- Fix ml_training_data_v2: restrict writes to service_role only
DROP POLICY IF EXISTS "Service manage ml_training_data_v2" ON public.ml_training_data_v2;
CREATE POLICY "Public read ml_training_data_v2" ON public.ml_training_data_v2
  FOR SELECT USING (true);
CREATE POLICY "Service write ml_training_data_v2" ON public.ml_training_data_v2
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fix ml_model_accuracy: restrict writes to service_role only
DROP POLICY IF EXISTS "Service manage ml_model_accuracy" ON public.ml_model_accuracy;
CREATE POLICY "Public read ml_model_accuracy" ON public.ml_model_accuracy
  FOR SELECT USING (true);
CREATE POLICY "Service write ml_model_accuracy" ON public.ml_model_accuracy
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Fix ml_models: restrict writes to service_role, keep public reads
DROP POLICY IF EXISTS "ML models are publicly readable" ON public.ml_models;
DROP POLICY IF EXISTS "Service role can manage models" ON public.ml_models;
CREATE POLICY "Public read ml_models" ON public.ml_models
  FOR SELECT USING (true);
CREATE POLICY "Service write ml_models" ON public.ml_models
  FOR ALL TO service_role USING (true) WITH CHECK (true);
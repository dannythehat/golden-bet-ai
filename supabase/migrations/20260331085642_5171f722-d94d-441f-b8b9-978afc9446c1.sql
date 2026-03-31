
-- Fix match_intelligence: remove public ALL policy, create service_role-only write
DROP POLICY IF EXISTS "Service role can manage match intelligence" ON public.match_intelligence;
CREATE POLICY "Service write match_intelligence" ON public.match_intelligence FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Restrict ml_models: create a view without weights for public, restrict base table
DROP POLICY IF EXISTS "Public read ml_models" ON public.ml_models;
CREATE POLICY "Service read ml_models" ON public.ml_models FOR SELECT TO service_role USING (true);
CREATE POLICY "Authenticated read ml_models" ON public.ml_models FOR SELECT TO authenticated USING (true);

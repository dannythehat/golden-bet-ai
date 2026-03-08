-- Fix 2: Remove overly permissive email_preferences SELECT policy
DROP POLICY IF EXISTS "Service role can read email preferences" ON public.email_preferences;
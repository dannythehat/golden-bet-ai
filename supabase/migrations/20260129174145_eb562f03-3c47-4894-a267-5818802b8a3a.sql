-- Add proof screenshot columns to all bet history tables

-- Golden Bet History
ALTER TABLE public.golden_bet_history 
ADD COLUMN IF NOT EXISTS proof_screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS proof_captured_at TIMESTAMP WITH TIME ZONE;

-- ACCA History
ALTER TABLE public.acca_history 
ADD COLUMN IF NOT EXISTS proof_screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS proof_captured_at TIMESTAMP WITH TIME ZONE;

-- Bet Builder History
ALTER TABLE public.bet_builder_history 
ADD COLUMN IF NOT EXISTS proof_screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS proof_captured_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for bet proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('bet-proofs', 'bet-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to bet proofs
CREATE POLICY "Bet proofs are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'bet-proofs');

-- Allow service role to upload proofs
CREATE POLICY "Service role can upload bet proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bet-proofs');
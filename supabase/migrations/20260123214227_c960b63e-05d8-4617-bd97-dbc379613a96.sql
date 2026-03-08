-- Create storage bucket for ML model artifacts
INSERT INTO storage.buckets (id, name, public)
VALUES ('ml-models', 'ml-models', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to models (for Edge Function inference)
CREATE POLICY "Public can read ML models"
ON storage.objects FOR SELECT
USING (bucket_id = 'ml-models');

-- Service role can upload models
CREATE POLICY "Service can upload ML models"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ml-models');

CREATE POLICY "Service can update ML models"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ml-models');

CREATE POLICY "Service can delete ML models"
ON storage.objects FOR DELETE
USING (bucket_id = 'ml-models');
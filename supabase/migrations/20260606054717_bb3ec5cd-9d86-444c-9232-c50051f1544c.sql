CREATE TABLE IF NOT EXISTS public.wc_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  key text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, key)
);

GRANT SELECT ON public.wc_content TO anon;
GRANT SELECT ON public.wc_content TO authenticated;
GRANT ALL ON public.wc_content TO service_role;

ALTER TABLE public.wc_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wc_content public read" ON public.wc_content FOR SELECT USING (true);

CREATE TRIGGER wc_content_updated_at BEFORE UPDATE ON public.wc_content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS wc_content_kind_key_idx ON public.wc_content (kind, key);

-- 1. Feature strip
CREATE TABLE public.homepage_feature_strip (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icon text NOT NULL,
  label text NOT NULL,
  subtitle text,
  link text,
  highlight boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_feature_strip TO anon, authenticated;
GRANT ALL ON public.homepage_feature_strip TO service_role;
ALTER TABLE public.homepage_feature_strip ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read feature strip" ON public.homepage_feature_strip FOR SELECT USING (true);
CREATE TRIGGER set_homepage_feature_strip_updated_at BEFORE UPDATE ON public.homepage_feature_strip FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Weekly prizes
CREATE TABLE public.homepage_weekly_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image text,
  link text,
  category text NOT NULL DEFAULT 'random' CHECK (category IN ('random','themed')),
  display_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_weekly_prizes TO anon, authenticated;
GRANT ALL ON public.homepage_weekly_prizes TO service_role;
ALTER TABLE public.homepage_weekly_prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read weekly prizes" ON public.homepage_weekly_prizes FOR SELECT USING (true);
CREATE TRIGGER set_homepage_weekly_prizes_updated_at BEFORE UPDATE ON public.homepage_weekly_prizes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Donkey of the Week (multiple rows allowed; component picks newest enabled)
CREATE TABLE public.homepage_donkey (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline text NOT NULL,
  description text,
  image text,
  cta_label text,
  cta_href text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_donkey TO anon, authenticated;
GRANT ALL ON public.homepage_donkey TO service_role;
ALTER TABLE public.homepage_donkey ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read donkey" ON public.homepage_donkey FOR SELECT USING (true);
CREATE TRIGGER set_homepage_donkey_updated_at BEFORE UPDATE ON public.homepage_donkey FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Gaffer Story
CREATE TABLE public.homepage_gaffer_story (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline text NOT NULL,
  image text,
  intro text,
  cta_label text,
  cta_href text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_gaffer_story TO anon, authenticated;
GRANT ALL ON public.homepage_gaffer_story TO service_role;
ALTER TABLE public.homepage_gaffer_story ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read gaffer story" ON public.homepage_gaffer_story FOR SELECT USING (true);
CREATE TRIGGER set_homepage_gaffer_story_updated_at BEFORE UPDATE ON public.homepage_gaffer_story FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

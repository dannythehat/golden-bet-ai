
-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  hero_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'match-preview',
  tags TEXT[] DEFAULT '{}',
  author TEXT NOT NULL DEFAULT 'The Gaffer',
  post_type TEXT NOT NULL DEFAULT 'match-preview',
  related_fixture_id TEXT,
  related_prediction_date DATE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  seo_title TEXT,
  seo_description TEXT,
  reading_time_minutes INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Published blog posts are publicly readable"
  ON public.blog_posts FOR SELECT
  USING (is_published = true);

-- Service role can manage all posts
CREATE POLICY "Service role can manage blog posts"
  ON public.blog_posts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for slug lookups
CREATE INDEX idx_blog_posts_slug ON public.blog_posts (slug);

-- Index for listing by date
CREATE INDEX idx_blog_posts_published ON public.blog_posts (is_published, published_at DESC);

-- Index for category filtering
CREATE INDEX idx_blog_posts_category ON public.blog_posts (category);

-- Trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

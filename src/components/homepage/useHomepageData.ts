import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STALE = 1000 * 60 * 10; // 10 min — homepage CMS rarely changes

/* ── Feature strip ─────────────────────────────────────────────────────── */
export interface FeatureStripRow {
  id: string;
  icon: string;
  label: string;
  subtitle: string | null;
  link: string | null;
  highlight: boolean;
  display_order: number;
}
export function useFeatureStrip() {
  return useQuery({
    queryKey: ['homepage_feature_strip'],
    staleTime: STALE,
    queryFn: async (): Promise<FeatureStripRow[]> => {
      const { data } = await supabase
        .from('homepage_feature_strip')
        .select('id, icon, label, subtitle, link, highlight, display_order')
        .eq('enabled', true)
        .order('display_order', { ascending: true });
      return data ?? [];
    },
  });
}

/* ── Weekly prizes ─────────────────────────────────────────────────────── */
export interface WeeklyPrizeRow {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  link: string | null;
  category: 'random' | 'themed';
  display_order: number;
}
export function useWeeklyPrizes() {
  return useQuery({
    queryKey: ['homepage_weekly_prizes'],
    staleTime: STALE,
    queryFn: async (): Promise<WeeklyPrizeRow[]> => {
      const { data } = await supabase
        .from('homepage_weekly_prizes')
        .select('id, title, description, image, link, category, display_order')
        .eq('enabled', true)
        .order('display_order', { ascending: true });
      return (data ?? []) as WeeklyPrizeRow[];
    },
  });
}

/* ── Donkey of the Week ────────────────────────────────────────────────── */
export interface DonkeyRow {
  id: string;
  headline: string;
  description: string | null;
  image: string | null;
  cta_label: string | null;
  cta_href: string | null;
}
export function useDonkey() {
  return useQuery({
    queryKey: ['homepage_donkey'],
    staleTime: STALE,
    queryFn: async (): Promise<DonkeyRow | null> => {
      const { data } = await supabase
        .from('homepage_donkey')
        .select('id, headline, description, image, cta_label, cta_href')
        .eq('enabled', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

/* ── Gaffer story ──────────────────────────────────────────────────────── */
export interface GafferStoryRow {
  id: string;
  headline: string;
  image: string | null;
  intro: string | null;
  cta_label: string | null;
  cta_href: string | null;
}
export function useGafferStory() {
  return useQuery({
    queryKey: ['homepage_gaffer_story'],
    staleTime: STALE,
    queryFn: async (): Promise<GafferStoryRow | null> => {
      const { data } = await supabase
        .from('homepage_gaffer_story')
        .select('id, headline, image, intro, cta_label, cta_href')
        .eq('enabled', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

/* ── Latest articles (blog_posts) ──────────────────────────────────────── */
export interface LatestArticleRow {
  slug: string;
  title: string;
  excerpt: string | null;
  hero_image_url: string | null;
  category: string | null;
  reading_time_minutes: number | null;
  published_at: string | null;
}
export function useLatestArticles(limit = 3) {
  return useQuery({
    queryKey: ['homepage_latest_articles', limit],
    staleTime: STALE,
    queryFn: async (): Promise<LatestArticleRow[]> => {
      const { data } = await supabase
        .from('blog_posts')
        .select('slug, title, excerpt, hero_image_url, category, reading_time_minutes, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(limit);
      return data ?? [];
    },
  });
}

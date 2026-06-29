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

/* ── Tip of the Day (gaffer_picks) ─────────────────────────────────────── */
export interface DailyTipRow {
  id: string;
  home_team: string;
  away_team: string;
  market: string;
  odds: number | string;
  confidence: number;
  short_reason?: string | null;
  updated_at?: string | null;
}

type PickLeg = {
  fixture?: string;
  match?: string;
  game?: string;
  home_team?: string;
  away_team?: string;
  homeTeam?: string;
  awayTeam?: string;
  market?: string;
  bet_type?: string;
  label?: string;
  odds?: number | string;
  price?: number | string;
  confidence?: number;
  probability?: number;
  formProb?: number;
};

type GafferPickRow = {
  id: string;
  combined_odds: number | null;
  reasoning: string | null;
  updated_at: string | null;
  created_at: string | null;
  legs: PickLeg[] | null;
};

function parseFixtureTeams(fixture?: string | null) {
  if (!fixture) return { home: 'Home', away: 'Away' };
  const parts = fixture.split(/\s+vs\s+|\s+v\s+/i);
  if (parts.length >= 2) {
    return { home: parts[0].trim(), away: parts[1].trim() };
  }
  return { home: fixture, away: 'Away' };
}

function pickConfidence(leg: PickLeg | undefined) {
  const raw = leg?.confidence ?? leg?.probability ?? leg?.formProb ?? 0.72;
  return Math.max(1, Math.min(100, raw <= 1 ? Math.round(raw * 100) : Math.round(raw)));
}

export function useTipOfTheDay() {
  return useQuery({
    queryKey: ['homepage_tip_of_day'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<DailyTipRow | null> => {
      const { data } = await (supabase as any)
        .from('gaffer_picks')
        .select('id, combined_odds, reasoning, updated_at, created_at, legs, pick_date, status')
        .order('pick_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const pick = (data ?? null) as GafferPickRow | null;
      if (!pick) return null;

      const firstLeg = Array.isArray(pick.legs) ? (pick.legs[0] as PickLeg | undefined) : undefined;
      const fixture = firstLeg?.fixture ?? firstLeg?.match ?? firstLeg?.game ?? '';
      const parsedTeams = parseFixtureTeams(fixture);
      const home_team = firstLeg?.home_team ?? firstLeg?.homeTeam ?? parsedTeams.home;
      const away_team = firstLeg?.away_team ?? firstLeg?.awayTeam ?? parsedTeams.away;
      const market = firstLeg?.market ?? firstLeg?.bet_type ?? firstLeg?.label ?? "Today's Pick";
      const odds = firstLeg?.odds ?? firstLeg?.price ?? pick.combined_odds ?? '';

      return {
        id: pick.id,
        home_team,
        away_team,
        market,
        odds,
        confidence: pickConfidence(firstLeg),
        short_reason: pick.reasoning,
        updated_at: pick.updated_at ?? pick.created_at,
      };
    },
  });
}

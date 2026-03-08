/**
 * Simple hook to fetch TOP 20 teams by stat from Supabase
 */

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

/**
 * Fetch top 20 teams for goals (Over 2.5)
 */
export function useTop20Goals(region = 'all') {
  return useQuery({
    queryKey: ['top20-goals', region],
    queryFn: async () => {
      let query = supabase
        .from('team_stats')
        .select('*')
        .order('over_2_5_goals_pct', { ascending: false })
        .limit(20);

      if (region !== 'all') {
        query = query.eq('region', region);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Fetch top 20 teams for corners (Over 9.5)
 */
export function useTop20Corners(region = 'all') {
  return useQuery({
    queryKey: ['top20-corners', region],
    queryFn: async () => {
      let query = supabase
        .from('team_stats')
        .select('*')
        .order('over_9_5_corners_pct', { ascending: false })
        .limit(20);

      if (region !== 'all') {
        query = query.eq('region', region);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Fetch top 20 teams for cards (Over 3.5)
 */
export function useTop20Cards(region = 'all') {
  return useQuery({
    queryKey: ['top20-cards', region],
    queryFn: async () => {
      let query = supabase
        .from('team_stats')
        .select('*')
        .order('over_3_5_cards_pct', { ascending: false })
        .limit(20);

      if (region !== 'all') {
        query = query.eq('region', region);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Fetch top 20 teams for BTTS
 */
export function useTop20BTTS(region = 'all') {
  return useQuery({
    queryKey: ['top20-btts', region],
    queryFn: async () => {
      let query = supabase
        .from('team_stats')
        .select('*')
        .order('btts_yes_pct', { ascending: false })
        .limit(20);

      if (region !== 'all') {
        query = query.eq('region', region);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 30,
  });
}

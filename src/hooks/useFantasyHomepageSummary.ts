import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── contract: GET /api/fantasy/homepage-summary ─────────────────────────────
export type FantasyHomepageSummary = {
  season: { name: string; status: string; joinUrl: string; registrationOpen: boolean; startsAt: string | null };
  stats: { membersJoined: number; weeklyPrizesCount: number; daysUntilLaunch: number };
  topPrize: { title: string; subtitle: string; imageUrl?: string };
  weeklyPrize: { title: string; subtitle: string; imageUrl?: string };
  donkeyOfTheWeek: { enabled: boolean; title: string; subtitle: string; imageUrl?: string };
  themedGiveaways: { enabled: boolean; title: string; subtitle: string };
  gafferQuote: { text: string; author: string };
};

const daysUntil = (iso: string) => {
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return Number.isFinite(d) ? Math.max(0, d) : 0;
};

/** Fallback so the homepage never breaks (matches the endpoint shape). */
export const FANTASY_FALLBACK: FantasyHomepageSummary = {
  season: { name: '2025/26 Season', status: 'coming_soon', joinUrl: '/fantasy-league', registrationOpen: true, startsAt: '2026-08-01T00:00:00Z' },
  stats: { membersJoined: 482, weeklyPrizesCount: 12, daysUntilLaunch: daysUntil('2026-08-01T00:00:00Z') },
  topPrize: { title: 'Dream Holiday', subtitle: 'Paradise awaits our top player.' },
  weeklyPrize: { title: 'Weekly Prizes', subtitle: 'Fresh prizes every single week.' },
  donkeyOfTheWeek: { enabled: true, title: 'Donkey of the Week', subtitle: 'Last place fame. Wear it proudly.' },
  themedGiveaways: { enabled: true, title: 'Themed Giveaways', subtitle: 'Special prizes all season long.' },
  gafferQuote: { text: 'Think you know football? Prove it. I’m watching.', author: 'The Gaffer' },
};

/**
 * Fantasy homepage summary. Tries the fantasy-homepage-summary edge function,
 * falls back to FANTASY_FALLBACK so the section always renders.
 */
export function useFantasyHomepageSummary() {
  return useQuery({
    queryKey: ['fantasy_homepage_summary'],
    staleTime: 1000 * 60 * 10,
    retry: false,
    queryFn: async (): Promise<FantasyHomepageSummary> => {
      try {
        // Race the edge function against a short timeout so a missing/slow
        // function never leaves the section stuck on the skeleton.
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoke = (supabase as any).functions.invoke('fantasy-homepage-summary');
        const res = await Promise.race([invoke, timeout]);
        if (!res || res.error || !res.data || !res.data.season) return FANTASY_FALLBACK;
        return res.data as FantasyHomepageSummary;
      } catch {
        return FANTASY_FALLBACK;
      }
    },
  });
}

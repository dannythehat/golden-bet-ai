import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GoldenBet } from '@/types/betting';
import { getEffectiveBetDate, isBeforeRefresh } from '@/lib/betDate';

export interface BetBuilder {
  id: string;
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string;
  markets: string[];
  market_confidences: Record<string, number>;
  combined_odds: number;
  average_confidence: number;
  gaffer_reasoning: string;
  bookmaker?: {
    key: string;
    title: string;
    logo?: string;
    lastUpdate?: string;
  };
  stake: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  result?: string;
  profit_loss?: number;
  // Settled stats (filled by settlement job)
  actual_goals_home?: number | null;
  actual_goals_away?: number | null;
  actual_corners?: number | null;
  actual_cards?: number | null;
  btts_result?: boolean | null;
  prediction_date: string;
  settled_at?: string;
}

/** Collect golden bet teams from the react-query cache or DB to pass to the bet-builder backend */
async function getGoldenBetTeams(queryClient: ReturnType<typeof useQueryClient>): Promise<Array<{ homeTeam: string; awayTeam: string; fixtureId?: string }>> {
  // Try to get from react-query cache first (fastest)
  const cached = queryClient.getQueryData<{ bets: GoldenBet[] }>(['golden-bets']);
  if (cached?.bets?.length) {
    return cached.bets.map(b => ({
      homeTeam: b.homeTeam,
      awayTeam: b.awayTeam,
      fixtureId: b.fixtureId ? String(b.fixtureId) : undefined,
    }));
  }

  // Fallback: fetch directly from DB
  const today = getEffectiveBetDate();
  const { data } = await supabase
    .from('golden_bet_history')
    .select('fixture_id, home_team, away_team')
    .eq('prediction_date', today);

  if (data?.length) {
    return data.map((row: any) => ({
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      fixtureId: String(row.fixture_id),
    }));
  }

  return [];
}

async function fetchBetBuilder(
  goldenBetTeams: Array<{ homeTeam: string; awayTeam: string; fixtureId?: string }>
): Promise<{ betBuilder: BetBuilder | null; isLive: boolean; noBetBuilder: boolean; message: string; showingYesterday?: boolean }> {
  const today = getEffectiveBetDate();
  const showingYesterday = isBeforeRefresh();

  // Before 6 AM: just load from DB, don't invoke edge function
  if (showingYesterday) {
    const { data: dbBetBuilder, error: dbError } = await supabase
      .from('bet_builder_history')
      .select('*')
      .eq('prediction_date', today)
      .maybeSingle();

    if (!dbError && dbBetBuilder) {
      return { betBuilder: dbBetBuilder as BetBuilder, isLive: true, noBetBuilder: false, message: '', showingYesterday: true };
    }
    return { betBuilder: null, isLive: false, noBetBuilder: true, message: "Today's Bet Builder will be ready at 6 AM UTC", showingYesterday: true };
  }

  try {
    const { data, error } = await supabase.functions.invoke('bet-builder', {
      method: 'POST',
      body: { 
        refreshOddsOnly: true,
        goldenBetTeams,
      },
    });

    if (error) {
      console.error('Bet builder invoke error:', error);
      throw error;
    }
    
    if (!data?.success && data?.noBetBuilder) {
      console.log('No bet builder applicable today:', data.message);
      return { 
        betBuilder: null, 
        isLive: true, 
        noBetBuilder: true, 
        message: data.message || 'No Bet Builder of the Day applicable',
      };
    }
    
    if (!data?.success || !data?.betBuilder) {
      console.log('No bet builder available:', data.message);
      return { betBuilder: null, isLive: false, noBetBuilder: true, message: data.message || 'No suitable fixtures found' };
    }
    
    return { 
      betBuilder: data.betBuilder as BetBuilder, 
      isLive: true,
      noBetBuilder: false,
      message: '',
    };
  } catch (error) {
    console.error('Error fetching bet builder:', error);

    const { data: dbBetBuilder, error: dbError } = await supabase
      .from('bet_builder_history')
      .select('*')
      .eq('prediction_date', today)
      .maybeSingle();

    if (!dbError && dbBetBuilder) {
      return {
        betBuilder: dbBetBuilder as BetBuilder,
        isLive: true,
        noBetBuilder: false,
        message: '',
      };
    }

    return { betBuilder: null, isLive: false, noBetBuilder: true, message: 'Failed to fetch' };
  }
}

// Fetch settled bet builders for P&L
async function fetchBetBuilderHistory(): Promise<BetBuilder[]> {
  const { data, error } = await supabase
    .from('bet_builder_history')
    .select('*')
    .in('status', ['won', 'lost', 'void'])
    .not('result', 'is', null)
    .order('settled_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching bet builder history:', error);
    return [];
  }
  
  return (data || []) as BetBuilder[];
}

export function useBetBuilder() {
  const queryClient = useQueryClient();
  const effectiveDate = getEffectiveBetDate();

  const query = useQuery({
    queryKey: ['bet-builder', effectiveDate],
    queryFn: async () => {
      // Collect golden bet teams to pass to backend for exclusion
      const goldenBetTeams = await getGoldenBetTeams(queryClient);
      console.log(`🚫 Passing ${goldenBetTeams.length} golden bet teams to bet-builder for exclusion`);
      return fetchBetBuilder(goldenBetTeams);
    },
    staleTime: 1000 * 60 * 2, // 2 min – pick up fresh data quickly
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const historyQuery = useQuery({
    queryKey: ['bet-builder-history'],
    queryFn: fetchBetBuilderHistory,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return {
    betBuilder: query.data?.betBuilder || null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isLive: query.data?.isLive ?? false,
    noBetBuilder: query.data?.noBetBuilder ?? false,
    noBetBuilderMessage: query.data?.message ?? '',
    settledBetBuilders: historyQuery.data || [],
    historyLoading: historyQuery.isLoading,
  };
}

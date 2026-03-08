import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGoldenBets } from './useGoldenBets';
import { useBetBuilder } from './useBetBuilder';
import { useAccaBuilder } from './useAccaBuilder';
import { isFinishedStatus, isInPlayStatus } from '@/lib/fixtureStatus';

export interface LiveFixtureStats {
  fixture_id: number;
  home_team: string;
  away_team: string;
  league: string;
  status: string;
  elapsed: number | null;
  score_home: number;
  score_away: number;
  corners_home: number;
  corners_away: number;
  corners_total: number;
  cards_home: number;
  cards_away: number;
  cards_total: number;
  yellow_cards_home: number;
  yellow_cards_away: number;
  red_cards_home: number;
  red_cards_away: number;
}

export interface InPlayBet {
  id: string;
  type: 'golden' | 'bet-builder' | 'acca';
  fixtureId: number | string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  market: string;
  markets?: string[];
  confidence: number;
  odds: number;
  liveStats?: LiveFixtureStats;
  hasStats: boolean;
  isLive: boolean;
  isFinished: boolean;
}

// Normalize team names for matching
function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/fc|cf|sc|ac|as|us|ss|afc|rfc$/gi, '')
    .replace(/^fc|^cf|^sc|^ac|^as|^us|^ss|^afc|^rfc/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function includesMatch(a: string, b: string) {
  return a.includes(b) || b.includes(a);
}

function teamsMatch(bet: { homeTeam: string; awayTeam: string }, live: LiveFixtureStats): boolean {
  const betHome = normalizeTeam(bet.homeTeam);
  const betAway = normalizeTeam(bet.awayTeam);
  const liveHome = normalizeTeam(live.home_team);
  const liveAway = normalizeTeam(live.away_team);
  
  const direct = includesMatch(betHome, liveHome) && includesMatch(betAway, liveAway);
  const swapped = includesMatch(betHome, liveAway) && includesMatch(betAway, liveHome);
  return direct || swapped;
}

function findLiveMatchForBet(
  liveFixtures: LiveFixtureStats[],
  fixtureId: number | string | undefined,
  homeTeam: string,
  awayTeam: string
): LiveFixtureStats | undefined {
  const idNum = fixtureId === undefined || fixtureId === null ? NaN : Number(fixtureId);
  if (Number.isFinite(idNum)) {
    const byId = liveFixtures.find(l => l.fixture_id === idNum);
    if (byId) return byId;
  }
  return liveFixtures.find(live => teamsMatch({ homeTeam, awayTeam }, live));
}

export function useInPlayStats() {
  const [liveFixtures, setLiveFixtures] = useState<LiveFixtureStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // IMPORTANT: On cold-load / tab resume, bets may not be loaded yet.
  // If we call live-stats with an empty query, we might fetch arbitrary live fixtures and
  // overwrite the matches the UI needs (making live scores “disappear”).
  // We therefore cache the last *non-empty* query and reuse it until we have fresh bet data.
  const lastQueryRef = useRef<{ fixtureIds: number[]; priorityTeams: string[] } | null>(null);

  // Get active bets from existing hooks
  const { bets: goldenBets } = useGoldenBets();
  const { betBuilder } = useBetBuilder();
  const { todaysAcca: acca } = useAccaBuilder();

  // Use refs to always have latest data without recreating callbacks
  const goldenBetsRef = useRef(goldenBets);
  const betBuilderRef = useRef(betBuilder);
  const accaRef = useRef(acca);

  // Keep refs up to date
  useEffect(() => {
    goldenBetsRef.current = goldenBets;
  }, [goldenBets]);

  useEffect(() => {
    betBuilderRef.current = betBuilder;
  }, [betBuilder]);

  useEffect(() => {
    accaRef.current = acca;
  }, [acca]);

  const fetchLiveStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use refs to get latest data
      const currentGoldenBets = goldenBetsRef.current;
      const currentBetBuilder = betBuilderRef.current;
      const currentAcca = accaRef.current;

      // Collect priority teams from our active bets
      const priorityTeams: string[] = [];
      const fixtureIdSet = new Set<number>();
      
      // From golden bets
      currentGoldenBets.filter(b => b.status === 'pending').forEach(bet => {
        priorityTeams.push(bet.homeTeam, bet.awayTeam);

        const idNum = Number(bet.fixtureId);
        if (Number.isFinite(idNum) && idNum > 0) fixtureIdSet.add(idNum);
      });
      
      // From bet builder
      if (currentBetBuilder && currentBetBuilder.status === 'pending') {
        priorityTeams.push(currentBetBuilder.home_team, currentBetBuilder.away_team);

        const idNum = Number(currentBetBuilder.fixture_id);
        if (Number.isFinite(idNum) && idNum > 0) fixtureIdSet.add(idNum);
      }
      
      // From ACCA
      if (currentAcca?.selections && currentAcca.status === 'pending') {
        currentAcca.selections.forEach((sel: any) => {
          priorityTeams.push(sel.teamName, sel.opposition);

          const idNum = Number(sel.fixtureId);
          if (Number.isFinite(idNum) && idNum > 0) fixtureIdSet.add(idNum);
        });
      }

      // Build a stable query for the backend.
      // If we have *no* bet-derived inputs yet (common on hard refresh), reuse the last query.
      const computedFixtureIds = Array.from(fixtureIdSet).slice(0, 30);
      const computedPriorityTeams = priorityTeams.slice(0, 20);

      const hasComputedQuery = computedFixtureIds.length > 0 || computedPriorityTeams.length > 0;
      const effectiveQuery = hasComputedQuery
        ? { fixtureIds: computedFixtureIds, priorityTeams: computedPriorityTeams }
        : lastQueryRef.current;

      if (!effectiveQuery) {
        // Nothing to query yet; do not overwrite UI state.
        console.log('[useInPlayStats] Skipping fetch: no bets loaded yet and no cached query');
        return;
      }

      // Cache the latest non-empty query so we never regress to “random live fixtures”.
      if (hasComputedQuery) lastQueryRef.current = effectiveQuery;

      console.log(
        '[useInPlayStats] Fetching with fixtureIds:',
        effectiveQuery.fixtureIds,
        'priorityTeams:',
        effectiveQuery.priorityTeams.slice(0, 6)
      );

      const { data, error: fnError } = await supabase.functions.invoke('live-stats', {
        method: 'POST',
        body: {
          priorityTeams: effectiveQuery.priorityTeams,
          fixtureIds: effectiveQuery.fixtureIds,
        },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        console.log('[useInPlayStats] Received', data.fixtures?.length || 0, 'live fixtures');
        setLiveFixtures(data.fixtures || []);
        setLastUpdated(new Date());
      } else {
        throw new Error(data?.error || 'Failed to fetch live stats');
      }
    } catch (err) {
      console.error('Error fetching live stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch live stats');
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies - uses refs

  // Mobile browsers frequently throttle timers when the app is backgrounded.
  // When the tab becomes visible again, do an immediate refresh (using cached query if needed).
  useEffect(() => {
    const onResume = () => {
      if (!isPollingRef.current) return;
      fetchLiveStats();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') onResume();
    };

    window.addEventListener('focus', onResume);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onResume);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchLiveStats]);

  // Start/stop polling - stable callback
  const startPolling = useCallback((intervalMs = 60000) => {
    if (isPollingRef.current) return; // Already polling
    
    isPollingRef.current = true;
    
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Fetch immediately
    fetchLiveStats();
    
    // Set up interval
    intervalRef.current = setInterval(fetchLiveStats, intervalMs);
  }, [fetchLiveStats]);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Auto-start/stop polling based on pending bets
  useEffect(() => {
    const hasPendingBets = 
      goldenBets.some(b => b.status === 'pending') ||
      (betBuilder && betBuilder.status === 'pending') ||
      (acca?.selections && acca.status === 'pending');
    
    if (hasPendingBets) {
      // Start polling if not already running
      if (!isPollingRef.current) {
        startPolling(60000);
      } else {
        // Already polling — just refetch with updated bet data
        fetchLiveStats();
      }
    } else {
      // No pending bets — stop polling
      stopPolling();
    }
  }, [goldenBets, betBuilder, acca, fetchLiveStats, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Match live stats to bets
  const getInPlayBets = useCallback((): InPlayBet[] => {
    const inPlayBets: InPlayBet[] = [];

    // Process Golden Bets
    goldenBets
      .filter(b => b.status === 'pending')
      .forEach(bet => {
        const liveMatch = findLiveMatchForBet(liveFixtures, bet.fixtureId, bet.homeTeam, bet.awayTeam);
        const hasStats = !!liveMatch;
        const live = !!liveMatch && isInPlayStatus(liveMatch.status);
        const finished = !!liveMatch && isFinishedStatus(liveMatch.status);
        
        inPlayBets.push({
          id: bet.id,
          type: 'golden',
          fixtureId: bet.fixtureId || 0,
          homeTeam: bet.homeTeam,
          awayTeam: bet.awayTeam,
          league: bet.league,
          kickoff: bet.kickoff,
          market: bet.market,
          confidence: bet.mlConfidence * 100,
          odds: bet.bookmakerOdds,
          liveStats: liveMatch,
          hasStats,
          isLive: live,
          isFinished: finished,
        });
      });

    // Process Bet Builder
    if (betBuilder && betBuilder.status === 'pending') {
      const liveMatch = findLiveMatchForBet(liveFixtures, betBuilder.fixture_id, betBuilder.home_team, betBuilder.away_team);
      const hasStats = !!liveMatch;
      const live = !!liveMatch && isInPlayStatus(liveMatch.status);
      const finished = !!liveMatch && isFinishedStatus(liveMatch.status);
      
      inPlayBets.push({
        id: betBuilder.id,
        type: 'bet-builder',
        fixtureId: betBuilder.fixture_id,
        homeTeam: betBuilder.home_team,
        awayTeam: betBuilder.away_team,
        league: betBuilder.league,
        kickoff: betBuilder.kickoff,
        markets: betBuilder.markets,
        market: betBuilder.markets.join(', '),
        confidence: betBuilder.average_confidence,
        odds: betBuilder.combined_odds,
        liveStats: liveMatch,
        hasStats,
        isLive: live,
        isFinished: finished,
      });
    }

    // Process ACCA selections
    if (acca?.selections && acca.status === 'pending') {
      acca.selections.forEach((sel: any, idx: number) => {
        const liveMatch = findLiveMatchForBet(
          liveFixtures,
          sel.fixtureId ?? idx,
          sel.isHome ? sel.teamName : sel.opposition,
          sel.isHome ? sel.opposition : sel.teamName
        );

        const hasStats = !!liveMatch;
        const live = !!liveMatch && isInPlayStatus(liveMatch.status);
        const finished = !!liveMatch && isFinishedStatus(liveMatch.status);

        inPlayBets.push({
          id: `${acca.id}-${idx}`,
          type: 'acca',
          fixtureId: idx,
          homeTeam: sel.isHome ? sel.teamName : sel.opposition,
          awayTeam: sel.isHome ? sel.opposition : sel.teamName,
          league: sel.league,
          kickoff: sel.kickoff,
          market: sel.market,
          confidence: sel.successPercent,
          odds: sel.odds,
          liveStats: liveMatch,
          hasStats,
          isLive: live,
          isFinished: finished,
        });
      });
    }

    // Sort: live bets first, then by kickoff
    return inPlayBets.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
    });
  }, [goldenBets, betBuilder, acca, liveFixtures]);

  return {
    liveFixtures,
    inPlayBets: getInPlayBets(),
    isLoading,
    lastUpdated,
    error,
    fetchLiveStats,
    startPolling,
    stopPolling,
  };
}

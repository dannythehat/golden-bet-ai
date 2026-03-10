import { useEffect, useRef, useCallback } from 'react';
import { useNotifications } from './useNotifications';
import { InPlayBet, LiveFixtureStats } from './useInPlayStats';
import { useToast } from '@/hooks/use-toast';

/**
 * Automatic live bet alert monitor.
 * No DB preferences required — fires notifications whenever
 * a relevant stat changes on any live bet (goal, corner, card).
 */

interface PrevStats {
  goals: number;
  corners: number;
  cards: number;
  btts: boolean;
}

export function useAlertMonitor(inPlayBets: InPlayBet[]) {
  const { 
    permission, 
    sendNotification,
  } = useNotifications();
  const { toast } = useToast();

  // Track previous stats per bet to detect changes
  const prevStatsRef = useRef<Record<string, PrevStats>>({});
  // Track which "won" notifications we've already sent
  const wonNotifiedRef = useRef<Set<string>>(new Set());

  const getMarketType = useCallback((bet: InPlayBet): ('goals' | 'corners' | 'cards' | 'btts')[] => {
    const market = bet.market.toLowerCase();
    const markets = bet.markets?.map(m => m.toLowerCase()) || [market];
    const allMarkets = [market, ...markets].join(' ');
    
    const types: ('goals' | 'corners' | 'cards' | 'btts')[] = [];
    if (allMarkets.includes('goal') || allMarkets.includes('over_1') || allMarkets.includes('over_2') || allMarkets.includes('over_3')) types.push('goals');
    if (allMarkets.includes('btts') || allMarkets.includes('both_teams')) types.push('btts');
    if (allMarkets.includes('corner')) types.push('corners');
    if (allMarkets.includes('card') || allMarkets.includes('booking')) types.push('cards');
    
    // If nothing matched, default to goals
    if (types.length === 0) types.push('goals');
    return types;
  }, []);

  const getTarget = useCallback((bet: InPlayBet, type: 'goals' | 'corners' | 'cards'): number => {
    const market = bet.market.toLowerCase();
    const allText = [market, ...(bet.markets?.map(m => m.toLowerCase()) || [])].join(' ');
    
    if (type === 'goals') {
      if (allText.includes('3.5') || allText.includes('35')) return 4;
      if (allText.includes('1.5') || allText.includes('15')) return 2;
      return 3; // default over 2.5
    }
    if (type === 'corners') {
      if (allText.includes('10.5') || allText.includes('105')) return 11;
      if (allText.includes('8.5') || allText.includes('85')) return 9;
      return 10; // default over 9.5
    }
    if (type === 'cards') {
      if (allText.includes('4.5') || allText.includes('45')) return 5;
      if (allText.includes('2.5') || allText.includes('25')) return 3;
      return 4; // default over 3.5
    }
    return 3;
  }, []);

  const notify = useCallback((title: string, body: string, tag: string) => {
    // Always show a toast (works without any permissions)
    toast({ title, description: body });
    
    // Also send browser push if granted
    if (permission === 'granted') {
      sendNotification(title, { body, tag, renotify: true });
    }
  }, [toast, permission, sendNotification]);

  useEffect(() => {
    const liveBets = inPlayBets.filter(b => b.isLive && b.liveStats);
    if (liveBets.length === 0) return;

    liveBets.forEach(bet => {
      const stats = bet.liveStats!;
      const key = bet.id;
      const marketTypes = getMarketType(bet);
      
      const currentGoals = stats.score_home + stats.score_away;
      const currentCorners = stats.corners_total;
      const currentCards = stats.cards_total;
      const currentBtts = stats.score_home > 0 && stats.score_away > 0;

      const prev = prevStatsRef.current[key];
      
      if (!prev) {
        // First time seeing this bet live — store initial state, don't alert
        prevStatsRef.current[key] = {
          goals: currentGoals,
          corners: currentCorners,
          cards: currentCards,
          btts: currentBtts,
        };
        return;
      }

      const matchLabel = `${bet.homeTeam} vs ${bet.awayTeam}`;

      // Check for GOAL changes
      if (marketTypes.includes('goals') && currentGoals > prev.goals) {
        const target = getTarget(bet, 'goals');
        const wonKey = `${key}-goals`;
        
        if (currentGoals >= target && !wonNotifiedRef.current.has(wonKey)) {
          notify('🎉 Bet Won! Goals Target Hit!', `${matchLabel}: ${stats.score_home}-${stats.score_away} (${currentGoals}/${target} goals)`, wonKey);
          wonNotifiedRef.current.add(wonKey);
        } else {
          notify('⚽ GOAL!', `${matchLabel}: ${stats.score_home}-${stats.score_away} (${currentGoals}/${target} goals)`, `${key}-goal`);
        }
      }

      // Check for BTTS
      if (marketTypes.includes('btts') && currentBtts && !prev.btts) {
        const wonKey = `${key}-btts`;
        if (!wonNotifiedRef.current.has(wonKey)) {
          notify('🎉 BTTS Landed!', `${matchLabel}: Both teams have scored! ${stats.score_home}-${stats.score_away}`, wonKey);
          wonNotifiedRef.current.add(wonKey);
        }
      }

      // Check for CORNER changes
      if (marketTypes.includes('corners') && currentCorners > prev.corners) {
        const newCorners = currentCorners - prev.corners;
        const target = getTarget(bet, 'corners');
        const wonKey = `${key}-corners`;
        
        if (currentCorners >= target && !wonNotifiedRef.current.has(wonKey)) {
          notify('🎉 Corners Target Hit!', `${matchLabel}: ${currentCorners}/${target} corners`, wonKey);
          wonNotifiedRef.current.add(wonKey);
        } else if (currentCorners >= target - 2) {
          // Close to target — alert
          notify('🚩 Corner!', `${matchLabel}: ${currentCorners}/${target} corners — nearly there!`, `${key}-corner`);
        }
      }

      // Check for CARD changes
      if (marketTypes.includes('cards') && currentCards > prev.cards) {
        const target = getTarget(bet, 'cards');
        const wonKey = `${key}-cards`;
        
        if (currentCards >= target && !wonNotifiedRef.current.has(wonKey)) {
          notify('🎉 Cards Target Hit!', `${matchLabel}: ${currentCards}/${target} cards`, wonKey);
          wonNotifiedRef.current.add(wonKey);
        } else if (currentCards >= target - 1) {
          notify('🟨 Card!', `${matchLabel}: ${currentCards}/${target} cards — close!`, `${key}-card`);
        }
      }

      // Update stored stats
      prevStatsRef.current[key] = {
        goals: currentGoals,
        corners: currentCorners,
        cards: currentCards,
        btts: currentBtts,
      };
    });
  }, [inPlayBets, getMarketType, getTarget, notify]);

  // Clean up finished matches
  useEffect(() => {
    const activeIds = new Set(
      inPlayBets.filter(b => b.isLive).map(b => b.id)
    );
    Object.keys(prevStatsRef.current).forEach(key => {
      if (!activeIds.has(key)) {
        delete prevStatsRef.current[key];
      }
    });
    wonNotifiedRef.current.forEach(wonKey => {
      const betId = wonKey.split('-')[0];
      if (!activeIds.has(betId)) {
        wonNotifiedRef.current.delete(wonKey);
      }
    });
  }, [inPlayBets]);

  const liveBetsWithStats = inPlayBets.filter(b => b.isLive && b.liveStats).length;

  return {
    activeAlerts: liveBetsWithStats,
    notificationsEnabled: true, // always enabled now via toasts
  };
}

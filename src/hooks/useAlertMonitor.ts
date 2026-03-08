import { useEffect, useRef, useCallback } from 'react';
import { useAlertPreferences, AlertPreference } from './useAlertPreferences';
import { useNotifications } from './useNotifications';
import { InPlayBet, LiveFixtureStats } from './useInPlayStats';

interface NotifiedState {
  [key: string]: {
    corners80?: boolean;
    corners100?: boolean;
    cards80?: boolean;
    cards100?: boolean;
    goals80?: boolean;
    goals100?: boolean;
    btts?: boolean;
  };
}

export function useAlertMonitor(inPlayBets: InPlayBet[]) {
  const { preferences } = useAlertPreferences();
  const { 
    permission, 
    notifyBetProgress, 
    notifyBetWon,
    sendNotification 
  } = useNotifications();
  
  // Track which notifications we've already sent to avoid spam
  const notifiedRef = useRef<NotifiedState>({});

  const checkAndNotify = useCallback((
    bet: InPlayBet,
    stats: LiveFixtureStats,
    pref: AlertPreference
  ) => {
    const key = `${bet.id}-${pref.id}`;
    if (!notifiedRef.current[key]) {
      notifiedRef.current[key] = {};
    }
    const notified = notifiedRef.current[key];

    // Check corners
    if (pref.alert_corners && pref.corners_threshold) {
      const current = stats.corners_total;
      const target = pref.corners_threshold;
      const pct = (current / target) * 100;

      if (pct >= 100 && !notified.corners100) {
        notifyBetWon(bet.homeTeam, bet.awayTeam, `Over ${target - 0.5} Corners`);
        notified.corners100 = true;
      } else if (pct >= 80 && !notified.corners80) {
        notifyBetProgress(bet.homeTeam, bet.awayTeam, 'corners', current, target);
        notified.corners80 = true;
      }
    }

    // Check cards
    if (pref.alert_cards && pref.cards_threshold) {
      const current = stats.cards_total;
      const target = pref.cards_threshold;
      const pct = (current / target) * 100;

      if (pct >= 100 && !notified.cards100) {
        notifyBetWon(bet.homeTeam, bet.awayTeam, `Over ${target - 0.5} Cards`);
        notified.cards100 = true;
      } else if (pct >= 80 && !notified.cards80) {
        notifyBetProgress(bet.homeTeam, bet.awayTeam, 'cards', current, target);
        notified.cards80 = true;
      }
    }

    // Check goals
    if (pref.alert_goals && pref.goals_threshold) {
      const current = stats.score_home + stats.score_away;
      const target = pref.goals_threshold;
      const pct = (current / target) * 100;

      if (pct >= 100 && !notified.goals100) {
        notifyBetWon(bet.homeTeam, bet.awayTeam, `Over ${target - 0.5} Goals`);
        notified.goals100 = true;
      } else if (pct >= 80 && !notified.goals80) {
        notifyBetProgress(bet.homeTeam, bet.awayTeam, 'goals', current, target);
        notified.goals80 = true;
      }
    }

    // Check BTTS
    if (pref.alert_btts && !notified.btts) {
      if (stats.score_home > 0 && stats.score_away > 0) {
        notifyBetWon(bet.homeTeam, bet.awayTeam, 'Both Teams to Score');
        notified.btts = true;
      } else if (stats.score_home > 0 || stats.score_away > 0) {
        // One team scored - 50% progress
        const scoredTeam = stats.score_home > 0 ? stats.home_team : stats.away_team;
        sendNotification(`⚽ ${scoredTeam} scored!`, {
          body: `${bet.homeTeam} vs ${bet.awayTeam} - 1/2 for BTTS`,
          tag: `${bet.id}-btts-progress`,
        });
      }
    }
  }, [notifyBetProgress, notifyBetWon, sendNotification]);

  // Monitor live bets against preferences
  useEffect(() => {
    if (permission !== 'granted' || preferences.length === 0) return;

    const liveBets = inPlayBets.filter(b => b.isLive && b.liveStats);

    liveBets.forEach(bet => {
      // Find matching preference by fixture
      // Match on team names since we may not have exact fixture IDs
      const matchingPref = preferences.find(pref => {
        // Check if this preference's saved_fixture matches this bet
        // We match by comparing the bet's teams/market with what was saved
        return pref.is_active && pref.push_enabled;
      });

      // For now, check all active preferences against all live bets
      // In production, you'd want to link saved_fixtures properly
      preferences.forEach(pref => {
        if (!pref.is_active || !pref.push_enabled) return;
        if (!bet.liveStats) return;

        // Check if this preference is relevant to this bet's market
        const market = bet.market.toLowerCase();
        const isRelevant = 
          (pref.alert_corners && market.includes('corner')) ||
          (pref.alert_cards && market.includes('card')) ||
          (pref.alert_goals && (market.includes('goal') || market.includes('over_2') || market.includes('over_1'))) ||
          (pref.alert_btts && (market.includes('btts') || market.includes('both')));

        if (isRelevant) {
          checkAndNotify(bet, bet.liveStats, pref);
        }
      });
    });
  }, [inPlayBets, preferences, permission, checkAndNotify]);

  // Clear notified state when a match ends (status changes)
  useEffect(() => {
    const activeFixtureIds = new Set(
      inPlayBets
        .filter(b => b.isLive)
        .map(b => b.id)
    );

    // Clean up notified state for matches that are no longer live
    Object.keys(notifiedRef.current).forEach(key => {
      const betId = key.split('-')[0];
      if (!activeFixtureIds.has(betId)) {
        delete notifiedRef.current[key];
      }
    });
  }, [inPlayBets]);

  return {
    activeAlerts: preferences.filter(p => p.is_active).length,
    notificationsEnabled: permission === 'granted',
  };
}

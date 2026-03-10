import { useEffect, useRef, useState } from 'react';
import type { LiveFixtureStats } from '@/hooks/useInPlayStats';

/**
 * Keeps showing the last known stats when the feed drops the fixture (e.g., right after FT).
 * This prevents the UI from losing the final score.
 * 
 * IMPORTANT: 
 * - Sticky stats are scoped to fixture_id to prevent stats from one match bleeding into another card
 * - If liveStats is undefined and we have no prior fixture reference, sticky stays undefined
 * - If liveStats changes to a different fixture_id, we reset and use the new stats
 */
export function useStickyFixtureStats(liveStats?: LiveFixtureStats) {
  const [sticky, setSticky] = useState<LiveFixtureStats | undefined>(undefined);
  const trackedFixtureIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (liveStats) {
      // If we're now seeing a DIFFERENT fixture than before, reset tracking
      if (trackedFixtureIdRef.current !== undefined && trackedFixtureIdRef.current !== liveStats.fixture_id) {
        console.log(`[StickyStats] Fixture changed from ${trackedFixtureIdRef.current} to ${liveStats.fixture_id}, resetting`);
      }
      // Always update sticky when we have new stats
      setSticky(liveStats);
      trackedFixtureIdRef.current = liveStats.fixture_id;
    }
    // If liveStats is undefined:
    // - Keep sticky if we have a tracked fixture (feed temporarily dropped it)
    // - Don't set sticky if we never had stats (prevents stale data from unrelated fixtures)
  }, [liveStats]);

  return {
    stats: liveStats ?? sticky,
    hasSticky: !!sticky,
  };
}

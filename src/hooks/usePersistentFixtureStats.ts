import { useEffect, useMemo, useRef, useState } from 'react';
import type { LiveFixtureStats } from '@/hooks/useInPlayStats';

type PersistedFixtureStats = {
  stats: LiveFixtureStats;
  storedAt: number;
};

const STORAGE_PREFIX = 'fixture_stats_v1:';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

function getKey(fixtureId: number) {
  return `${STORAGE_PREFIX}${fixtureId}`;
}

function safeRead(fixtureId: number): LiveFixtureStats | undefined {
  try {
    const raw = localStorage.getItem(getKey(fixtureId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PersistedFixtureStats;
    if (!parsed?.stats || !parsed?.storedAt) return undefined;
    if (Date.now() - parsed.storedAt > MAX_AGE_MS) {
      localStorage.removeItem(getKey(fixtureId));
      return undefined;
    }
    return parsed.stats;
  } catch {
    return undefined;
  }
}

function safeWrite(fixtureId: number, stats: LiveFixtureStats) {
  try {
    const payload: PersistedFixtureStats = { stats, storedAt: Date.now() };
    localStorage.setItem(getKey(fixtureId), JSON.stringify(payload));
  } catch {
    // ignore quota / JSON errors
  }
}

/**
 * Like useStickyFixtureStats, but persists the last-known stats in localStorage so
 * post-match checks don't disappear on refresh / tab restore.
 */
export function usePersistentFixtureStats(fixtureId?: number | string | null, liveStats?: LiveFixtureStats) {
  const fixtureIdNum = useMemo(() => {
    const n = fixtureId === null || fixtureId === undefined ? NaN : Number(fixtureId);
    return Number.isFinite(n) ? n : undefined;
  }, [fixtureId]);

  const [sticky, setSticky] = useState<LiveFixtureStats | undefined>(undefined);
  const trackedFixtureIdRef = useRef<number | undefined>(undefined);

  // On fixture change, prime sticky from storage (if available)
  useEffect(() => {
    if (!fixtureIdNum) {
      setSticky(undefined);
      trackedFixtureIdRef.current = undefined;
      return;
    }

    if (trackedFixtureIdRef.current !== fixtureIdNum) {
      trackedFixtureIdRef.current = fixtureIdNum;
      setSticky(safeRead(fixtureIdNum));
    }
  }, [fixtureIdNum]);

  // When live stats come in, keep in-memory sticky + persist
  useEffect(() => {
    if (!liveStats) return;

    const id = Number(liveStats.fixture_id);
    if (!Number.isFinite(id)) return;

    setSticky(liveStats);
    trackedFixtureIdRef.current = id;
    safeWrite(id, liveStats);
  }, [liveStats]);

  return {
    stats: liveStats ?? sticky,
    hasSticky: !!sticky,
  };
}

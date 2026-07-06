/**
 * Value Board hooks — the components' only door to the data layer.
 *
 * Reads are memoised adapters over the committed snapshot (sync, instant);
 * alert preferences round-trip the real /api/alerts Pages function (KV).
 * Keeping the hook names endpoint-shaped means the page doesn't change if
 * these later move behind server functions.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  getValueHubSummary, getValueMarketFamilies, getValueMarketFixtures,
  getGafferDailyCard, getFixtureValueBreakdown, getLeaguesOn, todayUK,
  type MarketFixturesQuery, type ValueMarketKey,
} from '@/lib/valueBoard';

export function useValueHubSummary(date?: string) {
  return useMemo(() => getValueHubSummary(date ?? todayUK()), [date]);
}
export function useValueMarketFamilies() {
  return useMemo(() => getValueMarketFamilies(), []);
}
export function useValueMarketFixtures(q: MarketFixturesQuery) {
  return useMemo(
    () => getValueMarketFixtures(q),
    [q.marketKey, q.date, q.league, q.minConfidence, q.minValueGap],
  );
}
export function useGafferDailyCard(date?: string) {
  return useMemo(() => getGafferDailyCard(date ?? todayUK()), [date]);
}
export function useFixtureValueBreakdown(fixtureId: string | null, marketKey: ValueMarketKey | null) {
  return useMemo(
    () => (fixtureId && marketKey ? getFixtureValueBreakdown(fixtureId, marketKey) : null),
    [fixtureId, marketKey],
  );
}
export function useValueBoardLeagues(date?: string) {
  return useMemo(() => getLeaguesOn(date ?? todayUK()), [date]);
}

/* ── Subscriber state ──────────────────────────────────────────────────────
 * No subscription system exists yet (membership opens 1st August), so the
 * board runs in launch PREVIEW: fully visible, clearly badged members-only.
 * Flip PREVIEW_MODE to false at launch to enforce the teaser lock, and swap
 * the localStorage probe for the real subscription hook when it exists. */
export type SubscriberState = 'preview' | 'free' | 'paid' | 'expired';
export const PREVIEW_MODE = true;
export function useSubscriberState(): SubscriberState {
  if (PREVIEW_MODE) return 'preview';
  try {
    const s = localStorage.getItem('fo_subscriber_state');
    if (s === 'paid' || s === 'expired') return s;
  } catch { /* ignore */ }
  return 'free';
}

/* ── Realtime (stub) ───────────────────────────────────────────────────────
 * The board's data is a daily locked snapshot refreshed by the 03:10 cron —
 * there's no push channel yet. This hook keeps the contract seat warm for a
 * `value-board-updates` channel once a live backend exists. */
export function useValueBoardRealtime() {
  return { connected: false, channel: 'value-board-updates' as const };
}

/* ── Email alert preferences (real endpoint: /api/alerts, KV-backed) ─────── */
export interface AlertTiming { morningScan: boolean; preKickoff: boolean; newValueAppears: boolean }
export interface AlertPreferences {
  email: string;
  enabled: boolean;
  gafferCardOnly: boolean;
  allValueAlerts: boolean;
  quietDayCallback: boolean;
  marketKeys: ValueMarketKey[];
  timing: AlertTiming;
}
export const DEFAULT_ALERT_PREFS: Omit<AlertPreferences, 'email'> = {
  enabled: true,
  gafferCardOnly: false,
  allValueAlerts: false,
  quietDayCallback: false,
  marketKeys: [],
  timing: { morningScan: true, preKickoff: false, newValueAppears: false },
};

export function useUserValueAlertPreferences(email: string | null) {
  const [prefs, setPrefs] = useState<AlertPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!email) { setPrefs(null); return; }
    let dead = false;
    setLoading(true);
    fetch(`/api/alerts?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((j) => { if (!dead && j?.ok && j.data) setPrefs(j.data as AlertPreferences); })
      .catch(() => {})
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [email]);
  return { prefs, loading };
}

export function useSaveUserValueAlertPreferences() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (prefs: AlertPreferences) => {
    setSaving(true); setError(null);
    try {
      const r = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      const j = await r.json();
      if (j?.ok) { setSaved(true); try { localStorage.setItem('fo_alert_email', prefs.email); } catch { /* ignore */ } }
      else setError(j?.error?.message ?? 'Could not save — try again.');
    } catch {
      setError('Network hiccup — try again.');
    } finally {
      setSaving(false);
    }
  };
  return { save, saving, saved, error, resetSaved: () => setSaved(false) };
}

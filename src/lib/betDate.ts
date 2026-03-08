/**
 * Returns the "effective bet date" — today if it's past the refresh hour,
 * otherwise yesterday. This ensures users see yesterday's picks
 * until today's picks are generated.
 */
const REFRESH_HOUR_UTC = 5; // Picks generated at 05:00 UTC

export function getEffectiveBetDate(): string {
  const now = new Date();
  const utcHour = now.getUTCHours();

  if (utcHour < REFRESH_HOUR_UTC) {
    // Before refresh hour — show yesterday's picks
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  return now.toISOString().split('T')[0];
}

/**
 * Returns true if we're currently in the "showing yesterday" window.
 */
export function isBeforeRefresh(): boolean {
  return new Date().getUTCHours() < REFRESH_HOUR_UTC;
}

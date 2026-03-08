export type FixtureStatusShort = string;

// API-Football status short codes (non-exhaustive)
// https://www.api-football.com/documentation-v3#tag/Fixtures/operation/get-fixtures
const IN_PLAY = new Set<FixtureStatusShort>([
  '1H',
  '2H',
  'ET',
  'P',
  'BT',
  'HT',
  'LIVE',
]);

const FINISHED = new Set<FixtureStatusShort>([
  'FT',
  'AET',
  'PEN',
]);

export function isInPlayStatus(status?: string | null): boolean {
  if (!status) return false;
  return IN_PLAY.has(status);
}

export function isFinishedStatus(status?: string | null): boolean {
  if (!status) return false;
  return FINISHED.has(status);
}

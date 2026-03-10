/**
 * Team name display helpers (UI only)
 *
 * Goals:
 * - Make names human/English friendly (strip diacritics)
 * - Remove leading numeric club prefixes like "1." (e.g., "1. FC Köln" -> "FC Koln")
 * - Keep common club tokens like "FC" when they are meaningful
 */

export function formatTeamName(rawName: string): string {
  const name = (rawName || '').trim();
  if (!name) return '';

  // Remove leading numeric prefixes like "1." / "2." etc.
  let cleaned = name.replace(/^\d+\.\s*/g, '');

  // Remove German club type prefixes that clutter the display
  cleaned = cleaned.replace(/^SpVgg\s+/i, '');
  cleaned = cleaned.replace(/^TSG\s+/i, '');
  cleaned = cleaned.replace(/^VfB\s+/i, '');
  cleaned = cleaned.replace(/^VfL\s+/i, '');
  cleaned = cleaned.replace(/^SV\s+/i, '');

  // Strip diacritics (Köln -> Koln, Fürth -> Furth)
  cleaned = cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Keep common club tokens like FC, SC, etc. – don't strip them

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

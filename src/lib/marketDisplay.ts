function titleCase(input: string) {
  return input
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function normalizeMarketKey(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/:/g, '_')
    .replace(/\./g, '_')
    .replace(/__+/g, '_');
}

function parseThreshold(marketKey: string): number | null {
  // Supports: _2_5 / _25 / 2.5 / 25 etc.
  const m = marketKey;

  if (m.includes('_1_5') || m.includes('_15')) return 1.5;
  if (m.includes('_2_5') || m.includes('_25')) return 2.5;
  if (m.includes('_3_5') || m.includes('_35')) return 3.5;
  if (m.includes('_4_5') || m.includes('_45')) return 4.5;
  if (m.includes('_7_5') || m.includes('_75')) return 7.5;
  if (m.includes('_8_5') || m.includes('_85')) return 8.5;
  if (m.includes('_9_5') || m.includes('_95')) return 9.5;
  if (m.includes('_10_5') || m.includes('_105')) return 10.5;

  return null;
}

export function getMarketLabel(rawMarket: unknown): string {
  const m = normalizeMarketKey(rawMarket);
  if (!m) return 'Market TBD';

  const isUnder = m.includes('under');
  const isOver = m.includes('over');
  const threshold = parseThreshold(m);

  const side = isUnder ? 'Under' : isOver ? 'Over' : null;
  const category = m.includes('corner')
    ? 'Corners'
    : m.includes('card')
      ? 'Cards'
      : m.includes('goal')
        ? 'Goals'
        : null;

  if (side && threshold !== null && category) {
    // Display corners as 8.5 regardless of underlying data threshold
    if (category === 'Corners' && (threshold === 9.5)) {
      return `${side} 8.5 Corners`;
    }
    return `${side} ${threshold} ${category}`;
  }

  // Last-resort fallback: readable titlecase.
  return titleCase(m.replace(/_/g, ' '));
}

export function getMarketIcon(rawMarket: unknown): string {
  const m = normalizeMarketKey(rawMarket);
  if (m.includes('corner')) return '🚩';
  if (m.includes('card')) return '🟨';
  if (m.includes('goal')) return '🥅';
  return '📊';
}

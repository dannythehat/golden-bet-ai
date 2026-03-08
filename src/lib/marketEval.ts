import type { LiveFixtureStats } from '@/hooks/useInPlayStats';

function includesAny(haystack: string, needles: string[]) {
  return needles.some((n) => haystack.includes(n));
}

function parseOverThreshold(market: string): number | null {
  // Supports variants like:
  // - over_2.5_goals / over_25_goals / goals:over_2_5
  // - over_9.5_corners / over_95_corners / corners:over_9_5
  // - over_3.5_cards / over_35_cards / cards:over_3_5
  const m = market
    .toLowerCase()
    .replace(/:/g, '_')
    .replace(/\./g, '_')
    .replace(/__+/g, '_');

  if (includesAny(m, ['_1_5', '_15', '1.5', '15'])) return 1.5;
  if (includesAny(m, ['_2_5', '_25', '2.5', '25'])) return 2.5;
  if (includesAny(m, ['_3_5', '_35', '3.5', '35'])) return 3.5;
  if (includesAny(m, ['_4_5', '_45', '4.5', '45'])) return 4.5;
  if (includesAny(m, ['_8_5', '_85', '8.5', '85'])) return 8.5;
  if (includesAny(m, ['_9_5', '_95', '9.5', '95'])) return 9.5;
  if (includesAny(m, ['_10_5', '_105', '10.5', '105'])) return 10.5;

  return null;
}

export function didMarketHit(market: string, stats: LiveFixtureStats): boolean | null {
  const m = market.toLowerCase();
  const isUnder = m.includes('under');

  // BTTS
  if (m.includes('btts')) {
    return stats.score_home > 0 && stats.score_away > 0;
  }

  // Goals
  if (m.includes('goal')) {
    const threshold = parseOverThreshold(market);
    if (!threshold) return null;
    const total = stats.score_home + stats.score_away;
    return isUnder ? total < threshold : total > threshold;
  }

  // Corners
  if (m.includes('corner')) {
    const threshold = parseOverThreshold(market);
    if (!threshold) return null;
    return isUnder ? stats.corners_total < threshold : stats.corners_total > threshold;
  }

  // Cards
  if (m.includes('card')) {
    const threshold = parseOverThreshold(market);
    if (!threshold) return null;
    return isUnder ? stats.cards_total < threshold : stats.cards_total > threshold;
  }

  // category:market formats from acca-builder
  if (m.startsWith('goals:') || m.startsWith('goals_')) {
    const threshold = parseOverThreshold(market);
    if (!threshold) return null;
    const total = stats.score_home + stats.score_away;
    return isUnder ? total < threshold : total > threshold;
  }
  if (m.startsWith('corners:') || m.startsWith('corners_')) {
    const threshold = parseOverThreshold(market);
    if (!threshold) return null;
    return isUnder ? stats.corners_total < threshold : stats.corners_total > threshold;
  }
  if (m.startsWith('cards:') || m.startsWith('cards_')) {
    const threshold = parseOverThreshold(market);
    if (!threshold) return null;
    return isUnder ? stats.cards_total < threshold : stats.cards_total > threshold;
  }
  if (m.startsWith('btts:') || m.startsWith('btts_')) {
    return stats.score_home > 0 && stats.score_away > 0;
  }

  return null;
}

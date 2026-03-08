/**
 * Data Transformation Utilities
 * Converts API-Football data to our application format
 */

import type { Fixture, FixtureStatistics } from '@/types/footballApi';
import type {
  TeamFormStats,
  TeamCornerStats,
  TeamCardStats,
  TeamBTTSStats,
  Region,
} from '@/types/betting';

/**
 * Determine region based on country
 */
export function getRegionFromCountry(country: string): Region {
  const ukCountries = ['England', 'Scotland', 'Wales', 'Northern Ireland'];
  const europeanCountries = [
    'Spain', 'Germany', 'Italy', 'France', 'Portugal', 'Netherlands', 'Belgium',
    'Turkey', 'Greece', 'Switzerland', 'Austria', 'Denmark', 'Sweden', 'Norway',
    'Poland', 'Czech Republic', 'Russia', 'Ukraine', 'Croatia', 'Serbia',
  ];
  const asianCountries = [
    'Japan', 'South Korea', 'China', 'Saudi Arabia', 'UAE', 'Qatar', 'India',
    'Thailand', 'Australia',
  ];
  const americasCountries = [
    'Brazil', 'Argentina', 'Mexico', 'USA', 'Colombia', 'Chile', 'Uruguay',
    'Paraguay', 'Peru', 'Ecuador', 'Canada',
  ];

  if (ukCountries.includes(country)) return 'uk';
  if (europeanCountries.includes(country)) return 'european';
  if (asianCountries.includes(country)) return 'asia';
  if (americasCountries.includes(country)) return 'americas';

  return 'european'; // Default
}

/**
 * Calculate percentage
 */
function calculatePercentage(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

/**
 * Transform fixtures to goal form stats
 */
export function transformToGoalFormStats(
  teamId: number,
  teamName: string,
  leagueName: string,
  fixtures: Fixture[],
  country: string
): TeamFormStats {
  const played = fixtures.length;
  const totalGoals = fixtures.map((f) => {
    const homeGoals = f.goals.home || 0;
    const awayGoals = f.goals.away || 0;
    return homeGoals + awayGoals;
  });

  const over_0_5 = calculatePercentage(totalGoals.filter((g) => g > 0.5).length, played);
  const over_1_5 = calculatePercentage(totalGoals.filter((g) => g > 1.5).length, played);
  const over_2_5 = calculatePercentage(totalGoals.filter((g) => g > 2.5).length, played);
  const over_3_5 = calculatePercentage(totalGoals.filter((g) => g > 3.5).length, played);

  return {
    id: String(teamId),
    team: teamName,
    league: leagueName,
    region: getRegionFromCountry(country),
    played,
    over_0_5,
    over_1_5,
    over_2_5,
    over_3_5,
    under_0_5: 100 - over_0_5,
    under_1_5: 100 - over_1_5,
    under_2_5: 100 - over_2_5,
    under_3_5: 100 - over_3_5,
  };
}

/**
 * Transform fixture statistics to corner stats
 */
export function transformToCornerStats(
  teamId: number,
  teamName: string,
  leagueName: string,
  fixtureStats: Array<{ fixture: Fixture; stats: FixtureStatistics[] }>,
  country: string
): TeamCornerStats {
  const played = fixtureStats.length;

  const cornerCounts = fixtureStats.map((fs) => {
    const homeStats = fs.stats.find((s) => s.team.id === fs.fixture.teams.home.id);
    const awayStats = fs.stats.find((s) => s.team.id === fs.fixture.teams.away.id);
    const homeCorners = Number(homeStats?.statistics.find((s) => s.type === 'Corner Kicks')?.value || 0);
    const awayCorners = Number(awayStats?.statistics.find((s) => s.type === 'Corner Kicks')?.value || 0);
    return homeCorners + awayCorners;
  });

  const avgCorners = cornerCounts.length > 0
    ? Number((cornerCounts.reduce((a, b) => a + b, 0) / cornerCounts.length).toFixed(1))
    : 0;

  const over_7_5 = calculatePercentage(cornerCounts.filter((c) => c > 7.5).length, played);
  const over_8_5 = calculatePercentage(cornerCounts.filter((c) => c > 8.5).length, played);
  const over_9_5 = calculatePercentage(cornerCounts.filter((c) => c > 9.5).length, played);
  const over_10_5 = calculatePercentage(cornerCounts.filter((c) => c > 10.5).length, played);

  return {
    id: String(teamId),
    team: teamName,
    league: leagueName,
    region: getRegionFromCountry(country),
    played,
    over_7_5,
    over_8_5,
    over_9_5,
    over_10_5,
    under_7_5: 100 - over_7_5,
    under_8_5: 100 - over_8_5,
    under_9_5: 100 - over_9_5,
    under_10_5: 100 - over_10_5,
    avgCorners,
  };
}

/**
 * Transform fixture statistics to card stats
 */
export function transformToCardStats(
  teamId: number,
  teamName: string,
  leagueName: string,
  fixtureStats: Array<{ fixture: Fixture; stats: FixtureStatistics[] }>,
  country: string
): TeamCardStats {
  const played = fixtureStats.length;

  const cardCounts = fixtureStats.map((fs) => {
    const homeStats = fs.stats.find((s) => s.team.id === fs.fixture.teams.home.id);
    const awayStats = fs.stats.find((s) => s.team.id === fs.fixture.teams.away.id);
    
    const homeYellow = Number(homeStats?.statistics.find((s) => s.type === 'Yellow Cards')?.value || 0);
    const awayYellow = Number(awayStats?.statistics.find((s) => s.type === 'Yellow Cards')?.value || 0);
    const homeRed = Number(homeStats?.statistics.find((s) => s.type === 'Red Cards')?.value || 0);
    const awayRed = Number(awayStats?.statistics.find((s) => s.type === 'Red Cards')?.value || 0);

    return homeYellow + awayYellow + homeRed + awayRed;
  });

  const avgCards = cardCounts.length > 0
    ? Number((cardCounts.reduce((a, b) => a + b, 0) / cardCounts.length).toFixed(1))
    : 0;

  const over_2_5 = calculatePercentage(cardCounts.filter((c) => c > 2.5).length, played);
  const over_3_5 = calculatePercentage(cardCounts.filter((c) => c > 3.5).length, played);
  const over_4_5 = calculatePercentage(cardCounts.filter((c) => c > 4.5).length, played);
  const over_5_5 = calculatePercentage(cardCounts.filter((c) => c > 5.5).length, played);

  return {
    id: String(teamId),
    team: teamName,
    league: leagueName,
    region: getRegionFromCountry(country),
    played,
    over_2_5,
    over_3_5,
    over_4_5,
    over_5_5,
    under_2_5: 100 - over_2_5,
    under_3_5: 100 - over_3_5,
    under_4_5: 100 - over_4_5,
    under_5_5: 100 - over_5_5,
    avgCards,
  };
}

/**
 * Transform fixtures to BTTS stats
 */
export function transformToBTTSStats(
  teamId: number,
  teamName: string,
  leagueName: string,
  fixtures: Fixture[],
  country: string
): TeamBTTSStats {
  const played = fixtures.length;

  const bttsYesCount = fixtures.filter((f) => {
    const homeGoals = f.goals.home || 0;
    const awayGoals = f.goals.away || 0;
    return homeGoals > 0 && awayGoals > 0;
  }).length;

  const btts_yes = calculatePercentage(bttsYesCount, played);
  const btts_no = 100 - btts_yes;

  let totalScored = 0, totalConceded = 0;
  fixtures.forEach(f => {
    const isHome = f.teams.home.id === teamId;
    const homeGoals = f.goals.home || 0;
    const awayGoals = f.goals.away || 0;
    
    if (isHome) {
      totalScored += homeGoals;
      totalConceded += awayGoals;
    } else {
      totalScored += awayGoals;
      totalConceded += homeGoals;
    }
  });

  return {
    id: String(teamId),
    team: teamName,
    league: leagueName,
    region: getRegionFromCountry(country),
    played,
    btts_yes,
    btts_no,
    avgGoalsScored: played > 0 ? Number((totalScored / played).toFixed(1)) : 0,
    avgGoalsConceded: played > 0 ? Number((totalConceded / played).toFixed(1)) : 0,
  };
}

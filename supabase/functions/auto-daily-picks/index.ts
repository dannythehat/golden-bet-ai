import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ══════════════════════════════════════════════════════════════════
 *  AUTO DAILY PICKS  v1.0
 * ══════════════════════════════════════════════════════════════════
 *
 *  Fully automated pipeline — runs at 6 AM UTC daily:
 *
 *  1. Fetch today's fixtures from API-Football
 *  2. Load ALL teams from form tables (team_rolling_stats)
 *  3. Cross-reference: if EITHER team in a fixture is in our form
 *     tables, that fixture qualifies for ML analysis
 *  4. For each qualifying fixture per market, run:
 *     - ML Inference (GBT models from ml_models or heuristic fallback)
 *     - Gaffer Brain scoring (Poisson, Bayesian, Kelly, Z-Score)
 *  5. Rank by composite score → pick top 3 per market (Gold/Silver/Bronze)
 *  6. Fetch live odds from API-Football
 *  7. Store in golden_bet_history
 *
 *  Markets: Over 2.5 Goals, Over 9.5 Corners, Over 3.5 Cards
 * ══════════════════════════════════════════════════════════════════
 */

const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const BET365_ID = 6;

// ── Market definitions ────────────────────────────────────────────
type Market = 'over_2_5_goals' | 'over_9_5_corners' | 'over_3_5_cards';
const ALL_MARKETS: Market[] = ['over_2_5_goals', 'over_9_5_corners', 'over_3_5_cards'];

const MARKET_THRESHOLDS: Record<Market, number> = {
  over_2_5_goals: 2.5,
  over_9_5_corners: 9.5,
  over_3_5_cards: 3.5,
};

const MARKET_MODEL_KEYS: Record<Market, string> = {
  over_2_5_goals: 'over_2.5_goals',
  over_9_5_corners: 'over_9.5_corners',
  over_3_5_cards: 'over_3.5_cards',
};

// ── League filtering ──────────────────────────────────────────────
// No league whitelist — we use ALL premium leagues worldwide.
// Only exclude junk (women's, youth, amateur, friendlies).
const EXCLUDED_PATTERNS = [
  'women', 'woman', 'femenina', 'féminine', 'feminin', 'frauen',
  'damer', 'ladies', 'female', 'wsl', 'nwsl',
  'u15', 'u16', 'u17', 'u18', 'u19', 'u20', 'u21', 'u23',
  'youth', 'junior', 'academy', 'reserve', 'development',
  'friendly', 'friendlies', 'amateur', 'non league',
  'primavera', 'revelação',
];

// Minimum odds threshold — we want winners, not long-shots
const MIN_ODDS = 1.40;

function isExcluded(name: string): boolean {
  const lower = name.toLowerCase();
  return EXCLUDED_PATTERNS.some(p => lower.includes(p)) || /\bw\b/i.test(name);
}

function normalizeTeamName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Fuzzy match: check if fixture team contains a form-table team name or vice versa
function fuzzyMatchTeam(fixtureTeamNorm: string, formTeamNormSet: Set<string>): string | null {
  // Exact match first
  if (formTeamNormSet.has(fixtureTeamNorm)) return fixtureTeamNorm;
  // Check if any form team is a prefix/substring of the fixture team or vice versa
  for (const formTeam of formTeamNormSet) {
    if (formTeam.length >= 4 && (fixtureTeamNorm.startsWith(formTeam) || formTeam.startsWith(fixtureTeamNorm))) {
      return formTeam;
    }
  }
  return null;
}

// ── Math helpers ──────────────────────────────────────────────────
const factCache: number[] = [1];
function fact(n: number): number {
  for (let i = factCache.length; i <= n; i++) factCache[i] = factCache[i - 1] * i;
  return factCache[Math.min(n, 20)] ?? 2.43e18;
}

function poissonPMF(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.exp(-lambda) * Math.pow(lambda, k) / fact(k);
}

function poissonExceedProb(lambda: number, threshold: number): number {
  const floor = Math.floor(threshold);
  let cdf = 0;
  for (let k = 0; k <= floor; k++) cdf += poissonPMF(lambda, k);
  return Math.max(0, Math.min(1, 1 - cdf));
}

function bayesianUpdate(leagueRate: number, teamRate: number, teamMatches: number, priorStrength = 10): number {
  const alpha0 = leagueRate * priorStrength;
  const beta0 = (1 - leagueRate) * priorStrength;
  const successes = teamRate * teamMatches;
  return Math.max(0, Math.min(1, (alpha0 + successes) / (alpha0 + beta0 + teamMatches)));
}

function kelly(prob: number, decimalOdds: number): number {
  if (decimalOdds <= 1) return 0;
  const b = decimalOdds - 1;
  return Math.max(0, Math.min(0.5, (prob * decimalOdds - 1) / b));
}

function zScore(value: number, mean: number, std: number): number {
  return std <= 0 ? 0 : (value - mean) / std;
}

function safeNum(v: any, fallback = 0): number {
  const n = Number(v);
  return (n === n && v !== null && v !== undefined) ? n : fallback;
}

// ── GBT tree prediction ──────────────────────────────────────────
interface TreeNode { f?: number; t?: number; l?: TreeNode; r?: TreeNode; v?: number; }

function predictTree(node: TreeNode, features: number[]): number {
  if (node.v !== undefined) return node.v;
  if (node.f === undefined || node.t === undefined) return 0;
  return features[node.f] <= node.t ? predictTree(node.l!, features) : predictTree(node.r!, features);
}

function predictGBT(trees: TreeNode[], baseScore: number, lr: number, features: number[]): number {
  let score = baseScore;
  for (const tree of trees) score += lr * predictTree(tree, features);
  return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, score))));
}

// ── Feature builder (matches ml-inference V3) ─────────────────────
interface RollingStats {
  team_name: string;
  avg_goals_scored: number; avg_goals_conceded: number;
  avg_total_goals: number; over_25_goals_pct: number; btts_pct: number;
  avg_corners_for: number; avg_corners_against: number;
  avg_total_corners: number; over_95_corners_pct: number;
  avg_cards_for: number; avg_cards_against: number;
  avg_total_cards: number; over_35_cards_pct: number; over_45_cards_pct: number;
  matches_used: number;
  avg_shots_for?: number; avg_xg_for?: number; avg_xg_against?: number;
  avg_possession?: number;
}

interface LeagueStats {
  avg_total_goals: number; over_25_goals_pct: number;
  avg_total_corners: number; over_95_corners_pct: number;
  avg_total_cards: number; over_35_cards_pct: number;
}

function buildMLFeatures(market: Market, home: RollingStats, away: RollingStats): number[] {
  const hGF = safeNum(home.avg_goals_scored, 1.3), hGA = safeNum(home.avg_goals_conceded, 1.3);
  const aGF = safeNum(away.avg_goals_scored, 1.1), aGA = safeNum(away.avg_goals_conceded, 1.3);
  const hCF = safeNum(home.avg_corners_for, 5), aCF = safeNum(away.avg_corners_for, 4.5);
  const hCA = safeNum(home.avg_corners_against, 5), aCA = safeNum(away.avg_corners_against, 4.5);
  const hCardF = safeNum(home.avg_cards_for, 1.8), aCardF = safeNum(away.avg_cards_for, 1.6);
  const hCardA = safeNum(home.avg_cards_against, 1.8), aCardA = safeNum(away.avg_cards_against, 1.6);

  switch (market) {
    case 'over_2_5_goals': {
      const homeExp = (hGF + aGA) / 2, awayExp = (aGF + hGA) / 2;
      const totalLambda = homeExp + awayExp;
      return [
        hGF, hGF, hGF, hGA, hGA, hGA, aGF, aGF, aGF, aGA, aGA, aGA,
        hGF + aGF, 2.5, 0.5, (hGA + aGA) - 2.5,
        poissonExceedProb(totalLambda, 3), poissonExceedProb(totalLambda, 2),
        Math.log(Math.max(hGF, 0.1) / Math.max(hGA, 0.1)),
        Math.log(Math.max(aGF, 0.1) / Math.max(aGA, 0.1)),
        Math.log(Math.max(hGF, 0.1) / Math.max(hGA, 0.1)) + Math.log(Math.max(aGF, 0.1) / Math.max(aGA, 0.1)),
        hGF * aGA, aGF * hGA, (hGF * aGA) + (aGF * hGA),
        0, 0, hGF - 1.25, aGF - 1.25, hGF - hGA, aGF - aGA,
        hGF + aGF, hGA + aGA, 0, 0, hGA / Math.max(aGA, 0.1),
      ];
    }
    case 'over_9_5_corners': {
      const totalCorners = hCF + aCF;
      return [
        hCF, hCF, hCF, hCA, hCA, hCA, aCF, aCF, aCF, aCA, aCA, aCA,
        hCF + aCF, 10, hGF, aGF, hGF + aGF,
        poissonExceedProb(totalCorners, 10),
        hCF + aCF, hCA + aCA, (hCF + hCA + aCF + aCA) / 2,
        0, 0, (hCF + aCF) - 10, hGF + aGF,
        hCF / Math.max(aCF, 0.1), hCF + aCF, 0, 0,
        Math.log(Math.max(hCF, 0.1) / Math.max(hCA, 0.1)),
        Math.log(Math.max(aCF, 0.1) / Math.max(aCA, 0.1)),
      ];
    }
    case 'over_3_5_cards': {
      const totalCards = hCardF + aCardF;
      const hFouls = hCardF * 5, aFouls = aCardF * 5;
      return [
        hCardF, hCardF, hCardF, hCardA, hCardA, hCardA,
        aCardF, aCardF, aCardF, aCardA, aCardA, aCardA,
        hFouls, hFouls, hFouls, aFouls, aFouls, aFouls,
        hCardF + aCardF, 3.5, 0.4, 3.5,
        poissonExceedProb(totalCards, 4),
        hCardF + aCardF, hCardA + aCardA, hFouls + aFouls,
        hCardF / Math.max(hFouls, 0.1), aCardF / Math.max(aFouls, 0.1),
        0, 0, 0, 0, (hCardF + aCardF) - 3.5, hCardA + aCardA, 0,
        Math.log(Math.max(hCardF, 0.01) / Math.max(hCardA, 0.01)),
        Math.log(Math.max(aCardF, 0.01) / Math.max(aCardA, 0.01)),
        0, 0,
      ];
    }
  }
}

// ── Heuristic fallback ────────────────────────────────────────────
function heuristicProb(market: Market, home: RollingStats, away: RollingStats): number {
  switch (market) {
    case 'over_2_5_goals': {
      const pctAvg = (safeNum(home.over_25_goals_pct, 50) + safeNum(away.over_25_goals_pct, 50)) / 200;
      const lambda = safeNum(home.avg_goals_scored, 1.3) + safeNum(away.avg_goals_scored, 1.1);
      return pctAvg * 0.5 + poissonExceedProb(lambda, 3) * 0.3 + (lambda > 2.5 ? 0.15 : 0.05) + 0.05;
    }
    case 'over_9_5_corners': {
      const totalCorners = safeNum(home.avg_corners_for, 5) + safeNum(away.avg_corners_for, 4.5);
      const pctAvg = (safeNum(home.over_95_corners_pct, 45) + safeNum(away.over_95_corners_pct, 45)) / 200;
      return pctAvg * 0.5 + poissonExceedProb(totalCorners, 10) * 0.3 + (totalCorners > 10 ? 0.15 : 0.05) + 0.05;
    }
    case 'over_3_5_cards': {
      const totalCards = safeNum(home.avg_cards_for, 1.8) + safeNum(away.avg_cards_for, 1.6);
      const pctAvg = (safeNum(home.over_35_cards_pct, 45) + safeNum(away.over_35_cards_pct, 45)) / 200;
      return pctAvg * 0.5 + poissonExceedProb(totalCards, 4) * 0.3 + (totalCards > 3.5 ? 0.15 : 0.05) + 0.05;
    }
  }
}

// ── Composite Brain Score ─────────────────────────────────────────
// Winners-first: rank primarily by FORM TABLE percentage (what users
// see on market pages). Poisson/Bayesian are minor tiebreakers.
function compositeScore(
  mlProb: number, poissonProb: number, bayesProb: number,
  kellyFrac: number, zScoreNorm: number,
  formTablePct: number = 0
): number {
  if (formTablePct > 0) {
    return 0.65 * formTablePct + 0.15 * poissonProb + 0.10 * bayesProb +
      0.05 * mlProb + 0.05 * Math.min(1, kellyFrac * 2);
  }
  return 0.40 * mlProb + 0.30 * poissonProb + 0.25 * bayesProb +
    0.05 * Math.min(1, kellyFrac * 2);
}

// ── Lambda estimator ──────────────────────────────────────────────
function estimateLambda(market: Market, home: RollingStats, away: RollingStats): number {
  switch (market) {
    case 'over_2_5_goals':
      return ((safeNum(home.avg_goals_scored) + safeNum(away.avg_goals_conceded)) / 2) +
             ((safeNum(away.avg_goals_scored) + safeNum(home.avg_goals_conceded)) / 2);
    case 'over_9_5_corners':
      return ((safeNum(home.avg_corners_for) + safeNum(away.avg_corners_against)) / 2) +
             ((safeNum(away.avg_corners_for) + safeNum(home.avg_corners_against)) / 2);
    case 'over_3_5_cards':
      return safeNum(home.avg_cards_for) + safeNum(away.avg_cards_for);
  }
}

function getLeagueRate(market: Market, league: LeagueStats): number {
  switch (market) {
    case 'over_2_5_goals': return (league.over_25_goals_pct || 50) / 100;
    case 'over_9_5_corners': return (league.over_95_corners_pct || 50) / 100;
    case 'over_3_5_cards': return (league.over_35_cards_pct || 40) / 100;
  }
}

function getTeamRate(market: Market, stats: RollingStats): number {
  switch (market) {
    case 'over_2_5_goals': return safeNum(stats.over_25_goals_pct, 50) / 100;
    case 'over_9_5_corners': return safeNum(stats.over_95_corners_pct, 45) / 100;
    case 'over_3_5_cards': return safeNum(stats.over_35_cards_pct, 40) / 100;
  }
}

function getLeagueAvgLambda(market: Market, league: LeagueStats): number {
  switch (market) {
    case 'over_2_5_goals': return league.avg_total_goals || 2.6;
    case 'over_9_5_corners': return league.avg_total_corners || 10.0;
    case 'over_3_5_cards': return league.avg_total_cards || 3.8;
  }
}

function getLeagueStd(market: Market): number {
  switch (market) {
    case 'over_2_5_goals': return 1.1;
    case 'over_9_5_corners': return 2.5;
    case 'over_3_5_cards': return 1.4;
  }
}

// ── Gaffer narrative builder ──────────────────────────────────────
const MARKET_LABELS: Record<Market, string> = {
  over_2_5_goals: 'Over 2.5 Goals',
  over_9_5_corners: 'Over 9.5 Corners',
  over_3_5_cards: 'Over 3.5 Cards',
};

const TIER_LABELS = ['Gold', 'Silver', 'Bronze'] as const;

function buildGafferReasoning(
  market: Market, home: string, away: string,
  composite: number, impliedProb: number, edge: number,
  lambda: number, poissonP: number, bayesP: number, kellyF: number, z: number,
  tier: typeof TIER_LABELS[number]
): string {
  const threshold = MARKET_THRESHOLDS[market];
  const marketLabel = MARKET_LABELS[market];

  // ── Part 1: Stats & Facts (clean, bullet-point data) ──
  const stats: string[] = [];
  stats.push(`📊 ${marketLabel}: ${home} vs ${away}`);
  stats.push(`🏠 ${home}: avg ${lambda > 0 ? (lambda * 0.55).toFixed(1) : '?'} per game`);
  stats.push(`✈️ ${away}: avg ${lambda > 0 ? (lambda * 0.45).toFixed(1) : '?'} per game`);
  stats.push(`📈 Combined avg: ${lambda.toFixed(1)} per game (mark: ${threshold})`);
  stats.push(`🎯 Gaffer Brain score: ${(composite * 100).toFixed(0)}% | Bookies: ${(impliedProb * 100).toFixed(0)}%`);
  if (edge > 0) stats.push(`💰 Value edge: +${(edge * 100).toFixed(1)}%`);

  // ── Part 2: The Gaffer's witty take ──
  const gaffer = buildWittyGafferTake(market, home, away, composite, edge, lambda, threshold, tier, z);

  return stats.join('\n') + '\n---GAFFER---\n' + gaffer;
}

function buildWittyGafferTake(
  market: Market, home: string, away: string,
  composite: number, edge: number, lambda: number, threshold: number,
  tier: typeof TIER_LABELS[number], z: number
): string {
  const edgePct = (edge * 100).toFixed(1);
  const confPct = (composite * 100).toFixed(0);
  const margin = lambda - threshold;
  const isStrong = margin > 1.5;
  const isComfortable = margin > 0.5;

  // Tier-specific openers
  const tierOpeners: Record<string, string[]> = {
    Gold: [
      `This is the one, lads. Absolute banker on tonight's card.`,
      `Gold pick and I'm not even sweating this one. Nailed on.`,
      `Top of the pile for a reason — this is as good as it gets tonight.`,
      `The Gaffer's gold star goes here. Don't overthink it, just get on it.`,
    ],
    Silver: [
      `Strong silver pick — not far behind the gold at all.`,
      `Right behind the banker — this one's got serious pedigree.`,
      `Silver tier but don't sleep on it. The numbers are screaming.`,
      `Proper value here — the bookies have got this one wrong.`,
    ],
    Bronze: [
      `Bronze doesn't mean bad — this is still a proper pick.`,
      `Third on the card but the value here is real. Trust the data.`,
      `Rounding out the card with a solid shout. The stats back it up.`,
      `The Gaffer fancies this one as a nice closer. Proper value.`,
    ],
  };

  const opener = tierOpeners[tier][Math.floor(Math.random() * tierOpeners[tier].length)];

  // Market-specific witty commentary
  let body: string;
  switch (market) {
    case 'over_2_5_goals':
      if (isStrong) {
        body = `Both sides have been leaking goals for fun — ${lambda.toFixed(1)} per game combined absolutely smashes the 2.5 mark. Neither defence can keep a clean sheet to save their lives. Get on it.`;
      } else if (isComfortable) {
        body = `The goals data stacks up nicely here — ${lambda.toFixed(1)} per game between them clears 2.5 comfortably. When these two turn up, goals follow. Proper pick.`;
      } else {
        body = `Tight one on paper but the underlying numbers tell a different story. At ${confPct}% confidence with a +${edgePct}% edge over the bookies, the Gaffer's backing goals here.`;
      }
      break;
    case 'over_9_5_corners':
      if (isStrong) {
        body = `Corners flying in from all angles — a combined ${lambda.toFixed(1)} per game absolutely demolishes the 9.5 mark. Expect flags waving all night long. Banker.`;
      } else if (isComfortable) {
        body = `Both sides rack up set pieces and the corner data is rock solid at ${lambda.toFixed(1)} per game combined. The 9.5 mark is well within reach. Get it on.`;
      } else {
        body = `The corner stats are tighter but the value is there. At ${confPct}% confidence the bookies have underpriced this one. Trust the form tables.`;
      }
      break;
    case 'over_3_5_cards':
      if (isStrong) {
        body = `Cards flying everywhere when these two meet — ${lambda.toFixed(1)} per game combined. The ref's pocket is going to be busy tonight. Nailed on.`;
      } else if (isComfortable) {
        body = `A tasty card-heavy affair is on the cards. Both sides pick up bookings for fun and the disciplinary records don't lie at ${lambda.toFixed(1)} per game. Lovely stuff.`;
      } else {
        body = `The card data says yes — ${confPct}% confidence with the bookies sleeping on this one. Expect a feisty encounter and a busy referee.`;
      }
      break;
  }

  return `${opener} ${body}`;
}

// ── Full scoring pipeline per fixture per market ──────────────────
interface ScoredPick {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  league_id: number;
  kickoff: string;
  market: Market;
  ml_probability: number;
  composite_score: number;
  odds: number;
  bookmaker: string;
  implied_prob: number;
  value_edge: number;
  lambda: number;
  poisson_prob: number;
  bayes_prob: number;
  kelly_frac: number;
  z: number;
}

function scoreFixture(
  fixture: { fixture_id: string; home_team: string; away_team: string; league: string; league_id: number; kickoff: string },
  market: Market,
  home: RollingStats,
  away: RollingStats,
  leagueStats: LeagueStats,
  mlProb: number,
  odds: number,
  bookmaker: string,
): ScoredPick {
  const threshold = MARKET_THRESHOLDS[market];
  const lambda = estimateLambda(market, home, away);
  const poissonP = poissonExceedProb(lambda, threshold);

  const leagueRate = getLeagueRate(market, leagueStats);
  const homeRate = getTeamRate(market, home);
  const awayRate = getTeamRate(market, away);
  const bayesHome = bayesianUpdate(leagueRate, homeRate, home.matches_used);
  const bayesAway = bayesianUpdate(leagueRate, awayRate, away.matches_used);
  const bayesP = bayesHome * 0.55 + bayesAway * 0.45;

  const kellyF = kelly(mlProb, odds);
  const leagueAvgLambda = getLeagueAvgLambda(market, leagueStats);
  const z = zScore(lambda, leagueAvgLambda, getLeagueStd(market));
  const zNorm = 1 / (1 + Math.exp(-z * 1.2));

  // Form table percentage: average of both teams' market-specific %
  const formTablePct = (homeRate + awayRate) / 2;

  const comp = compositeScore(mlProb, poissonP, bayesP, kellyF, zNorm, formTablePct);
  const impliedProb = odds > 0 ? 1 / odds : 0.5;
  // Never show negative value — floor at +0.5% minimum
  const edge = Math.max(0.005, comp - impliedProb);

  return {
    fixture_id: fixture.fixture_id,
    home_team: fixture.home_team,
    away_team: fixture.away_team,
    league: fixture.league,
    league_id: fixture.league_id,
    kickoff: fixture.kickoff,
    market,
    ml_probability: mlProb,
    composite_score: comp,
    odds,
    bookmaker,
    implied_prob: impliedProb,
    value_edge: edge,
    lambda, poisson_prob: poissonP, bayes_prob: bayesP, kelly_frac: kellyF, z,
  };
}

// ── Parse odds from API-Football response ─────────────────────────
function parseOddsResponse(
  response: any[],
  oddsMap: Map<string, { odds: number; bookmaker: string }>
): number {
  let found = 0;
  for (const fixture of response) {
    const fixtureId = String(fixture.fixture?.id || '');
    for (const bk of (fixture.bookmakers || [])) {
      for (const bet of (bk.bets || [])) {
        const betName = (bet.name || '').toLowerCase();
        for (const val of (bet.values || [])) {
          const label = String(val.value || '').toLowerCase();
          const odd = parseFloat(val.odd);
          if (!odd || odd <= 0) continue;

          // Goals: "over 2.5" (standard label)
          if ((label === 'over 2.5' || label === 'over 3') && !betName.includes('corner') && !betName.includes('card')) {
            if (!oddsMap.has(`${fixtureId}_over_2_5_goals`)) {
              oddsMap.set(`${fixtureId}_over_2_5_goals`, { odds: odd, bookmaker: bk.name || 'Bet365' });
              found++;
            }
          }
          // Corners: Bet365 uses whole numbers — "over 10" means Over 9.5
          // Also match "over 9.5", "over 9", "over 10", "over 10.5"
          const isCornerBet = betName.includes('corner');
          if (isCornerBet && (label === 'over 9.5' || label === 'over 10' || label === 'over 9')) {
            if (!oddsMap.has(`${fixtureId}_over_9_5_corners`)) {
              oddsMap.set(`${fixtureId}_over_9_5_corners`, { odds: odd, bookmaker: bk.name || 'Bet365' });
              found++;
            }
          }
          // Cards: Bet365 uses "over 4" meaning Over 3.5
          // Also match "over 3.5", "over 4", "over 4.5"
          const isCardBet = betName.includes('card');
          if (isCardBet && (label === 'over 3.5' || label === 'over 4' || label === 'over 4.5')) {
            if (!oddsMap.has(`${fixtureId}_over_3_5_cards`)) {
              oddsMap.set(`${fixtureId}_over_3_5_cards`, { odds: odd, bookmaker: bk.name || 'Bet365' });
              found++;
            }
          }
        }
      }
    }
  }
  return found;
}

//  MAIN HANDLER
// ══════════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    if (!API_KEY) throw new Error('API_FOOTBALL_KEY not configured');

    const today = new Date().toISOString().split('T')[0];
    const body = await req.json().catch(() => ({}));
    const regenerate = body?.regenerate === true;
    console.log(`\n🚀 AUTO DAILY PICKS — ${today}${regenerate ? ' (REGENERATE)' : ''}\n${'═'.repeat(50)}`);

    // If regenerate flag, delete today's pending picks first
    if (regenerate) {
      const { error: delErr, count } = await supabase
        .from('golden_bet_history')
        .delete({ count: 'exact' })
        .eq('prediction_date', today)
        .eq('status', 'pending');
      console.log(`🗑️ Regenerate: deleted ${count ?? 0} pending picks for today${delErr ? ` (error: ${delErr.message})` : ''}`);
    }

    // ── Check existing picks for today (self-heal partial days instead of aborting) ──
    const { data: existingRows } = await supabase
      .from('golden_bet_history')
      .select('id, fixture_id, market')
      .eq('prediction_date', today);

    const existingByMarket: Record<Market, any[]> = {
      over_2_5_goals: [],
      over_9_5_corners: [],
      over_3_5_cards: [],
    };

    for (const row of (existingRows || [])) {
      const market = String(row.market || '') as Market;
      if (existingByMarket[market]) existingByMarket[market].push(row);
    }

    const neededByMarket: Record<Market, number> = {
      over_2_5_goals: Math.max(0, 3 - existingByMarket.over_2_5_goals.length),
      over_9_5_corners: Math.max(0, 3 - existingByMarket.over_9_5_corners.length),
      over_3_5_cards: Math.max(0, 3 - existingByMarket.over_3_5_cards.length),
    };

    const totalNeeded = Object.values(neededByMarket).reduce((sum, n) => sum + n, 0);

    if (totalNeeded === 0) {
      console.log('⚠️ Full market set already exists for today — no top-up needed');
      return new Response(JSON.stringify({
        success: true,
        message: 'Picks already fully generated for today',
        date: today,
        picks_stored: existingRows?.length || 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`🩹 Self-heal mode: need ${totalNeeded} additional picks (${neededByMarket.over_2_5_goals} goals, ${neededByMarket.over_9_5_corners} corners, ${neededByMarket.over_3_5_cards} cards)`);

    // ── Step 1: Fetch today's fixtures ────────────────────────────
    console.log('\n📅 Step 1: Fetching fixtures...');
    const fixturesRes = await fetch(`${API_FOOTBALL_BASE}/fixtures?date=${today}&timezone=UTC`, {
      headers: { 'x-apisports-key': API_KEY },
    });
    if (!fixturesRes.ok) throw new Error(`API-Football fixtures error: ${fixturesRes.status}`);

    const fixturesData = await fixturesRes.json();
    // Debug: find Rosenborg/Bryne in raw fixtures
    const rawFixtures = fixturesData.response || [];
    const debugRosenborg = rawFixtures.filter((f: any) => {
      const home = (f.teams?.home?.name || '').toLowerCase();
      const away = (f.teams?.away?.name || '').toLowerCase();
      return home.includes('rosen') || away.includes('rosen') || home.includes('bryne') || away.includes('bryne');
    });
    console.log(`🔍 DEBUG: Found ${debugRosenborg.length} Rosenborg/Bryne fixtures in raw API response`);
    for (const d of debugRosenborg) {
      const lname = d.league?.name || '';
      const home = d.teams?.home?.name || '';
      const away = d.teams?.away?.name || '';
      const kickoff = d.fixture?.date;
      const pastKickoff = !kickoff || new Date(kickoff) < new Date();
      const excluded = isExcluded(lname) || isExcluded(home) || isExcluded(away);
      console.log(`  → ${home} vs ${away} | ${lname} | KO: ${kickoff} | past=${pastKickoff} | excluded=${excluded}`);
    }

    const allFixtures = rawFixtures
      .filter((f: any) => {
        const lname = f.league?.name || '';
        const home = f.teams?.home?.name || '';
        const away = f.teams?.away?.name || '';
        const kickoff = f.fixture?.date;
        if (!kickoff || new Date(kickoff) < new Date()) return false;
        if (isExcluded(lname) || isExcluded(home) || isExcluded(away)) return false;
        return true;
      })
      .map((f: any) => ({
        fixture_id: String(f.fixture.id),
        league_id: f.league.id,
        league: f.league.name,
        home_team: f.teams.home.name,
        away_team: f.teams.away.name,
        kickoff: f.fixture.date,
      }));

    console.log(`✅ ${allFixtures.length} eligible fixtures from ${new Set(allFixtures.map((f: any) => f.league)).size} leagues`);

    if (allFixtures.length === 0) {
      return new Response(JSON.stringify({
        success: false, message: 'No fixtures found for today', date: today,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Step 2: Load form table teams ─────────────────────────────
    console.log('\n📊 Step 2: Loading form table teams...');
    // Paginate to load ALL team names (max_rows=1000 cap in PostgREST)
    const allFormTeams: any[] = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: batch } = await supabase
        .from('team_rolling_stats')
        .select('team_name')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (!batch || batch.length === 0) break;
      allFormTeams.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      page++;
    }

    const formTeamSet = new Set(allFormTeams.map((t: any) => t.team_name));
    const formTeamNormSet = new Set(allFormTeams.map((t: any) => normalizeTeamName(t.team_name)));
    console.log(`✅ ${formTeamSet.size} teams in form tables`);

    // ── Step 3: Cross-reference — keep fixtures where either team is in form tables ─
    // Use fuzzy matching to handle API-Football suffixes (e.g. "Rosenborg BK" vs "Rosenborg")
    console.log('\n🔗 Step 3: Cross-referencing fixtures with form tables (fuzzy)...');
    const fixtureTeamMap = new Map<string, string>(); // maps fixture team norm → form team norm
    const qualifyingFixtures = allFixtures.filter((f: any) => {
      const homeNorm = normalizeTeamName(f.home_team);
      const awayNorm = normalizeTeamName(f.away_team);
      const homeMatch = fuzzyMatchTeam(homeNorm, formTeamNormSet);
      const awayMatch = fuzzyMatchTeam(awayNorm, formTeamNormSet);
      if (homeMatch) fixtureTeamMap.set(homeNorm, homeMatch);
      if (awayMatch) fixtureTeamMap.set(awayNorm, awayMatch);
      return homeMatch !== null || awayMatch !== null;
    });
    console.log(`✅ ${qualifyingFixtures.length} qualifying fixtures (at least one form team)`);

    if (qualifyingFixtures.length === 0) {
      return new Response(JSON.stringify({
        success: false, message: 'No fixtures match form table teams', date: today,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Step 4: Load rolling stats + league stats for all teams ───
    console.log('\n📈 Step 4: Loading rolling stats...');
    const teamNames = new Set<string>();
    const leagueNames = new Set<string>();
    for (const f of qualifyingFixtures) {
      teamNames.add(f.home_team);
      teamNames.add(f.away_team);
      leagueNames.add(f.league);
    }

    // Paginate rolling stats (max_rows=1000 cap)
    const allRollingData: any[] = [];
    let rsPage = 0;
    while (true) {
      const { data: rsBatch } = await supabase.from('team_rolling_stats')
        .select('team_name, avg_goals_scored, avg_goals_conceded, avg_total_goals, over_25_goals_pct, btts_pct, avg_corners_for, avg_corners_against, avg_total_corners, over_95_corners_pct, avg_cards_for, avg_cards_against, avg_total_cards, over_35_cards_pct, over_45_cards_pct, matches_used, avg_shots_for, avg_xg_for, avg_xg_against, avg_possession')
        .gte('matches_used', 6)
        .range(rsPage * PAGE_SIZE, (rsPage + 1) * PAGE_SIZE - 1);
      if (!rsBatch || rsBatch.length === 0) break;
      allRollingData.push(...rsBatch);
      if (rsBatch.length < PAGE_SIZE) break;
      rsPage++;
    }

    const { data: leagueData } = await supabase.from('league_rolling_stats')
      .select('league, avg_total_goals, over_25_goals_pct, avg_total_corners, over_95_corners_pct, avg_total_cards, over_35_cards_pct')
      .in('league', [...leagueNames]);

    const rollingMap = new Map<string, RollingStats>();
    for (const r of allRollingData) {
      rollingMap.set(r.team_name, r as RollingStats);
      rollingMap.set(normalizeTeamName(r.team_name), r as RollingStats);
    }

    const leagueMap = new Map<string, LeagueStats>();
    for (const l of (leagueData || [])) leagueMap.set(l.league, l as LeagueStats);

    const defaultLeague: LeagueStats = {
      avg_total_goals: 2.6, over_25_goals_pct: 52,
      avg_total_corners: 10.0, over_95_corners_pct: 50,
      avg_total_cards: 3.8, over_35_cards_pct: 42,
    };

    console.log(`✅ ${rollingMap.size} teams with rolling stats, ${leagueMap.size} leagues loaded`);

    // ── Step 5: Load ML models ────────────────────────────────────
    console.log('\n🤖 Step 5: Loading ML models...');
    const { data: models } = await supabase
      .from('ml_models')
      .select('market, weights, version, model_type, brier_score, calibration_slope, reliability_bins')
      .eq('is_active', true)
      .eq('model_type', 'gradient_boosted_trees');

    const modelMap = new Map<string, any>();
    for (const m of (models || [])) {
      // Governance check
      if (m.brier_score != null && m.calibration_slope != null &&
          m.reliability_bins && Array.isArray(m.reliability_bins) && m.reliability_bins.length > 0) {
        modelMap.set(m.market, m);
        console.log(`  ✅ ${m.market} v${m.version} (GBT, governed)`);
      } else {
        console.log(`  ⚠️ ${m.market} v${m.version} — governance fail, using heuristic`);
      }
    }

    // ── Step 6: Fetch odds from API-Football ──────────────────────
    // Pre-rank fixtures by form to only fetch odds for top candidates
    console.log('\n💰 Step 6: Pre-ranking by form then fetching odds for top candidates...');
    
    // Quick form-rank: for each fixture, compute average form % across all markets
    const formRanked = qualifyingFixtures.map((f: any) => {
      const hNorm = normalizeTeamName(f.home_team);
      const aNorm = normalizeTeamName(f.away_team);
      const home = rollingMap.get(f.home_team) || rollingMap.get(hNorm) || rollingMap.get(fixtureTeamMap.get(hNorm) || '');
      const away = rollingMap.get(f.away_team) || rollingMap.get(aNorm) || rollingMap.get(fixtureTeamMap.get(aNorm) || '');
      const goalsForm = ((safeNum(home?.over_25_goals_pct, 0) + safeNum(away?.over_25_goals_pct, 0)) / 2);
      const cornersForm = ((safeNum(home?.over_95_corners_pct, 0) + safeNum(away?.over_95_corners_pct, 0)) / 2);
      const cardsForm = ((safeNum(home?.over_35_cards_pct, 0) + safeNum(away?.over_35_cards_pct, 0)) / 2);
      const bestForm = Math.max(goalsForm, cornersForm, cardsForm);
      return { ...f, bestForm };
    }).sort((a: any, b: any) => b.bestForm - a.bestForm);

    // Fetch odds for top 50 fixtures by form (saves API calls while covering more markets)
    const topCandidates = formRanked.slice(0, 50);
    console.log(`  Top 50 candidates by form (best: ${topCandidates[0]?.home_team} vs ${topCandidates[0]?.away_team} @ ${topCandidates[0]?.bestForm}%)`);
    // Debug: find Rosenborg in ranked list
    const rosenIdx = formRanked.findIndex((f: any) => f.home_team.toLowerCase().includes('rosen') || f.away_team.toLowerCase().includes('rosen') || f.home_team.toLowerCase().includes('bryne') || f.away_team.toLowerCase().includes('bryne'));
    if (rosenIdx >= 0) {
      const rf = formRanked[rosenIdx];
      console.log(`  🔍 Bryne/Rosenborg ranked #${rosenIdx + 1} with bestForm=${rf.bestForm}% (${rf.home_team} vs ${rf.away_team}) — ${rosenIdx < 50 ? 'IN TOP 50 ✅' : 'OUTSIDE TOP 50 ❌'}`);
    } else {
      console.log('  🔍 Bryne/Rosenborg NOT FOUND in qualifying fixtures');
    }

    const oddsMap = new Map<string, { odds: number; bookmaker: string }>();
    const fixtureIds = topCandidates.map((f: any) => f.fixture_id);
    
    // Fetch odds by fixture ID — accept ANY bookmaker, not just Bet365
    for (let i = 0; i < fixtureIds.length; i += 5) {
      const batch = fixtureIds.slice(i, i + 5);
      const oddsPromises = batch.map(async (fid: string) => {
        try {
          // First try Bet365 specifically
          let oddsRes = await fetch(
            `${API_FOOTBALL_BASE}/odds?fixture=${fid}&bookmaker=${BET365_ID}`,
            { headers: { 'x-apisports-key': API_KEY } }
          );
          if (oddsRes.ok) {
            const oddsData = await oddsRes.json();
            const found = parseOddsResponse(oddsData.response || [], oddsMap);
            if (found > 0) return;
          }
          // Fallback: try any bookmaker
          oddsRes = await fetch(
            `${API_FOOTBALL_BASE}/odds?fixture=${fid}`,
            { headers: { 'x-apisports-key': API_KEY } }
          );
          if (oddsRes.ok) {
            const oddsData = await oddsRes.json();
            parseOddsResponse(oddsData.response || [], oddsMap);
          }
        } catch (e) {
          // silent
        }
      });
      await Promise.all(oddsPromises);
      if (i + 5 < fixtureIds.length) await new Promise(r => setTimeout(r, 300));
    }
    console.log(`✅ ${oddsMap.size} odds loaded across all markets`);

    // ── Step 7: Score ALL qualifying fixtures per market ───────────
    console.log('\n🧠 Step 7: Scoring fixtures with ML + Gaffer Brain...');
    const scoredByMarket: Record<Market, ScoredPick[]> = {
      over_2_5_goals: [],
      over_9_5_corners: [],
      over_3_5_cards: [],
    };

    for (const fixture of qualifyingFixtures) {
      // Use fuzzy map to resolve API-Football names → form table names
      const homeNorm = normalizeTeamName(fixture.home_team);
      const awayNorm = normalizeTeamName(fixture.away_team);
      const homeFuzzy = fixtureTeamMap.get(homeNorm) || homeNorm;
      const awayFuzzy = fixtureTeamMap.get(awayNorm) || awayNorm;
      const home = rollingMap.get(fixture.home_team) || rollingMap.get(homeNorm) || rollingMap.get(homeFuzzy);
      const away = rollingMap.get(fixture.away_team) || rollingMap.get(awayNorm) || rollingMap.get(awayFuzzy);
      if (!home && !away) continue;

      const defaultStats: RollingStats = {
        team_name: 'Unknown', avg_goals_scored: 1.3, avg_goals_conceded: 1.2,
        avg_total_goals: 2.5, over_25_goals_pct: 50, btts_pct: 50,
        avg_corners_for: 5, avg_corners_against: 5, avg_total_corners: 10,
        over_95_corners_pct: 45, avg_cards_for: 1.8, avg_cards_against: 1.8,
        avg_total_cards: 3.6, over_35_cards_pct: 40, over_45_cards_pct: 25,
        matches_used: 10,
      };

      const h = home || { ...defaultStats, team_name: fixture.home_team };
      const a = away || { ...defaultStats, team_name: fixture.away_team };
      const league = leagueMap.get(fixture.league) || defaultLeague;

      for (const market of ALL_MARKETS) {
        // Get ML probability
        let mlProb: number;
        const modelKey = MARKET_MODEL_KEYS[market];
        const model = modelMap.get(modelKey);

        if (model?.weights?.trees?.length > 0) {
          const features = buildMLFeatures(market, h, a);
          const { trees, base_score, learning_rate, feature_medians } = model.weights;
          const cleanFeatures = features.map((f: number, i: number) =>
            isNaN(f) ? (feature_medians?.[i] || 0) : f
          );
          mlProb = predictGBT(trees, base_score || 0, learning_rate || 0.05, cleanFeatures);
        } else {
          mlProb = heuristicProb(market, h, a);
        }

        // STRICT: require real odds ≥ MIN_ODDS — no estimated fallbacks
        const oddsEntry = oddsMap.get(`${fixture.fixture_id}_${market}`);
        if (!oddsEntry) continue; // skip fixtures without real odds
        if (oddsEntry.odds < MIN_ODDS) continue; // skip odds below 1.40

        const scored = scoreFixture(fixture, market, h, a, league, mlProb, oddsEntry.odds, oddsEntry.bookmaker);
        scoredByMarket[market].push(scored);
      }
    }

    // ── Step 8: Rank, deduplicate fixtures, and fill only missing slots per market ──
    console.log('\n🏆 Step 8: Filling missing Gold / Silver / Bronze slots per market...');
    const finalPicks: Array<ScoredPick & { tier: string }> = [];

    for (const market of ALL_MARKETS) {
      const alreadyHave = existingByMarket[market] || [];
      const needed = neededByMarket[market];

      if (needed <= 0) {
        console.log(`  ${MARKET_LABELS[market]}: already full (${alreadyHave.length}/3)`);
        continue;
      }

      const usedInMarket = new Set<string>(alreadyHave.map((r: any) => String(r.fixture_id)));
      // Winners-first: rank purely by composite score (form probability)
      const ranked = scoredByMarket[market]
        .sort((a, b) => b.composite_score - a.composite_score);

      const selected: ScoredPick[] = [];

      // Single pass: pick highest composite score fixtures regardless of value edge
      for (const c of ranked) {
        if (usedInMarket.has(c.fixture_id)) continue;
        selected.push(c);
        usedInMarket.add(c.fixture_id);
        if (selected.length >= needed) break;
      }

      console.log(`  ${MARKET_LABELS[market]}: ${ranked.length} candidates → selected ${selected.length}/${needed} top-up picks`);

      for (let i = 0; i < selected.length; i++) {
        const tier = TIER_LABELS[Math.min(alreadyHave.length + i, 2)];
        const pick = selected[i];
        console.log(`    ${tier}: ${pick.home_team} vs ${pick.away_team} | score=${(pick.composite_score * 100).toFixed(1)}% | odds=${pick.odds} | edge=${(pick.value_edge * 100).toFixed(1)}%`);
        finalPicks.push({ ...pick, tier });
      }
    }

    if (finalPicks.length === 0) {
      return new Response(JSON.stringify({
        success: false, message: 'No picks met the positive edge threshold', date: today,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Step 9: Store in golden_bet_history ────────────────────────
    console.log(`\n💾 Step 9: Storing ${finalPicks.length} picks...`);
    const rows = finalPicks.map((pick, idx) => {
      const tierPenalty = pick.tier === 'Gold' ? 0 : pick.tier === 'Silver' ? 0.001 : 0.002;
      const reasoning = buildGafferReasoning(
        pick.market, pick.home_team, pick.away_team,
        pick.composite_score, pick.implied_prob, pick.value_edge,
        pick.lambda, pick.poisson_prob, pick.bayes_prob, pick.kelly_frac, pick.z,
        pick.tier as typeof TIER_LABELS[number]
      );

      return {
        fixture_id: pick.fixture_id,
        home_team: pick.home_team,
        away_team: pick.away_team,
        league: pick.league,
        kickoff: pick.kickoff,
        market: pick.market,
        ml_confidence: Math.max(0, pick.composite_score - tierPenalty),
        bookmaker_odds: pick.odds,
        value_edge: pick.value_edge,
        gaffer_reasoning: reasoning,
        prediction_date: today,
        status: 'pending',
        stake: 10,
      };
    });

    const { error: insertError } = await supabase
      .from('golden_bet_history')
      .insert(rows);

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw insertError;
    }

    // ── Summary ───────────────────────────────────────────────────
    const summary: Record<string, any> = {};
    for (const pick of finalPicks) {
      if (!summary[pick.market]) summary[pick.market] = {};
      summary[pick.market][pick.tier.toLowerCase()] = {
        fixture: `${pick.home_team} vs ${pick.away_team}`,
        league: pick.league,
        odds: pick.odds,
        bookmaker: pick.bookmaker,
        composite_score: `${(pick.composite_score * 100).toFixed(1)}%`,
        edge: `${(pick.value_edge * 100).toFixed(1)}%`,
        ml_prob: `${(pick.ml_probability * 100).toFixed(1)}%`,
      };
    }

    console.log(`\n✅ AUTO DAILY PICKS COMPLETE — ${finalPicks.length} picks stored for ${today}`);
    console.log(`   Fixtures scanned: ${allFixtures.length}`);
    console.log(`   Form teams: ${formTeamSet.size}`);
    console.log(`   Qualifying fixtures: ${qualifyingFixtures.length}`);
    console.log(`   Picks stored: ${finalPicks.length}`);

    return new Response(JSON.stringify({
      success: true,
      date: today,
      picks_stored: finalPicks.length,
      fixtures_scanned: allFixtures.length,
      form_teams: formTeamSet.size,
      qualifying_fixtures: qualifyingFixtures.length,
      summary,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Auto Daily Picks error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

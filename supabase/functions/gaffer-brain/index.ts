import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * ══════════════════════════════════════════════════════════════════
 *  THE GAFFER'S MATHEMATICAL BRAIN  v1.0
 * ══════════════════════════════════════════════════════════════════
 *
 *  Each ML model (Corners / Goals / Cards) scores EVERY fixture for
 *  its own market.  This function receives those per-fixture scores
 *  and selects the mathematically strongest game per market using:
 *
 *  1. Poisson Distribution  — P(stat > threshold) from λ
 *  2. Bayesian Updating     — prior (league avg) + likelihood (team rolling)
 *  3. Kelly Criterion       — true confidence = (p·b − 1) / (b − 1)
 *  4. Z-Score vs League     — stdevs above the league baseline
 *  5. Composite Brain Score — weighted blend of all signals
 *
 *  Output: the single best fixture per market, fully annotated with
 *  the mathematical breakdown so the Gaffer can explain his reasoning.
 * ══════════════════════════════════════════════════════════════════
 */

// ── Poisson helpers ────────────────────────────────────────────────

/** Factorial (memoised) */
const factCache: number[] = [1];
function fact(n: number): number {
  for (let i = factCache.length; i <= n; i++) factCache[i] = factCache[i - 1] * i;
  return factCache[Math.min(n, 20)] ?? 2.43e18; // cap at 20!
}

/** P(X = k) for Poisson(λ) */
function poissonPMF(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.exp(-lambda) * Math.pow(lambda, k) / fact(k);
}

/** P(X > threshold) — e.g. P(goals > 2.5) = P(X ≥ 3) */
function poissonExceedProb(lambda: number, threshold: number): number {
  const floor = Math.floor(threshold); // e.g. 2 for threshold 2.5
  let cdf = 0;
  for (let k = 0; k <= floor; k++) cdf += poissonPMF(lambda, k);
  return Math.max(0, Math.min(1, 1 - cdf));
}

// ── Bayesian update ────────────────────────────────────────────────
/**
 * Bayesian posterior combining a league-level prior with team-level evidence.
 * Uses a simple Beta-Binomial conjugate approximation:
 *   posterior_p = (α_prior + successes) / (α_prior + β_prior + n_obs)
 *
 * @param leagueRate  league hit-rate  0..1
 * @param teamRate    team hit-rate    0..1  (from rolling_stats)
 * @param teamMatches number of matches the team rate is based on
 * @param priorStrength  how many "virtual matches" the league prior is worth
 */
function bayesianUpdate(
  leagueRate: number,
  teamRate: number,
  teamMatches: number,
  priorStrength = 10,
): number {
  const alpha0 = leagueRate * priorStrength;
  const beta0  = (1 - leagueRate) * priorStrength;
  const successes = teamRate * teamMatches;
  const posterior = (alpha0 + successes) / (alpha0 + beta0 + teamMatches);
  return Math.max(0, Math.min(1, posterior));
}

// ── Kelly Criterion ────────────────────────────────────────────────
/**
 * Full Kelly fraction: f* = (p·b − 1) / (b − 1)  where b = decimal odds − 1
 * Returns 0 if negative (no edge).  Capped at 0.5 (half-Kelly max).
 */
function kelly(prob: number, decimalOdds: number): number {
  if (decimalOdds <= 1) return 0;
  const b = decimalOdds - 1;
  const k = (prob * decimalOdds - 1) / b;
  return Math.max(0, Math.min(0.5, k));
}

// ── Z-Score ────────────────────────────────────────────────────────
function zScore(value: number, mean: number, std: number): number {
  if (std <= 0) return 0;
  return (value - mean) / std;
}

// ── Composite Brain Score ──────────────────────────────────────────
/**
 * Weights:
 *   35% ML probability     (from the caller's model)
 *   25% Poisson probability (mathematical first principles)
 *   20% Bayesian posterior  (prior + evidence)
 *   10% Kelly fraction      (normalised 0-1, capped at 0.5 → ×2)
 *   10% Z-score signal      (normalised; >2σ = top 2.5% of fixtures)
 */
function compositeScore(params: {
  mlProb: number;      // 0..1
  poissonProb: number; // 0..1
  bayesProb: number;   // 0..1
  kellyFrac: number;   // 0..0.5
  zScoreNorm: number;  // 0..1 (normalised)
}): number {
  const { mlProb, poissonProb, bayesProb, kellyFrac, zScoreNorm } = params;
  return (
    0.35 * mlProb +
    0.25 * poissonProb +
    0.20 * bayesProb +
    0.10 * Math.min(1, kellyFrac * 2) +   // 0.5 kelly → 1.0
    0.10 * zScoreNorm
  );
}

// ── Types ──────────────────────────────────────────────────────────

interface FixtureMLData {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string;
  // Per-market ML probability (0..1) — from the respective ML model
  ml_probability: number;
  // Bookmaker odds for this market
  odds: number;
  bookmaker?: string;
  // Rolling stats (used by the Gaffer's maths)
  home_rolling: RollingStats;
  away_rolling: RollingStats;
  league_stats: LeagueStats;
  h2h?: H2HData;
}

interface RollingStats {
  // Goals
  avg_goals_scored: number;
  avg_goals_conceded: number;
  over_25_goals_pct: number;      // 0..100
  btts_pct: number;
  // Corners
  avg_corners_for: number;
  avg_corners_against: number;
  over_95_corners_pct: number;
  // Cards
  avg_cards_for: number;
  avg_cards_against: number;
  over_35_cards_pct: number;
  over_45_cards_pct: number;
  matches_used: number;
}

interface LeagueStats {
  avg_total_goals: number;
  over_25_goals_pct: number;
  avg_total_corners: number;
  over_95_corners_pct: number;
  avg_total_cards: number;
  over_35_cards_pct: number;
  // Standard deviations (computed dynamically or provided)
  std_goals?: number;
  std_corners?: number;
  std_cards?: number;
}

interface H2HData {
  meetings: number;
  over_25_pct: number;
  over_95_corners_pct: number;
  over_35_cards_pct: number;
  avg_total_goals: number;
  avg_total_corners: number;
  avg_total_cards: number;
}

type Market = 'over_2_5_goals' | 'over_9_5_corners' | 'over_3_5_cards' | 'over_4_5_cards';

interface BrainResult {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  kickoff: string;
  market: Market;
  odds: number;
  bookmaker: string;
  // Scores
  ml_probability: number;
  poisson_probability: number;
  bayesian_probability: number;
  kelly_fraction: number;
  z_score: number;
  composite_score: number;      // 0..1 — the Gaffer's final ranking metric
  implied_prob: number;
  value_edge: number;           // composite_score − implied_prob
  // Human-readable maths breakdown
  math_breakdown: {
    lambda: number;
    poisson_readable: string;
    bayesian_readable: string;
    kelly_readable: string;
    z_score_readable: string;
    overall_verdict: string;
  };
  // The Gaffer's narrative
  gaffer_reasoning: string;
}

// ── Lambda estimator ───────────────────────────────────────────────
function estimateLambda(market: Market, home: RollingStats, away: RollingStats): number {
  switch (market) {
    case 'over_2_5_goals': {
      // Dixon-Coles-style λ: (home attack + away defence) / 2 for each side
      const homeAtt  = home.avg_goals_scored;
      const awayDef  = away.avg_goals_conceded;
      const awayAtt  = away.avg_goals_scored;
      const homeDef  = home.avg_goals_conceded;
      return ((homeAtt + awayDef) / 2) + ((awayAtt + homeDef) / 2);
    }
    case 'over_9_5_corners': {
      const homeAtt  = home.avg_corners_for;
      const awayDef  = away.avg_corners_against;
      const awayAtt  = away.avg_corners_for;
      const homeDef  = home.avg_corners_against;
      return ((homeAtt + awayDef) / 2) + ((awayAtt + homeDef) / 2);
    }
    case 'over_3_5_cards':
    case 'over_4_5_cards': {
      const homeCrd  = home.avg_cards_for;
      const awayCrd  = away.avg_cards_for;
      return homeCrd + awayCrd;
    }
  }
}

function getThreshold(market: Market): number {
  switch (market) {
    case 'over_2_5_goals':   return 2.5;
    case 'over_9_5_corners': return 9.5;
    case 'over_3_5_cards':   return 3.5;
    case 'over_4_5_cards':   return 4.5;
  }
}

function getLeagueAvgForMarket(market: Market, league: LeagueStats): number {
  switch (market) {
    case 'over_2_5_goals':   return (league.over_25_goals_pct || 50) / 100;
    case 'over_9_5_corners': return (league.over_95_corners_pct || 50) / 100;
    case 'over_3_5_cards':
    case 'over_4_5_cards':   return (league.over_35_cards_pct || 40) / 100;
  }
}

function getTeamRateForMarket(market: Market, home: RollingStats, away: RollingStats): { homeRate: number; awayRate: number } {
  switch (market) {
    case 'over_2_5_goals':
      return { homeRate: home.over_25_goals_pct / 100, awayRate: away.over_25_goals_pct / 100 };
    case 'over_9_5_corners':
      return { homeRate: home.over_95_corners_pct / 100, awayRate: away.over_95_corners_pct / 100 };
    case 'over_3_5_cards':
    case 'over_4_5_cards':
      return { homeRate: home.over_35_cards_pct / 100, awayRate: away.over_35_cards_pct / 100 };
  }
}

// ── H2H adjustment ─────────────────────────────────────────────────
function h2hAdjustment(market: Market, h2h: H2HData | undefined): number {
  if (!h2h || h2h.meetings < 2) return 0;
  switch (market) {
    case 'over_2_5_goals':   return (h2h.over_25_pct / 100 - 0.5) * 0.1;
    case 'over_9_5_corners': return (h2h.over_95_corners_pct / 100 - 0.5) * 0.1;
    case 'over_3_5_cards':
    case 'over_4_5_cards':   return (h2h.over_35_cards_pct / 100 - 0.5) * 0.1;
  }
}

// ── Main per-fixture analysis ──────────────────────────────────────
function analyseFixture(fixture: FixtureMLData, market: Market): BrainResult {
  const { home_rolling: home, away_rolling: away, league_stats: league, h2h } = fixture;

  // 1. Poisson
  const lambda = estimateLambda(market, home, away);
  const threshold = getThreshold(market);
  const poissonProb = poissonExceedProb(lambda, threshold);

  // 2. Bayesian update (home + away independently, then average)
  const leagueRate = getLeagueAvgForMarket(market, league);
  const { homeRate, awayRate } = getTeamRateForMarket(market, home, away);
  const bayesHome = bayesianUpdate(leagueRate, homeRate, home.matches_used);
  const bayesAway = bayesianUpdate(leagueRate, awayRate, away.matches_used);
  const bayesProb = (bayesHome * 0.55 + bayesAway * 0.45) + h2hAdjustment(market, h2h);

  // 3. Kelly
  const mlProb = fixture.ml_probability;
  const kellyFrac = kelly(mlProb, fixture.odds);

  // 4. Z-Score — how exceptional is the λ vs league average?
  const leagueAvgLambda = ((): number => {
    switch (market) {
      case 'over_2_5_goals':   return league.avg_total_goals || 2.6;
      case 'over_9_5_corners': return league.avg_total_corners || 10.0;
      case 'over_3_5_cards':
      case 'over_4_5_cards':   return league.avg_total_cards || 3.8;
    }
  })();
  const leagueStd = ((): number => {
    switch (market) {
      case 'over_2_5_goals':   return league.std_goals   || 1.1;
      case 'over_9_5_corners': return league.std_corners || 2.5;
      case 'over_3_5_cards':
      case 'over_4_5_cards':   return league.std_cards   || 1.4;
    }
  })();
  const z = zScore(lambda, leagueAvgLambda, leagueStd);
  // Normalise Z to 0..1 using sigmoid-like mapping (z=2 → ~0.95, z=0 → 0.5, z=-2 → 0.05)
  const zNorm = 1 / (1 + Math.exp(-z * 1.2));

  // 5. Composite
  const comp = compositeScore({ mlProb, poissonProb, bayesProb, kellyFrac, zScoreNorm: zNorm });

  const impliedProb = 1 / fixture.odds;
  const valueEdge = comp - impliedProb;

  // ── Human-readable breakdown ─────────────────────────────────────
  const thr = threshold;
  const poissonReadable = `λ=${lambda.toFixed(2)} → P(>${thr})=${(poissonProb * 100).toFixed(1)}%`;
  const bayesReadable   = `League prior ${(leagueRate * 100).toFixed(0)}% → posterior ${(bayesProb * 100).toFixed(1)}% (${home.matches_used + away.matches_used} team games)`;
  const kellyReadable   = kellyFrac > 0
    ? `Kelly = ${(kellyFrac * 100).toFixed(1)}% of bankroll — positive EV confirmed`
    : `Kelly = 0% — no mathematical edge at this price`;
  const zReadable       = `λ is ${z >= 0 ? '+' : ''}${z.toFixed(2)}σ vs league avg (${leagueAvgLambda.toFixed(1)})`;

  const verdictParts: string[] = [];
  if (poissonProb > 0.60) verdictParts.push(`Poisson strongly favours >${thr}`);
  if (bayesProb > 0.60) verdictParts.push(`Bayesian evidence is bullish`);
  if (kellyFrac > 0.10) verdictParts.push(`Kelly flags real value at ${fixture.odds}`);
  if (z > 1.5) verdictParts.push(`Fixture is ${z.toFixed(1)}σ above league norm — exceptional`);
  const verdict = verdictParts.length > 0 ? verdictParts.join('. ') + '.' : `Marginal mathematical edge (composite ${(comp * 100).toFixed(1)}%)`;

  // ── Gaffer narrative ─────────────────────────────────────────────
  const gafferLines: string[] = [];
  const marketLabel: Record<Market, string> = {
    'over_2_5_goals':   'Over 2.5 Goals',
    'over_9_5_corners': 'Over 9.5 Corners',
    'over_3_5_cards':   'Over 3.5 Cards',
    'over_4_5_cards':   'Over 4.5 Cards',
  };
  gafferLines.push(`🧮 ${marketLabel[market]}: ${fixture.home_team} vs ${fixture.away_team}`);
  gafferLines.push(`📐 ${poissonReadable}`);
  gafferLines.push(`📊 ${bayesReadable}`);
  gafferLines.push(`💰 ${kellyReadable}`);
  gafferLines.push(`📈 ${zReadable}`);
  gafferLines.push(`🎯 Brain score: ${(comp * 100).toFixed(1)}% vs bookies' ${(impliedProb * 100).toFixed(1)}% → edge ${valueEdge >= 0 ? '+' : ''}${(valueEdge * 100).toFixed(1)}%`);
  gafferLines.push(`⚡ ${verdict}`);

  return {
    fixture_id:           fixture.fixture_id,
    home_team:            fixture.home_team,
    away_team:            fixture.away_team,
    league:               fixture.league,
    kickoff:              fixture.kickoff,
    market,
    odds:                 fixture.odds,
    bookmaker:            fixture.bookmaker || 'unknown',
    ml_probability:       mlProb,
    poisson_probability:  parseFloat(poissonProb.toFixed(4)),
    bayesian_probability: parseFloat(bayesProb.toFixed(4)),
    kelly_fraction:       parseFloat(kellyFrac.toFixed(4)),
    z_score:              parseFloat(z.toFixed(3)),
    composite_score:      parseFloat(comp.toFixed(4)),
    implied_prob:         parseFloat(impliedProb.toFixed(4)),
    value_edge:           parseFloat(valueEdge.toFixed(4)),
    math_breakdown: {
      lambda:            parseFloat(lambda.toFixed(3)),
      poisson_readable:  poissonReadable,
      bayesian_readable: bayesReadable,
      kelly_readable:    kellyReadable,
      z_score_readable:  zReadable,
      overall_verdict:   verdict,
    },
    gaffer_reasoning: gafferLines.join('\n'),
  };
}

// ── DB helpers ─────────────────────────────────────────────────────
async function fetchLeagueStats(supabase: any, league: string): Promise<LeagueStats> {
  const { data } = await supabase
    .from('league_rolling_stats')
    .select('avg_total_goals, over_25_goals_pct, avg_total_corners, over_95_corners_pct, avg_total_cards, over_35_cards_pct')
    .ilike('league', `%${league}%`)
    .limit(1)
    .maybeSingle();

  return {
    avg_total_goals:    data?.avg_total_goals    ?? 2.6,
    over_25_goals_pct:  data?.over_25_goals_pct  ?? 52,
    avg_total_corners:  data?.avg_total_corners   ?? 10.0,
    over_95_corners_pct: data?.over_95_corners_pct ?? 50,
    avg_total_cards:    data?.avg_total_cards     ?? 3.8,
    over_35_cards_pct:  data?.over_35_cards_pct   ?? 42,
  };
}

async function fetchRollingStats(supabase: any, teamName: string): Promise<RollingStats | null> {
  const cols = [
    'avg_goals_scored', 'avg_goals_conceded', 'over_25_goals_pct', 'btts_pct',
    'avg_corners_for', 'avg_corners_against', 'over_95_corners_pct',
    'avg_cards_for', 'avg_cards_against', 'over_35_cards_pct', 'over_45_cards_pct',
    'matches_used',
  ].join(', ');

  const { data } = await supabase
    .from('team_rolling_stats')
    .select(cols)
    .ilike('team_name', `%${teamName}%`)
    .limit(1)
    .maybeSingle();

  return data ?? null;
}

async function fetchH2H(supabase: any, homeTeam: string, awayTeam: string): Promise<H2HData | null> {
  const { data } = await supabase
    .from('ml_training_data')
    .select('total_goals, total_corners, total_cards, over_25_hit, over_95_corners_hit, over_35_cards_hit')
    .or(
      `and(home_team.ilike.%${homeTeam}%,away_team.ilike.%${awayTeam}%),` +
      `and(home_team.ilike.%${awayTeam}%,away_team.ilike.%${homeTeam}%)`
    )
    .order('fixture_date', { ascending: false })
    .limit(6);

  const matches = data ?? [];
  if (matches.length < 2) return null;
  const n = matches.length;

  return {
    meetings:            n,
    over_25_pct:         Math.round(matches.filter((m: any) => m.over_25_hit).length / n * 100),
    over_95_corners_pct: Math.round(matches.filter((m: any) => m.over_95_corners_hit).length / n * 100),
    over_35_cards_pct:   Math.round(matches.filter((m: any) => m.over_35_cards_hit).length / n * 100),
    avg_total_goals:     matches.reduce((s: number, m: any) => s + (m.total_goals ?? 0), 0) / n,
    avg_total_corners:   matches.reduce((s: number, m: any) => s + (m.total_corners ?? 0), 0) / n,
    avg_total_cards:     matches.reduce((s: number, m: any) => s + (m.total_cards ?? 0), 0) / n,
  };
}

// ── Main serve ─────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    /**
     * Expected body:
     * {
     *   market: 'over_2_5_goals' | 'over_9_5_corners' | 'over_3_5_cards' | 'over_4_5_cards',
     *   candidates: Array<{
     *     fixture_id, home_team, away_team, league, kickoff,
     *     ml_probability,   // from ML model (0..1)
     *     odds,             // bookmaker decimal odds
     *     bookmaker?,       // bookmaker name
     *   }>
     * }
     *
     * The Gaffer fetches rolling stats + league stats + H2H for each candidate,
     * runs the full mathematical analysis, and returns the top-ranked pick plus
     * the full ranked list so the caller can see the reasoning.
     */
    const body = await req.json();
    const market: Market = body.market;
    const candidates: Array<{
      fixture_id: string;
      home_team: string;
      away_team: string;
      league: string;
      kickoff: string;
      ml_probability: number;
      odds: number;
      bookmaker?: string;
    }> = body.candidates || [];

    if (!market || !['over_2_5_goals', 'over_9_5_corners', 'over_3_5_cards', 'over_4_5_cards'].includes(market)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing market' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!candidates.length) {
      return new Response(JSON.stringify({ error: 'No candidates provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🧠 Gaffer Brain: analysing ${candidates.length} candidates for ${market}`);

    // Enrich candidates in parallel batches
    const enriched: FixtureMLData[] = [];
    const BATCH = 5;

    for (let i = 0; i < candidates.length; i += BATCH) {
      const batch = candidates.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (c) => {
          const [homeRolling, awayRolling, leagueStats, h2h] = await Promise.all([
            fetchRollingStats(supabase, c.home_team),
            fetchRollingStats(supabase, c.away_team),
            fetchLeagueStats(supabase, c.league),
            fetchH2H(supabase, c.home_team, c.away_team),
          ]);

          if (!homeRolling || !awayRolling) {
            console.warn(`⚠️ Missing rolling stats for ${c.home_team} vs ${c.away_team} — skipping`);
            return null;
          }

          return {
            ...c,
            home_rolling: homeRolling,
            away_rolling: awayRolling,
            league_stats: leagueStats,
            h2h: h2h ?? undefined,
          } as FixtureMLData;
        })
      );
      enriched.push(...results.filter((r): r is FixtureMLData => r !== null));
    }

    if (!enriched.length) {
      return new Response(JSON.stringify({ error: 'No candidates had sufficient data', market }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Run the Brain on every enriched candidate
    const scored: BrainResult[] = enriched
      .map(f => analyseFixture(f, market))
      .filter(r => r.value_edge > 0)                    // must have positive brain edge
      .sort((a, b) => b.composite_score - a.composite_score);

    const topPick = scored[0] ?? null;

    console.log(`✅ Brain complete: ${scored.length}/${enriched.length} fixtures have positive edge`);
    if (topPick) {
      console.log(`🏆 Top pick: ${topPick.home_team} vs ${topPick.away_team} | score=${(topPick.composite_score * 100).toFixed(1)}% | edge=${(topPick.value_edge * 100).toFixed(1)}%`);
    }

    return new Response(JSON.stringify({
      success: true,
      market,
      candidates_received: candidates.length,
      candidates_scored: scored.length,
      top_pick: topPick,
      ranked_list: scored.slice(0, 10).map(r => ({
        fixture:         `${r.home_team} vs ${r.away_team}`,
        league:          r.league,
        composite_score: parseFloat((r.composite_score * 100).toFixed(1)),
        ml_prob:         parseFloat((r.ml_probability * 100).toFixed(1)),
        poisson_prob:    parseFloat((r.poisson_probability * 100).toFixed(1)),
        bayes_prob:      parseFloat((r.bayesian_probability * 100).toFixed(1)),
        kelly_pct:       parseFloat((r.kelly_fraction * 100).toFixed(1)),
        z_score:         r.z_score,
        odds:            r.odds,
        edge_pct:        parseFloat((r.value_edge * 100).toFixed(1)),
        lambda:          r.math_breakdown.lambda,
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Gaffer Brain Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

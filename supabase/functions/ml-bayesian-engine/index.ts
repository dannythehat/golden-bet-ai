import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= STATISTICAL ENGINE =============
// Uses Bayesian updating with league priors + team-specific adjustments
// This is MORE accurate than ML for football because it respects base rates

interface LeagueStats {
  league: string;
  matches: number;
  over25Rate: number;
  bttsRate: number;
  cornersRate: number;
  cardsRate: number;
}

interface TeamAdjustment {
  goalsFactor: number; // multiplier vs league average
  bttsAdjust: number;  // additive adjustment
  cornersAdjust: number;
  cardsAdjust: number;
}

// Poisson probability calculations
function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= Math.min(n, 20); i++) result *= i;
  return result;
}

function poissonPMF(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function poissonCDF(lambda: number, upTo: number): number {
  let sum = 0;
  for (let k = 0; k <= Math.floor(upTo); k++) {
    sum += poissonPMF(lambda, k);
  }
  return sum;
}

// Calculate probability of Over X goals using Poisson
function calcOverGoalsProb(homeExpected: number, awayExpected: number, threshold: number): number {
  // Sum of two independent Poissons
  let probUnder = 0;
  for (let h = 0; h <= Math.floor(threshold); h++) {
    for (let a = 0; a <= Math.floor(threshold) - h; a++) {
      if (h + a <= threshold) {
        probUnder += poissonPMF(homeExpected, h) * poissonPMF(awayExpected, a);
      }
    }
  }
  return 1 - probUnder;
}

// Calculate BTTS probability
function calcBttsProb(homeExpected: number, awayExpected: number): number {
  const homeScores = 1 - poissonPMF(homeExpected, 0);
  const awayScores = 1 - poissonPMF(awayExpected, 0);
  return homeScores * awayScores;
}

// Kelly Criterion for optimal bet sizing
function kellyStake(winProb: number, odds: number, fraction: number = 0.25): number {
  const q = 1 - winProb;
  const b = odds - 1;
  const kelly = (winProb * b - q) / b;
  return Math.max(0, Math.min(kelly * fraction, 0.05)); // Max 5% of bankroll
}

// Calculate value edge
function calcValueEdge(modelProb: number, impliedProb: number): number {
  return (modelProb / impliedProb) - 1;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action = "analyze", fixtures = [] } = await req.json().catch(() => ({}));

    // ========== ACTION: Get league base rates ==========
    if (action === "get_league_stats") {
      const { data: leagueData, error } = await supabase
        .from("ml_training_data")
        .select("league, over_25_hit, btts_hit, over_95_corners_hit, over_35_cards_hit")
        .gte("fixture_date", "2023-01-01");

      if (error) throw new Error(`League stats error: ${error.message}`);

      // Aggregate by league
      const leagueMap = new Map<string, { 
        total: number; 
        over25: number; 
        btts: number; 
        corners: number; 
        cards: number 
      }>();

      for (const row of leagueData || []) {
        const league = row.league;
        if (!leagueMap.has(league)) {
          leagueMap.set(league, { total: 0, over25: 0, btts: 0, corners: 0, cards: 0 });
        }
        const stats = leagueMap.get(league)!;
        stats.total++;
        if (row.over_25_hit) stats.over25++;
        if (row.btts_hit) stats.btts++;
        if (row.over_95_corners_hit) stats.corners++;
        if (row.over_35_cards_hit) stats.cards++;
      }

      const leagueStats: LeagueStats[] = [];
      leagueMap.forEach((stats, league) => {
        if (stats.total >= 100) {
          leagueStats.push({
            league,
            matches: stats.total,
            over25Rate: stats.over25 / stats.total,
            bttsRate: stats.btts / stats.total,
            cornersRate: stats.corners / stats.total,
            cardsRate: stats.cards / stats.total
          });
        }
      });

      return new Response(
        JSON.stringify({ success: true, leagues: leagueStats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== ACTION: Analyze fixtures with Bayesian approach ==========
    if (action === "analyze") {
      // First, get league base rates
      const { data: leagueData } = await supabase
        .from("ml_training_data")
        .select("league, over_25_hit, btts_hit, over_95_corners_hit, over_35_cards_hit, home_avg_goals, away_avg_goals")
        .gte("fixture_date", "2023-01-01");

      // Calculate league priors
      const leaguePriors = new Map<string, {
        over25: number;
        btts: number;
        corners: number;
        cards: number;
        avgGoalsHome: number;
        avgGoalsAway: number;
        count: number;
      }>();

      for (const row of leagueData || []) {
        if (!leaguePriors.has(row.league)) {
          leaguePriors.set(row.league, {
            over25: 0, btts: 0, corners: 0, cards: 0,
            avgGoalsHome: 0, avgGoalsAway: 0, count: 0
          });
        }
        const p = leaguePriors.get(row.league)!;
        p.count++;
        if (row.over_25_hit) p.over25++;
        if (row.btts_hit) p.btts++;
        if (row.over_95_corners_hit) p.corners++;
        if (row.over_35_cards_hit) p.cards++;
        p.avgGoalsHome += row.home_avg_goals || 0;
        p.avgGoalsAway += row.away_avg_goals || 0;
      }

      // Finalize priors
      leaguePriors.forEach((p) => {
        if (p.count > 0) {
          p.over25 /= p.count;
          p.btts /= p.count;
          p.corners /= p.count;
          p.cards /= p.count;
          p.avgGoalsHome /= p.count;
          p.avgGoalsAway /= p.count;
        }
      });

      // Global average as fallback
      const globalPrior = {
        over25: 0.50,
        btts: 0.48,
        corners: 0.08,
        cards: 0.12,
        avgGoalsHome: 1.4,
        avgGoalsAway: 1.1
      };

      // Analyze each fixture
      const predictions = [];

      for (const fixture of fixtures) {
        const { 
          homeTeam, 
          awayTeam, 
          league,
          homeGoalsAvg = 0,
          awayGoalsAvg = 0,
          homeOver25Pct = 0,
          awayOver25Pct = 0,
          homeBttsPct = 0,
          awayBttsPct = 0,
          homeCornersPct = 0,
          awayCornersPct = 0,
          homeCardsPct = 0,
          awayCardsPct = 0,
          bookmakerOdds = {}
        } = fixture;

        // Get league prior or use global
        const prior = leaguePriors.get(league) || globalPrior;

        // ===== OVER 2.5 GOALS =====
        // Bayesian update: combine league prior with team-specific data
        const expectedHomeGoals = homeGoalsAvg > 0 
          ? (homeGoalsAvg * 0.7 + prior.avgGoalsHome * 0.3)  // 70% team, 30% league
          : prior.avgGoalsHome;
        
        const expectedAwayGoals = awayGoalsAvg > 0
          ? (awayGoalsAvg * 0.7 + prior.avgGoalsAway * 0.3)
          : prior.avgGoalsAway;

        const poissonOver25 = calcOverGoalsProb(expectedHomeGoals, expectedAwayGoals, 2.5);
        
        // Combine Poisson with historical rates (weighted average)
        const teamOver25Avg = (homeOver25Pct + awayOver25Pct) / 2 / 100;
        const over25Prob = teamOver25Avg > 0
          ? poissonOver25 * 0.6 + teamOver25Avg * 0.3 + prior.over25 * 0.1
          : poissonOver25 * 0.7 + prior.over25 * 0.3;

        // ===== BTTS =====
        const poissonBtts = calcBttsProb(expectedHomeGoals, expectedAwayGoals);
        const teamBttsAvg = (homeBttsPct + awayBttsPct) / 2 / 100;
        const bttsProb = teamBttsAvg > 0
          ? poissonBtts * 0.5 + teamBttsAvg * 0.4 + prior.btts * 0.1
          : poissonBtts * 0.7 + prior.btts * 0.3;

        // ===== CORNERS =====
        const teamCornersAvg = (homeCornersPct + awayCornersPct) / 2 / 100;
        const cornersProb = teamCornersAvg > 0
          ? teamCornersAvg * 0.7 + prior.corners * 0.3
          : prior.corners;

        // ===== CARDS =====
        const teamCardsAvg = (homeCardsPct + awayCardsPct) / 2 / 100;
        const cardsProb = teamCardsAvg > 0
          ? teamCardsAvg * 0.7 + prior.cards * 0.3
          : prior.cards;

        // Calculate value edges if odds provided
        const markets = {
          over_25_goals: {
            probability: Math.min(over25Prob, 0.95),
            confidence: Math.abs(over25Prob - 0.5) * 2, // Distance from 50%
            odds: bookmakerOdds.over25 || null,
            valueEdge: bookmakerOdds.over25 
              ? calcValueEdge(over25Prob, 1 / bookmakerOdds.over25)
              : null,
            kelly: bookmakerOdds.over25
              ? kellyStake(over25Prob, bookmakerOdds.over25)
              : null
          },
          btts: {
            probability: Math.min(bttsProb, 0.95),
            confidence: Math.abs(bttsProb - 0.5) * 2,
            odds: bookmakerOdds.btts || null,
            valueEdge: bookmakerOdds.btts
              ? calcValueEdge(bttsProb, 1 / bookmakerOdds.btts)
              : null,
            kelly: bookmakerOdds.btts
              ? kellyStake(bttsProb, bookmakerOdds.btts)
              : null
          },
          over_95_corners: {
            probability: Math.min(cornersProb, 0.95),
            confidence: Math.abs(cornersProb - 0.5) * 2,
            odds: bookmakerOdds.corners || null,
            valueEdge: bookmakerOdds.corners
              ? calcValueEdge(cornersProb, 1 / bookmakerOdds.corners)
              : null,
            kelly: bookmakerOdds.corners
              ? kellyStake(cornersProb, bookmakerOdds.corners)
              : null
          },
          over_35_cards: {
            probability: Math.min(cardsProb, 0.95),
            confidence: Math.abs(cardsProb - 0.5) * 2,
            odds: bookmakerOdds.cards || null,
            valueEdge: bookmakerOdds.cards
              ? calcValueEdge(cardsProb, 1 / bookmakerOdds.cards)
              : null,
            kelly: bookmakerOdds.cards
              ? kellyStake(cardsProb, bookmakerOdds.cards)
              : null
          }
        };

        // Find best value bet for this fixture
        const allBets = Object.entries(markets)
          .filter(([_, m]) => m.valueEdge !== null && m.valueEdge > 0.1)
          .map(([market, m]) => ({ market, ...m }))
          .sort((a, b) => (b.valueEdge || 0) - (a.valueEdge || 0));

        predictions.push({
          homeTeam,
          awayTeam,
          league,
          leaguePrior: {
            over25: (prior.over25 * 100).toFixed(1) + "%",
            btts: (prior.btts * 100).toFixed(1) + "%",
            avgGoals: (prior.avgGoalsHome + prior.avgGoalsAway).toFixed(2)
          },
          expectedGoals: {
            home: expectedHomeGoals.toFixed(2),
            away: expectedAwayGoals.toFixed(2),
            total: (expectedHomeGoals + expectedAwayGoals).toFixed(2)
          },
          markets,
          bestValueBet: allBets[0] || null,
          allValueBets: allBets
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          method: "bayesian_poisson",
          description: "Combines league base rates (prior) with team-specific Poisson modeling",
          predictions 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== ACTION: Backtest accuracy ==========
    if (action === "backtest") {
      const { market = "over_2.5_goals", sampleSize = 2000 } = await req.json().catch(() => ({}));

      // Get recent fixtures with outcomes
      const { data: testData, error } = await supabase
        .from("ml_training_data")
        .select("*")
        .not("over_25_hit", "is", null)
        .order("fixture_date", { ascending: false })
        .limit(sampleSize);

      if (error) throw new Error(`Backtest error: ${error.message}`);

      // Get league priors from older data
      const { data: priorData } = await supabase
        .from("ml_training_data")
        .select("league, over_25_hit, btts_hit, home_avg_goals, away_avg_goals")
        .lt("fixture_date", testData?.[testData.length - 1]?.fixture_date || "2024-01-01");

      const leaguePriors = new Map<string, { over25: number; btts: number; homeGoals: number; awayGoals: number; count: number }>();
      for (const row of priorData || []) {
        if (!leaguePriors.has(row.league)) {
          leaguePriors.set(row.league, { over25: 0, btts: 0, homeGoals: 0, awayGoals: 0, count: 0 });
        }
        const p = leaguePriors.get(row.league)!;
        p.count++;
        if (row.over_25_hit) p.over25++;
        if (row.btts_hit) p.btts++;
        p.homeGoals += row.home_avg_goals || 0;
        p.awayGoals += row.away_avg_goals || 0;
      }

      leaguePriors.forEach(p => {
        if (p.count > 0) {
          p.over25 /= p.count;
          p.btts /= p.count;
          p.homeGoals /= p.count;
          p.awayGoals /= p.count;
        }
      });

      // Backtest
      let correct = 0;
      let total = 0;
      let highConfCorrect = 0;
      let highConfTotal = 0;

      const globalPrior = { over25: 0.50, btts: 0.48, homeGoals: 1.4, awayGoals: 1.1 };

      for (const row of testData || []) {
        const prior = leaguePriors.get(row.league) || globalPrior;
        
        const homeGoals = row.home_avg_goals || prior.homeGoals;
        const awayGoals = row.away_avg_goals || prior.awayGoals;
        
        const poissonProb = calcOverGoalsProb(homeGoals, awayGoals, 2.5);
        const teamAvg = ((row.home_over25_pct || 0) + (row.away_over25_pct || 0)) / 2 / 100;
        
        const prob = teamAvg > 0
          ? poissonProb * 0.6 + teamAvg * 0.3 + prior.over25 * 0.1
          : poissonProb * 0.7 + prior.over25 * 0.3;

        const prediction = prob > 0.5 ? 1 : 0;
        const actual = row.over_25_hit ? 1 : 0;

        if (prediction === actual) correct++;
        total++;

        // High confidence predictions (>60% or <40%)
        if (prob > 0.60 || prob < 0.40) {
          if (prediction === actual) highConfCorrect++;
          highConfTotal++;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          backtest: {
            market,
            total_predictions: total,
            correct: correct,
            accuracy: (correct / total * 100).toFixed(1) + "%",
            high_confidence: {
              total: highConfTotal,
              correct: highConfCorrect,
              accuracy: highConfTotal > 0 ? (highConfCorrect / highConfTotal * 100).toFixed(1) + "%" : "N/A"
            }
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );

  } catch (error) {
    console.error("[Bayesian Engine] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

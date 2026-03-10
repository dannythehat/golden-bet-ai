import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';

/**
 * Match Power Scores Engine v2
 * 
 * Computes a 0-100 power score per market for every fixture playing today
 * using venue-specific L10 rolling stats + intelligence layers.
 * 
 * Base formula per market (sums to ~85 before intelligence):
 *   35% — Overall L10 combined stat
 *   25% — Venue-specific stat (home form at home, away form away)
 *   15% — Hit-rate percentage
 *   10% — Volume/form quality bonus
 * 
 * Intelligence layers (up to ±15 adjustment):
 *   xG Regression   — penalize overperformers (goals > xG), boost underperformers
 *   Injury Impact   — penalize when key players missing (scaled by count)
 *   Referee Bias     — boost/penalize cards score based on ref strictness
 */

// ═══════════════════════════════════════════
// POWER SCORE FORMULAS
// ═══════════════════════════════════════════

interface RollingStats {
  team_name: string;
  matches_used: number;
  // Overall
  avg_goals_scored: number;
  avg_goals_conceded: number;
  avg_total_goals: number;
  over_25_goals_pct: number;
  btts_pct: number;
  avg_corners_for: number;
  avg_corners_against: number;
  avg_total_corners: number;
  over_95_corners_pct: number;
  avg_cards_for: number;
  avg_cards_against: number;
  avg_total_cards: number;
  over_35_cards_pct: number;
  avg_shots_for: number;
  avg_xg_for: number;
  avg_xg_against: number;
  // Home venue
  home_avg_goals_scored: number;
  home_avg_goals_conceded: number;
  home_avg_total_goals: number;
  home_over_25_goals_pct: number;
  home_btts_pct: number;
  home_avg_total_corners: number;
  home_over_95_corners_pct: number;
  home_avg_total_cards: number;
  home_over_35_cards_pct: number;
  home_avg_corners_for: number;
  home_avg_corners_against: number;
  home_avg_cards_for: number;
  home_avg_cards_against: number;
  // Away venue
  away_avg_goals_scored: number;
  away_avg_goals_conceded: number;
  away_avg_total_goals: number;
  away_over_25_goals_pct: number;
  away_btts_pct: number;
  away_avg_total_corners: number;
  away_over_95_corners_pct: number;
  away_avg_total_cards: number;
  away_over_35_cards_pct: number;
  away_avg_corners_for: number;
  away_avg_corners_against: number;
  away_avg_cards_for: number;
  away_avg_cards_against: number;
}

interface MatchIntel {
  fixture_id: string;
  home_injury_count: number | null;
  away_injury_count: number | null;
  home_key_players_out: string[] | null;
  away_key_players_out: string[] | null;
  referee_avg_cards: number | null;
  referee_name: string | null;
}

const safe = (v: any, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Clamp to 0-100
const clamp100 = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

// Scale a raw value to 0-100 given expected min/max range
const scale = (value: number, min: number, max: number): number => {
  if (max <= min) return 50;
  return clamp100(((value - min) / (max - min)) * 100);
};

interface ScoreBreakdown {
  overall_avg: number;
  venue_avg: number;
  hit_rate: number;
  quality_bonus: number;
}

// ═══════════════════════════════════════════
// INTELLIGENCE LAYER ADJUSTMENTS
// ═══════════════════════════════════════════

/**
 * xG Regression: Teams scoring well above xG are "lucky" and due regression.
 * Teams below xG are "unlucky" and due goals. Adjusts goals/BTTS scores.
 * Returns adjustment from -8 to +8.
 */
function xgRegressionAdjustment(home: RollingStats, away: RollingStats): { adjustment: number; detail: string } {
  const homeGoals = safe(home.avg_goals_scored);
  const homeXg = safe(home.avg_xg_for);
  const awayGoals = safe(away.avg_goals_scored);
  const awayXg = safe(away.avg_xg_for);

  // Skip if no xG data
  if (homeXg === 0 && awayXg === 0) return { adjustment: 0, detail: 'no_xg_data' };

  // Positive delta = scoring above xG (lucky), negative = below (unlucky/due)
  const homeDelta = homeXg > 0 ? (homeGoals - homeXg) : 0;
  const awayDelta = awayXg > 0 ? (awayGoals - awayXg) : 0;
  const combinedDelta = homeDelta + awayDelta;

  // If both teams overperform xG by >0.3 goals combined → penalize (regression likely)
  // If both underperform → boost (goals are "owed")
  // Range: roughly -1.0 to +1.0 typical, scale to -8..+8
  const adjustment = Math.max(-8, Math.min(8, Math.round(-combinedDelta * 6)));

  const direction = adjustment > 0 ? 'boost (underperforming xG, goals due)' 
    : adjustment < 0 ? 'penalty (overperforming xG, regression risk)' 
    : 'neutral';

  return { 
    adjustment, 
    detail: `home_delta=${homeDelta.toFixed(2)}, away_delta=${awayDelta.toFixed(2)}, ${direction}` 
  };
}

/**
 * Injury Impact: Penalize score when teams have significant absences.
 * 3+ injuries = -3, 5+ = -5, key players out = extra -2 each.
 * Returns adjustment from -10 to 0.
 */
function injuryAdjustment(intel: MatchIntel | null): { adjustment: number; detail: string } {
  if (!intel) return { adjustment: 0, detail: 'no_intel_data' };

  let penalty = 0;
  const homeInj = safe(intel.home_injury_count);
  const awayInj = safe(intel.away_injury_count);
  const totalInj = homeInj + awayInj;

  // General injury volume penalty
  if (totalInj >= 8) penalty -= 5;
  else if (totalInj >= 5) penalty -= 3;
  else if (totalInj >= 3) penalty -= 1;

  // Key players out = extra penalty
  const homeKey = intel.home_key_players_out?.length || 0;
  const awayKey = intel.away_key_players_out?.length || 0;
  penalty -= Math.min(5, (homeKey + awayKey) * 2);

  const adj = Math.max(-10, penalty);
  return { 
    adjustment: adj, 
    detail: `injuries=${totalInj}, key_out=${homeKey + awayKey}, penalty=${adj}` 
  };
}

/**
 * Referee Bias: Strict refs (>4.5 avg cards) boost cards score,
 * lenient refs (<3.0) penalize it. Only affects cards market.
 * Returns adjustment from -7 to +7.
 */
function refereeBiasAdjustment(intel: MatchIntel | null): { adjustment: number; detail: string } {
  if (!intel || !intel.referee_avg_cards) return { adjustment: 0, detail: 'no_ref_data' };

  const refCards = safe(intel.referee_avg_cards);
  // Average ref = ~3.5-4.0 cards. Scale deviation to adjustment.
  const deviation = refCards - 3.75;
  const adjustment = Math.max(-7, Math.min(7, Math.round(deviation * 4)));

  const label = refCards >= 4.5 ? 'strict' : refCards <= 3.0 ? 'lenient' : 'average';
  return { 
    adjustment, 
    detail: `ref=${intel.referee_name || 'unknown'}, avg_cards=${refCards.toFixed(1)} (${label})` 
  };
}

function computeGoalsScore(home: RollingStats, away: RollingStats): { score: number; breakdown: ScoreBreakdown } {
  // Overall: combined avg total goals (range ~1.5 to 4.0, sweet spot > 2.8)
  const overallAvg = (safe(home.avg_total_goals) + safe(away.avg_total_goals)) / 2;
  const overallComponent = scale(overallAvg, 1.5, 4.0);
  
  // Venue-specific: home team's HOME avg + away team's AWAY avg
  const venueGoals = safe(home.home_avg_total_goals, home.avg_total_goals) / 2 
    + safe(away.away_avg_total_goals, away.avg_total_goals) / 2;
  // Use scoring rates: home team scoring at home + away team scoring away
  const venueScoring = safe(home.home_avg_goals_scored, home.avg_goals_scored)
    + safe(away.away_avg_goals_scored, away.avg_goals_scored);
  const venueComponent = scale(venueScoring, 1.0, 3.5);
  
  // Hit rate: average O2.5% using venue-specific
  const homeHit = safe(home.home_over_25_goals_pct, home.over_25_goals_pct);
  const awayHit = safe(away.away_over_25_goals_pct, away.over_25_goals_pct);
  const hitRate = (homeHit + awayHit) / 2;
  const hitComponent = scale(hitRate, 30, 80);
  
  // Quality bonus: both teams must be decent scorers (penalize if either is weak)
  const weakest = Math.min(safe(home.avg_goals_scored), safe(away.avg_goals_scored));
  const qualityBonus = scale(weakest, 0.5, 2.0);
  
  const score = clamp100(
    overallComponent * 0.40 +
    venueComponent * 0.30 +
    hitComponent * 0.20 +
    qualityBonus * 0.10
  );
  
  return { score, breakdown: { overall_avg: overallComponent, venue_avg: venueComponent, hit_rate: hitComponent, quality_bonus: qualityBonus } };
}

function computeBTTSScore(home: RollingStats, away: RollingStats): { score: number; breakdown: ScoreBreakdown } {
  // Overall: both teams' BTTS% average
  const overallBtts = (safe(home.btts_pct) + safe(away.btts_pct)) / 2;
  const overallComponent = scale(overallBtts, 30, 75);
  
  // Venue-specific BTTS
  const homeBtts = safe(home.home_btts_pct, home.btts_pct);
  const awayBtts = safe(away.away_btts_pct, away.btts_pct);
  const venueComponent = scale((homeBtts + awayBtts) / 2, 30, 75);
  
  // Scoring reliability: both teams must score regularly
  const homeScoring = safe(home.home_avg_goals_scored, home.avg_goals_scored);
  const awayScoring = safe(away.away_avg_goals_scored, away.avg_goals_scored);
  const hitComponent = scale(Math.min(homeScoring, awayScoring), 0.5, 1.8);
  
  // Quality: penalize if either team has high clean sheet rate (via goals conceded)
  const homeConc = safe(home.home_avg_goals_conceded, home.avg_goals_conceded);
  const awayConc = safe(away.away_avg_goals_conceded, away.avg_goals_conceded);
  const qualityBonus = scale(Math.min(homeConc, awayConc), 0.3, 1.8);
  
  const score = clamp100(
    overallComponent * 0.40 +
    venueComponent * 0.30 +
    hitComponent * 0.20 +
    qualityBonus * 0.10
  );
  
  return { score, breakdown: { overall_avg: overallComponent, venue_avg: venueComponent, hit_rate: hitComponent, quality_bonus: qualityBonus } };
}

function computeCornersScore(home: RollingStats, away: RollingStats): { score: number; breakdown: ScoreBreakdown } {
  // Overall combined corners
  const overallCorners = (safe(home.avg_total_corners) + safe(away.avg_total_corners)) / 2;
  const overallComponent = scale(overallCorners, 7, 14);
  
  // Venue-specific corners
  const homeCorners = safe(home.home_avg_total_corners, home.avg_total_corners);
  const awayCorners = safe(away.away_avg_total_corners, away.avg_total_corners);
  const venueComponent = scale((homeCorners + awayCorners) / 2, 7, 14);
  
  // Hit rate O9.5
  const homeHit = safe(home.home_over_95_corners_pct, home.over_95_corners_pct);
  const awayHit = safe(away.away_over_95_corners_pct, away.over_95_corners_pct);
  const hitComponent = scale((homeHit + awayHit) / 2, 25, 70);
  
  // Quality: shots drive corners — teams that shoot a lot force corners
  const shotActivity = safe(home.avg_shots_for) + safe(away.avg_shots_for);
  const qualityBonus = scale(shotActivity, 15, 35);
  
  const score = clamp100(
    overallComponent * 0.40 +
    venueComponent * 0.30 +
    hitComponent * 0.20 +
    qualityBonus * 0.10
  );
  
  return { score, breakdown: { overall_avg: overallComponent, venue_avg: venueComponent, hit_rate: hitComponent, quality_bonus: qualityBonus } };
}

function computeCardsScore(home: RollingStats, away: RollingStats): { score: number; breakdown: ScoreBreakdown } {
  // Overall combined cards
  const overallCards = (safe(home.avg_total_cards) + safe(away.avg_total_cards)) / 2;
  const overallComponent = scale(overallCards, 2.5, 6.0);
  
  // Venue-specific cards
  const homeCards = safe(home.home_avg_total_cards, home.avg_total_cards);
  const awayCards = safe(away.away_avg_total_cards, away.avg_total_cards);
  const venueComponent = scale((homeCards + awayCards) / 2, 2.5, 6.0);
  
  // Hit rate O3.5
  const homeHit = safe(home.home_over_35_cards_pct, home.over_35_cards_pct);
  const awayHit = safe(away.away_over_35_cards_pct, away.over_35_cards_pct);
  const hitComponent = scale((homeHit + awayHit) / 2, 30, 75);
  
  // Quality: card-heavy teams (their own cards_for)
  const cardProne = safe(home.avg_cards_for) + safe(away.avg_cards_for);
  const qualityBonus = scale(cardProne, 1.5, 4.0);
  
  const score = clamp100(
    overallComponent * 0.40 +
    venueComponent * 0.30 +
    hitComponent * 0.20 +
    qualityBonus * 0.10
  );
  
  return { score, breakdown: { overall_avg: overallComponent, venue_avg: venueComponent, hit_rate: hitComponent, quality_bonus: qualityBonus } };
}

// ═══════════════════════════════════════════
// EXCLUDED LEAGUES/TEAMS
// ═══════════════════════════════════════════

const EXCLUDED_PATTERNS = [
  'women', 'woman', 'femenina', 'féminine', 'feminin', 'frauen', 'vrouwen',
  'damer', 'damas', 'feminine', 'feminino', 'ladies', 'female', 'girl',
  'wsl', 'nwsl', 'fawc', 'uwcl',
  'u15', 'u16', 'u17', 'u18', 'u19', 'u20', 'u21', 'u23',
  'youth', 'junior', 'academy', 'reserve', 'development', 'pl2',
  'friendly', 'friendlies', 'club friendly', 'amateur', 'regional',
];

function isExcluded(name: string): boolean {
  const lower = name.toLowerCase();
  return EXCLUDED_PATTERNS.some(p => lower.includes(p));
}

// ═══════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    console.log(`⚡ Computing Match Power Scores for ${today}`);

    // 1. Check if already computed today
    const { data: existing } = await supabase
      .from('match_power_scores')
      .select('id')
      .eq('computed_date', today)
      .limit(1);

    if (existing && existing.length > 0) {
      // Return existing scores
      const { data: scores } = await supabase
        .from('match_power_scores')
        .select('*')
        .eq('computed_date', today)
        .order('best_score', { ascending: false });

      console.log(`📦 Returning ${scores?.length || 0} cached power scores`);
      return new Response(JSON.stringify({ 
        success: true, 
        cached: true,
        date: today, 
        fixtures_scored: scores?.length || 0, 
        scores 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch today's fixtures from API-Football
    if (!apiKey) throw new Error("API_FOOTBALL_KEY not configured");

    const fixturesRes = await fetch(
      `${API_FOOTBALL_BASE}/fixtures?date=${today}&timezone=UTC`,
      { headers: { 'x-apisports-key': apiKey } }
    );
    
    if (!fixturesRes.ok) throw new Error(`Fixtures API error: ${fixturesRes.status}`);
    const fixturesData = await fixturesRes.json();
    const allFixtures = fixturesData.response || [];
    
    // Filter to valid fixtures only
    const fixtures = allFixtures.filter((f: any) => {
      const leagueName = f.league?.name || '';
      const homeTeam = f.teams?.home?.name || '';
      const awayTeam = f.teams?.away?.name || '';
      const kickoff = f.fixture?.date;
      if (!kickoff || new Date(kickoff) < new Date()) return false;
      if (isExcluded(leagueName) || isExcluded(homeTeam) || isExcluded(awayTeam)) return false;
      if (/\bw\b/i.test(homeTeam) || /\bw\b/i.test(awayTeam)) return false;
      return true;
    });

    console.log(`📅 ${fixtures.length} valid fixtures from ${allFixtures.length} total`);

    // 3. Load ALL team rolling stats in one query
    const { data: allStats, error: statsError } = await supabase
      .from('team_rolling_stats')
      .select('*')
      .gte('matches_used', 5);

    if (statsError) throw new Error(`Stats fetch error: ${statsError.message}`);
    
    const statsMap = new Map<string, RollingStats>();
    for (const row of (allStats || [])) {
      const key = (row.team_name || '').trim().toLowerCase();
      if (key) statsMap.set(key, row as RollingStats);
    }
    console.log(`📊 Loaded ${statsMap.size} team rolling stats`);

    // 3b. Load match intelligence for today (injuries, referee data)
    const { data: intelData } = await supabase
      .from('match_intelligence')
      .select('fixture_id, home_injury_count, away_injury_count, home_key_players_out, away_key_players_out, referee_avg_cards, referee_name')
      .eq('fixture_date', today);

    const intelMap = new Map<string, MatchIntel>();
    for (const row of (intelData || [])) {
      intelMap.set(String(row.fixture_id), row as MatchIntel);
    }
    console.log(`🧠 Loaded ${intelMap.size} match intelligence records`);

    // Helper to find stats (exact then fuzzy)
    function findStats(teamName: string): RollingStats | null {
      const key = teamName.trim().toLowerCase();
      if (statsMap.has(key)) return statsMap.get(key)!;
      const stripped = key.replace(/\b(fc|afc|sc|cf|cd)\b/g, '').replace(/\s+/g, ' ').trim();
      for (const [k, v] of statsMap) {
        if (k.includes(stripped) || stripped.includes(k)) return v;
      }
      return null;
    }

    // 4. Compute power scores for each fixture
    const rows: any[] = [];
    let scored = 0;
    let skipped = 0;
    let intelApplied = 0;

    for (const f of fixtures) {
      const fixtureId = String(f.fixture?.id || '');
      const homeTeam = f.teams?.home?.name || '';
      const awayTeam = f.teams?.away?.name || '';
      const league = f.league?.name || '';
      const kickoff = f.fixture?.date || '';

      const homeStats = findStats(homeTeam);
      const awayStats = findStats(awayTeam);

      if (!homeStats || !awayStats) {
        skipped++;
        continue;
      }

      // Base scores
      const goals = computeGoalsScore(homeStats, awayStats);
      const btts = computeBTTSScore(homeStats, awayStats);
      const corners = computeCornersScore(homeStats, awayStats);
      const cards = computeCardsScore(homeStats, awayStats);

      // Intelligence layers
      const intel = intelMap.get(fixtureId) || null;
      const xgAdj = xgRegressionAdjustment(homeStats, awayStats);
      const injAdj = injuryAdjustment(intel);
      const refAdj = refereeBiasAdjustment(intel);

      if (intel) intelApplied++;

      // Apply intelligence adjustments
      // xG regression affects goals + BTTS (goal-related markets)
      const goalsAdjusted = clamp100(goals.score + xgAdj.adjustment + injAdj.adjustment);
      const bttsAdjusted = clamp100(btts.score + xgAdj.adjustment + injAdj.adjustment);
      // Corners: only injury penalty (fewer players = less pressing)
      const cornersAdjusted = clamp100(corners.score + Math.round(injAdj.adjustment * 0.5));
      // Cards: referee bias is the big one, plus injury penalty
      const cardsAdjusted = clamp100(cards.score + refAdj.adjustment + Math.round(injAdj.adjustment * 0.5));

      const scores = [
        { market: 'over_2.5_goals', score: goalsAdjusted },
        { market: 'btts', score: bttsAdjusted },
        { market: 'over_9.5_corners', score: cornersAdjusted },
        { market: 'over_3.5_cards', score: cardsAdjusted },
      ];
      const best = scores.reduce((a, b) => b.score > a.score ? b : a);

      rows.push({
        fixture_id: fixtureId,
        home_team: homeTeam,
        away_team: awayTeam,
        league,
        kickoff,
        computed_date: today,
        over_25_goals_score: goalsAdjusted,
        btts_score: bttsAdjusted,
        over_95_corners_score: cornersAdjusted,
        over_35_cards_score: cardsAdjusted,
        best_market: best.market,
        best_score: best.score,
        score_breakdown: {
          goals: { ...goals.breakdown, base: goals.score, adjusted: goalsAdjusted },
          btts: { ...btts.breakdown, base: btts.score, adjusted: bttsAdjusted },
          corners: { ...corners.breakdown, base: corners.score, adjusted: cornersAdjusted },
          cards: { ...cards.breakdown, base: cards.score, adjusted: cardsAdjusted },
          intelligence: {
            xg_regression: xgAdj,
            injury_impact: injAdj,
            referee_bias: refAdj,
            has_intel: !!intel,
          },
          home_stats: homeStats.team_name,
          away_stats: awayStats.team_name,
          home_matches: homeStats.matches_used,
          away_matches: awayStats.matches_used,
        },
      });
      scored++;
    }

    console.log(`⚡ Scored ${scored} fixtures, skipped ${skipped} (no stats), intel applied to ${intelApplied}`);

    // 5. Upsert to database in batches
    if (rows.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error: upsertError } = await supabase
          .from('match_power_scores')
          .upsert(batch, { onConflict: 'fixture_id,computed_date' });

        if (upsertError) {
          console.error(`⚠️ Upsert batch error:`, upsertError.message);
        }
      }
    }

    // 6. Summary stats
    const above70 = rows.filter(r => r.best_score >= 70).length;
    const above80 = rows.filter(r => r.best_score >= 80).length;
    const above90 = rows.filter(r => r.best_score >= 90).length;

    const summary = {
      success: true,
      date: today,
      fixtures_scored: scored,
      fixtures_skipped: skipped,
      intelligence_applied: intelApplied,
      intelligence_layers: ['xg_regression', 'injury_impact', 'referee_bias'],
      power_tiers: {
        elite_90_plus: above90,
        strong_80_plus: above80,
        eligible_70_plus: above70,
        total: scored,
      },
      top_10_goals: rows.sort((a, b) => b.over_25_goals_score - a.over_25_goals_score).slice(0, 10).map(r => ({
        match: `${r.home_team} vs ${r.away_team}`,
        league: r.league,
        score: r.over_25_goals_score,
      })),
      top_10_btts: rows.sort((a, b) => b.btts_score - a.btts_score).slice(0, 10).map(r => ({
        match: `${r.home_team} vs ${r.away_team}`,
        league: r.league,
        score: r.btts_score,
      })),
    };

    console.log(`✅ Power Scores complete: ${above70} eligible (70+), ${above90} elite (90+)`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[Power Scores] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';

/**
 * STATISTICAL VALUE ENGINE v2 — Internal League Rankings
 *
 * The Gaffer's logic:
 *   1. Rank every team in their league by home goals, away goals,
 *      home corners, away corners, cards, BTTS, etc.
 *   2. When two top-ranked teams meet (e.g. #2 home goals vs #3 away goals)
 *      → high-confidence signal.
 *   3. Compare team stats vs league average → above/below average signal.
 *   4. Blend with H2H, venue form, derby context, match intelligence.
 *   5. Real odds only. No odds = no selection.
 *   6. Log every pick into gaffer_learning_log for feedback.
 */

// ── Types ──────────────────────────────────────────────────────────

interface ValueBet {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  market: string;
  statisticalProbability: number;
  bookmakerOdds: number;
  impliedProbability: number;
  valueEdge: number;
  recommendation: string;
  confidence: 'high' | 'medium' | 'low';
  breakdown: {
    overall: number;
    venue: number;
    h2h: number;
    derby: number;
    intelligenceAdj: number;
    leagueRankSignal: number;
    leagueAvgDelta: number;
    final: number;
  };
}

const EXCLUDED_FIXTURE_PATTERNS = [
  /\bu\d{1,2}\b/i,
  /under[\s-]*\d/i,
  /youth/i,
  /academy/i,
  /reserve/i,
  /development/i,
  /\bii\b/i,
  /\bb\s*$/i,
  /^jong\s/i,
  /women/i,
  /ladies/i,
  /premier league 2/i,
  /primavera/i,
  /regionalliga/i,
  /serie d/i,
  /segunda división rfef/i,
  /lowland league/i,
  /3\. division/i,
  /challenger pro league/i,
  /1\. liga promotion/i,
];

function isExcludedFixture(league: string, homeTeam: string, awayTeam: string): boolean {
  const values = [league, homeTeam, awayTeam];
  return values.some((value) => EXCLUDED_FIXTURE_PATTERNS.some((pattern) => pattern.test(value)));
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchFromApi(apiKey: string, endpoint: string, params: Record<string, string | number> = {}) {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)));
  const res = await fetch(url.toString(), {
    headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'v3.football.api-sports.io' },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Internal League Rankings ───────────────────────────────────────
// Returns rank position (1 = best) and total teams for a given metric

interface LeagueRank {
  homeRank: number;
  awayRank: number;
  totalTeams: number;
  homeValue: number;
  awayValue: number;
  leagueAvg: number;
}

async function getLeagueRanking(
  supabase: any,
  homeTeamName: string,
  awayTeamName: string,
  league: string,
  market: string
): Promise<LeagueRank | null> {
  // Map market to the ranking columns
  const marketCols: Record<string, { homeCol: string; awayCol: string; overallCol: string }> = {
    over25: { homeCol: 'home_avg_total_goals', awayCol: 'away_avg_total_goals', overallCol: 'avg_total_goals' },
    btts: { homeCol: 'home_btts_pct', awayCol: 'away_btts_pct', overallCol: 'btts_pct' },
    over85corners: { homeCol: 'home_avg_total_corners', awayCol: 'away_avg_total_corners', overallCol: 'avg_total_corners' },
    over35cards: { homeCol: 'home_avg_total_cards', awayCol: 'away_avg_total_cards', overallCol: 'avg_total_cards' },
  };

  const cols = marketCols[market];
  if (!cols) return null;

  // Get all teams in this league
  const { data: leagueTeams } = await supabase
    .from('team_rolling_stats')
    .select(`team_name, ${cols.homeCol}, ${cols.awayCol}, ${cols.overallCol}`)
    .eq('league', league)
    .gte('matches_used', 6);

  if (!leagueTeams || leagueTeams.length < 4) return null;

  // Sort by home metric (descending) to get home rankings
  const homeSorted = [...leagueTeams].sort((a: any, b: any) => (b[cols.homeCol] ?? 0) - (a[cols.homeCol] ?? 0));
  const awaySorted = [...leagueTeams].sort((a: any, b: any) => (b[cols.awayCol] ?? 0) - (a[cols.awayCol] ?? 0));

  // Find home team's HOME rank and away team's AWAY rank
  const homeIdx = homeSorted.findIndex((t: any) => t.team_name?.toLowerCase().includes(homeTeamName.toLowerCase()));
  const awayIdx = awaySorted.findIndex((t: any) => t.team_name?.toLowerCase().includes(awayTeamName.toLowerCase()));

  if (homeIdx === -1 || awayIdx === -1) return null;

  const leagueAvg = leagueTeams.reduce((sum: number, t: any) => sum + (Number(t[cols.overallCol]) || 0), 0) / leagueTeams.length;

  return {
    homeRank: homeIdx + 1,
    awayRank: awayIdx + 1,
    totalTeams: leagueTeams.length,
    homeValue: Number(homeSorted[homeIdx]?.[cols.homeCol]) || 0,
    awayValue: Number(awaySorted[awayIdx]?.[cols.awayCol]) || 0,
    leagueAvg: parseFloat(leagueAvg.toFixed(2)),
  };
}

// ── Rolling Stats Lookup ───────────────────────────────────────────
async function getRollingStats(supabase: any, teamName: string) {
  const { data } = await supabase
    .from('team_rolling_stats')
    .select('over_25_goals_pct, btts_pct, over_95_corners_pct, over_35_cards_pct, avg_total_goals, avg_total_corners, avg_total_cards, avg_xg_for, avg_xg_against, home_over_25_goals_pct, home_btts_pct, home_over_95_corners_pct, home_over_35_cards_pct, away_over_25_goals_pct, away_btts_pct, away_over_95_corners_pct, away_over_35_cards_pct')
    .ilike('team_name', `%${teamName}%`)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// ── H2H Last 4 Meetings ───────────────────────────────────────────
async function getH2H(supabase: any, homeTeam: string, awayTeam: string) {
  const { data } = await supabase
    .from('ml_training_data')
    .select('total_goals, total_corners, total_cards, btts_hit, over_25_hit, over_95_corners_hit, over_35_cards_hit')
    .or(
      `and(home_team.ilike.%${homeTeam}%,away_team.ilike.%${awayTeam}%),` +
      `and(home_team.ilike.%${awayTeam}%,away_team.ilike.%${homeTeam}%)`
    )
    .order('fixture_date', { ascending: false })
    .limit(4);

  const matches = data ?? [];
  const n = matches.length;
  if (n === 0) return { games: 0, over25Pct: 50, bttsPct: 50, over95CornersPct: 50, over35CardsPct: 50, avgGoals: 2.5, avgCorners: 10, avgCards: 3.5, isDerby: false };

  let o25 = 0, btts = 0, o95c = 0, o35c = 0, tG = 0, tCo = 0, tCa = 0;
  matches.forEach((m: any) => {
    if (m.over_25_hit) o25++;
    if (m.btts_hit) btts++;
    if (m.over_95_corners_hit) o95c++;
    if (m.over_35_cards_hit) o35c++;
    tG += m.total_goals ?? 0;
    tCo += m.total_corners ?? 0;
    tCa += m.total_cards ?? 0;
  });

  return {
    games: n,
    over25Pct: Math.round((o25 / n) * 100),
    bttsPct: Math.round((btts / n) * 100),
    over95CornersPct: Math.round((o95c / n) * 100),
    over35CardsPct: Math.round((o35c / n) * 100),
    avgGoals: parseFloat((tG / n).toFixed(1)),
    avgCorners: parseFloat((tCo / n).toFixed(1)),
    avgCards: parseFloat((tCa / n).toFixed(1)),
    isDerby: detectDerby(homeTeam, awayTeam),
  };
}

function detectDerby(home: string, away: string): boolean {
  const derbies = [
    ['Arsenal', 'Tottenham'], ['Liverpool', 'Everton'], ['Manchester United', 'Manchester City'],
    ['AC Milan', 'Inter'], ['Real Madrid', 'Atletico Madrid'], ['Barcelona', 'Espanyol'],
    ['Roma', 'Lazio'], ['Borussia Dortmund', 'Schalke'], ['Celtic', 'Rangers'],
    ['Galatasaray', 'Fenerbahce'], ['Ajax', 'Feyenoord'], ['Benfica', 'Sporting CP'],
    ['Porto', 'Benfica'], ['Boca Juniors', 'River Plate'],
    ['Chelsea', 'Tottenham'], ['Chelsea', 'Arsenal'], ['West Ham', 'Tottenham'],
    ['Newcastle', 'Sunderland'], ['Aston Villa', 'Birmingham'],
    ['Bayern Munich', 'Borussia Dortmund'],
  ];
  const h = home.toLowerCase(), a = away.toLowerCase();
  return derbies.some(([x, y]) =>
    (h.includes(x.toLowerCase()) && a.includes(y.toLowerCase())) ||
    (h.includes(y.toLowerCase()) && a.includes(x.toLowerCase()))
  );
}

// ── Intelligence Adjustments ───────────────────────────────────────
// Reads everything match_intelligence collects (injuries, fatigue, ref,
// weather, manager changes, kickoff time, key players out) and converts
// it into a per-market probability nudge. Returns -999 to veto the bet.
async function getIntelligenceAdj(supabase: any, fixtureId: string, market: string): Promise<number> {
  const { data: intel } = await supabase
    .from('match_intelligence')
    .select(`
      home_injury_count, away_injury_count,
      home_key_players_out, away_key_players_out,
      home_is_fatigued, away_is_fatigued,
      fatigue_risk_score, injury_risk_score, weather_risk_score, overall_risk_score,
      referee_avg_cards, referee_strictness,
      is_adverse_weather, weather_condition, wind_speed_kmh, temperature_celsius,
      home_new_manager, away_new_manager,
      kickoff_hour, is_early_kickoff,
      should_avoid
    `)
    .eq('fixture_id', fixtureId)
    .maybeSingle();

  if (!intel) return 0;
  if (intel.should_avoid) return -999;

  let adj = 0;
  const totalInjuries = (intel.home_injury_count ?? 0) + (intel.away_injury_count ?? 0);
  const keyOut = (intel.home_key_players_out?.length ?? 0) + (intel.away_key_players_out?.length ?? 0);
  const isGoalsMkt = market === 'over25' || market === 'btts';
  const isCornersMkt = market === 'over95corners' || market === 'over85corners';
  const isCardsMkt = market === 'over35cards';

  // Injuries — modest goals/btts bump (more chaos = more goals on average)
  if (isGoalsMkt) adj += Math.min(5, totalInjuries);
  // Key player(s) out — punish goals/btts (attacking talent missing)
  if (keyOut > 0 && isGoalsMkt) adj -= Math.min(8, keyOut * 3);

  // Fatigue
  if (intel.home_is_fatigued || intel.away_is_fatigued) {
    if (isGoalsMkt) adj += 3;
    if (isCardsMkt) adj += 3;
    if (isCornersMkt) adj += 2;
  }

  // Referee for cards
  if (isCardsMkt) {
    const refCards = intel.referee_avg_cards ?? 0;
    if (refCards >= 5.0) adj += 7;
    else if (refCards >= 4.5) adj += 4;
    else if (refCards < 3.5) adj -= 5;
    if (intel.referee_strictness === 'strict') adj += 2;
    else if (intel.referee_strictness === 'lenient') adj -= 2;
  }

  // Adverse weather — suppresses goals + corners (slower, scrappier game),
  // can nudge cards up via slick conditions / fouls
  if (intel.is_adverse_weather) {
    if (isGoalsMkt) adj -= 6;
    if (isCornersMkt) adj -= 4;
    if (isCardsMkt) adj += 2;
  }
  // High wind hurts corner deliveries + finishing
  if ((intel.wind_speed_kmh ?? 0) >= 35) {
    if (isGoalsMkt) adj -= 3;
    if (isCornersMkt) adj -= 3;
  }
  // Freezing/very hot extremes slow tempo
  const temp = intel.temperature_celsius;
  if (temp != null && (temp <= 0 || temp >= 32)) {
    if (isGoalsMkt) adj -= 2;
    if (isCornersMkt) adj -= 2;
  }

  // New manager — first few games unpredictable, often more cards & cagier
  if (intel.home_new_manager || intel.away_new_manager) {
    if (isGoalsMkt) adj -= 3;
    if (isCardsMkt) adj += 2;
  }

  // Early kickoff (lunchtime) — historically lower-scoring
  if (intel.is_early_kickoff || (intel.kickoff_hour != null && intel.kickoff_hour < 13)) {
    if (isGoalsMkt) adj -= 3;
    if (isCornersMkt) adj -= 2;
  }

  // Overall risk score — global dampener for anything fragile
  const risk = intel.overall_risk_score ?? 0;
  if (risk >= 70) adj -= 6;
  else if (risk >= 50) adj -= 3;

  // Cap the swing so a single fixture's intelligence can't overwhelm the model
  return Math.max(-20, Math.min(15, adj));
}

// ── Self-Calibration from Learning Log ─────────────────────────────
// Reads historical accuracy by market+band. If the Gaffer consistently
// over-predicts (e.g. says 70% but only hits 55%), apply a correction.
async function getCalibrationAdj(supabase: any, market: string, rawProb: number): Promise<number> {
  const band = `${Math.floor(rawProb / 5) * 5}-${Math.floor(rawProb / 5) * 5 + 5}`;

  const { data } = await supabase
    .from('gaffer_learning_log')
    .select('result')
    .eq('market', market)
    .eq('probability_band', band)
    .not('result', 'is', null); // only settled

  if (!data || data.length < 10) return 0; // need 10+ samples to calibrate

  const wins = data.filter((r: any) => r.result === 'won').length;
  const actualHitRate = (wins / data.length) * 100;
  const midBand = Math.floor(rawProb / 5) * 5 + 2.5;

  // If we predicted ~67.5% but actually hit 58%, delta = -9.5 → apply half as correction
  const delta = actualHitRate - midBand;
  const correction = Math.round(delta * 0.5); // apply 50% of the observed delta

  if (Math.abs(correction) >= 2) {
    console.log(`📈 Calibration: ${market} band ${band} — predicted ~${midBand}%, actual ${actualHitRate.toFixed(0)}% (${data.length} samples) → adj ${correction > 0 ? '+' : ''}${correction}`);
  }

  return Math.max(-10, Math.min(10, correction)); // cap at ±10
}

// ── League Rank Signal ─────────────────────────────────────────────
// Both teams in top quartile of their league = strong signal
function computeRankSignal(rank: LeagueRank): number {
  const topQuartile = Math.ceil(rank.totalTeams * 0.25);
  const topHalf = Math.ceil(rank.totalTeams * 0.5);

  // Both in top 25% → +10
  if (rank.homeRank <= topQuartile && rank.awayRank <= topQuartile) return 10;
  // Both in top 50% → +5
  if (rank.homeRank <= topHalf && rank.awayRank <= topHalf) return 5;
  // One in top 25%, other in top 50% → +3
  if (rank.homeRank <= topQuartile || rank.awayRank <= topQuartile) return 3;
  // Both bottom half → -3
  if (rank.homeRank > topHalf && rank.awayRank > topHalf) return -3;
  return 0;
}

// ── Blended Probability ────────────────────────────────────────────
function blendProbability(
  homeStats: any, awayStats: any, h2h: any, market: string,
  rankSignal: number, leagueAvgDelta: number
) {
  const W_OVERALL = 0.40, W_VENUE = 0.30, W_H2H = 0.20, W_DERBY = 0.10;

  const keys: Record<string, { o: string; hv: string; av: string; h2h: string }> = {
    over25: { o: 'over_25_goals_pct', hv: 'home_over_25_goals_pct', av: 'away_over_25_goals_pct', h2h: 'over25Pct' },
    btts: { o: 'btts_pct', hv: 'home_btts_pct', av: 'away_btts_pct', h2h: 'bttsPct' },
    over85corners: { o: 'over_95_corners_pct', hv: 'home_over_95_corners_pct', av: 'away_over_95_corners_pct', h2h: 'over95CornersPct' },
    over35cards: { o: 'over_35_cards_pct', hv: 'home_over_35_cards_pct', av: 'away_over_35_cards_pct', h2h: 'over35CardsPct' },
  };

  const k = keys[market];
  if (!k) return { overall: 50, venue: 50, h2h: 50, derby: 0, blended: 50 };

  const overall = ((homeStats[k.o] ?? 50) * 0.55 + (awayStats[k.o] ?? 50) * 0.45);
  const venue = ((homeStats[k.hv] ?? homeStats[k.o] ?? 50) * 0.55 + (awayStats[k.av] ?? awayStats[k.o] ?? 50) * 0.45);
  const h2hPct = h2h[k.h2h] ?? 50;

  let derbyBoost = 0;
  if (h2h.isDerby) {
    if (market === 'over35cards') derbyBoost = 15;
    else if (market === 'over85corners') derbyBoost = 8;
    else if (market === 'over25') derbyBoost = 5;
    else if (market === 'btts') derbyBoost = 3;
  }

  const raw = (overall * W_OVERALL) + (venue * W_VENUE) + (h2hPct * W_H2H) + derbyBoost + rankSignal;
  const final = Math.min(95, Math.max(10, raw));

  return { overall: Math.round(overall), venue: Math.round(venue), h2h: Math.round(h2hPct), derby: derbyBoost, blended: Math.round(final) };
}

// ── Real Bookmaker Odds (NO FALLBACK) ──────────────────────────────
async function getRealOdds(apiKey: string, fixtureId: number, market: string): Promise<number | null> {
  try {
    const oddsData = await fetchFromApi(apiKey, '/odds', { fixture: fixtureId, bookmaker: 6 });
    if (!oddsData.response?.length) return null;
    const bets = oddsData.response[0]?.bookmakers?.[0]?.bets || [];
    const map: Record<string, { label: string; value: string }> = {
      over25: { label: 'Goals Over/Under', value: 'Over 2.5' },
      btts: { label: 'Both Teams Score', value: 'Yes' },
      over85corners: { label: 'Total Corners', value: 'Over 8.5' },
      over35cards: { label: 'Total Cards', value: 'Over 3.5' },
    };
    const target = map[market];
    if (!target) return null;
    for (const bet of bets) {
      if (bet.name.includes(target.label)) {
        const outcome = bet.values?.find((v: any) => v.value === target.value);
        if (outcome?.odd) return parseFloat(outcome.odd);
      }
    }
    return null;
  } catch { return null; }
}

// ── Probability Band ───────────────────────────────────────────────
function getProbabilityBand(prob: number): string {
  const lower = Math.floor(prob / 5) * 5;
  return `${lower}-${lower + 5}`;
}

// ── Main Handler ───────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    if (!API_KEY) throw new Error('API_FOOTBALL_KEY not configured');

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const url = new URL(req.url);
    const targetDate = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const minEdge = parseFloat(url.searchParams.get('minEdge') || '5');

    console.log(`🎯 Value Engine v2: ${targetDate} | min edge ${minEdge}%`);

    // Fetch today's fixtures
    const fixturesData = await fetchFromApi(API_KEY, '/fixtures', { date: targetDate });
    await delay(200);

    if (!fixturesData.response?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No fixtures', valueBets: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const fixtures = fixturesData.response.filter((f: any) => {
      if (f.fixture.status.short !== 'NS') return false;

      const leagueName = String(f.league?.name ?? '');
      const homeTeam = String(f.teams?.home?.name ?? '');
      const awayTeam = String(f.teams?.away?.name ?? '');

      return !isExcludedFixture(leagueName, homeTeam, awayTeam);
    });

    console.log(`📊 Analysing ${fixtures.length} fixtures with league rankings...`);

    const valueBets: ValueBet[] = [];
      const markets = ['over25', 'btts', 'over85corners', 'over35cards'];

    for (const fixture of fixtures.slice(0, 50)) {
      const homeTeam = fixture.teams.home.name;
      const awayTeam = fixture.teams.away.name;
      const fixtureId = String(fixture.fixture.id);
      const leagueName = fixture.league.name;

      // Parallel data fetch
      const [homeStats, awayStats, h2h] = await Promise.all([
        getRollingStats(supabase, homeTeam),
        getRollingStats(supabase, awayTeam),
        getH2H(supabase, homeTeam, awayTeam),
      ]);

      if (!homeStats || !awayStats) continue;

      for (const market of markets) {
        // Intelligence adjustment
        const adj = await getIntelligenceAdj(supabase, fixtureId, market);
        if (adj === -999) continue;

        // League ranking signal
        const rank = await getLeagueRanking(supabase, homeTeam, awayTeam, leagueName, market);
        const rankSignal = rank ? computeRankSignal(rank) : 0;

        // League average delta (how far above/below league avg)
        let leagueAvgDelta = 0;
        if (rank) {
          const combinedTeamAvg = (rank.homeValue + rank.awayValue) / 2;
          leagueAvgDelta = parseFloat((combinedTeamAvg - rank.leagueAvg).toFixed(2));
        }

        // Blend probability
        const blend = blendProbability(homeStats, awayStats, h2h, market, rankSignal, leagueAvgDelta);
        const rawProb = blend.blended + adj;

        // Self-calibration: learn from past accuracy
        const calibrationAdj = await getCalibrationAdj(supabase, market, rawProb);
        const finalProb = Math.min(95, Math.max(10, rawProb + calibrationAdj));

        // REAL ODDS ONLY
        const bookmakerOdds = await getRealOdds(API_KEY, fixture.fixture.id, market);
        await delay(50);
        if (!bookmakerOdds || bookmakerOdds < 1.33) continue;

        const impliedProbability = (1 / bookmakerOdds) * 100;
        const valueEdge = ((finalProb / 100) * bookmakerOdds - 1) * 100;

        if (valueEdge >= minEdge && finalProb >= 55) {
          let confidence: 'high' | 'medium' | 'low' = 'low';
          if (valueEdge >= 30 && finalProb >= 70) confidence = 'high';
          else if (valueEdge >= 15 && finalProb >= 60) confidence = 'medium';

          const rankNote = rank
            ? `League rank: Home #${rank.homeRank}/${rank.totalTeams}, Away #${rank.awayRank}/${rank.totalTeams}`
            : 'No league ranking';
          const h2hNote = h2h.games > 0
            ? `H2H(${h2h.games}g): ${market === 'over25' ? h2h.over25Pct : market === 'btts' ? h2h.bttsPct : market === 'over85corners' ? h2h.over95CornersPct : h2h.over35CardsPct}%`
            : 'No H2H';
          const derbyNote = h2h.isDerby ? ' 🔥DERBY' : '';

          valueBets.push({
            fixtureId, homeTeam, awayTeam, league: leagueName, kickoff: fixture.fixture.date, market,
            statisticalProbability: Math.round(finalProb),
            bookmakerOdds, impliedProbability: Math.round(impliedProbability),
            valueEdge: Math.round(valueEdge), confidence,
            recommendation: `${market.toUpperCase()} @ ${bookmakerOdds} | Stats: ${Math.round(finalProb)}% vs Bookies: ${Math.round(impliedProbability)}% = ${Math.round(valueEdge)}% edge | ${rankNote} | ${h2hNote}${derbyNote}`,
            breakdown: {
              overall: blend.overall, venue: blend.venue, h2h: blend.h2h,
              derby: blend.derby, intelligenceAdj: adj,
              leagueRankSignal: rankSignal, leagueAvgDelta,
              final: Math.round(finalProb),
            },
          });
        }
      }
    }

    // Sort by value edge
    valueBets.sort((a, b) => b.valueEdge - a.valueEdge);
    const topValueBets = valueBets.slice(0, 10);

    // Store in golden_bet_history + gaffer_learning_log
    for (const bet of topValueBets) {
      await supabase.from('golden_bet_history').upsert({
        fixture_id: bet.fixtureId, home_team: bet.homeTeam, away_team: bet.awayTeam,
        league: bet.league, kickoff: bet.kickoff, market: bet.market,
        ml_confidence: bet.statisticalProbability, value_edge: bet.valueEdge,
        bookmaker_odds: bet.bookmakerOdds, gaffer_reasoning: bet.recommendation,
        status: 'pending', prediction_date: targetDate,
      }, { onConflict: 'fixture_id,market' });

      // Log for learning feedback
      await supabase.from('gaffer_learning_log').upsert({
        prediction_date: targetDate,
        fixture_id: bet.fixtureId, home_team: bet.homeTeam, away_team: bet.awayTeam,
        league: bet.league, market: bet.market, source: 'golden_bet',
        predicted_probability: bet.statisticalProbability,
        probability_band: getProbabilityBand(bet.statisticalProbability),
        bookmaker_odds: bet.bookmakerOdds, value_edge: bet.valueEdge,
        overall_pct: bet.breakdown.overall, venue_pct: bet.breakdown.venue,
        h2h_pct: bet.breakdown.h2h, derby_boost: bet.breakdown.derby,
        intelligence_adj: bet.breakdown.intelligenceAdj,
        league_avg: bet.breakdown.leagueAvgDelta,
      }, { onConflict: 'prediction_date,fixture_id,market,source' });
    }

    console.log(`✅ Found ${topValueBets.length} value bets with ${minEdge}%+ edge`);

    return new Response(JSON.stringify({
      success: true, date: targetDate, minEdge,
      totalFixturesAnalysed: fixtures.length,
      valueBetsFound: valueBets.length,
      topValueBets: topValueBets.map(b => ({
        ...b,
        summary: `${b.homeTeam} vs ${b.awayTeam} | ${b.market} @ ${b.bookmakerOdds} | Edge: ${b.valueEdge}% | Rank signal: ${b.breakdown.leagueRankSignal > 0 ? '+' : ''}${b.breakdown.leagueRankSignal}`,
      })),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Value Engine Error:', msg);
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

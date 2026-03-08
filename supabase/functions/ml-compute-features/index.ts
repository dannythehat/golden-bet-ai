import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RollingStats {
  goalsFor: number[];
  goalsAgainst: number[];
  xgFor: number[];
  xgAgainst: number[];
  shots: number[];
  shotsOnTarget: number[];
  cornersFor: number[];
  cornersAgainst: number[];
  fouls: number[];
  cardsFor: number[];
  cardsAgainst: number[];
}

function avg(arr: number[]): number | null {
  const valid = arr.filter(v => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
}

function getWindowAvg(arr: number[], window: number): number | null {
  return avg(arr.slice(0, window));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 500;
    const startOffset = body.startOffset || 0;
    const mode = body.mode || 'offset'; // 'offset' (legacy) or 'incremental' (daily)

    console.log(`🧠 ML Feature Computation: mode=${mode}, offset=${startOffset}, batch=${batchSize}`);

    let fixtures: any[] | null = null;
    let fetchError: any = null;

    if (mode === 'incremental') {
      // INCREMENTAL MODE: Find fixtures in V1 that are missing from V2
      // Get recent V1 fixture_ids (last 5 days to catch any gaps)
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const cutoffDate = fiveDaysAgo.toISOString().split('T')[0];

      const { data: v1Recent, error: v1Err } = await supabase
        .from('ml_training_data')
        .select('fixture_id')
        .gte('fixture_date', cutoffDate);
      
      if (v1Err) throw v1Err;
      
      if (v1Recent && v1Recent.length > 0) {
        const v1Ids = v1Recent.map(r => r.fixture_id);
        
        // Check which already exist in V2
        const { data: v2Existing } = await supabase
          .from('ml_training_data_v2')
          .select('fixture_id')
          .in('fixture_id', v1Ids);
        
        const existingIds = new Set((v2Existing || []).map(r => r.fixture_id));
        const missingIds = v1Ids.filter(id => !existingIds.has(id));
        
        console.log(`📊 Incremental: ${v1Ids.length} V1 recent, ${existingIds.size} already in V2, ${missingIds.length} missing`);
        
        if (missingIds.length > 0) {
          // Fetch full V1 records for missing fixtures (limit to batchSize)
          const idsToProcess = missingIds.slice(0, batchSize);
          const { data, error } = await supabase
            .from('ml_training_data')
            .select('fixture_id, fixture_date, home_team, away_team, league, region, total_goals, home_goals, away_goals, total_corners, total_cards, over_25_hit, btts_hit, over_95_corners_hit, over_35_cards_hit')
            .in('fixture_id', idsToProcess);
          fixtures = data;
          fetchError = error;
        } else {
          fixtures = [];
        }
      } else {
        fixtures = [];
      }
    } else {
      // LEGACY OFFSET MODE — for bulk backfills
      const result = await supabase
        .from('ml_training_data')
        .select('fixture_id, fixture_date, home_team, away_team, league, region, total_goals, home_goals, away_goals, total_corners, total_cards, over_25_hit, btts_hit, over_95_corners_hit, over_35_cards_hit')
        .order('fixture_date', { ascending: true })
        .range(startOffset, startOffset + batchSize - 1);
      fixtures = result.data;
      fetchError = result.error;
    }

    if (fetchError) throw fetchError;
    if (!fixtures || fixtures.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No more fixtures to process',
        processed: 0 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`📊 Processing ${fixtures.length} fixtures...`);

    // Cache for team historical matches to avoid repeated queries
    const teamMatchCache: Map<string, any[]> = new Map();
    const leagueStatsCache: Map<string, any> = new Map();

    let processed = 0;
    let errors = 0;

    for (const fixture of fixtures) {
      try {
        const fixtureDate = fixture.fixture_date;
        const homeTeam = fixture.home_team;
        const awayTeam = fixture.away_team;
        const league = fixture.league;

        // Get historical matches for home team (BEFORE fixture_date)
        let homeMatches = teamMatchCache.get(`${homeTeam}_${fixtureDate}`);
        if (!homeMatches) {
          const { data } = await supabase
            .from('ml_training_data')
            .select('*')
            .or(`home_team.eq.${homeTeam},away_team.eq.${homeTeam}`)
            .lt('fixture_date', fixtureDate)
            .order('fixture_date', { ascending: false })
            .limit(25);
          homeMatches = data || [];
          teamMatchCache.set(`${homeTeam}_${fixtureDate}`, homeMatches);
        }

        // Get historical matches for away team (BEFORE fixture_date)
        let awayMatches = teamMatchCache.get(`${awayTeam}_${fixtureDate}`);
        if (!awayMatches) {
          const { data } = await supabase
            .from('ml_training_data')
            .select('*')
            .or(`home_team.eq.${awayTeam},away_team.eq.${awayTeam}`)
            .lt('fixture_date', fixtureDate)
            .order('fixture_date', { ascending: false })
            .limit(25);
          awayMatches = data || [];
          teamMatchCache.set(`${awayTeam}_${fixtureDate}`, awayMatches);
        }

        // Compute rolling stats for home team
        const homeStats = computeRollingStats(homeMatches, homeTeam);
        const awayStats = computeRollingStats(awayMatches, awayTeam);

        // Get league baseline stats (BEFORE fixture_date)
        const leagueCacheKey = `${league}_${fixtureDate}`;
        let leagueStats = leagueStatsCache.get(leagueCacheKey);
        if (!leagueStats) {
          const { data: leagueMatches } = await supabase
            .from('ml_training_data')
            .select('total_goals, over_25_hit, btts_hit, total_corners, total_cards')
            .eq('league', league)
            .lt('fixture_date', fixtureDate)
            .not('total_goals', 'is', null)
            .limit(200);

          if (leagueMatches && leagueMatches.length > 0) {
            const goals = leagueMatches.map(m => m.total_goals).filter(v => v !== null);
            const over25 = leagueMatches.filter(m => m.over_25_hit === true).length;
            const btts = leagueMatches.filter(m => m.btts_hit === true).length;
            const corners = leagueMatches.map(m => m.total_corners).filter(v => v !== null);
            const cards = leagueMatches.map(m => m.total_cards).filter(v => v !== null);

            leagueStats = {
              avgGoals: avg(goals),
              over25Rate: Math.round((over25 / leagueMatches.length) * 100) / 100,
              bttsRate: Math.round((btts / leagueMatches.length) * 100) / 100,
              avgCorners: avg(corners),
              avgCards: avg(cards),
            };
          } else {
            leagueStats = { avgGoals: null, over25Rate: null, bttsRate: null, avgCorners: null, avgCards: null };
          }
          leagueStatsCache.set(leagueCacheKey, leagueStats);
        }

        // Compute max source match date for validation
        const allSourceDates = [
          ...homeMatches.map(m => m.fixture_date),
          ...awayMatches.map(m => m.fixture_date),
        ].filter(d => d);
        const maxSourceDate = allSourceDates.length > 0 ? allSourceDates.sort().reverse()[0] : null;

        // Build the v2 record
        const v2Record = {
          fixture_id: fixture.fixture_id,
          fixture_date: fixtureDate,
          home_team: homeTeam,
          away_team: awayTeam,
          league: league,
          region: fixture.region,
          
          // Labels
          total_goals: fixture.total_goals,
          home_goals: fixture.home_goals,
          away_goals: fixture.away_goals,
          total_corners: fixture.total_corners,
          total_cards: fixture.total_cards,
          over_25_hit: fixture.over_25_hit,
          btts_hit: fixture.btts_hit,
          over_95_corners_hit: fixture.over_95_corners_hit,
          over_35_cards_hit: fixture.over_35_cards_hit,
          
          // Home team rolling features
          home_goals_for_avg_5: getWindowAvg(homeStats.goalsFor, 5),
          home_goals_against_avg_5: getWindowAvg(homeStats.goalsAgainst, 5),
          home_xg_for_avg_5: getWindowAvg(homeStats.xgFor, 5),
          home_xg_against_avg_5: getWindowAvg(homeStats.xgAgainst, 5),
          home_shots_for_avg_5: getWindowAvg(homeStats.shots, 5),
          home_shots_on_target_avg_5: getWindowAvg(homeStats.shotsOnTarget, 5),
          home_corners_for_avg_5: getWindowAvg(homeStats.cornersFor, 5),
          home_corners_against_avg_5: getWindowAvg(homeStats.cornersAgainst, 5),
          home_fouls_for_avg_5: getWindowAvg(homeStats.fouls, 5),
          home_cards_for_avg_5: getWindowAvg(homeStats.cardsFor, 5),
          home_cards_against_avg_5: getWindowAvg(homeStats.cardsAgainst, 5),
          
          home_goals_for_avg_10: getWindowAvg(homeStats.goalsFor, 10),
          home_goals_against_avg_10: getWindowAvg(homeStats.goalsAgainst, 10),
          home_xg_for_avg_10: getWindowAvg(homeStats.xgFor, 10),
          home_xg_against_avg_10: getWindowAvg(homeStats.xgAgainst, 10),
          home_shots_for_avg_10: getWindowAvg(homeStats.shots, 10),
          home_shots_on_target_avg_10: getWindowAvg(homeStats.shotsOnTarget, 10),
          home_corners_for_avg_10: getWindowAvg(homeStats.cornersFor, 10),
          home_corners_against_avg_10: getWindowAvg(homeStats.cornersAgainst, 10),
          home_fouls_for_avg_10: getWindowAvg(homeStats.fouls, 10),
          home_cards_for_avg_10: getWindowAvg(homeStats.cardsFor, 10),
          home_cards_against_avg_10: getWindowAvg(homeStats.cardsAgainst, 10),
          
          home_goals_for_avg_20: getWindowAvg(homeStats.goalsFor, 20),
          home_goals_against_avg_20: getWindowAvg(homeStats.goalsAgainst, 20),
          home_xg_for_avg_20: getWindowAvg(homeStats.xgFor, 20),
          home_xg_against_avg_20: getWindowAvg(homeStats.xgAgainst, 20),
          home_shots_for_avg_20: getWindowAvg(homeStats.shots, 20),
          home_shots_on_target_avg_20: getWindowAvg(homeStats.shotsOnTarget, 20),
          home_corners_for_avg_20: getWindowAvg(homeStats.cornersFor, 20),
          home_corners_against_avg_20: getWindowAvg(homeStats.cornersAgainst, 20),
          home_fouls_for_avg_20: getWindowAvg(homeStats.fouls, 20),
          home_cards_for_avg_20: getWindowAvg(homeStats.cardsFor, 20),
          home_cards_against_avg_20: getWindowAvg(homeStats.cardsAgainst, 20),
          
          // Away team rolling features
          away_goals_for_avg_5: getWindowAvg(awayStats.goalsFor, 5),
          away_goals_against_avg_5: getWindowAvg(awayStats.goalsAgainst, 5),
          away_xg_for_avg_5: getWindowAvg(awayStats.xgFor, 5),
          away_xg_against_avg_5: getWindowAvg(awayStats.xgAgainst, 5),
          away_shots_for_avg_5: getWindowAvg(awayStats.shots, 5),
          away_shots_on_target_avg_5: getWindowAvg(awayStats.shotsOnTarget, 5),
          away_corners_for_avg_5: getWindowAvg(awayStats.cornersFor, 5),
          away_corners_against_avg_5: getWindowAvg(awayStats.cornersAgainst, 5),
          away_fouls_for_avg_5: getWindowAvg(awayStats.fouls, 5),
          away_cards_for_avg_5: getWindowAvg(awayStats.cardsFor, 5),
          away_cards_against_avg_5: getWindowAvg(awayStats.cardsAgainst, 5),
          
          away_goals_for_avg_10: getWindowAvg(awayStats.goalsFor, 10),
          away_goals_against_avg_10: getWindowAvg(awayStats.goalsAgainst, 10),
          away_xg_for_avg_10: getWindowAvg(awayStats.xgFor, 10),
          away_xg_against_avg_10: getWindowAvg(awayStats.xgAgainst, 10),
          away_shots_for_avg_10: getWindowAvg(awayStats.shots, 10),
          away_shots_on_target_avg_10: getWindowAvg(awayStats.shotsOnTarget, 10),
          away_corners_for_avg_10: getWindowAvg(awayStats.cornersFor, 10),
          away_corners_against_avg_10: getWindowAvg(awayStats.cornersAgainst, 10),
          away_fouls_for_avg_10: getWindowAvg(awayStats.fouls, 10),
          away_cards_for_avg_10: getWindowAvg(awayStats.cardsFor, 10),
          away_cards_against_avg_10: getWindowAvg(awayStats.cardsAgainst, 10),
          
          away_goals_for_avg_20: getWindowAvg(awayStats.goalsFor, 20),
          away_goals_against_avg_20: getWindowAvg(awayStats.goalsAgainst, 20),
          away_xg_for_avg_20: getWindowAvg(awayStats.xgFor, 20),
          away_xg_against_avg_20: getWindowAvg(awayStats.xgAgainst, 20),
          away_shots_for_avg_20: getWindowAvg(awayStats.shots, 20),
          away_shots_on_target_avg_20: getWindowAvg(awayStats.shotsOnTarget, 20),
          away_corners_for_avg_20: getWindowAvg(awayStats.cornersFor, 20),
          away_corners_against_avg_20: getWindowAvg(awayStats.cornersAgainst, 20),
          away_fouls_for_avg_20: getWindowAvg(awayStats.fouls, 20),
          away_cards_for_avg_20: getWindowAvg(awayStats.cardsFor, 20),
          away_cards_against_avg_20: getWindowAvg(awayStats.cardsAgainst, 20),
          
          // League context
          league_avg_goals: leagueStats.avgGoals,
          league_over25_rate: leagueStats.over25Rate,
          league_btts_rate: leagueStats.bttsRate,
          league_avg_corners: leagueStats.avgCorners,
          league_avg_cards: leagueStats.avgCards,
          
          // Derived matchup features (using 10-game window)
          combined_goals_for_10: (getWindowAvg(homeStats.goalsFor, 10) || 0) + (getWindowAvg(awayStats.goalsFor, 10) || 0),
          combined_xg_for_10: (getWindowAvg(homeStats.xgFor, 10) || 0) + (getWindowAvg(awayStats.xgFor, 10) || 0),
          combined_shots_10: (getWindowAvg(homeStats.shots, 10) || 0) + (getWindowAvg(awayStats.shots, 10) || 0),
          combined_corners_10: (getWindowAvg(homeStats.cornersFor, 10) || 0) + (getWindowAvg(awayStats.cornersFor, 10) || 0),
          combined_cards_10: (getWindowAvg(homeStats.cardsFor, 10) || 0) + (getWindowAvg(awayStats.cardsFor, 10) || 0),
          xg_diff_10: (getWindowAvg(homeStats.xgFor, 10) || 0) - (getWindowAvg(awayStats.xgFor, 10) || 0),
          defense_weakness_index_10: (getWindowAvg(homeStats.goalsAgainst, 10) || 0) + (getWindowAvg(awayStats.goalsAgainst, 10) || 0),

          // ── POWER LAYER: Cards & Corners Derived Features ─────────────────
          // Cards — fouls momentum: combined recent foul intensity (L5)
          fouls_momentum_5: (getWindowAvg(homeStats.fouls, 5) || 0) + (getWindowAvg(awayStats.fouls, 5) || 0),
          // Cards — discipline imbalance: home cards vs away cards (L10)
          discipline_gap_10: (getWindowAvg(homeStats.cardsFor, 10) || 0) - (getWindowAvg(awayStats.cardsFor, 10) || 0),
          // Corners — shot pressure: combined shot volume both teams (L10)
          shot_pressure_10: (getWindowAvg(homeStats.shots, 10) || 0) + (getWindowAvg(awayStats.shots, 10) || 0)
                          + (getWindowAvg(homeStats.shotsOnTarget, 10) || 0) + (getWindowAvg(awayStats.shotsOnTarget, 10) || 0),
          // Corners/Cards — tempo index: fouls + shots combined L10 (match intensity proxy)
          tempo_index_10: (getWindowAvg(homeStats.fouls, 10) || 0) + (getWindowAvg(awayStats.fouls, 10) || 0)
                        + (getWindowAvg(homeStats.shots, 10) || 0) + (getWindowAvg(awayStats.shots, 10) || 0),
          
          // Validation
          max_source_match_date: maxSourceDate,
          features_computed_at: new Date().toISOString(),
        };

        // Upsert to v2 table
        const { error: upsertError } = await supabase
          .from('ml_training_data_v2')
          .upsert(v2Record, { onConflict: 'fixture_id' });

        if (upsertError) {
          console.error(`❌ Error upserting ${fixture.fixture_id}:`, upsertError.message);
          errors++;
        } else {
          processed++;
        }

        // Log progress every 100 records
        if (processed % 100 === 0) {
          console.log(`  ✓ Processed ${processed}/${fixtures.length}`);
        }
      } catch (err) {
        console.error(`❌ Error processing fixture ${fixture.fixture_id}:`, err);
        errors++;
      }
    }

    const summary = {
      success: true,
      processed,
      errors,
      nextOffset: startOffset + batchSize,
      hasMore: fixtures.length === batchSize,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Feature computation complete:', summary);
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Feature computation error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Compute rolling stats for a team from their historical matches
 * CRITICAL: Only uses matches BEFORE the target fixture date (already filtered in query)
 */
function computeRollingStats(matches: any[], teamName: string): RollingStats {
  const stats: RollingStats = {
    goalsFor: [],
    goalsAgainst: [],
    xgFor: [],
    xgAgainst: [],
    shots: [],
    shotsOnTarget: [],
    cornersFor: [],
    cornersAgainst: [],
    fouls: [],
    cardsFor: [],
    cardsAgainst: [],
  };

  for (const match of matches) {
    const isHome = match.home_team === teamName;
    
    // Goals
    if (isHome) {
      stats.goalsFor.push(match.home_goals);
      stats.goalsAgainst.push(match.away_goals);
      stats.xgFor.push(match.home_xg);
      stats.xgAgainst.push(match.away_xg);
      stats.shots.push(match.home_total_shots);
      stats.shotsOnTarget.push(match.home_shots_on_goal);
      stats.cornersFor.push(match.home_corners);
      stats.cornersAgainst.push(match.away_corners);
      stats.fouls.push(match.home_fouls);
      stats.cardsFor.push((match.home_yellow_cards || 0) + (match.home_red_cards || 0));
      stats.cardsAgainst.push((match.away_yellow_cards || 0) + (match.away_red_cards || 0));
    } else {
      stats.goalsFor.push(match.away_goals);
      stats.goalsAgainst.push(match.home_goals);
      stats.xgFor.push(match.away_xg);
      stats.xgAgainst.push(match.home_xg);
      stats.shots.push(match.away_total_shots);
      stats.shotsOnTarget.push(match.away_shots_on_goal);
      stats.cornersFor.push(match.away_corners);
      stats.cornersAgainst.push(match.home_corners);
      stats.fouls.push(match.away_fouls);
      stats.cardsFor.push((match.away_yellow_cards || 0) + (match.away_red_cards || 0));
      stats.cardsAgainst.push((match.home_yellow_cards || 0) + (match.home_red_cards || 0));
    }
  }

  return stats;
}

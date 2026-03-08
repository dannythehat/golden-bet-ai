import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * COMPUTE LEAGUE STATS
 *
 * Aggregates team_rolling_stats into per-league averages.
 * Gives The Gaffer league-level context:
 *   "La Liga averages 2.6 total goals, 58% BTTS, 10.2 corners"
 *
 * Run daily after compute-rolling-stats.
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('📊 Computing league-level rolling stats...');

    // Fetch all team rolling stats (min 6 matches)
    const { data: teams, error } = await supabase
      .from('team_rolling_stats')
      .select('league, region, matches_used, avg_goals_scored, avg_goals_conceded, avg_total_goals, over_15_goals_pct, over_25_goals_pct, over_35_goals_pct, btts_pct, clean_sheet_pct, avg_corners_for, avg_corners_against, avg_total_corners, over_85_corners_pct, over_95_corners_pct, over_105_corners_pct, avg_cards_for, avg_cards_against, avg_total_cards, over_25_cards_pct, over_35_cards_pct, over_45_cards_pct, failed_to_score_pct, home_avg_goals_scored, home_avg_goals_conceded, home_avg_total_goals, home_over_25_goals_pct, home_btts_pct, home_avg_corners_for, home_avg_corners_against, home_avg_total_corners, home_over_95_corners_pct, home_avg_cards_for, home_avg_cards_against, home_avg_total_cards, home_over_35_cards_pct, away_avg_goals_scored, away_avg_goals_conceded, away_avg_total_goals, away_over_25_goals_pct, away_btts_pct, away_avg_corners_for, away_avg_corners_against, away_avg_total_corners, away_over_95_corners_pct, away_avg_cards_for, away_avg_cards_against, away_avg_total_cards, away_over_35_cards_pct')
      .gte('matches_used', 6);

    if (error) throw error;
    if (!teams?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No teams with enough data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Group by league
    const leagueMap = new Map<string, { region: string; teams: any[] }>();
    for (const t of teams) {
      if (!leagueMap.has(t.league)) {
        leagueMap.set(t.league, { region: t.region, teams: [] });
      }
      leagueMap.get(t.league)!.teams.push(t);
    }

    const upserts: any[] = [];

    for (const [league, { region, teams: leagueTeams }] of leagueMap) {
      if (leagueTeams.length < 4) continue; // skip tiny leagues

      const n = leagueTeams.length;
      const avg = (field: string) => {
        const vals = leagueTeams.map((t: any) => Number(t[field]) || 0);
        return parseFloat((vals.reduce((a: number, b: number) => a + b, 0) / n).toFixed(2));
      };

      upserts.push({
        league,
        region,
        matches_sampled: leagueTeams.reduce((sum: number, t: any) => sum + (t.matches_used || 0), 0),

        // Goals
        avg_home_goals: avg('home_avg_goals_scored'),
        avg_away_goals: avg('away_avg_goals_scored'),
        avg_total_goals: avg('avg_total_goals'),
        over_15_goals_pct: Math.round(avg('over_15_goals_pct')),
        over_25_goals_pct: Math.round(avg('over_25_goals_pct')),
        over_35_goals_pct: Math.round(avg('over_35_goals_pct')),
        btts_pct: Math.round(avg('btts_pct')),
        clean_sheet_pct: Math.round(avg('clean_sheet_pct')),

        // Corners
        avg_home_corners: avg('home_avg_corners_for'),
        avg_away_corners: avg('away_avg_corners_for'),
        avg_total_corners: avg('avg_total_corners'),
        over_85_corners_pct: Math.round(avg('over_85_corners_pct')),
        over_95_corners_pct: Math.round(avg('over_95_corners_pct')),
        over_105_corners_pct: Math.round(avg('over_105_corners_pct')),

        // Cards
        avg_home_cards: avg('home_avg_cards_for'),
        avg_away_cards: avg('away_avg_cards_for'),
        avg_total_cards: avg('avg_total_cards'),
        over_25_cards_pct: Math.round(avg('over_25_cards_pct')),
        over_35_cards_pct: Math.round(avg('over_35_cards_pct')),
        over_45_cards_pct: Math.round(avg('over_45_cards_pct')),

        // Scoring rates
        home_scored_pct: Math.round(100 - avg('failed_to_score_pct')),
        away_scored_pct: Math.round(100 - avg('failed_to_score_pct')),

        last_updated: new Date().toISOString(),
      });
    }

    // Batch upsert
    if (upserts.length > 0) {
      const { error: upsertErr } = await supabase
        .from('league_rolling_stats')
        .upsert(upserts, { onConflict: 'league' });
      if (upsertErr) throw upsertErr;
    }

    console.log(`✅ Computed league stats for ${upserts.length} leagues`);

    return new Response(JSON.stringify({
      success: true,
      leaguesComputed: upserts.length,
      sampleLeagues: upserts.slice(0, 5).map(l => ({
        league: l.league,
        avgGoals: l.avg_total_goals,
        btts: l.btts_pct,
        avgCorners: l.avg_total_corners,
        avgCards: l.avg_total_cards,
      })),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('League Stats Error:', msg);
    return new Response(JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

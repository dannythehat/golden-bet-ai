import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function avg(arr: (number | null)[]): number | null {
  const valid = arr.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10000) / 10000;
}

function l10(arr: (number | null)[]): number | null {
  return avg(arr.slice(0, 10));
}

function safeDiv(num: number | null, den: number | null, fallback = 0): number | null {
  if (num === null || den === null) return null;
  if (den === 0 || Math.abs(den) < 0.001) return fallback;
  return Math.round((num / den) * 10000) / 10000;
}

interface Rolling {
  xg: (number|null)[]; xga: (number|null)[]; npxg: (number|null)[]; xgot: (number|null)[];
  xgOpenPlay: (number|null)[]; xgSetPlay: (number|null)[]; xgCorners: (number|null)[];
  xpts: (number|null)[]; xgd: (number|null)[]; goalsFor: (number|null)[]; goalsAgainst: (number|null)[];
  shots: (number|null)[]; shotsOnTarget: (number|null)[]; cornersFor: (number|null)[];
  cornersAgainst: (number|null)[]; cards: (number|null)[]; fouls: (number|null)[];
  possession: (number|null)[];
}

function computeRolling(matches: any[], team: string): Rolling {
  const r: Rolling = {
    xg:[], xga:[], npxg:[], xgot:[], xgOpenPlay:[], xgSetPlay:[],
    xgCorners:[], xpts:[], xgd:[], goalsFor:[], goalsAgainst:[],
    shots:[], shotsOnTarget:[], cornersFor:[], cornersAgainst:[],
    cards:[], fouls:[], possession:[]
  };
  for (const m of matches) {
    const h = m.home_team === team;
    r.xg.push(h ? m.home_xg : m.away_xg);
    r.xga.push(h ? (m.home_xga ?? m.away_xg) : (m.away_xga ?? m.home_xg));
    r.npxg.push(h ? m.home_npxg : m.away_npxg);
    r.xgot.push(h ? m.home_xgot : m.away_xgot);
    r.xgOpenPlay.push(h ? m.home_xg_open_play : m.away_xg_open_play);
    r.xgSetPlay.push(h ? m.home_xg_set_play : m.away_xg_set_play);
    r.xgCorners.push(h ? m.home_xg_corners : m.away_xg_corners);
    r.xpts.push(h ? m.home_xpts : m.away_xpts);
    r.xgd.push(h ? m.home_xgd : m.away_xgd);
    r.goalsFor.push(h ? m.home_goals : m.away_goals);
    r.goalsAgainst.push(h ? m.away_goals : m.home_goals);
    r.shots.push(h ? m.home_shots : m.away_shots);
    r.shotsOnTarget.push(h ? m.home_shots_on_target : m.away_shots_on_target);
    r.cornersFor.push(h ? m.home_corners : m.away_corners);
    r.cornersAgainst.push(h ? m.away_corners : m.home_corners);
    r.cards.push((h ? ((m.home_yellow_cards||0)+(m.home_red_cards||0)) : ((m.away_yellow_cards||0)+(m.away_red_cards||0))));
    r.fouls.push(h ? m.home_fouls : m.away_fouls);
    r.possession.push(h ? m.home_possession : m.away_possession);
  }
  return r;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 50;
    const startOffset = body.startOffset || 0;

    console.log(`🧠 Feature compute: offset=${startOffset}, batch=${batchSize}`);

    // Fetch fixtures to process
    const { data: fixtures, error: fetchErr } = await supabase
      .from('sportmonks_matches')
      .select('fixture_id, fixture_date, home_team, away_team, league, region, home_goals, away_goals, total_goals, total_corners, total_cards, over_25_hit, btts_hit, over_95_corners_hit, over_35_cards_hit')
      .order('fixture_date', { ascending: true })
      .range(startOffset, startOffset + batchSize - 1);

    if (fetchErr) throw fetchErr;
    if (!fixtures?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No more fixtures', processed: 0, hasMore: false }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Pre-fetch ALL matches once (sorted desc by date) to avoid per-fixture queries
    const { data: allMatches } = await supabase
      .from('sportmonks_matches')
      .select('*')
      .order('fixture_date', { ascending: false })
      .limit(1000);

    const matches = allMatches || [];

    // Pre-compute league stats
    const leagueStats = new Map<string, any>();
    const leagueGroups = new Map<string, any[]>();
    for (const m of matches) {
      const lg = leagueGroups.get(m.league) || [];
      lg.push(m);
      leagueGroups.set(m.league, lg);
    }
    for (const [league, lm] of leagueGroups) {
      const goals = lm.map(m => m.total_goals).filter((v): v is number => v !== null);
      const xgs = lm.flatMap(m => [m.home_xg, m.away_xg]).filter((v): v is number => v !== null);
      leagueStats.set(league, {
        avgGoals: avg(goals),
        avgXg: avg(xgs),
        over25Rate: lm.length ? Math.round((lm.filter(m => m.over_25_hit).length / lm.length) * 10000) / 10000 : null,
        bttsRate: lm.length ? Math.round((lm.filter(m => m.btts_hit).length / lm.length) * 10000) / 10000 : null,
        avgCorners: avg(lm.map(m => m.total_corners).filter((v): v is number => v !== null)),
        avgCards: avg(lm.map(m => m.total_cards).filter((v): v is number => v !== null)),
      });
    }

    let processed = 0, errors = 0;
    const records: any[] = [];

    for (const fix of fixtures) {
      try {
        // Get last 15 matches for each team BEFORE this fixture (leak-free)
        const homeMatches = matches
          .filter(m => (m.home_team === fix.home_team || m.away_team === fix.home_team) && m.fixture_date < fix.fixture_date)
          .slice(0, 15);
        const awayMatches = matches
          .filter(m => (m.home_team === fix.away_team || m.away_team === fix.away_team) && m.fixture_date < fix.fixture_date)
          .slice(0, 15);

        const hR = computeRolling(homeMatches, fix.home_team);
        const aR = computeRolling(awayMatches, fix.away_team);
        const ls = leagueStats.get(fix.league) || { avgGoals:null, avgXg:null, over25Rate:null, bttsRate:null, avgCorners:null, avgCards:null };

        const allDates = [...homeMatches, ...awayMatches].map(m => m.fixture_date).filter(Boolean).sort().reverse();

        // Compute L10 base values for derived features
        const hXg = l10(hR.xg); const aXg = l10(aR.xg);
        const hShots = l10(hR.shots); const aShots = l10(aR.shots);
        const hSoT = l10(hR.shotsOnTarget); const aSoT = l10(aR.shotsOnTarget);
        const hCorners = l10(hR.cornersFor); const aCorners = l10(aR.cornersFor);
        const hCards = l10(hR.cards); const aCards = l10(aR.cards);
        const hFouls = l10(hR.fouls); const aFouls = l10(aR.fouls);
        const hPoss = l10(hR.possession); const aPoss = l10(aR.possession);
        const hGoals = l10(hR.goalsFor); const aGoals = l10(aR.goalsFor);

        records.push({
          fixture_id: fix.fixture_id, fixture_date: fix.fixture_date,
          home_team: fix.home_team, away_team: fix.away_team,
          league: fix.league, region: fix.region,
          home_goals: fix.home_goals, away_goals: fix.away_goals,
          total_goals: fix.total_goals, total_corners: fix.total_corners, total_cards: fix.total_cards,
          over_25_hit: fix.over_25_hit, btts_hit: fix.btts_hit,
          over_95_corners_hit: fix.over_95_corners_hit, over_35_cards_hit: fix.over_35_cards_hit,
          // Standard rolling features
          home_xg_l10: hXg, home_xga_l10: l10(hR.xga), home_npxg_l10: l10(hR.npxg),
          home_xgot_l10: l10(hR.xgot), home_xg_open_play_l10: l10(hR.xgOpenPlay),
          home_xg_set_play_l10: l10(hR.xgSetPlay), home_xg_corners_l10: l10(hR.xgCorners),
          home_xpts_l10: l10(hR.xpts), home_xgd_l10: l10(hR.xgd),
          home_goals_for_l10: hGoals, home_goals_against_l10: l10(hR.goalsAgainst),
          home_shots_l10: hShots, home_shots_on_target_l10: hSoT,
          home_corners_for_l10: hCorners, home_corners_against_l10: l10(hR.cornersAgainst),
          home_cards_l10: hCards, home_fouls_l10: hFouls, home_possession_l10: hPoss,
          away_xg_l10: aXg, away_xga_l10: l10(aR.xga), away_npxg_l10: l10(aR.npxg),
          away_xgot_l10: l10(aR.xgot), away_xg_open_play_l10: l10(aR.xgOpenPlay),
          away_xg_set_play_l10: l10(aR.xgSetPlay), away_xg_corners_l10: l10(aR.xgCorners),
          away_xpts_l10: l10(aR.xpts), away_xgd_l10: l10(aR.xgd),
          away_goals_for_l10: aGoals, away_goals_against_l10: l10(aR.goalsAgainst),
          away_shots_l10: aShots, away_shots_on_target_l10: aSoT,
          away_corners_for_l10: aCorners, away_corners_against_l10: l10(aR.cornersAgainst),
          away_cards_l10: aCards, away_fouls_l10: aFouls, away_possession_l10: aPoss,
          // Combined features
          combined_xg_l10: (hXg||0) + (aXg||0) || null,
          combined_npxg_l10: (l10(hR.npxg)||0) + (l10(aR.npxg)||0) || null,
          combined_xgot_l10: (l10(hR.xgot)||0) + (l10(aR.xgot)||0) || null,
          combined_goals_l10: (hGoals||0) + (aGoals||0) || null,
          combined_shots_l10: (hShots||0) + (aShots||0) || null,
          combined_corners_l10: (hCorners||0) + (aCorners||0) || null,
          combined_cards_l10: (hCards||0) + (aCards||0) || null,
          xg_diff_l10: (hXg||0) - (aXg||0) || null,
          defense_weakness_xga_l10: (l10(hR.xga)||0) + (l10(aR.xga)||0) || null,
          // League stats
          league_avg_goals: ls.avgGoals, league_avg_xg: ls.avgXg,
          league_over25_rate: ls.over25Rate, league_btts_rate: ls.bttsRate,
          league_avg_corners: ls.avgCorners, league_avg_cards: ls.avgCards,
          // ═══ NEW DERIVED FEATURES ═══
          // Efficiency ratios
          xg_per_shot_home_l10: safeDiv(hXg, hShots),
          xg_per_shot_away_l10: safeDiv(aXg, aShots),
          shots_on_target_ratio_home_l10: safeDiv(hSoT, hShots),
          shots_on_target_ratio_away_l10: safeDiv(aSoT, aShots),
          shots_per_possession_home_l10: safeDiv(hShots, hPoss),
          shots_per_possession_away_l10: safeDiv(aShots, aPoss),
          // Set-piece threat
          corners_per_shot_home_l10: safeDiv(hCorners, hShots),
          corners_per_shot_away_l10: safeDiv(aCorners, aShots),
          goals_per_corner_home_l10: safeDiv(hGoals, hCorners),
          goals_per_corner_away_l10: safeDiv(aGoals, aCorners),
          // Aggression / discipline
          cards_per_foul_home_l10: safeDiv(hCards, hFouls),
          cards_per_foul_away_l10: safeDiv(aCards, aFouls),
          fouls_per_possession_home_l10: safeDiv(hFouls, hPoss),
          fouls_per_possession_away_l10: safeDiv(aFouls, aPoss),
          // Metadata
          max_source_match_date: allDates[0] || null,
          features_computed_at: new Date().toISOString(),
        });
        processed++;
      } catch (err) {
        console.error(`❌ Error ${fix.fixture_id}:`, err);
        errors++;
      }
    }

    // Batch upsert all records at once
    if (records.length > 0) {
      const { error: upsertErr } = await supabase
        .from('sportmonks_ml_features')
        .upsert(records, { onConflict: 'fixture_id' });
      if (upsertErr) {
        console.error('❌ Batch upsert error:', upsertErr.message);
        errors += records.length;
        processed = 0;
      }
    }

    console.log(`✅ Computed ${processed} features (incl. derived), ${errors} errors`);

    return new Response(JSON.stringify({
      success: true, processed, errors,
      nextOffset: startOffset + batchSize,
      hasMore: fixtures.length === batchSize,
      derived_features_added: [
        'xg_per_shot', 'shots_on_target_ratio', 'shots_per_possession',
        'corners_per_shot', 'goals_per_corner',
        'cards_per_foul', 'fouls_per_possession',
      ],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Feature computation error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

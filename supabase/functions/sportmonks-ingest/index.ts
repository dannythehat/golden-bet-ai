import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football';

// SportMonks stat type IDs
const STAT_IDS = {
  CORNERS: 34,
  SHOTS_TOTAL: 42,
  SHOTS_ON_TARGET: 86,
  FOULS: 56,
  YELLOW_CARDS: 84,
  RED_CARDS: 85,
  POSSESSION: 45,
  SHOTS_OFF_TARGET: 41,
};

// xG type IDs from SportMonks Expected endpoint
const XG_TYPES = {
  XG: 5304,           // Standard xG
  NPXG: 5305,         // Non-penalty xG (approximate - check docs)
  XGOT: 5306,         // xG on target
  XG_OPEN_PLAY: 5307, // xG open play
  XG_SET_PLAY: 5308,  // xG set play
  XG_CORNERS: 5309,   // xG from corners
  XPTS: 5310,         // Expected points
};

async function fetchWithRetry(url: string, maxRetries = 3): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const resp = await fetch(url);
      if (resp.status === 429) {
        const wait = Math.pow(2, attempt) * 2000;
        console.log(`⏳ Rate limited, waiting ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (!resp.ok) {
        console.error(`HTTP ${resp.status}: ${await resp.text()}`);
        return null;
      }
      return await resp.json();
    } catch (err) {
      console.error(`Fetch error (attempt ${attempt + 1}):`, err);
      if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 1000));
    }
  }
  return null;
}

function extractStat(statistics: any[], participantId: number, typeId: number): number | null {
  if (!statistics) return null;
  const stat = statistics.find(
    (s: any) => s.participant_id === participantId && s.type_id === typeId
  );
  return stat?.data?.value ?? null;
}

function extractXg(expected: any[], participantId: number, typeId: number = XG_TYPES.XG): number | null {
  if (!expected) return null;
  const xg = expected.find(
    (x: any) => x.participant_id === participantId && x.type_id === typeId
  );
  return xg?.data?.value ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SPORTMONKS_API_KEY = Deno.env.get('SPORTMONKS_API_KEY');
    if (!SPORTMONKS_API_KEY) throw new Error('SPORTMONKS_API_KEY not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const { startDate, endDate, leagueId, mode } = body;

    // Mode: 'date_range' (backfill) or 'single_date' (daily)
    if (mode === 'single_date' || (!startDate && !endDate)) {
      // Fetch today's matches
      const date = startDate || new Date().toISOString().split('T')[0];
      const result = await ingestDate(supabase, SPORTMONKS_API_KEY, date);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Backfill mode: process date range
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate required for date_range mode');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalProcessed = 0;
    let totalErrors = 0;
    let daysProcessed = 0;

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      
      try {
        const result = await ingestDate(supabase, SPORTMONKS_API_KEY, dateStr, leagueId);
        totalProcessed += result.processed;
        totalErrors += result.errors;
        daysProcessed++;

        if (daysProcessed % 7 === 0) {
          console.log(`📅 Progress: ${daysProcessed} days, ${totalProcessed} fixtures processed`);
        }
      } catch (err) {
        console.error(`❌ Error on ${dateStr}:`, err);
        totalErrors++;
      }

      // Rate limit: ~500ms between date calls
      await new Promise(r => setTimeout(r, 500));
      current.setDate(current.getDate() + 1);
    }

    return new Response(JSON.stringify({
      success: true,
      daysProcessed,
      totalProcessed,
      totalErrors,
      dateRange: { startDate, endDate },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ SportMonks ingest error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function ingestDate(
  supabase: any,
  apiKey: string,
  date: string,
  leagueId?: number
): Promise<{ processed: number; errors: number; skipped: number }> {
  // Fetch fixtures for this date with statistics and xG includes
  let url = `${SPORTMONKS_BASE}/fixtures/date/${date}?api_token=${apiKey}&include=statistics;participants;scores;xGFixture&per_page=100`;
  if (leagueId) url += `&filters=fixtureLeagues:${leagueId}`;

  let allFixtures: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchWithRetry(`${url}&page=${page}`);
    if (!data || !data.data) break;

    allFixtures = allFixtures.concat(data.data);

    if (data.pagination && data.pagination.has_more) {
      page++;
      await new Promise(r => setTimeout(r, 300));
    } else {
      hasMore = false;
    }
  }

  if (allFixtures.length === 0) {
    return { processed: 0, errors: 0, skipped: 0 };
  }

  let processed = 0;
  let errors = 0;
  let skipped = 0;

  for (const fixture of allFixtures) {
    try {
      // Only process finished matches (state_id typically 5 = FT)
      const stateId = fixture.state_id;
      if (stateId !== 5 && stateId !== 11) { // 5=FT, 11=AET
        skipped++;
        continue;
      }

      const participants = fixture.participants || [];
      const homeParticipant = participants.find((p: any) => p.meta?.location === 'home');
      const awayParticipant = participants.find((p: any) => p.meta?.location === 'away');

      if (!homeParticipant || !awayParticipant) {
        skipped++;
        continue;
      }

      const homeId = homeParticipant.id;
      const awayId = awayParticipant.id;
      const stats = fixture.statistics || [];
      // xG data lives under 'xgfixture' (lowercase) from the xGFixture include
      const expected = fixture.xgfixture || fixture.expected || [];

      // Extract scores from the scores array
      const scores = fixture.scores || [];
      const homeScore = scores.find((s: any) => s.participant_id === homeId && s.description === 'CURRENT')?.score?.goals;
      const awayScore = scores.find((s: any) => s.participant_id === awayId && s.description === 'CURRENT')?.score?.goals;

      const record = {
        fixture_id: String(fixture.id),
        sportmonks_fixture_id: fixture.id,
        fixture_date: date,
        league: fixture.league?.name || `League ${fixture.league_id}`,
        league_id: fixture.league_id,
        season_id: fixture.season_id,
        home_team: homeParticipant.name,
        away_team: awayParticipant.name,
        home_team_id: homeId,
        away_team_id: awayId,

        // Scores
        home_goals: homeScore ?? homeParticipant.meta?.winner ? null : null,
        away_goals: awayScore ?? null,

        // xG
        home_xg: extractXg(expected, homeId, XG_TYPES.XG),
        away_xg: extractXg(expected, awayId, XG_TYPES.XG),
        home_npxg: extractXg(expected, homeId, XG_TYPES.NPXG),
        away_npxg: extractXg(expected, awayId, XG_TYPES.NPXG),
        home_xgot: extractXg(expected, homeId, XG_TYPES.XGOT),
        away_xgot: extractXg(expected, awayId, XG_TYPES.XGOT),
        home_xg_open_play: extractXg(expected, homeId, XG_TYPES.XG_OPEN_PLAY),
        away_xg_open_play: extractXg(expected, awayId, XG_TYPES.XG_OPEN_PLAY),
        home_xg_set_play: extractXg(expected, homeId, XG_TYPES.XG_SET_PLAY),
        away_xg_set_play: extractXg(expected, awayId, XG_TYPES.XG_SET_PLAY),
        home_xg_corners: extractXg(expected, homeId, XG_TYPES.XG_CORNERS),
        away_xg_corners: extractXg(expected, awayId, XG_TYPES.XG_CORNERS),
        home_xpts: extractXg(expected, homeId, XG_TYPES.XPTS),
        away_xpts: extractXg(expected, awayId, XG_TYPES.XPTS),

        // Derived xG fields
        home_xga: extractXg(expected, awayId, XG_TYPES.XG), // home xGA = away xG
        away_xga: extractXg(expected, homeId, XG_TYPES.XG), // away xGA = home xG
        home_xgd: null as number | null,
        away_xgd: null as number | null,

        // Core stats
        home_shots: extractStat(stats, homeId, STAT_IDS.SHOTS_TOTAL),
        away_shots: extractStat(stats, awayId, STAT_IDS.SHOTS_TOTAL),
        home_shots_on_target: extractStat(stats, homeId, STAT_IDS.SHOTS_ON_TARGET),
        away_shots_on_target: extractStat(stats, awayId, STAT_IDS.SHOTS_ON_TARGET),
        home_corners: extractStat(stats, homeId, STAT_IDS.CORNERS),
        away_corners: extractStat(stats, awayId, STAT_IDS.CORNERS),
        home_yellow_cards: extractStat(stats, homeId, STAT_IDS.YELLOW_CARDS),
        away_yellow_cards: extractStat(stats, awayId, STAT_IDS.YELLOW_CARDS),
        home_red_cards: extractStat(stats, homeId, STAT_IDS.RED_CARDS),
        away_red_cards: extractStat(stats, awayId, STAT_IDS.RED_CARDS),
        home_fouls: extractStat(stats, homeId, STAT_IDS.FOULS),
        away_fouls: extractStat(stats, awayId, STAT_IDS.FOULS),
        home_possession: extractStat(stats, homeId, STAT_IDS.POSSESSION),
        away_possession: extractStat(stats, awayId, STAT_IDS.POSSESSION),
      };

      // Compute xGD
      if (record.home_xg !== null && record.away_xg !== null) {
        record.home_xgd = Math.round((record.home_xg - record.away_xg) * 10000) / 10000;
        record.away_xgd = Math.round((record.away_xg - record.home_xg) * 10000) / 10000;
      }

      // Fix goals if we couldn't extract from scores
      if (record.home_goals === null && homeParticipant.meta?.winner !== undefined) {
        // Try extracting from scores differently
        const ftScore = scores.find((s: any) => s.description === 'CURRENT');
        if (ftScore) {
          record.home_goals = ftScore.score?.participant === 'home' ? ftScore.score.goals : null;
        }
      }

      const { error: upsertError } = await supabase
        .from('sportmonks_matches')
        .upsert(record, { onConflict: 'fixture_id' });

      if (upsertError) {
        console.error(`❌ Upsert error for fixture ${fixture.id}:`, upsertError.message);
        errors++;
      } else {
        processed++;
      }
    } catch (err) {
      console.error(`❌ Error processing fixture ${fixture.id}:`, err);
      errors++;
    }
  }

  const xgCount = allFixtures.filter(f => (f.xgfixture || f.expected || []).length > 0).length;
  if (processed > 0) {
    console.log(`✅ ${date}: ${processed} fixtures ingested, ${skipped} skipped, ${errors} errors, ${xgCount} with xG data`);
  }

  return { processed, errors, skipped };
}

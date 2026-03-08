import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-upload-key',
};

// Simple upload key for basic protection (not a secret, just prevents random uploads)
const UPLOAD_KEY = 'footy-oracle-ml-2026';

// Canonical market keys (LOCKED CONTRACT)
// NOTE: Underscore keys are what the app consumes internally.
const ALLOWED_MARKETS = new Set([
  'over_2_5_goals',
  'btts',
  'over_9_5_corners',
  'over_3_5_cards',
]);

const API_BASE_URL = 'https://v3.football.api-sports.io';

function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

type NormalizedPrediction = {
  fixture_id: string;
  home_team: string;
  away_team: string;
  league: string;
  league_id: number;
  kickoff: string;
  markets: Record<string, { probability: number }>;
};

type UploadMarketRow = {
  fixture_id: string;
  market: string;
  probability: number;
};

function normalizeMarketRow(raw: any): UploadMarketRow | null {
  const fixtureId = String(raw?.fixture_id ?? raw?.fixtureId ?? '');
  if (!fixtureId || fixtureId === '0') return null;

  const market = raw?.market;
  const prob = asNumber(raw?.prob ?? raw?.probability);

  if (typeof market !== 'string' || prob === null) return null;
  if (market.toUpperCase() === 'TEST') return null;

  // Enforce canonical underscore market keys only
  if (!ALLOWED_MARKETS.has(market)) return null;

  // Strict probability range
  if (prob < 0 || prob > 1) return null;

  return {
    fixture_id: fixtureId,
    market,
    probability: prob,
  };
}

type FixtureMeta = {
  fixture_id: string;
  league_id: number;
  league: string;
  home_team: string;
  away_team: string;
  kickoff: string;
};

async function fetchFixturesForDate(date: string): Promise<Map<string, FixtureMeta>> {
  const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
  if (!API_KEY) throw new Error('API_FOOTBALL_KEY not configured');

  const apiUrl = `${API_BASE_URL}/fixtures?date=${encodeURIComponent(date)}`;
  console.log(`📡 ml-upload-predictions: Fetching fixtures for validation: ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`❌ API-Football fixtures fetch failed: ${response.status} ${response.statusText} | ${text}`);
    throw new Error(`API-Football fixtures fetch failed: ${response.statusText}`);
  }

  const json = JSON.parse(text);
  const rawFixtures = Array.isArray(json?.response) ? json.response : [];

  const map = new Map<string, FixtureMeta>();
  for (const r of rawFixtures) {
    const fixtureId = r?.fixture?.id;
    const kickoff = r?.fixture?.date;
    const leagueId = r?.league?.id;
    const leagueName = r?.league?.name;
    const homeTeam = r?.teams?.home?.name;
    const awayTeam = r?.teams?.away?.name;

    if (
      (typeof fixtureId !== 'number' && typeof fixtureId !== 'string') ||
      typeof kickoff !== 'string' ||
      typeof leagueId !== 'number' ||
      typeof leagueName !== 'string' ||
      typeof homeTeam !== 'string' ||
      typeof awayTeam !== 'string'
    ) {
      continue;
    }

    map.set(String(fixtureId), {
      fixture_id: String(fixtureId),
      league_id: leagueId,
      league: leagueName,
      home_team: homeTeam,
      away_team: awayTeam,
      kickoff,
    });
  }

  console.log(`✅ Fixture validation map size: ${map.size}`);
  return map;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Basic authentication via header
    const uploadKey = req.headers.get('x-upload-key');
    if (uploadKey !== UPLOAD_KEY) {
      console.error('❌ Invalid upload key');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid upload key. Include header: x-upload-key: footy-oracle-ml-2026' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the predictions data from request body
    const predictionsData = await req.json();
    
    // Validate required fields
    if (!predictionsData.date || !predictionsData.predictions) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required fields: date, predictions' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isISODate(predictionsData.date)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid date format. Expected YYYY-MM-DD',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!Array.isArray(predictionsData.predictions)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'predictions must be an array' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============ LOCKED UPLOAD CONTRACT ============
    // We accept ONLY per-market rows:
    //   { fixture_id, market, prob }
    // and we enrich the final stored file using API-Football fixtures for that date.

    // 1) Fetch fixtures source-of-truth for fixture_id validation + enrichment
    const fixturesById = await fetchFixturesForDate(predictionsData.date);
    if (fixturesById.size === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No fixtures returned by API-Football for date ${predictionsData.date}. Cannot validate fixture IDs.`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2) Normalize rows + enforce canonical markets + validate fixture_ids exist in the fixtures map
    const rows: UploadMarketRow[] = [];
    const rejected: { bad_shape: number; bad_market: number; bad_fixture_id: number } = {
      bad_shape: 0,
      bad_market: 0,
      bad_fixture_id: 0,
    };

    for (const raw of predictionsData.predictions) {
      // First validate shape/values; note: normalizeMarketRow also rejects non-canonical market keys.
      const n = normalizeMarketRow(raw);
      if (!n) {
        // Attempt to distinguish between bad market vs general shape for better diagnostics
        const market = raw?.market;
        if (typeof market === 'string' && !ALLOWED_MARKETS.has(market)) rejected.bad_market += 1;
        else rejected.bad_shape += 1;
        continue;
      }

      if (!fixturesById.has(n.fixture_id)) {
        rejected.bad_fixture_id += 1;
        continue;
      }

      rows.push(n);
    }

    // 3) Group rows into per-fixture normalized objects (what the app consumes)
    const grouped = new Map<string, { meta: FixtureMeta; markets: Record<string, { probability: number }> }>();
    for (const r of rows) {
      const meta = fixturesById.get(r.fixture_id);
      if (!meta) continue;

      const existing = grouped.get(r.fixture_id) ?? { meta, markets: {} };
      const current = existing.markets[r.market]?.probability;

      // If duplicates happen, keep the higher probability (more conservative for selection thresholds)
      if (typeof current !== 'number' || r.probability > current) {
        existing.markets[r.market] = { probability: r.probability };
      }

      grouped.set(r.fixture_id, existing);
    }

    const normalized: NormalizedPrediction[] = Array.from(grouped.values()).map((g) => ({
      fixture_id: g.meta.fixture_id,
      home_team: g.meta.home_team,
      away_team: g.meta.away_team,
      league: g.meta.league,
      league_id: g.meta.league_id,
      kickoff: g.meta.kickoff,
      markets: g.markets,
    }));

    if (normalized.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            `No valid predictions found after validation. Accepted markets are: ${Array.from(ALLOWED_MARKETS).join(', ')}. Also, fixture_id must match API-Football fixtures for ${predictionsData.date}.`,
          diagnostics: {
            submitted_rows: predictionsData.predictions.length,
            accepted_rows: rows.length,
            accepted_fixtures: 0,
            rejected,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Reject obvious test payload overwrites (DISTINCT FIXTURES, not rows)
    if (normalized.length < 3) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Refusing upload: only ${normalized.length} distinct fixture(s) matched today's fixtures. Need at least 3 to protect the live feed from test payloads.`,
          diagnostics: {
            submitted_rows: predictionsData.predictions.length,
            accepted_rows: rows.length,
            accepted_fixtures: normalized.length,
            rejected,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Add upload metadata
    const uploadData = {
      date: predictionsData.date,
      generated_at: typeof predictionsData.generated_at === 'string' ? predictionsData.generated_at : undefined,
      model_version: typeof predictionsData.model_version === 'string' ? predictionsData.model_version : undefined,
      predictions: normalized,
      uploaded_at: new Date().toISOString(),
      fixture_count: normalized.length,
      row_count: rows.length,
      accepted_markets: Array.from(ALLOWED_MARKETS),
      diagnostics: {
        submitted_rows: predictionsData.predictions.length,
        accepted_rows: rows.length,
        accepted_fixtures: normalized.length,
        rejected,
      },
    };

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert to JSON bytes
    const jsonContent = JSON.stringify(uploadData, null, 2);
    const encoder = new TextEncoder();
    const jsonBytes = encoder.encode(jsonContent);

    console.log(`📦 Uploading ${jsonBytes.length} bytes, ${uploadData.fixture_count} fixtures (${uploadData.row_count} rows)`);

    // Upload to storage with upsert (overwrite existing)
    const { data, error } = await supabase.storage
      .from('ml-models')
      .upload('latest/predictions_all_markets.json', jsonBytes, {
        contentType: 'application/json',
        upsert: true,
        cacheControl: 'public, max-age=1800',
      });

    if (error) {
      console.error('❌ Storage upload error:', error.message);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/ml-models/latest/predictions_all_markets.json`;
    
    console.log('=' .repeat(60));
    console.log('✅ UPLOAD SUCCESSFUL');
    console.log(`   Date: ${uploadData.date}`);
    console.log(`   Fixtures: ${uploadData.fixture_count}`);
    console.log(`   Rows: ${uploadData.row_count}`);
    console.log(`   Size: ${jsonBytes.length} bytes`);
    console.log(`   URL: ${publicUrl}`);
    console.log('=' .repeat(60));

    return new Response(JSON.stringify({
      success: true,
      message: 'UPLOAD SUCCESSFUL',
      date: uploadData.date,
      fixture_count: uploadData.fixture_count,
      row_count: uploadData.row_count,
      size_bytes: jsonBytes.length,
      public_url: publicUrl,
      uploaded_at: uploadData.uploaded_at,
      diagnostics: uploadData.diagnostics,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Upload error:', msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

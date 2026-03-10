import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Enriches sportmonks_ml_features with odds data from The Odds API.
 * Stores implied probabilities for over2.5, BTTS, and 1X2 markets.
 * Run daily before training to keep odds features fresh.
 */

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// Map leagues to Odds API sport keys
const SPORT_KEYS: Record<string, string> = {
  'Premier League': 'soccer_epl',
  'Championship': 'soccer_england_league1',
  'La Liga': 'soccer_spain_la_liga',
  'Bundesliga': 'soccer_germany_bundesliga',
  'Serie A': 'soccer_italy_serie_a',
  'Ligue 1': 'soccer_france_ligue_one',
  'Eredivisie': 'soccer_netherlands_eredivisie',
};

function normalizeTeam(name: string): string {
  return name.toLowerCase()
    .replace(/\bfc\b/gi, '').replace(/\bsc\b/gi, '')
    .replace(/\bafc\b/gi, '').replace(/\bcf\b/gi, '')
    .replace(/\bunited\b/gi, 'utd').replace(/\bcity\b/gi, '')
    .trim();
}

function impliedProb(odds: number): number {
  return odds > 0 ? Math.round((1 / odds) * 10000) / 10000 : 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const apiKey = Deno.env.get('ODDS_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ODDS_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const leagues = body.leagues || Object.keys(SPORT_KEYS);

    let totalUpdated = 0;
    let totalFetched = 0;

    for (const league of leagues) {
      const sportKey = SPORT_KEYS[league];
      if (!sportKey) continue;

      // Fetch totals (over/under) and h2h and btts
      const markets = ['totals', 'h2h'];
      const oddsMap = new Map<string, any>();

      for (const market of markets) {
        const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=uk&markets=${market}`;
        try {
          const resp = await fetch(url);
          if (!resp.ok) { console.error(`Odds API ${resp.status} for ${sportKey}/${market}`); continue; }
          const events = await resp.json();
          totalFetched += events.length;

          for (const event of events) {
            const key = `${normalizeTeam(event.home_team)}|||${normalizeTeam(event.away_team)}`;
            if (!oddsMap.has(key)) oddsMap.set(key, { home: event.home_team, away: event.away_team });
            const entry = oddsMap.get(key)!;

            for (const bk of event.bookmakers || []) {
              for (const mkt of bk.markets || []) {
                if (mkt.key === 'totals') {
                  for (const o of mkt.outcomes || []) {
                    if (o.name === 'Over' && o.point === 2.5) entry.odds_over25 = Math.max(entry.odds_over25 || 0, o.price);
                    if (o.name === 'Under' && o.point === 2.5) entry.odds_under25 = Math.max(entry.odds_under25 || 0, o.price);
                  }
                }
                if (mkt.key === 'h2h') {
                  for (const o of mkt.outcomes || []) {
                    if (o.name === event.home_team) entry.odds_home_win = Math.max(entry.odds_home_win || 0, o.price);
                    if (o.name === 'Draw') entry.odds_draw = Math.max(entry.odds_draw || 0, o.price);
                    if (o.name === event.away_team) entry.odds_away_win = Math.max(entry.odds_away_win || 0, o.price);
                  }
                }
              }
            }
          }
          // Rate limit
          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          console.error(`Error fetching ${sportKey}/${market}:`, err);
        }
      }

      // Match odds to sportmonks_ml_features records
      // Get upcoming features that lack odds
      const { data: features } = await supabase
        .from('sportmonks_ml_features')
        .select('fixture_id, home_team, away_team')
        .eq('league', league)
        .is('odds_over25', null)
        .order('fixture_date', { ascending: false })
        .limit(100);

      if (!features?.length) continue;

      for (const feat of features) {
        const normalH = normalizeTeam(feat.home_team);
        const normalA = normalizeTeam(feat.away_team);

        // Fuzzy match
        let matched: any = null;
        for (const [key, val] of oddsMap.entries()) {
          const [oh, oa] = key.split('|||');
          if ((oh.includes(normalH) || normalH.includes(oh)) &&
              (oa.includes(normalA) || normalA.includes(oa))) {
            matched = val;
            break;
          }
        }

        if (matched && (matched.odds_over25 || matched.odds_home_win)) {
          const update: Record<string, any> = {};
          if (matched.odds_over25) { update.odds_over25 = matched.odds_over25; update.implied_prob_over25 = impliedProb(matched.odds_over25); }
          if (matched.odds_under25) update.odds_under25 = matched.odds_under25;
          if (matched.odds_home_win) update.odds_home_win = matched.odds_home_win;
          if (matched.odds_draw) update.odds_draw = matched.odds_draw;
          if (matched.odds_away_win) update.odds_away_win = matched.odds_away_win;

          const { error } = await supabase
            .from('sportmonks_ml_features')
            .update(update)
            .eq('fixture_id', feat.fixture_id);

          if (!error) totalUpdated++;
        }
      }
    }

    console.log(`✅ Odds enrichment: fetched ${totalFetched} events, updated ${totalUpdated} features`);

    return new Response(JSON.stringify({
      success: true,
      events_fetched: totalFetched,
      features_updated: totalUpdated,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Odds enrichment error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

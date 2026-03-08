import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-upload-key',
};

/**
 * ML Daily Picks Endpoint v6
 *
 * 9 PICKS per day — 3 per market (Gold / Silver / Bronze):
 *   - Corners ML:  3 × Over 9.5 Corners
 *   - Goals ML:    3 × Over 2.5 Goals
 *   - Cards ML:    3 × Over 3.5 or Over 4.5 Cards (Bet365 odds required)
 *
 * Each market's picks are ranked by probability (highest = Gold).
 * The Gold pick from each market feeds the homepage "Golden Bets".
 *
 * P&L per market page:
 *   - 3 Doubles + 1 Treble from that market's Gold/Silver/Bronze (£40/day per market)
 *
 * Global Golden Bets P&L:
 *   - Uses only the 3 Gold picks (1 per market)
 *   - 3 Doubles + 1 Treble (£40/day)
 *
 * Also supports LEGACY format (1 pick per market) for backwards compatibility.
 */

const CORNERS_MARKET = 'over_9_5_corners';
const GOALS_MARKET   = 'over_2_5_goals';
const CARDS_MARKETS  = ['over_3_5_cards', 'over_4_5_cards'] as const;

type CardsMarket = typeof CARDS_MARKETS[number];

const MIN_ODDS = 1.60;
const MIN_EDGE_PERCENT = 0.20;

interface MatchContext {
  weather?: { condition?: string; temp_celsius?: number; wind_kmh?: number; rain_chance?: number };
  home_manager?: string;
  away_manager?: string;
  home_key_players_out?: string[];
  away_key_players_out?: string[];
  home_form?: string;
  away_form?: string;
  referee?: { name?: string; avg_cards?: number; strictness?: string };
  head_to_head?: { home_wins?: number; away_wins?: number; draws?: number; avg_goals?: number };
  talking_points?: string[];
}

interface GoldenBetPick {
  model: 'corners' | 'goals' | 'cards';
  fixture_id: string;
  league_id: number;
  competition: string;
  kickoff: string;
  home_team: string;
  away_team: string;
  market: string;
  probability: number;
  odds: number;
  bookmaker: string;
  implied_prob: number;
  edge: number;
  used_fallback_odds: boolean;
  context?: MatchContext;
  gaffer_comment?: string; // Optional: The Gaffer's specific comment for this pick
}

// New v6 payload: 3 picks per market
interface DailyPicksPayloadV6 {
  date: string;
  run_id: string;
  model_version: string;
  corners_picks: GoldenBetPick[];  // 3 picks, ordered by probability desc
  goals_picks: GoldenBetPick[];
  cards_picks: GoldenBetPick[];
}

// Legacy v5 payload: 1 pick per market
interface DailyPicksPayloadV5 {
  date: string;
  run_id: string;
  model_version: string;
  corners_pick: GoldenBetPick;
  goals_pick: GoldenBetPick;
  cards_pick: GoldenBetPick;
}

type DailyPicksPayload = DailyPicksPayloadV6 | DailyPicksPayloadV5;

function isV6Payload(p: DailyPicksPayload): p is DailyPicksPayloadV6 {
  return 'corners_picks' in p && Array.isArray((p as any).corners_picks);
}

const TIER_LABELS = ['Gold', 'Silver', 'Bronze'] as const;

function validatePick(pick: GoldenBetPick, expectedModel: string, expectedMarkets: string[], tier: string): string[] {
  const errors: string[] = [];
  const prefix = `${expectedModel} ${tier} pick`;

  if (pick.model !== expectedModel) {
    errors.push(`${prefix}: model field must be '${expectedModel}', got '${pick.model}'`);
  }
  if (!expectedMarkets.includes(pick.market)) {
    errors.push(`${prefix}: market must be one of [${expectedMarkets.join(', ')}], got '${pick.market}'`);
  }
  if (pick.odds < MIN_ODDS) {
    errors.push(`${prefix}: odds ${pick.odds} below minimum ${MIN_ODDS}`);
  }
  if (pick.edge < MIN_EDGE_PERCENT) {
    errors.push(`${prefix}: edge ${(pick.edge * 100).toFixed(1)}% below minimum 20%`);
  }
  if (expectedModel === 'cards' && !pick.bookmaker.toLowerCase().includes('bet365')) {
    errors.push(`${prefix}: bookmaker must be Bet365, got '${pick.bookmaker}'`);
  }
  if (!pick.fixture_id || !pick.home_team || !pick.away_team || !pick.kickoff) {
    errors.push(`${prefix}: missing required fields (fixture_id, home_team, away_team, kickoff)`);
  }

  return errors;
}

function generateGafferReasoning(pick: GoldenBetPick, tier: typeof TIER_LABELS[number]): string {
  // If The Gaffer provided a custom comment, use that
  if (pick.gaffer_comment && pick.gaffer_comment.trim().length > 10) {
    return pick.gaffer_comment.trim();
  }

  const ctx = pick.context || {};
  const parts: string[] = [];

  // Tier-specific opener
  const tierOpeners: Record<string, string[]> = {
    Gold: ["This is my top pick of the day — absolute banker.", "Number one selection, no messing about.", "My gold standard pick right here."],
    Silver: ["Strong second pick — not far behind the gold.", "Silver but could easily be gold on another day.", "My backup banker — still cracking value."],
    Bronze: ["Third pick but still worth a punt.", "The value here is why it makes the cut.", "Bronze doesn't mean weak — the edge is real."],
  };

  const openers = tierOpeners[tier] || tierOpeners.Bronze;
  parts.push(openers[Math.floor(Math.random() * openers.length)]);

  const marketPhrases: Record<string, string[]> = {
    [GOALS_MARKET]:   ["Goals, goals, goals.", "Attacking stats are outstanding here."],
    [CORNERS_MARKET]: ["Corners galore incoming.", "Wing play data is off the charts."],
    'over_3_5_cards': ["This ref loves a card.", "Feisty encounter ahead."],
    'over_4_5_cards': ["Cards flying everywhere.", "Disciplinary records are alarming."],
  };
  const phrases = marketPhrases[pick.market] || ["Numbers look strong."];
  parts.push(phrases[Math.floor(Math.random() * phrases.length)]);

  if (ctx.weather?.condition) {
    const cond = ctx.weather.condition.toLowerCase();
    if (cond.includes('rain') || cond.includes('storm')) {
      parts.push(`Wet conditions (${ctx.weather.temp_celsius}°C) could add drama.`);
    } else if (ctx.weather.wind_kmh && ctx.weather.wind_kmh > 30) {
      parts.push("Windy conditions might see more speculative crosses.");
    }
  }

  if (ctx.referee?.avg_cards && ctx.referee.avg_cards > 4) {
    parts.push(`${ctx.referee.name || 'The ref'} averages ${ctx.referee.avg_cards.toFixed(1)} cards per game.`);
  }

  if (ctx.head_to_head?.avg_goals && ctx.head_to_head.avg_goals > 2.5) {
    parts.push(`These two average ${ctx.head_to_head.avg_goals.toFixed(1)} goals in recent meetings.`);
  }

  if (ctx.talking_points?.length) {
    parts.push(ctx.talking_points[0]);
  }

  if (pick.edge >= 0.30) {
    parts.push("Massive value — the edge is significant.");
  } else if (pick.edge >= 0.20) {
    parts.push("Solid value — worth the stake.");
  }

  return parts.join(' ');
}

async function storeMatchIntelligence(
  supabase: SupabaseClient,
  pick: GoldenBetPick,
  date: string
): Promise<void> {
  if (!pick.context) return;
  const ctx = pick.context;

  const { error } = await supabase.from('match_intelligence').upsert({
    fixture_id: pick.fixture_id,
    fixture_date: date,
    home_team: pick.home_team,
    away_team: pick.away_team,
    league: pick.competition,
    kickoff: pick.kickoff,
    home_manager: ctx.home_manager || null,
    away_manager: ctx.away_manager || null,
    home_key_players_out: ctx.home_key_players_out || [],
    away_key_players_out: ctx.away_key_players_out || [],
    weather_condition: ctx.weather?.condition || null,
    weather_temp_celsius: ctx.weather?.temp_celsius || null,
    weather_wind_speed_kmh: ctx.weather?.wind_kmh || null,
    weather_rain_chance: ctx.weather?.rain_chance || null,
    referee_name: ctx.referee?.name || null,
    referee_avg_cards: ctx.referee?.avg_cards || null,
    referee_strictness: ctx.referee?.strictness || null,
    gaffer_talking_points: ctx.talking_points || [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'fixture_id' });

  if (error) console.warn(`Failed to store match intelligence for ${pick.fixture_id}:`, error.message);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const uploadKey = req.headers.get('x-upload-key');
    if (uploadKey !== 'footy-oracle-ml-2026') {
      return new Response(
        JSON.stringify({ error: 'Invalid upload key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const rawPayload = await req.json();

    // Detect v5 (legacy) vs v6 (new) format
    let allPicks: { pick: GoldenBetPick; tier: typeof TIER_LABELS[number]; model: string }[] = [];
    let payload: DailyPicksPayload;

    if (isV6Payload(rawPayload)) {
      payload = rawPayload as DailyPicksPayloadV6;
      const v6 = payload as DailyPicksPayloadV6;

      // Validate we have 1-3 picks per market
      const marketGroups: { picks: GoldenBetPick[]; model: string; markets: string[] }[] = [
        { picks: v6.corners_picks || [], model: 'corners', markets: [CORNERS_MARKET] },
        { picks: v6.goals_picks || [], model: 'goals', markets: [GOALS_MARKET] },
        { picks: v6.cards_picks || [], model: 'cards', markets: [...CARDS_MARKETS] },
      ];

      const validationErrors: string[] = [];

      for (const group of marketGroups) {
        if (group.picks.length === 0) {
          validationErrors.push(`${group.model}: at least 1 pick required`);
          continue;
        }
        if (group.picks.length > 3) {
          validationErrors.push(`${group.model}: maximum 3 picks, got ${group.picks.length}`);
          continue;
        }

        for (let i = 0; i < group.picks.length; i++) {
          const tier = TIER_LABELS[i];
          validationErrors.push(...validatePick(group.picks[i], group.model, group.markets, tier));
          allPicks.push({ pick: group.picks[i], tier, model: group.model });
        }
      }

      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: validationErrors }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

    } else {
      // Legacy v5 format — wrap each single pick as Gold
      payload = rawPayload as DailyPicksPayloadV5;
      const v5 = payload as DailyPicksPayloadV5;

      const validationErrors: string[] = [];
      if (!v5.corners_pick) validationErrors.push('corners_pick is required');
      if (!v5.goals_pick) validationErrors.push('goals_pick is required');
      if (!v5.cards_pick) validationErrors.push('cards_pick is required');

      if (v5.corners_pick) validationErrors.push(...validatePick(v5.corners_pick, 'corners', [CORNERS_MARKET], 'Gold'));
      if (v5.goals_pick) validationErrors.push(...validatePick(v5.goals_pick, 'goals', [GOALS_MARKET], 'Gold'));
      if (v5.cards_pick) validationErrors.push(...validatePick(v5.cards_pick, 'cards', [...CARDS_MARKETS], 'Gold'));

      if (validationErrors.length > 0) {
        return new Response(
          JSON.stringify({ error: 'Validation failed', details: validationErrors }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      allPicks = [
        { pick: v5.corners_pick, tier: 'Gold', model: 'corners' },
        { pick: v5.goals_pick, tier: 'Gold', model: 'goals' },
        { pick: v5.cards_pick, tier: 'Gold', model: 'cards' },
      ];
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Use YYYY-MM-DD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 Daily picks for ${payload.date} (run: ${payload.run_id}, model: ${payload.model_version}) — ${allPicks.length} picks`);
    for (const { pick, tier, model } of allPicks) {
      console.log(`   ${model} ${tier}: ${pick.home_team} vs ${pick.away_team} — ${pick.market} @ ${pick.odds}`);
    }

    // Clear existing pending picks for the day
    await supabase
      .from('golden_bet_history')
      .delete()
      .eq('prediction_date', payload.date)
      .eq('status', 'pending');

    // Store match intelligence for all picks
    for (const { pick } of allPicks) {
      await storeMatchIntelligence(supabase, pick, payload.date);
    }

    // Insert all picks — ml_confidence ordering creates Gold > Silver > Bronze naturally
    // We slightly reduce confidence for Silver/Bronze to ensure ordering is preserved
    const goldenBetRows = allPicks.map(({ pick, tier }) => {
      const tierPenalty = tier === 'Gold' ? 0 : tier === 'Silver' ? 0.001 : 0.002;
      return {
        fixture_id: pick.fixture_id,
        home_team: pick.home_team,
        away_team: pick.away_team,
        league: pick.competition,
        kickoff: pick.kickoff,
        market: pick.market,
        ml_confidence: Math.max(0, pick.probability - tierPenalty),
        bookmaker_odds: pick.odds,
        value_edge: pick.edge,
        gaffer_reasoning: generateGafferReasoning(pick, tier),
        prediction_date: payload.date,
        status: 'pending',
        stake: 10,
      };
    });

    const { error: insertError } = await supabase
      .from('golden_bet_history')
      .insert(goldenBetRows);

    if (insertError) {
      console.error('Error inserting picks:', insertError);
      throw insertError;
    }

    const summary: Record<string, any> = {};
    for (const { pick, tier, model } of allPicks) {
      if (!summary[model]) summary[model] = {};
      summary[model][tier.toLowerCase()] = {
        fixture: `${pick.home_team} vs ${pick.away_team}`,
        market: pick.market,
        odds: pick.odds,
      };
    }

    console.log(`✅ ${allPicks.length} picks stored — ${allPicks.length / 3} per market, Gold/Silver/Bronze structure ready`);

    return new Response(JSON.stringify({
      success: true,
      message: `${allPicks.length} picks stored successfully (Gold/Silver/Bronze per market)`,
      stored: {
        ...summary,
        date: payload.date,
        run_id: payload.run_id,
        model_version: payload.model_version,
        total_picks: allPicks.length,
        daily_stake_per_market: '£40 (3 doubles + 1 treble × £10 each)',
        daily_stake_golden: '£40 (Gold picks only: 3 doubles + 1 treble × £10 each)',
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('ML Daily Picks error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

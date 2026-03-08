import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

const TOP_LEAGUES = [39, 40, 140, 78, 135, 61, 94, 88, 203, 71, 128, 262, 253, 98, 307];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchFromApi(apiKey: string, endpoint: string, params: Record<string, string | number> = {}): Promise<any> {
  const queryString = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${API_BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!response.ok) throw new Error(`API error: ${response.statusText}`);
  const data = await response.json();
  return data.response || [];
}

interface Alert {
  fixtureId: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  market: string;
  homeSuccessPct: number;
  awaySuccessPct: number;
  combinedConfidence: number;
  alertType: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!API_KEY) throw new Error('API_FOOTBALL_KEY not configured');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`🔔 Gaffer Alerts: Scanning for today's top-30 matchups (${today})`);

    // Get all top-30 teams from regional_stats for each market
    const markets = ['over_2_5', 'btts_yes', 'over_9_5', 'over_3_5'];
    const marketToCategory: Record<string, string> = {
      'over_2_5': 'goals',
      'btts_yes': 'btts',
      'over_9_5': 'corners',
      'over_3_5': 'cards',
    };
    const marketLabels: Record<string, string> = {
      'over_2_5': 'Over 2.5 Goals',
      'btts_yes': 'BTTS Yes',
      'over_9_5': 'Over 9.5 Corners',
      'over_3_5': 'Over 3.5 Cards',
    };

    // Build top-30 sets per market
    const top30ByMarket: Record<string, Map<string, number>> = {};
    
    for (const market of markets) {
      const category = marketToCategory[market];
      const { data: topTeams } = await supabase
        .from('regional_stats')
        .select('team_name, success_percent')
        .eq('category', category)
        .eq('market', market)
        .order('success_percent', { ascending: false })
        .limit(30);

      top30ByMarket[market] = new Map();
      topTeams?.forEach(t => top30ByMarket[market].set(t.team_name.toLowerCase(), t.success_percent));
      console.log(`  📊 ${marketLabels[market]}: ${topTeams?.length || 0} top teams loaded`);
    }

    // Fetch today's fixtures
    await delay(500);
    const allFixtures = await fetchFromApi(API_KEY, '/fixtures', { date: today });
    
    const preferredLeagues = new Set(TOP_LEAGUES);
    const eligibleFixtures = allFixtures.filter((f: any) => 
      preferredLeagues.has(f.league?.id) &&
      f.teams?.home?.name &&
      f.teams?.away?.name
    );

    console.log(`  ⚽ ${eligibleFixtures.length} fixtures in top leagues today`);

    const alerts: Alert[] = [];

    for (const f of eligibleFixtures) {
      const homeTeam = f.teams.home.name.toLowerCase();
      const awayTeam = f.teams.away.name.toLowerCase();
      const fixtureId = String(f.fixture.id);

      for (const market of markets) {
        const top30 = top30ByMarket[market];
        const homeInTop30 = top30.has(homeTeam);
        const awayInTop30 = top30.has(awayTeam);

        if (homeInTop30 && awayInTop30) {
          // TOP 30 CLASH! Both teams in top 30 for this market
          const homePct = top30.get(homeTeam) || 0;
          const awayPct = top30.get(awayTeam) || 0;
          const combined = Math.round((homePct + awayPct) / 2);

          alerts.push({
            fixtureId,
            kickoff: f.fixture.date,
            homeTeam: f.teams.home.name,
            awayTeam: f.teams.away.name,
            league: f.league.name,
            market,
            homeSuccessPct: homePct,
            awaySuccessPct: awayPct,
            combinedConfidence: combined,
            alertType: 'top30_clash',
          });

          console.log(`  🚨 TOP 30 CLASH: ${f.teams.home.name} vs ${f.teams.away.name} for ${marketLabels[market]} (${homePct}% + ${awayPct}%)`);
        } else if ((homeInTop30 || awayInTop30) && (top30.get(homeTeam) || 0) >= 70 || (top30.get(awayTeam) || 0) >= 70) {
          // High-form team (70%+) playing
          const homePct = top30.get(homeTeam) || 0;
          const awayPct = top30.get(awayTeam) || 0;
          const maxPct = Math.max(homePct, awayPct);
          
          if (maxPct >= 70) {
            alerts.push({
              fixtureId,
              kickoff: f.fixture.date,
              homeTeam: f.teams.home.name,
              awayTeam: f.teams.away.name,
              league: f.league.name,
              market,
              homeSuccessPct: homePct,
              awaySuccessPct: awayPct,
              combinedConfidence: maxPct,
              alertType: 'high_form_matchup',
            });
          }
        }
      }
    }

    // Sort by combined confidence
    alerts.sort((a, b) => b.combinedConfidence - a.combinedConfidence);
    const topAlerts = alerts.slice(0, 10);

    console.log(`  📢 Generated ${topAlerts.length} Gaffer Alerts`);

    // Get Gaffer reasoning for top alerts
    if (topAlerts.length > 0 && LOVABLE_API_KEY) {
      const alertDescriptions = topAlerts.slice(0, 5).map((a, i) => 
        `Alert ${i + 1}: ${a.homeTeam} vs ${a.awayTeam} (${a.league})
Market: ${marketLabels[a.market]}
Type: ${a.alertType === 'top30_clash' ? 'TOP 30 CLASH - Both teams in top 30!' : 'High form team playing'}
Home: ${a.homeSuccessPct}%, Away: ${a.awaySuccessPct}%`
      ).join('\n\n');

      try {
        const response = await fetch(AI_GATEWAY_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [{
              role: 'user',
              content: `You are "The Gaffer" - a quirky football betting expert. Write a SHORT, punchy 20-25 word alert for each of these matches. Be excited, use British football slang. Focus on why this is a MUST-BET.

${alertDescriptions}

Return ONLY a JSON array with objects: { alertNumber: 1-5, text: "your alert" }`,
            }],
            temperature: 0.8,
            max_tokens: 800,
          }),
        });

        if (response.ok) {
          const aiResponse = await response.json();
          const content = aiResponse.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          
          if (jsonMatch) {
            const gafferTexts = JSON.parse(jsonMatch[0]);
            topAlerts.forEach((alert, i) => {
              const gafferEntry = gafferTexts.find((g: any) => g.alertNumber === i + 1);
              if (gafferEntry) {
                (alert as any).gafferText = gafferEntry.text;
              }
            });
          }
        }
      } catch (err) {
        console.error('AI error for alerts:', err);
      }
    }

    // Insert/update alerts in database
    for (const alert of topAlerts) {
      await supabase.from('gaffer_alerts').upsert({
        fixture_id: alert.fixtureId,
        fixture_date: today,
        kickoff: alert.kickoff,
        home_team: alert.homeTeam,
        away_team: alert.awayTeam,
        league: alert.league,
        alert_type: alert.alertType,
        market: alert.market,
        home_success_pct: alert.homeSuccessPct,
        away_success_pct: alert.awaySuccessPct,
        combined_confidence: alert.combinedConfidence,
        gaffer_alert_text: (alert as any).gafferText || `🔥 ${alert.alertType === 'top30_clash' ? 'TOP 30 CLASH!' : 'HIGH FORM TEAM!'} ${alert.homeTeam} vs ${alert.awayTeam} - Combined ${alert.combinedConfidence}%`,
        is_active: true,
        result: 'pending',
      }, { onConflict: 'fixture_id,market' });
    }

    const summary = {
      success: true,
      date: today,
      fixtures_scanned: eligibleFixtures.length,
      alerts_generated: topAlerts.length,
      top30_clashes: topAlerts.filter(a => a.alertType === 'top30_clash').length,
      high_form_matchups: topAlerts.filter(a => a.alertType === 'high_form_matchup').length,
      alerts: topAlerts,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Gaffer Alerts Complete');
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Gaffer Alerts Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

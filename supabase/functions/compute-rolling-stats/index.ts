import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Authoritative league-to-region map (same as ml-ingest-results + extras) ──
const LEAGUE_REGION_MAP: Record<string, string> = {
  // UK & Ireland
  'Premier League': 'uk', 'Championship': 'uk', 'League One': 'uk', 'League Two': 'uk',
  'National League': 'uk', 'FA Cup': 'uk', 'EFL Cup': 'uk', 'League Cup': 'uk',
  'Scottish Premiership': 'uk', 'Scottish Championship': 'uk', 'Scottish League One': 'uk',
  'Scottish League Two': 'uk', 'Premiership': 'uk', 'Welsh Premier League': 'uk',
  'NIFL Premiership': 'uk', 'Irish Premier Division': 'uk',
  'Premier Division': 'uk', 'First Division': 'uk',
  // European Top 5
  'La Liga': 'european', 'La Liga 2': 'european', 'Segunda División': 'european',
  'Bundesliga': 'european', '2. Bundesliga': 'european', '3. Liga': 'european',
  'Serie A': 'european', 'Serie B': 'european',
  'Ligue 1': 'european', 'Ligue 2': 'european',
  'Primeira Liga': 'european', 'Liga Portugal 2': 'european',
  // European Other
  'Eredivisie': 'european', 'Eerste Divisie': 'european',
  'Belgian Pro League': 'european', 'Belgian First Division B': 'european',
  'Super Lig': 'european', 'TFF 1. Lig': 'european', '2. Lig': 'european',
  '3. Lig - Group 1': 'european', '3. Lig - Group 2': 'european',
  '3. Lig - Group 3': 'european', '3. Lig - Group 4': 'european',
  'Super League Greece': 'european', 'Swiss Super League': 'european',
  'Swiss Challenge League': 'european', 'Austrian Bundesliga': 'european',
  'Austrian 2. Liga': 'european', 'Danish Superliga': 'european',
  'Danish 1st Division': 'european', '2. Division': 'european',
  'Allsvenskan': 'european', 'Superettan': 'european',
  'Eliteserien': 'european', 'OBOS-ligaen': 'european',
  'Ekstraklasa': 'european', 'I Liga': 'european',
  'Czech First League': 'european', 'Czech FNL': 'european',
  'Russian Premier': 'european', 'Russian FNL': 'european',
  'Ukrainian Premier': 'european', 'Croatian HNL': 'european',
  'Serbian Super Liga': 'european', 'Romanian Liga I': 'european',
  'Romanian Liga II': 'european', 'Bulgarian First League': 'european',
  'Hungarian NB I': 'european', 'Slovak Super Liga': 'european',
  'Slovenian PrvaLiga': 'european', 'Veikkausliiga': 'european',
  'Cypriot First Division': 'european', 'Israeli Premier': 'european',
  '1a Divisió': 'european', '1st Division': 'european',
  '2. Frauen Bundesliga': 'european',
  // UEFA competitions
  'Champions League': 'european', 'Europa League': 'european',
  'Conference League': 'european', 'UEFA Super Cup': 'european',
  'UEFA Youth League': 'european',
  // Americas
  'Serie A Brazil': 'americas', 'Serie B Brazil': 'americas',
  'Liga Argentina': 'americas', 'Primera Nacional': 'americas',
  'Liga MX': 'americas', 'Liga MX Expansion': 'americas',
  'Liga MX Femenil': 'americas',
  'MLS': 'americas', 'USL Championship': 'americas', 'US Open Cup': 'americas',
  'Colombian Primera A': 'americas', 'Colombian Primera B': 'americas',
  'Chilean Primera': 'americas', 'Chilean Primera B': 'americas',
  'Ecuadorian Serie A': 'americas', 'Peruvian Primera': 'americas',
  'Paraguayan Primera': 'americas', 'Venezuelan Primera': 'americas',
  'Guatemalan Liga': 'americas', 'Honduran Liga': 'americas',
  'Copa Libertadores': 'americas', 'Copa Sudamericana': 'americas',
  'Division Profesional - Apertura': 'americas', 'Primera División': 'americas',
  // Brazilian state leagues
  'Carioca - 1': 'americas', 'Paulista - A2': 'americas', 'Paulista - A3': 'americas',
  'Gaúcho - 1': 'americas', 'Catarinense - 1': 'americas', 'Cearense - 1': 'americas',
  'Baiano - 1': 'americas', 'Goiano - 1': 'americas', 'Pernambucano - 1': 'americas',
  'Paraense': 'americas', 'Paraibano': 'americas', 'Maranhense': 'americas',
  'Matogrossense': 'americas', 'Sergipano': 'americas', 'Potiguar': 'americas',
  'Capixaba': 'americas', 'Amazonense': 'americas', 'Acreano': 'americas',
  'Piauiense': 'americas', 'Sul-Matogrossense': 'americas',
  'Rondoniense': 'americas', 'Roraimense': 'americas', 'Brasiliense': 'americas',
  'Alagoano': 'americas', 'Copa Alagoas': 'americas', 'Copa Argentina': 'americas',
  // Asia & Oceania
  'J1 League': 'asia', 'J2 League': 'asia', 'J3 League': 'asia',
  'K League 1': 'asia', 'K League 2': 'asia',
  'Chinese Super League': 'asia', 'China League One': 'asia',
  'Saudi Pro League': 'asia', 'Saudi First Division': 'asia',
  'UAE Pro League': 'asia', 'Stars League': 'asia', 'QSL Cup': 'asia',
  'A-League': 'asia', 'ISL': 'asia', 'Santosh Trophy': 'asia',
  'Thai League 1': 'asia', 'Thai League 2': 'asia',
  'Liga 1': 'asia', 'Division 1': 'asia',
  'Persian Gulf Pro League': 'asia', 'Azadegan League': 'asia',
  'Pro League': 'asia',
  'AFC Champions League': 'asia', 'AFC Cup': 'asia',
  // Africa
  'CAF Champions League': 'africa', 'CAF Confederation Cup': 'africa',
  'NPFL': 'africa', 'Premier Soccer League': 'africa',
  'Botola Pro': 'africa', 'Botola 2': 'africa',
  'Ligue Professionnelle 1': 'africa', 'FKF Premier League': 'africa',
  'Diski Challenge': 'africa', 'Division One League': 'africa',
  'Second League': 'africa',
};

// Leagues to completely exclude from rolling stats
const EXCLUDED_LEAGUES = new Set([
  'Friendlies Clubs', 'Club Friendly', 'Friendlies', 'Club Friendlies',
  'ASEAN Club Championship',
]);

/** Validate and correct the region for a given league name */
function validateRegion(league: string, currentRegion: string): string {
  // Exclude friendlies entirely
  if (EXCLUDED_LEAGUES.has(league)) return '__exclude__';
  
  // Check authoritative map first
  const mapped = LEAGUE_REGION_MAP[league];
  if (mapped) return mapped;
  
  // If not in our map, trust the source region ONLY if it's not the default 'european'
  // This prevents unknown leagues defaulting to european
  if (currentRegion && currentRegion !== 'european' && currentRegion !== 'Unknown') {
    return currentRegion;
  }
  
  // For truly unknown leagues tagged as 'european', mark as 'other' to prevent contamination
  return 'other';
}

interface TeamMatch {
  fixture_date: string;
  home_team: string;
  away_team: string;
  home_goals: number | null;
  away_goals: number | null;
  home_xg: number | null;
  away_xg: number | null;
  home_shots: number | null;
  away_shots: number | null;
  home_shots_on_target: number | null;
  away_shots_on_target: number | null;
  home_corners: number | null;
  away_corners: number | null;
  home_yellow_cards: number | null;
  away_yellow_cards: number | null;
  home_red_cards: number | null;
  away_red_cards: number | null;
  home_fouls: number | null;
  away_fouls: number | null;
  home_possession: number | null;
  away_possession: number | null;
  total_goals: number | null;
  total_corners: number | null;
  total_cards: number | null;
  fixture_id: string;
}

function safeNum(v: number | null | undefined): number {
  return v != null && !isNaN(v) ? v : 0;
}

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

function computeFormString(results: Array<'W' | 'D' | 'L'>): string {
  return results.slice(0, 10).join('');
}

function computeStatsForTeam(matches: TeamMatch[], teamName: string) {
  const L = matches.length;
  if (L === 0) return null;

  const goalsScored: number[] = [];
  const goalsConceded: number[] = [];
  const totalGoals: number[] = [];
  const cornersFor: number[] = [];
  const cornersAgainst: number[] = [];
  const totalCorners: number[] = [];
  const cardsFor: number[] = [];
  const cardsAgainst: number[] = [];
  const totalCards: number[] = [];
  const xgFor: number[] = [];
  const xgAgainst: number[] = [];
  const shotsFor: number[] = [];
  const shotsOnTarget: number[] = [];
  const possession: number[] = [];
  const results: Array<'W' | 'D' | 'L'> = [];
  const matchIds: string[] = [];

  for (const m of matches) {
    const isHome = m.home_team === teamName;
    const gf = safeNum(isHome ? m.home_goals : m.away_goals);
    const ga = safeNum(isHome ? m.away_goals : m.home_goals);
    
    goalsScored.push(gf);
    goalsConceded.push(ga);
    totalGoals.push(safeNum(m.total_goals));
    
    const hc = isHome ? m.home_corners : m.away_corners;
    const ac = isHome ? m.away_corners : m.home_corners;
    if (hc != null && ac != null) {
      cornersFor.push(safeNum(hc));
      cornersAgainst.push(safeNum(ac));
      totalCorners.push(m.total_corners != null ? safeNum(m.total_corners) : safeNum(hc) + safeNum(ac));
    }
    
    const hyc = isHome ? m.home_yellow_cards : m.away_yellow_cards;
    const ayc = isHome ? m.away_yellow_cards : m.home_yellow_cards;
    const hrc = isHome ? m.home_red_cards : m.away_red_cards;
    const arc = isHome ? m.away_red_cards : m.home_red_cards;
    if (hyc != null || hrc != null) {
      const cf = safeNum(hyc) + safeNum(hrc);
      const ca = safeNum(ayc) + safeNum(arc);
      cardsFor.push(cf);
      cardsAgainst.push(ca);
      totalCards.push(m.total_cards != null ? safeNum(m.total_cards) : cf + ca);
    }
    
    if ((isHome ? m.home_xg : m.away_xg) != null) {
      xgFor.push(safeNum(isHome ? m.home_xg : m.away_xg));
      xgAgainst.push(safeNum(isHome ? m.away_xg : m.home_xg));
    }
    if ((isHome ? m.home_shots : m.away_shots) != null) {
      shotsFor.push(safeNum(isHome ? m.home_shots : m.away_shots));
    }
    if ((isHome ? m.home_shots_on_target : m.away_shots_on_target) != null) {
      shotsOnTarget.push(safeNum(isHome ? m.home_shots_on_target : m.away_shots_on_target));
    }
    if ((isHome ? m.home_possession : m.away_possession) != null) {
      possession.push(safeNum(isHome ? m.home_possession : m.away_possession));
    }
    
    if (gf > ga) results.push('W');
    else if (gf === ga) results.push('D');
    else results.push('L');
    
    matchIds.push(m.fixture_id);
  }

  const CL = cornersFor.length || 0;
  const KL = cardsFor.length || 0;

  return {
    matches_used: L,
    avg_goals_scored: avg(goalsScored),
    avg_goals_conceded: avg(goalsConceded),
    avg_total_goals: avg(totalGoals),
    over_15_goals_pct: pct(totalGoals.filter(g => g > 1).length, L),
    over_25_goals_pct: pct(totalGoals.filter(g => g > 2).length, L),
    over_35_goals_pct: pct(totalGoals.filter(g => g > 3).length, L),
    btts_pct: pct(matches.filter((_m, i) => goalsScored[i] > 0 && goalsConceded[i] > 0).length, L),
    clean_sheet_pct: pct(goalsConceded.filter(g => g === 0).length, L),
    failed_to_score_pct: pct(goalsScored.filter(g => g === 0).length, L),
    avg_corners_for: avg(cornersFor),
    avg_corners_against: avg(cornersAgainst),
    avg_total_corners: avg(totalCorners),
    over_85_corners_pct: CL > 0 ? pct(totalCorners.filter(c => c > 8).length, CL) : 0,
    over_95_corners_pct: CL > 0 ? pct(totalCorners.filter(c => c > 9).length, CL) : 0,
    over_105_corners_pct: CL > 0 ? pct(totalCorners.filter(c => c > 10).length, CL) : 0,
    avg_cards_for: avg(cardsFor),
    avg_cards_against: avg(cardsAgainst),
    avg_total_cards: avg(totalCards),
    over_25_cards_pct: KL > 0 ? pct(totalCards.filter(c => c > 2).length, KL) : 0,
    over_35_cards_pct: KL > 0 ? pct(totalCards.filter(c => c > 3).length, KL) : 0,
    over_45_cards_pct: KL > 0 ? pct(totalCards.filter(c => c > 4).length, KL) : 0,
    avg_shots_for: avg(shotsFor),
    avg_shots_on_target: avg(shotsOnTarget),
    avg_xg_for: avg(xgFor),
    avg_xg_against: avg(xgAgainst),
    avg_possession: avg(possession),
    wins: results.filter(r => r === 'W').length,
    draws: results.filter(r => r === 'D').length,
    losses: results.filter(r => r === 'L').length,
    form_string: computeFormString(results),
    match_ids: matchIds,
  };
}

/** Compute home-only or away-only split stats for a team */
function computeSplitStats(matches: TeamMatch[], teamName: string, venueFilter: 'home' | 'away') {
  const filtered = matches.filter(m => 
    venueFilter === 'home' ? m.home_team === teamName : m.away_team === teamName
  );
  
  if (filtered.length < 2) return null; // Need at least 2 venue-specific matches
  
  // Take last 10 venue-specific matches
  const sorted = filtered
    .sort((a, b) => b.fixture_date.localeCompare(a.fixture_date))
    .slice(0, 10);
  
  const L = sorted.length;
  const goalsScored: number[] = [];
  const goalsConceded: number[] = [];
  const totalGoals: number[] = [];
  const cornersFor: number[] = [];
  const cornersAgainst: number[] = [];
  const totalCorners: number[] = [];
  const cardsFor: number[] = [];
  const cardsAgainst: number[] = [];
  const totalCards: number[] = [];
  
  for (const m of sorted) {
    const isHome = m.home_team === teamName;
    const gf = safeNum(isHome ? m.home_goals : m.away_goals);
    const ga = safeNum(isHome ? m.away_goals : m.home_goals);
    goalsScored.push(gf);
    goalsConceded.push(ga);
    totalGoals.push(safeNum(m.total_goals));
    
    const hc = isHome ? m.home_corners : m.away_corners;
    const ac = isHome ? m.away_corners : m.home_corners;
    if (hc != null && ac != null) {
      cornersFor.push(safeNum(hc));
      cornersAgainst.push(safeNum(ac));
      totalCorners.push(m.total_corners != null ? safeNum(m.total_corners) : safeNum(hc) + safeNum(ac));
    }
    
    const hyc = isHome ? m.home_yellow_cards : m.away_yellow_cards;
    const hrc = isHome ? m.home_red_cards : m.away_red_cards;
    const ayc = isHome ? m.away_yellow_cards : m.home_yellow_cards;
    const arc = isHome ? m.away_red_cards : m.home_red_cards;
    if (hyc != null || hrc != null) {
      const cf = safeNum(hyc) + safeNum(hrc);
      const ca = safeNum(ayc) + safeNum(arc);
      cardsFor.push(cf);
      cardsAgainst.push(ca);
      totalCards.push(m.total_cards != null ? safeNum(m.total_cards) : cf + ca);
    }
  }
  
  const CL = cornersFor.length;
  const KL = cardsFor.length;
  
  return {
    matches_used: L,
    avg_goals_scored: avg(goalsScored),
    avg_goals_conceded: avg(goalsConceded),
    avg_total_goals: avg(totalGoals),
    over_25_goals_pct: pct(totalGoals.filter(g => g > 2).length, L),
    btts_pct: pct(sorted.filter((_m, i) => goalsScored[i] > 0 && goalsConceded[i] > 0).length, L),
    avg_corners_for: avg(cornersFor),
    avg_corners_against: avg(cornersAgainst),
    avg_total_corners: avg(totalCorners),
    over_95_corners_pct: CL > 0 ? pct(totalCorners.filter(c => c > 9).length, CL) : 0,
    avg_cards_for: avg(cardsFor),
    avg_cards_against: avg(cardsAgainst),
    avg_total_cards: avg(totalCards),
    over_35_cards_pct: KL > 0 ? pct(totalCards.filter(c => c > 3).length, KL) : 0,
  };
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
    const region = body.region || null;
    const source = body.source || 'both';

    console.log(`🔄 Computing rolling L10 stats (with home/away splits) | region=${region || 'all'} | source=${source}`);

    // Step 1: Gather recent matches (last 150 days)
    let allMatches: TeamMatch[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 150);
    const cutoff = cutoffDate.toISOString().split('T')[0];

    if (source === 'sportmonks' || source === 'both') {
      const { data } = await supabase
        .from('sportmonks_matches')
        .select('fixture_id, fixture_date, home_team, away_team, home_goals, away_goals, home_xg, away_xg, home_shots, away_shots, home_shots_on_target, away_shots_on_target, home_corners, away_corners, home_yellow_cards, away_yellow_cards, home_red_cards, away_red_cards, home_fouls, away_fouls, home_possession, away_possession, total_goals, total_corners, total_cards, league, region')
        .not('home_goals', 'is', null)
        .gte('fixture_date', cutoff)
        .order('fixture_date', { ascending: false })
        .limit(1000);
      if (data) allMatches.push(...(data as any[]));
    }

    if (source === 'api_football' || source === 'both') {
      let offset = 0;
      while (true) {
        const { data } = await supabase
          .from('ml_training_data')
          .select('fixture_id, fixture_date, home_team, away_team, home_goals, away_goals, home_xg, away_xg, home_total_shots, away_total_shots, home_shots_on_goal, away_shots_on_goal, home_corners, away_corners, home_yellow_cards, away_yellow_cards, home_red_cards, away_red_cards, home_fouls, away_fouls, home_possession, away_possession, total_goals, total_corners, total_cards, league, region')
          .not('home_goals', 'is', null)
          .gte('fixture_date', cutoff)
          .order('fixture_date', { ascending: false })
          .range(offset, offset + 999);
        if (!data || data.length === 0) break;
        const normalized = data.map((m: any) => ({
          ...m,
          home_shots: m.home_total_shots,
          away_shots: m.away_total_shots,
          home_shots_on_target: m.home_shots_on_goal,
          away_shots_on_target: m.away_shots_on_goal,
          home_possession: m.home_possession ? parseFloat(m.home_possession) : null,
          away_possession: m.away_possession ? parseFloat(m.away_possession) : null,
        }));
        allMatches.push(...normalized);
        console.log(`  📥 Fetched page ${offset / 1000 + 1}: ${data.length} matches`);
        if (data.length < 1000) break;
        offset += 1000;
      }
    }

    console.log(`📊 Total matches fetched: ${allMatches.length}`);

    // Step 2: Deduplicate by fixture_id (prefer sportmonks for xG) + exclude friendlies
    const fixtureMap = new Map<string, TeamMatch & { league: string; region: string }>();
    let excludedCount = 0;
    for (const m of allMatches) {
      const league = (m as any).league || 'Unknown';
      if (EXCLUDED_LEAGUES.has(league)) {
        excludedCount++;
        continue;
      }
      const existing = fixtureMap.get(m.fixture_id);
      if (!existing || (m as any).home_xg != null) {
        fixtureMap.set(m.fixture_id, m as any);
      }
    }
    const dedupedMatches = Array.from(fixtureMap.values());
    console.log(`📊 Deduped matches: ${dedupedMatches.length} (excluded ${excludedCount} friendlies)`);

    // Step 3: Group matches by team with VALIDATED regions
    const teamMatches = new Map<string, { matches: (TeamMatch & { league: string; region: string })[], league: string, region: string, team_id: number }>();
    
    function hashTeamId(name: string): number {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    }

    let regionCorrected = 0;
    for (const m of dedupedMatches) {
      const league = (m as any).league || 'Unknown';
      const rawRegion = (m as any).region || 'Unknown';
      const validatedRegion = validateRegion(league, rawRegion);
      
      // Skip excluded leagues
      if (validatedRegion === '__exclude__') continue;
      
      if (validatedRegion !== rawRegion) regionCorrected++;
      
      for (const team of [m.home_team, m.away_team]) {
        if (!teamMatches.has(team)) {
          teamMatches.set(team, {
            matches: [],
            league,
            region: validatedRegion,
            team_id: hashTeamId(team),
          });
        }
        teamMatches.get(team)!.matches.push(m as any);
        teamMatches.get(team)!.league = league || teamMatches.get(team)!.league;
        teamMatches.get(team)!.region = validatedRegion;
      }
    }
    console.log(`🔧 Region corrections applied: ${regionCorrected}`);

    console.log(`👥 Unique teams found: ${teamMatches.size}`);

    // Step 4: Compute L10 stats + home/away splits for each team
    let processed = 0;
    let errors = 0;
    const batchSize = 50;
    let batch: any[] = [];

    for (const [teamName, data] of teamMatches) {
      const sorted = data.matches
        .sort((a, b) => b.fixture_date.localeCompare(a.fixture_date))
        .slice(0, 10);

      if (sorted.length < 3) continue;

      const stats = computeStatsForTeam(sorted, teamName);
      if (!stats) continue;

      // Compute home-only and away-only splits from ALL matches (not just L10 overall)
      const homeStats = computeSplitStats(data.matches, teamName, 'home');
      const awayStats = computeSplitStats(data.matches, teamName, 'away');

      const row: any = {
        team_name: teamName,
        team_id: data.team_id,
        league: data.league,
        region: data.region,
        last_updated: new Date().toISOString(),
        ...stats,
      };

      // Add home split stats
      if (homeStats) {
        row.home_matches_used = homeStats.matches_used;
        row.home_avg_goals_scored = homeStats.avg_goals_scored;
        row.home_avg_goals_conceded = homeStats.avg_goals_conceded;
        row.home_avg_total_goals = homeStats.avg_total_goals;
        row.home_over_25_goals_pct = homeStats.over_25_goals_pct;
        row.home_btts_pct = homeStats.btts_pct;
        row.home_avg_corners_for = homeStats.avg_corners_for;
        row.home_avg_corners_against = homeStats.avg_corners_against;
        row.home_avg_total_corners = homeStats.avg_total_corners;
        row.home_over_95_corners_pct = homeStats.over_95_corners_pct;
        row.home_avg_cards_for = homeStats.avg_cards_for;
        row.home_avg_cards_against = homeStats.avg_cards_against;
        row.home_avg_total_cards = homeStats.avg_total_cards;
        row.home_over_35_cards_pct = homeStats.over_35_cards_pct;
      }

      // Add away split stats
      if (awayStats) {
        row.away_matches_used = awayStats.matches_used;
        row.away_avg_goals_scored = awayStats.avg_goals_scored;
        row.away_avg_goals_conceded = awayStats.avg_goals_conceded;
        row.away_avg_total_goals = awayStats.avg_total_goals;
        row.away_over_25_goals_pct = awayStats.over_25_goals_pct;
        row.away_btts_pct = awayStats.btts_pct;
        row.away_avg_corners_for = awayStats.avg_corners_for;
        row.away_avg_corners_against = awayStats.avg_corners_against;
        row.away_avg_total_corners = awayStats.avg_total_corners;
        row.away_over_95_corners_pct = awayStats.over_95_corners_pct;
        row.away_avg_cards_for = awayStats.avg_cards_for;
        row.away_avg_cards_against = awayStats.avg_cards_against;
        row.away_avg_total_cards = awayStats.avg_total_cards;
        row.away_over_35_cards_pct = awayStats.over_35_cards_pct;
      }

      batch.push(row);

      if (batch.length >= batchSize) {
        const { error } = await supabase
          .from('team_rolling_stats')
          .upsert(batch, { onConflict: 'team_name' });
        
        if (error) {
          console.error(`❌ Batch upsert error:`, error.message);
          errors += batch.length;
        } else {
          processed += batch.length;
        }
        batch = [];
      }
    }

    if (batch.length > 0) {
      const { error } = await supabase
        .from('team_rolling_stats')
        .upsert(batch, { onConflict: 'team_name' });
      
      if (error) {
        console.error(`❌ Final batch error:`, error.message);
        errors += batch.length;
      } else {
        processed += batch.length;
      }
    }

    const summary = {
      success: true,
      teams_processed: processed,
      errors,
      total_source_matches: dedupedMatches.length,
      unique_teams: teamMatches.size,
      features: ['overall_L10', 'home_split', 'away_split'],
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Rolling stats complete:', JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Rolling stats error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

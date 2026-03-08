import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_BASE_URL = 'https://v3.football.api-sports.io';
const OPENWEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Injury {
  player: string;
  position: string;
  type: string;
  reason: string;
}

interface WeatherData {
  tempCelsius: number | null;
  humidity: number | null;
  windSpeedKmh: number | null;
  rainChance: number | null;
  condition: string | null;
  impact: string[];
  riskScore: number;
}

interface MatchIntelligence {
  fixtureId: string;
  fixtureDate: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  homeTeamId: number;
  awayTeamId: number;
  venue: string | null;
  venueLat: number | null;
  venueLon: number | null;
  
  // Detailed Injuries
  homeInjuries: Injury[];
  awayInjuries: Injury[];
  homeInjuryCount: number;
  awayInjuryCount: number;
  homeKeyPlayersOut: string[];
  awayKeyPlayersOut: string[];
  homeInjuriesDetailed: { player: string; position: string; reason: string }[];
  awayInjuriesDetailed: { player: string; position: string; reason: string }[];
  
  // Fatigue
  homeDaysSinceLastMatch: number | null;
  awayDaysSinceLastMatch: number | null;
  homeMatchesLast14Days: number;
  awayMatchesLast14Days: number;
  homeIsFatigued: boolean;
  awayIsFatigued: boolean;
  
  // Kickoff
  isEarlyKickoff: boolean;
  kickoffHour: number;
  
  // Manager
  homeManager: string | null;
  awayManager: string | null;
  homeManagerGames: number;
  awayManagerGames: number;
  homeNewManager: boolean;
  awayNewManager: boolean;
  
  // Referee
  refereeName: string | null;
  refereeAvgCards: number | null;
  refereeStrictness: string | null;
  
  // Weather
  weather: WeatherData;
  
  // Risk Scores
  injuryRiskScore: number;
  fatigueRiskScore: number;
  weatherRiskScore: number;
  overallRiskScore: number;
  rejectionReasons: string[];
  shouldAvoid: boolean;
  
  // Talking Points
  gafferTalkingPoints: string[];
  intelligenceSummary: string;
}

// City coordinates for major venues (cached for performance)
const VENUE_COORDS: Record<string, { lat: number; lon: number }> = {
  // England
  'Emirates Stadium': { lat: 51.5549, lon: -0.1084 },
  'Anfield': { lat: 53.4308, lon: -2.9609 },
  'Old Trafford': { lat: 53.4631, lon: -2.2913 },
  'Stamford Bridge': { lat: 51.4817, lon: -0.1910 },
  'Etihad Stadium': { lat: 53.4831, lon: -2.2004 },
  'Tottenham Hotspur Stadium': { lat: 51.6042, lon: -0.0662 },
  'Villa Park': { lat: 52.5092, lon: -1.8847 },
  'St. James\' Park': { lat: 54.9756, lon: -1.6217 },
  'Goodison Park': { lat: 53.4387, lon: -2.9664 },
  'London Stadium': { lat: 51.5387, lon: -0.0166 },
  'Selhurst Park': { lat: 51.3983, lon: -0.0855 },
  'Craven Cottage': { lat: 51.4749, lon: -0.2217 },
  'Portman Road': { lat: 52.0550, lon: 1.1447 },
  // Spain
  'Santiago Bernabéu': { lat: 40.4531, lon: -3.6883 },
  'Camp Nou': { lat: 41.3809, lon: 2.1228 },
  'Wanda Metropolitano': { lat: 40.4362, lon: -3.5995 },
  // Italy
  'San Siro': { lat: 45.4781, lon: 9.1240 },
  'Allianz Stadium': { lat: 45.1096, lon: 7.6413 },
  'Stadio Olimpico': { lat: 41.9341, lon: 12.4547 },
  // Germany
  'Allianz Arena': { lat: 48.2188, lon: 11.6248 },
  'Signal Iduna Park': { lat: 51.4926, lon: 7.4516 },
  // France
  'Parc des Princes': { lat: 48.8414, lon: 2.2530 },
  'Groupama Stadium': { lat: 45.7652, lon: 4.9821 },
};

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

async function fetchWeather(apiKey: string, lat: number, lon: number): Promise<WeatherData> {
  try {
    const url = `${OPENWEATHER_URL}?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`Weather API returned ${response.status}`);
      return getDefaultWeather();
    }
    
    const data = await response.json();
    
    const tempCelsius = Math.round(data.main?.temp ?? 15);
    const humidity = data.main?.humidity ?? 50;
    const windSpeedKmh = Math.round((data.wind?.speed ?? 0) * 3.6); // m/s to km/h
    const condition = data.weather?.[0]?.main ?? 'Clear';
    const rainChance = data.rain ? 80 : (condition.toLowerCase().includes('cloud') ? 30 : 10);
    
    // Analyze weather impact on betting markets
    const impact: string[] = [];
    let riskScore = 0;
    
    // Temperature impacts
    if (tempCelsius < 5) {
      impact.push('Cold conditions - players tire faster, more fouls likely');
      riskScore += 15;
    } else if (tempCelsius > 30) {
      impact.push('Extreme heat - slower tempo, fewer goals expected');
      riskScore += 20;
    }
    
    // Wind impacts
    if (windSpeedKmh > 40) {
      impact.push('Strong winds - long balls unpredictable, corners affected');
      riskScore += 25;
    } else if (windSpeedKmh > 25) {
      impact.push('Windy conditions may disrupt set pieces');
      riskScore += 10;
    }
    
    // Rain impacts
    if (condition.toLowerCase().includes('rain') || condition.toLowerCase().includes('drizzle')) {
      impact.push('Wet pitch - more slips, more fouls, cards likely higher');
      riskScore += 20;
    }
    if (condition.toLowerCase().includes('thunderstorm')) {
      impact.push('Stormy conditions - potential match delays, chaotic play');
      riskScore += 35;
    }
    
    // Humidity impacts
    if (humidity > 85) {
      impact.push('High humidity - players fatigue quickly, expect substitutions');
      riskScore += 15;
    }
    
    // Snow/fog
    if (condition.toLowerCase().includes('snow')) {
      impact.push('Snow - unpredictable bounces, goalkeeping errors more likely');
      riskScore += 30;
    }
    if (condition.toLowerCase().includes('fog') || condition.toLowerCase().includes('mist')) {
      impact.push('Poor visibility - defensive errors more likely');
      riskScore += 15;
    }
    
    return {
      tempCelsius,
      humidity,
      windSpeedKmh,
      rainChance,
      condition,
      impact,
      riskScore: Math.min(100, riskScore),
    };
  } catch (err) {
    console.error('Weather fetch error:', err);
    return getDefaultWeather();
  }
}

function getDefaultWeather(): WeatherData {
  return {
    tempCelsius: null,
    humidity: null,
    windSpeedKmh: null,
    rainChance: null,
    condition: null,
    impact: [],
    riskScore: 0,
  };
}

function getVenueCoords(venueName: string | null): { lat: number; lon: number } | null {
  if (!venueName) return null;
  
  // Direct match
  if (VENUE_COORDS[venueName]) return VENUE_COORDS[venueName];
  
  // Fuzzy match
  const venueKey = Object.keys(VENUE_COORDS).find(
    key => venueName.toLowerCase().includes(key.toLowerCase()) ||
           key.toLowerCase().includes(venueName.toLowerCase())
  );
  
  return venueKey ? VENUE_COORDS[venueKey] : null;
}

function calculateDaysSinceMatch(fixtures: any[]): number | null {
  const completed = fixtures.filter(f => f.fixture?.status?.short === 'FT');
  if (completed.length === 0) return null;
  
  completed.sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime());
  
  const lastMatch = new Date(completed[0].fixture.date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - lastMatch.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays;
}

function countMatchesInPeriod(fixtures: any[], days: number): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  return fixtures.filter(f => {
    const matchDate = new Date(f.fixture.date);
    return matchDate >= cutoff && f.fixture?.status?.short === 'FT';
  }).length;
}

function identifyKeyPlayers(injuries: any[]): string[] {
  // Key player heuristic: attackers, midfielders, and players with detailed info
  const keyPositions = ['Attacker', 'Forward', 'Midfielder', 'Striker', 'Winger'];
  return injuries
    .filter(i => keyPositions.some(p => 
      i.player?.type?.includes(p) || 
      i.player?.position?.includes(p)
    ) || i.player?.name?.length > 15)
    .slice(0, 4)
    .map(i => i.player?.name || 'Unknown');
}

function extractDetailedInjuries(injuries: any[]): { player: string; position: string; reason: string }[] {
  return injuries.slice(0, 5).map(i => ({
    player: i.player?.name || 'Unknown',
    position: i.player?.type || i.player?.position || 'N/A',
    reason: i.player?.reason || 'Injury',
  }));
}

function isEarlyKickoff(kickoffTime: string): boolean {
  const hour = new Date(kickoffTime).getUTCHours();
  return hour < 14;
}

function calculateRiskScores(intel: Partial<MatchIntelligence>): {
  injuryRisk: number;
  fatigueRisk: number;
  weatherRisk: number;
  overall: number;
  reasons: string[];
  shouldAvoid: boolean;
} {
  const reasons: string[] = [];
  let injuryRisk = 0;
  let fatigueRisk = 0;
  const weatherRisk = intel.weather?.riskScore || 0;
  
  // Injury Risk (0-100)
  const totalInjuries = (intel.homeInjuryCount || 0) + (intel.awayInjuryCount || 0);
  const keyPlayersOut = (intel.homeKeyPlayersOut?.length || 0) + (intel.awayKeyPlayersOut?.length || 0);
  
  if (totalInjuries >= 6) {
    injuryRisk = 80;
    reasons.push(`⚠️ High injury count (${totalInjuries} players out)`);
  } else if (totalInjuries >= 4) {
    injuryRisk = 50;
    reasons.push(`🤕 ${totalInjuries} players injured across both teams`);
  } else if (totalInjuries >= 2) {
    injuryRisk = 25;
  }
  
  if (keyPlayersOut >= 2) {
    injuryRisk += 30;
    reasons.push(`⭐ ${keyPlayersOut} key players missing`);
  }
  
  // Fatigue Risk (0-100)
  const homeDays = intel.homeDaysSinceLastMatch ?? null;
  const awayDays = intel.awayDaysSinceLastMatch ?? null;
  const homeFatigue = homeDays !== null && homeDays <= 3;
  const awayFatigue = awayDays !== null && awayDays <= 3;
  const homeHeavySchedule = (intel.homeMatchesLast14Days || 0) >= 4;
  const awayHeavySchedule = (intel.awayMatchesLast14Days || 0) >= 4;
  
  if (homeFatigue || awayFatigue) {
    fatigueRisk += 40;
    if (homeFatigue && awayFatigue) {
      reasons.push(`😓 Both teams played within last 3 days`);
    } else if (homeFatigue) {
      reasons.push(`😓 ${intel.homeTeam} playing on short rest`);
    } else {
      reasons.push(`😓 ${intel.awayTeam} playing on short rest`);
    }
  }
  
  if (homeHeavySchedule || awayHeavySchedule) {
    fatigueRisk += 30;
    reasons.push(`📅 Fixture congestion detected`);
  }
  
  if (intel.isEarlyKickoff) {
    fatigueRisk += 15;
    reasons.push(`🌅 Early kickoff (historically lower scoring)`);
  }
  
  if (intel.homeNewManager || intel.awayNewManager) {
    reasons.push(`🆕 New manager bounce potential`);
  }
  
  // Weather risk reasons
  if (weatherRisk >= 25) {
    const weatherImpact = intel.weather?.impact || [];
    if (weatherImpact.length > 0) {
      reasons.push(`🌧️ ${weatherImpact[0]}`);
    }
  }
  
  // Overall - now includes weather
  injuryRisk = Math.min(100, injuryRisk);
  fatigueRisk = Math.min(100, fatigueRisk);
  const overall = Math.round((injuryRisk * 0.4 + fatigueRisk * 0.3 + weatherRisk * 0.3));
  
  const shouldAvoid = overall >= 60;
  
  if (shouldAvoid) {
    reasons.unshift(`🚨 HIGH RISK MATCH - Consider avoiding`);
  }
  
  return { injuryRisk, fatigueRisk, weatherRisk, overall, reasons, shouldAvoid };
}

function generateTalkingPoints(intel: Partial<MatchIntelligence>): string[] {
  const points: string[] = [];
  
  // Detailed injury insights
  if (intel.homeInjuriesDetailed && intel.homeInjuriesDetailed.length > 0) {
    const injured = intel.homeInjuriesDetailed.slice(0, 2);
    const names = injured.map(i => `${i.player} (${i.position})`).join(', ');
    points.push(`${intel.homeTeam} missing: ${names}`);
  }
  if (intel.awayInjuriesDetailed && intel.awayInjuriesDetailed.length > 0) {
    const injured = intel.awayInjuriesDetailed.slice(0, 2);
    const names = injured.map(i => `${i.player} (${i.position})`).join(', ');
    points.push(`${intel.awayTeam} missing: ${names}`);
  }
  
  // Weather insights for betting
  if (intel.weather && intel.weather.condition) {
    const w = intel.weather;
    const condition = w.condition?.toLowerCase() || '';
    if (condition.includes('rain')) {
      points.push(`Rain expected - wet pitch increases card risk, consider O3.5 cards`);
    }
    if (w.windSpeedKmh && w.windSpeedKmh > 30) {
      points.push(`Strong winds (${w.windSpeedKmh}km/h) - corners may be affected`);
    }
    if (w.tempCelsius !== null && w.tempCelsius < 5) {
      points.push(`Cold conditions (${w.tempCelsius}°C) - expect more fouls and cards`);
    }
    if (w.tempCelsius !== null && w.tempCelsius > 28) {
      points.push(`Hot weather (${w.tempCelsius}°C) - slower pace, consider U2.5 goals`);
    }
    if (w.humidity && w.humidity > 80) {
      points.push(`High humidity - players will tire, late goals possible`);
    }
  }
  
  // Fatigue
  const homeDaysRest = intel.homeDaysSinceLastMatch ?? null;
  const awayDaysRest = intel.awayDaysSinceLastMatch ?? null;
  if (homeDaysRest !== null && homeDaysRest <= 2) {
    points.push(`${intel.homeTeam} only had ${homeDaysRest} days rest - rotation likely`);
  }
  if (awayDaysRest !== null && awayDaysRest <= 2) {
    points.push(`${intel.awayTeam} only had ${awayDaysRest} days rest - rotation likely`);
  }
  
  // Fixture congestion
  if (intel.homeMatchesLast14Days && intel.homeMatchesLast14Days >= 5) {
    points.push(`${intel.homeTeam}: ${intel.homeMatchesLast14Days} games in 14 days - fatigue factor`);
  }
  if (intel.awayMatchesLast14Days && intel.awayMatchesLast14Days >= 5) {
    points.push(`${intel.awayTeam}: ${intel.awayMatchesLast14Days} games in 14 days - fatigue factor`);
  }
  
  // Manager
  if (intel.homeNewManager) {
    points.push(`New manager bounce for ${intel.homeTeam} - momentum shift expected`);
  }
  if (intel.awayNewManager) {
    points.push(`${intel.awayTeam} under new management - unpredictable`);
  }
  
  // Early kickoff
  if (intel.isEarlyKickoff) {
    points.push(`Early kickoff (${intel.kickoffHour}:00 UTC) - historically fewer goals`);
  }
  
  // Referee
  if (intel.refereeAvgCards && intel.refereeAvgCards >= 5) {
    points.push(`Referee ${intel.refereeName} averages ${intel.refereeAvgCards} cards - back O3.5 cards`);
  }
  
  return points.slice(0, 8); // Max 8 talking points
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('API_FOOTBALL_KEY');
    const WEATHER_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!API_KEY) throw new Error('API_FOOTBALL_KEY not configured');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().split('T')[0];
    const fixtureIds = body.fixture_ids || [];
    
    console.log(`🔍 Match Intelligence: Gathering contextual data for ${targetDate}`);
    console.log(`  🌤️ Weather API: ${WEATHER_KEY ? 'Configured' : 'Not configured'}`);

    const TOP_LEAGUES = [39, 40, 140, 78, 135, 61, 94, 88, 203, 71, 128, 262, 253, 98, 307, 2, 3, 848];

    await delay(300);
    const allFixtures = await fetchFromApi(API_KEY, '/fixtures', { date: targetDate });
    
    const preferredLeagues = new Set(TOP_LEAGUES);
    let eligibleFixtures = allFixtures.filter((f: any) => 
      preferredLeagues.has(f.league?.id) &&
      f.teams?.home?.id &&
      f.teams?.away?.id &&
      !f.league?.name?.toLowerCase().includes('women') &&
      !f.league?.name?.toLowerCase().includes('u21')
    );

    if (fixtureIds.length > 0) {
      eligibleFixtures = eligibleFixtures.filter((f: any) => 
        fixtureIds.includes(String(f.fixture.id))
      );
    }

    console.log(`  📅 Analyzing ${eligibleFixtures.length} fixtures`);

    const intelligenceResults: MatchIntelligence[] = [];

    const MAX_DETAILED_INTEL = 50;
    const MAX_BASIC_INTEL = 100;
    
    const topLeagueIds = new Set([39, 140, 78, 135, 61]);
    const topLeagueFixtures = eligibleFixtures.filter((f: any) => topLeagueIds.has(f.league?.id));
    const otherFixtures = eligibleFixtures.filter((f: any) => !topLeagueIds.has(f.league?.id));
    
    const orderedFixtures = [...topLeagueFixtures, ...otherFixtures];
    
    console.log(`  🏆 ${topLeagueFixtures.length} top-5 league fixtures, ${otherFixtures.length} other league fixtures`);
    
    for (let i = 0; i < Math.min(orderedFixtures.length, MAX_BASIC_INTEL); i++) {
      const fixture = orderedFixtures[i];
      const isDetailedAnalysis = i < MAX_DETAILED_INTEL;
      const homeTeamId = fixture.teams.home.id;
      const awayTeamId = fixture.teams.away.id;
      const fixtureId = String(fixture.fixture.id);
      const venueName = fixture.fixture.venue?.name || null;
      
      console.log(`  ⚽ ${fixture.teams.home.name} vs ${fixture.teams.away.name} @ ${venueName || 'TBD'}`);

      let intel: Partial<MatchIntelligence> = {
        fixtureId,
        fixtureDate: targetDate,
        kickoff: fixture.fixture.date,
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        league: fixture.league.name,
        homeTeamId,
        awayTeamId,
        venue: venueName,
        venueLat: null,
        venueLon: null,
        homeInjuries: [],
        awayInjuries: [],
        homeInjuryCount: 0,
        awayInjuryCount: 0,
        homeKeyPlayersOut: [],
        awayKeyPlayersOut: [],
        homeInjuriesDetailed: [],
        awayInjuriesDetailed: [],
        homeMatchesLast14Days: 0,
        awayMatchesLast14Days: 0,
        homeDaysSinceLastMatch: null,
        awayDaysSinceLastMatch: null,
        homeIsFatigued: false,
        awayIsFatigued: false,
        isEarlyKickoff: isEarlyKickoff(fixture.fixture.date),
        kickoffHour: new Date(fixture.fixture.date).getUTCHours(),
        homeManager: null,
        awayManager: null,
        homeManagerGames: 0,
        awayManagerGames: 0,
        homeNewManager: false,
        awayNewManager: false,
        refereeName: fixture.fixture.referee || null,
        refereeAvgCards: null,
        refereeStrictness: null,
        weather: getDefaultWeather(),
      };

      try {
        // 1. Fetch injuries for both teams (always do this)
        await delay(300);
        const injuries = await fetchFromApi(API_KEY, '/injuries', { fixture: fixtureId });
        
        const homeInjuries = injuries.filter((i: any) => i.team?.id === homeTeamId);
        const awayInjuries = injuries.filter((i: any) => i.team?.id === awayTeamId);
        
        intel.homeInjuries = homeInjuries.map((i: any) => ({
          player: i.player?.name,
          position: i.player?.type || i.player?.position || 'N/A',
          type: i.player?.type,
          reason: i.player?.reason,
        }));
        intel.awayInjuries = awayInjuries.map((i: any) => ({
          player: i.player?.name,
          position: i.player?.type || i.player?.position || 'N/A',
          type: i.player?.type,
          reason: i.player?.reason,
        }));
        intel.homeInjuryCount = homeInjuries.length;
        intel.awayInjuryCount = awayInjuries.length;
        intel.homeKeyPlayersOut = identifyKeyPlayers(homeInjuries);
        intel.awayKeyPlayersOut = identifyKeyPlayers(awayInjuries);
        intel.homeInjuriesDetailed = extractDetailedInjuries(homeInjuries);
        intel.awayInjuriesDetailed = extractDetailedInjuries(awayInjuries);

        // Only do detailed analysis for top fixtures
        if (isDetailedAnalysis) {
          // 2. Fetch weather data if API key available
          if (WEATHER_KEY && venueName) {
            const coords = getVenueCoords(venueName);
            if (coords) {
              intel.venueLat = coords.lat;
              intel.venueLon = coords.lon;
              console.log(`    🌤️ Fetching weather for ${venueName}`);
              intel.weather = await fetchWeather(WEATHER_KEY, coords.lat, coords.lon);
              console.log(`    🌡️ ${intel.weather.tempCelsius}°C, ${intel.weather.condition}, Wind: ${intel.weather.windSpeedKmh}km/h`);
            }
          }
          
          // 3. Fetch recent fixtures for fatigue analysis
          await delay(300);
          const homeFixtures = await fetchFromApi(API_KEY, '/fixtures', { 
            team: homeTeamId, 
            season: new Date().getFullYear(),
            last: 10 
          });
          
          await delay(300);
          const awayFixtures = await fetchFromApi(API_KEY, '/fixtures', { 
            team: awayTeamId, 
            season: new Date().getFullYear(),
            last: 10 
          });

          intel.homeDaysSinceLastMatch = calculateDaysSinceMatch(homeFixtures);
          intel.awayDaysSinceLastMatch = calculateDaysSinceMatch(awayFixtures);
          intel.homeMatchesLast14Days = countMatchesInPeriod(homeFixtures, 14);
          intel.awayMatchesLast14Days = countMatchesInPeriod(awayFixtures, 14);
          intel.homeIsFatigued = (intel.homeDaysSinceLastMatch !== null && intel.homeDaysSinceLastMatch <= 3) || 
                                 intel.homeMatchesLast14Days >= 4;
          intel.awayIsFatigued = (intel.awayDaysSinceLastMatch !== null && intel.awayDaysSinceLastMatch <= 3) || 
                                 intel.awayMatchesLast14Days >= 4;

          // 4. Fetch coach data
          await delay(300);
          const homeCoaches = await fetchFromApi(API_KEY, '/coachs', { team: homeTeamId });
          await delay(300);
          const awayCoaches = await fetchFromApi(API_KEY, '/coachs', { team: awayTeamId });

          if (homeCoaches.length > 0) {
            const coach = homeCoaches[0];
            intel.homeManager = coach.name;
            const currentTeamCareer = coach.career?.find((c: any) => c.team?.id === homeTeamId && !c.end);
            if (currentTeamCareer) {
              const startDate = new Date(currentTeamCareer.start);
              const monthsInCharge = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
              intel.homeNewManager = monthsInCharge < 3;
              intel.homeManagerGames = Math.round(monthsInCharge * 2);
            }
          }

          if (awayCoaches.length > 0) {
            const coach = awayCoaches[0];
            intel.awayManager = coach.name;
            const currentTeamCareer = coach.career?.find((c: any) => c.team?.id === awayTeamId && !c.end);
            if (currentTeamCareer) {
              const startDate = new Date(currentTeamCareer.start);
              const monthsInCharge = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
              intel.awayNewManager = monthsInCharge < 3;
              intel.awayManagerGames = Math.round(monthsInCharge * 2);
            }
          }
        }

      } catch (err) {
        console.error(`  ⚠️ Error fetching intel for ${fixtureId}:`, err);
      }

      // Calculate risk scores (now includes weather)
      const risks = calculateRiskScores(intel);
      intel.injuryRiskScore = risks.injuryRisk;
      intel.fatigueRiskScore = risks.fatigueRisk;
      intel.weatherRiskScore = risks.weatherRisk;
      intel.overallRiskScore = risks.overall;
      intel.rejectionReasons = risks.reasons;
      intel.shouldAvoid = risks.shouldAvoid;

      // Generate Gaffer talking points (now includes weather insights)
      intel.gafferTalkingPoints = generateTalkingPoints(intel);
      intel.intelligenceSummary = intel.gafferTalkingPoints.slice(0, 3).join('. ') || 'Standard match conditions';

      intelligenceResults.push(intel as MatchIntelligence);
    }

    // Save to database
    for (const intel of intelligenceResults) {
      await supabase.from('match_intelligence').upsert({
        fixture_id: intel.fixtureId,
        fixture_date: intel.fixtureDate,
        kickoff: intel.kickoff,
        home_team: intel.homeTeam,
        away_team: intel.awayTeam,
        league: intel.league,
        home_injuries: intel.homeInjuries,
        away_injuries: intel.awayInjuries,
        home_injury_count: intel.homeInjuryCount,
        away_injury_count: intel.awayInjuryCount,
        home_key_players_out: intel.homeKeyPlayersOut,
        away_key_players_out: intel.awayKeyPlayersOut,
        home_injuries_detailed: intel.homeInjuriesDetailed,
        away_injuries_detailed: intel.awayInjuriesDetailed,
        home_days_since_last_match: intel.homeDaysSinceLastMatch,
        away_days_since_last_match: intel.awayDaysSinceLastMatch,
        home_matches_last_14_days: intel.homeMatchesLast14Days,
        away_matches_last_14_days: intel.awayMatchesLast14Days,
        home_is_fatigued: intel.homeIsFatigued,
        away_is_fatigued: intel.awayIsFatigued,
        is_early_kickoff: intel.isEarlyKickoff,
        kickoff_hour: intel.kickoffHour,
        home_manager: intel.homeManager,
        away_manager: intel.awayManager,
        home_manager_games: intel.homeManagerGames,
        away_manager_games: intel.awayManagerGames,
        home_new_manager: intel.homeNewManager,
        away_new_manager: intel.awayNewManager,
        referee_name: intel.refereeName,
        referee_avg_cards: intel.refereeAvgCards,
        referee_strictness: intel.refereeStrictness,
        weather_temp_celsius: intel.weather.tempCelsius,
        weather_humidity: intel.weather.humidity,
        weather_wind_speed_kmh: intel.weather.windSpeedKmh,
        weather_rain_chance: intel.weather.rainChance,
        weather_condition: intel.weather.condition,
        weather_impact: intel.weather.impact,
        weather_risk_score: intel.weatherRiskScore,
        injury_risk_score: intel.injuryRiskScore,
        fatigue_risk_score: intel.fatigueRiskScore,
        overall_risk_score: intel.overallRiskScore,
        rejection_reasons: intel.rejectionReasons,
        should_avoid: intel.shouldAvoid,
        intelligence_summary: intel.intelligenceSummary,
        gaffer_talking_points: intel.gafferTalkingPoints,
      }, { onConflict: 'fixture_id' });
    }

    const summary = {
      success: true,
      date: targetDate,
      fixtures_analyzed: intelligenceResults.length,
      high_risk_matches: intelligenceResults.filter(i => i.shouldAvoid).length,
      fatigued_teams: intelligenceResults.filter(i => i.homeIsFatigued || i.awayIsFatigued).length,
      injury_concerns: intelligenceResults.filter(i => i.injuryRiskScore >= 50).length,
      weather_warnings: intelligenceResults.filter(i => i.weatherRiskScore >= 20).length,
      new_managers: intelligenceResults.filter(i => i.homeNewManager || i.awayNewManager).length,
      early_kickoffs: intelligenceResults.filter(i => i.isEarlyKickoff).length,
      intelligence: intelligenceResults,
      timestamp: new Date().toISOString(),
    };

    console.log(`✅ Match Intelligence Complete: ${summary.fixtures_analyzed} fixtures, ${summary.high_risk_matches} to avoid, ${summary.weather_warnings} weather alerts`);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Match Intelligence Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

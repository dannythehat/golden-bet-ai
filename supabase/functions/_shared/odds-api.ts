// Shared utility for The Odds API integration

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

// Bookmaker logos - using high quality official logos where available
export const BOOKMAKER_LOGOS: Record<string, string> = {
  bet365: 'https://cdn.freebiesupply.com/logos/large/2x/bet365-logo-png-transparent.png',
  williamhill: 'https://cdn.freebiesupply.com/logos/large/2x/william-hill-logo-png-transparent.png',
  paddypower: 'https://www.paddypower.com/static/images/logos/pp-logo.svg',
  betfair: 'https://cdn.freebiesupply.com/logos/large/2x/betfair-logo-png-transparent.png',
  skybet: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/50/Sky_Bet_logo.svg/320px-Sky_Bet_logo.svg.png',
  unibet: 'https://cdn.freebiesupply.com/logos/large/2x/unibet-logo-png-transparent.png',
  betway: 'https://cdn.freebiesupply.com/logos/large/2x/betway-logo-png-transparent.png',
  ladbrokes: 'https://cdn.freebiesupply.com/logos/large/2x/ladbrokes-logo-png-transparent.png',
  coral: 'https://upload.wikimedia.org/wikipedia/en/c/c9/Coral_%28bookmaker%29_logo.svg',
  boylesports: 'https://www.boylesports.com/assets/images/logo.svg',
  betvictor: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/95/BetVictor_logo.svg/320px-BetVictor_logo.svg.png',
  '888sport': 'https://cdn.freebiesupply.com/logos/large/2x/888-sport-logo-png-transparent.png',
  leovegas: 'https://www.leovegas.com/assets/images/logo-leovegas.svg',
  matchbook: 'https://www.matchbook.com/images/logo.svg',
  betsson: 'https://cdn.freebiesupply.com/logos/large/2x/betsson-logo-png-transparent.png',
  pinnacle: 'https://www.pinnacle.com/PublishingImages/navigation/pinnacle-logo.svg',
};

// Map Odds API sport keys to our league structure
const SPORT_KEYS: Record<number, string> = {
  // English Football
  39: 'soccer_epl',               // Premier League
  40: 'soccer_england_efl_cup',   // EFL Cup (approximation for Championship)
  // European Top Leagues
  140: 'soccer_spain_la_liga',    // La Liga
  78: 'soccer_germany_bundesliga', // Bundesliga  
  135: 'soccer_italy_serie_a',    // Serie A
  61: 'soccer_france_ligue_one',  // Ligue 1
  // European Competitions
  2: 'soccer_uefa_champs_league',
  3: 'soccer_uefa_europa_league',
};

// Market mappings for Odds API
const MARKET_MAPPINGS: Record<string, { key: string; point?: number }> = {
  'over_2.5_goals': { key: 'totals', point: 2.5 },
  'over_1.5_goals': { key: 'totals', point: 1.5 },
  'over_3.5_goals': { key: 'totals', point: 3.5 },
  'btts': { key: 'btts' },
};

export interface OddsResult {
  odds: number;
  bookmaker: {
    key: string;
    title: string;
    logo?: string;
    lastUpdate: string;
  };
  available: boolean;
}

export interface TeamOdds {
  homeTeam: string;
  awayTeam: string;
  commence_time: string;
  markets: Record<string, OddsResult>;
}

/**
 * Fetch odds from The Odds API for a specific sport and market
 */
export async function fetchOdds(
  apiKey: string,
  leagueId: number,
  market: string = 'totals',
  regions: string = 'uk'
): Promise<any[]> {
  const sportKey = SPORT_KEYS[leagueId];
  if (!sportKey) {
    console.log(`No Odds API mapping for league ID ${leagueId}`);
    return [];
  }

  const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=${regions}&markets=${market}`;
  
  try {
    console.log(`📊 Fetching odds: ${sportKey}/${market}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Odds API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching odds:', error);
    return [];
  }
}

/**
 * Find the best odds for a specific fixture and market
 */
export function findBestOdds(
  oddsData: any[],
  homeTeam: string,
  awayTeam: string,
  marketType: string
): OddsResult | null {
  // Normalize team names for matching
  const normalizeTeam = (name: string) => 
    name.toLowerCase()
      .replace(/\bfc\b/gi, '')
      .replace(/\bsc\b/gi, '')
      .replace(/\bafc\b/gi, '')
      .replace(/\bcf\b/gi, '')
      .replace(/\bunited\b/gi, 'utd')
      .replace(/\bcity\b/gi, '')
      .trim();

  const normalizedHome = normalizeTeam(homeTeam);
  const normalizedAway = normalizeTeam(awayTeam);

  // Find matching fixture
  const fixture = oddsData.find(event => {
    const eventHome = normalizeTeam(event.home_team || '');
    const eventAway = normalizeTeam(event.away_team || '');
    
    return (
      (eventHome.includes(normalizedHome) || normalizedHome.includes(eventHome)) &&
      (eventAway.includes(normalizedAway) || normalizedAway.includes(eventAway))
    );
  });

  if (!fixture || !fixture.bookmakers?.length) {
    return null;
  }

  // Find best odds across bookmakers
  let bestOdds = 0;
  let bestBookmaker: any = null;

  for (const bookmaker of fixture.bookmakers) {
    const market = bookmaker.markets?.find((m: any) => m.key === getMarketKey(marketType));
    if (!market) continue;

    for (const outcome of market.outcomes || []) {
      // For totals, look for "Over" outcome
      if (marketType.startsWith('over_') && outcome.name === 'Over') {
        const point = parseFloat(marketType.split('_')[1] + '.' + (marketType.split('_')[2] || '5'));
        if (outcome.point === point && outcome.price > bestOdds) {
          bestOdds = outcome.price;
          bestBookmaker = bookmaker;
        }
      }
      // For BTTS, look for "Yes" outcome
      if (marketType === 'btts' && outcome.name === 'Yes' && outcome.price > bestOdds) {
        bestOdds = outcome.price;
        bestBookmaker = bookmaker;
      }
    }
  }

  if (!bestBookmaker) return null;

  return {
    odds: bestOdds,
    bookmaker: {
      key: bestBookmaker.key,
      title: bestBookmaker.title,
      logo: BOOKMAKER_LOGOS[bestBookmaker.key] || undefined,
      lastUpdate: bestBookmaker.last_update || new Date().toISOString(),
    },
    available: true,
  };
}

/**
 * Get the Odds API market key for our internal market type
 */
function getMarketKey(marketType: string): string {
  if (marketType.includes('goals')) return 'totals';
  if (marketType === 'btts') return 'btts';
  if (marketType.includes('corners')) return 'totals'; // Corners not directly available
  if (marketType.includes('cards')) return 'totals';   // Cards not directly available
  return 'h2h';
}

/**
 * Batch fetch odds for multiple leagues and cache results
 */
export async function fetchOddsForLeagues(
  apiKey: string,
  leagueIds: number[],
  markets: string[] = ['totals', 'btts']
): Promise<Map<string, any[]>> {
  const oddsCache = new Map<string, any[]>();
  
  for (const leagueId of leagueIds) {
    const sportKey = SPORT_KEYS[leagueId];
    if (!sportKey) continue;
    
    for (const market of markets) {
      const cacheKey = `${sportKey}_${market}`;
      if (oddsCache.has(cacheKey)) continue;
      
      const odds = await fetchOdds(apiKey, leagueId, market);
      oddsCache.set(cacheKey, odds);
      
      // Rate limit - Odds API has limits
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  return oddsCache;
}

/**
 * Generate fallback odds based on confidence if API unavailable
 */
export function generateFallbackOdds(
  confidence: number,
  marketType: string
): OddsResult {
  const impliedOdds = 1 / confidence;
  const marketVariance = marketType.includes('goals') ? 0.05 : 0.08;
  const randomVariance = (Math.random() * 0.12) - 0.06;
  const rawOdds = impliedOdds * (1 + marketVariance + randomVariance);
  
  return {
    odds: Math.max(1.40, Math.min(3.50, Math.round(rawOdds * 100) / 100)),
    bookmaker: {
      key: 'estimated',
      title: 'Est. Odds',
      lastUpdate: new Date().toISOString(),
    },
    available: false,
  };
}

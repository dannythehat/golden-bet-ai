/**
 * Stats Service - Direct GitHub Raw URL with Fallbacks
 * Fetches cache directly from PUBLIC GitHub repo
 * Multiple fallback URLs for reliability
 */

// Primary and fallback URLs
const CACHE_URLS = [
  'https://raw.githubusercontent.com/dannythehat/golden-bet-ai/main/cache/stats-cache.json',
  'https://cdn.jsdelivr.net/gh/dannythehat/golden-bet-ai@main/cache/stats-cache.json',
  'https://raw.githubusercontent.com/dannythehat/golden-bet-ai/refs/heads/main/cache/stats-cache.json',
];

/**
 * Fetch all team stats directly from GitHub cache
 * Returns instantly with pre-computed data
 * Tries multiple CDN URLs for reliability
 */
export async function fetchAllTeamStats() {
  console.log('📦 Fetching cached stats from GitHub...');
  
  let lastError: Error | null = null;
  
  // Try each URL in sequence
  for (let i = 0; i < CACHE_URLS.length; i++) {
    const url = CACHE_URLS[i];
    console.log(`🔗 Attempt ${i + 1}/${CACHE_URLS.length}: ${url}`);
    
    try {
      const response = await fetch(url + '?t=' + Date.now(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-cache',
      });
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const cachedData = await response.json();
      
      // Validate data structure
      if (!cachedData.goals || !cachedData.corners || !cachedData.cards || !cachedData.btts) {
        throw new Error('Invalid cache structure - missing required fields');
      }
      
      console.log('✅ Cached stats loaded successfully from:', url);
      console.log('📊 Teams loaded:', {
        goals: cachedData.goals?.length || 0,
        corners: cachedData.corners?.length || 0,
        cards: cachedData.cards?.length || 0,
        btts: cachedData.btts?.length || 0,
      });
      
      return {
        goals: cachedData.goals || [],
        corners: cachedData.corners || [],
        cards: cachedData.cards || [],
        btts: cachedData.btts || [],
      };
    } catch (error) {
      console.warn(`⚠️ Failed to fetch from ${url}:`, error instanceof Error ? error.message : 'Unknown error');
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Continue to next URL
      if (i < CACHE_URLS.length - 1) {
        console.log('🔄 Trying next fallback URL...');
        continue;
      }
    }
  }
  
  // All URLs failed
  console.error('❌ All cache URLs failed');
  console.error('❌ Last error:', lastError?.message);
  console.error('❌ Tried URLs:', CACHE_URLS);
  
  throw new Error(
    `Failed to load statistics from all sources. Last error: ${lastError?.message || 'Unknown error'}. ` +
    `Please check your internet connection or try again later.`
  );
}

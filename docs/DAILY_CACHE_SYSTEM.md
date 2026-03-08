# Daily Stats Cache System - 4 AM Refresh

## Overview
The Form Tables now use a **daily caching system** that refreshes automatically at **4 AM UTC** every day. This provides:

- ⚡ **Instant loading** - No more 5-10 minute waits
- 🌍 **250+ leagues** - Comprehensive global coverage
- 🔄 **Daily updates** - Fresh data every morning at 4 AM UTC
- 📊 **Pre-computed stats** - All calculations done in background

## Architecture

### Components

1. **Cron Job** (`/api/cron/refresh-stats`)
   - Runs daily at 4 AM UTC
   - Fetches data from 250+ leagues worldwide
   - Processes ~5,000+ teams
   - Calculates all statistics
   - Stores results in cache file
   - Duration: ~10-15 minutes

2. **Cache API** (`/api/stats-cache`)
   - Serves pre-computed cached data
   - Returns instantly (< 100ms)
   - Includes metadata (last refresh, next refresh, cache age)

3. **Stats Service** (`src/services/directStats.ts`)
   - Frontend service that fetches from cache API
   - No more live API calls
   - Instant data loading

### Data Flow

```
4 AM UTC Daily:
API-Football → Cron Job → Process 250+ Leagues → Cache File

User Request:
Browser → Cache API → Cache File → Instant Response
```

## Configuration

### Vercel Cron Setup
In `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-stats",
      "schedule": "0 4 * * *"
    }
  ]
}
```

### Environment Variables
Required in Vercel:
- `VITE_API_FOOTBALL_KEY` - Your API-Football API key
- `CRON_SECRET` - Secret token to protect cron endpoint

## Manual Refresh

### Trigger Manual Refresh (Admin Only)
```bash
curl -X GET https://your-domain.vercel.app/api/cron/refresh-stats \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Check Cache Status
```bash
curl https://your-domain.vercel.app/api/stats-cache
```

Response includes:
```json
{
  "success": true,
  "data": {
    "goals": [...],
    "corners": [...],
    "cards": [...],
    "btts": [...]
  },
  "meta": {
    "cached": true,
    "lastRefresh": "2026-01-07T04:00:00.000Z",
    "nextRefresh": "2026-01-08T04:00:00.000Z",
    "cacheAge": "12.5 hours"
  }
}
```

## League Coverage

### 250+ Leagues Worldwide

**Europe (150+ leagues)**
- England: Premier League, Championship, League One, League Two, National League, etc.
- Spain: La Liga, Segunda División, etc.
- Germany: Bundesliga, 2. Bundesliga, 3. Liga, etc.
- Italy: Serie A, Serie B, Serie C, Serie D
- France: Ligue 1, Ligue 2, National
- Plus 30+ more European countries

**Asia (40+ leagues)**
- Japan: J1, J2, J3 League
- South Korea: K League 1, K League 2
- China: Super League, League One
- Saudi Arabia: Pro League, First Division
- UAE, Qatar, India, Australia, Thailand, Vietnam, etc.

**Americas (40+ leagues)**
- Brazil: Série A, B, C, D
- Argentina: Liga Profesional, Primera Nacional, Primera B
- Mexico: Liga MX, Liga de Expansión, Liga Premier
- USA: MLS, USL Championship
- Colombia, Chile, Uruguay, Paraguay, Peru, Ecuador, etc.

**Africa (20+ leagues)**
- South Africa, Egypt, Morocco, Tunisia, Algeria
- Nigeria, Ghana, Kenya, Tanzania, Uganda, etc.

## Statistics Calculated

For each team across all leagues:

### Goals
- Over 2.5 goals percentage
- Over 2.5 goals count
- Average goals scored
- Average goals conceded

### Corners
- Over 9.5 corners percentage
- Average corners per match

### Cards
- Over 3.5 cards percentage
- Average cards per match

### BTTS (Both Teams To Score)
- BTTS percentage
- BTTS count

## Performance

### Before (Live Fetching)
- ⏱️ Load time: 5-10 minutes
- 🔥 API calls: 10,000+ per page load
- 💸 Cost: High API usage
- 😫 User experience: Poor

### After (Daily Cache)
- ⚡ Load time: < 1 second
- 🔥 API calls: 0 per page load
- 💸 Cost: Minimal (1 refresh/day)
- 😊 User experience: Excellent

## Monitoring

### Check Cron Job Logs
In Vercel Dashboard:
1. Go to your project
2. Click "Deployments"
3. Click on latest deployment
4. Go to "Functions" tab
5. Find `/api/cron/refresh-stats`
6. View logs

### Cache Health Check
```bash
# Check if cache exists and is fresh
curl https://your-domain.vercel.app/api/stats-cache | jq '.meta'
```

## Troubleshooting

### Cache Not Found (404)
**Problem:** Cache file doesn't exist yet
**Solution:** 
1. Wait for next 4 AM UTC refresh, OR
2. Trigger manual refresh with cron secret

### Stale Data
**Problem:** Data is more than 24 hours old
**Solution:** Check cron job logs - may have failed. Trigger manual refresh.

### Cron Job Failed
**Problem:** Cron job encountered errors
**Solution:**
1. Check Vercel function logs
2. Verify API key is valid
3. Check API-Football rate limits
4. Trigger manual refresh

## Future Enhancements

- [ ] Store cache in Vercel KV for better reliability
- [ ] Add incremental updates (update only changed data)
- [ ] Add cache warming (pre-fetch before 4 AM)
- [ ] Add cache versioning
- [ ] Add cache invalidation API
- [ ] Add real-time updates for live matches
- [ ] Add webhook notifications when cache refreshes

## API Usage Optimization

### Before
- **Per user visit:** 10,000+ API calls
- **Daily with 100 users:** 1,000,000+ API calls
- **Monthly:** 30,000,000+ API calls ❌ (exceeds limits)

### After
- **Per user visit:** 0 API calls
- **Daily refresh:** 10,000 API calls
- **Monthly:** 300,000 API calls ✅ (well within limits)

**Savings:** 99% reduction in API calls!

# Real Football Statistics Data Source

## Problem
The app currently uses fake/mock data with unrealistic statistics. Users need REAL team statistics from actual matches.

## Challenge
- API-Football free tier: 100 requests/day (not enough for 60+ teams)
- Other free APIs: Limited data or strict rate limits
- Real-time fetching: Too slow and expensive

## Solutions

### Option 1: Manual Data Entry (Quick Fix)
Manually populate `formTablesData.ts` with real statistics from current season:
- Source: FBref.com, Whoscored.com, Soccerstats.com
- Update frequency: Weekly/Monthly
- Pros: Free, no rate limits, fast loading
- Cons: Manual work, not real-time

### Option 2: Scheduled Data Scraping (Better)
Create a backend service that scrapes data daily:
- Use Puppeteer/Cheerio to scrape FBref.com
- Run on Vercel Cron Jobs (free tier: daily)
- Store in Supabase database
- Pros: Automated, real data, no API costs
- Cons: Requires backend setup, scraping can break

### Option 3: Paid API (Best but costs money)
Use API-Football paid plan:
- $15/month for 3,000 requests/day
- Real-time data
- Reliable
- Pros: Real-time, reliable, comprehensive
- Cons: Monthly cost

### Option 4: Hybrid Approach (Recommended)
1. Use manual data entry for initial launch
2. Set up scraping for automated updates
3. Cache data in Supabase
4. Update once per day

## Implementation Plan

### Phase 1: Manual Real Data (Immediate)
1. Visit FBref.com for each league
2. Extract top 20 teams' statistics:
   - Goals: Over/Under 0.5, 1.5, 2.5, 3.5
   - Corners: Over/Under 7.5, 8.5, 9.5, 10.5
   - Cards: Over/Under 2.5, 3.5, 4.5, 5.5
   - BTTS: Yes/No percentages
3. Update `formTablesData.ts` with real numbers
4. Add data source attribution

### Phase 2: Automated Scraping (Next Week)
1. Create `/api/scrape-stats` endpoint
2. Use Cheerio to scrape FBref.com
3. Parse HTML tables for statistics
4. Store in Supabase
5. Set up Vercel Cron Job for daily updates

### Phase 3: Real-Time Updates (Future)
1. Upgrade to API-Football paid plan
2. Implement real-time data fetching
3. Add live match tracking
4. Push notifications for bet opportunities

## Data Sources (Free)

### FBref.com
- URL: https://fbref.com/en/comps/
- Data: Goals, shots, cards, possession
- Format: HTML tables (scrapable)
- Update: Daily
- Coverage: All major leagues

### Soccerstats.com
- URL: https://www.soccerstats.com/
- Data: Goals, corners, cards, BTTS
- Format: HTML tables
- Update: Daily
- Coverage: 100+ leagues

### Whoscored.com
- URL: https://www.whoscored.com/
- Data: Detailed match statistics
- Format: JavaScript-rendered (harder to scrape)
- Update: Real-time
- Coverage: Major leagues

## Current Status

**Using:** Mock/fake data
**Need:** Real statistics from 2024-2025 season
**Immediate Action:** Manual data entry from FBref.com
**Long-term:** Automated scraping with Vercel Cron

## Next Steps

1. ✅ Create this documentation
2. ⏳ Manually collect real data for top 60 teams
3. ⏳ Update `formTablesData.ts` with real statistics
4. ⏳ Add data source attribution in UI
5. ⏳ Create scraping service for automation
6. ⏳ Set up Vercel Cron Job

## Example Real Data Format

```typescript
{
  id: '1',
  team: 'Manchester City',
  league: 'Premier League',
  region: 'uk',
  played: 19, // Actual games played this season
  over_2_5: 68, // Real percentage from FBref
  avgCorners: 11.2, // Real average from Soccerstats
  // ... etc
}
```

## Attribution

Data sources should be credited in the UI:
- "Statistics sourced from FBref.com"
- "Data updated: [Last Update Date]"
- "Based on 2024-2025 season"

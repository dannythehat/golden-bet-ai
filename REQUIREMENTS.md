# Form Tables Requirements - COMPLETE SPECIFICATION

## Overview
Form Tables must analyze **~200 MAIN PROFESSIONAL LEAGUES** worldwide and show the top 20 teams for each bet type based on their statistical performance. Users can also search for ANY team to view their stats.

## Reference Application
See screenshot: StatMaster app showing teams like SJK, Nacional, Stromsgodset, Shanghai Port, HJK, Ilves, Kawasaki Frontale, Daegu, KTP, Viking, Shandong Taishan, Brann, Cerezo Osaka - teams from ALL OVER THE WORLD, not just top leagues.

## Core Requirements

### 1. Data Source
- **API**: API-Football (api-football-v1.p.rapidapi.com)
- **API Key**: `***REMOVED***`
- **Scope**: ~200 MAIN professional leagues worldwide
- **League Filtering**: 
  - ✅ **INCLUDE**: Main professional leagues (Premier League, La Liga, J-League, MLS, etc.)
  - ❌ **EXCLUDE**: Women's leagues, U21, U19, U18, youth leagues, reserve teams
  - Filter by checking league name/type for keywords: "Women", "U21", "U19", "U18", "Youth", "Reserve", "Amateur"
- **Teams**: EVERY team from the ~200 main leagues must be analyzed and cached

### 2. Bet Types (Tabs) with Multiple Thresholds

#### Goals Tab
User can select different goal thresholds:
- **Over 1.5 Goals** - Shows top 20 teams with highest O1.5% globally
- **Over 2.5 Goals** - Shows top 20 teams with highest O2.5% globally
- **Over 3.5 Goals** - Shows top 20 teams with highest O3.5% globally
- **Over 4.5 Goals** - Shows top 20 teams with highest O4.5% globally

**Columns**: 
- Rank (#)
- Team name
- League name
- Games Played
- Over X.5% (percentage based on selected threshold)
- Count (e.g., "15/20")
- Avg Total Goals per game

**Sorting**: Highest percentage first for selected threshold
**Top 20**: Best 20 teams globally for selected threshold

#### Corners Tab
User can select different corner thresholds:
- **Over 8.5 Corners** - Shows top 20 teams with highest O8.5% globally
- **Over 9.5 Corners** - Shows top 20 teams with highest O9.5% globally
- **Over 10.5 Corners** - Shows top 20 teams with highest O10.5% globally
- **Over 11.5 Corners** - Shows top 20 teams with highest O11.5% globally
- **Over 12.5 Corners** - Shows top 20 teams with highest O12.5% globally

**Columns**:
- Rank (#)
- Team name
- League name
- Games Played
- Over X.5% (percentage based on selected threshold)
- Count (e.g., "18/25")
- Avg Corners per game

**Sorting**: Highest percentage first for selected threshold
**Top 20**: Best 20 teams globally for selected threshold

#### Cards Tab
User can select different card thresholds:
- **Over 2.5 Cards** - Shows top 20 teams with highest O2.5% globally
- **Over 3.5 Cards** - Shows top 20 teams with highest O3.5% globally
- **Over 4.5 Cards** - Shows top 20 teams with highest O4.5% globally
- **Over 5.5 Cards** - Shows top 20 teams with highest O5.5% globally

**Columns**:
- Rank (#)
- Team name
- League name
- Games Played
- Over X.5% (percentage based on selected threshold)
- Count (e.g., "12/20")
- Avg Cards per game

**Sorting**: Highest percentage first for selected threshold
**Top 20**: Best 20 teams globally for selected threshold

#### BTTS Tab (Both Teams To Score)
Single metric (no threshold selection):
- **BTTS percentage**

**Columns**:
- Rank (#)
- Team name
- League name
- Games Played
- BTTS% (percentage)
- Count (e.g., "17/25")
- Avg Goals Scored (GS)
- Avg Goals Conceded (GC)

**Sorting**: Highest BTTS% first
**Top 20**: Best 20 teams globally for BTTS

### 3. UI Layout

#### Tab Structure:
```
[Goals] [Corners] [Cards] [BTTS]
```

#### Within Each Tab (except BTTS):
```
Dropdown/Buttons for threshold selection:
Goals Tab: [Over 1.5] [Over 2.5] [Over 3.5] [Over 4.5]
Corners Tab: [Over 8.5] [Over 9.5] [Over 10.5] [Over 11.5] [Over 12.5]
Cards Tab: [Over 2.5] [Over 3.5] [Over 4.5] [Over 5.5]
```

#### Region Filters (applies to all tabs):
```
[All Regions] [UK] [European] [Asia] [Americas]
```

#### Team Search Feature:
```
[Search Box: "Search for any team..."]
```
- Users can search for their favorite teams
- Shows stats for searched team even if not in top 20
- All team stats are pre-calculated and cached
- Search is instant (client-side filtering from cached data)

### 4. Region Filters
Users can filter by region. Each region shows different top 20 teams:

#### "All Regions" (Default)
- Analyzes **EVERY TEAM from ~200 main leagues**
- Shows top 20 teams globally for selected bet type and threshold
- Could include teams from ANY league (e.g., Tranmere Rovers, Toulouse, Shanghai Port, etc.)
- **NOT limited to top leagues**

#### "UK" Filter
- Analyzes only UK leagues (Premier League, Championship, League One, League Two, Scottish Premiership, etc.)
- Shows top 20 UK teams for selected bet type and threshold

#### "European" Filter
- Analyzes European leagues (La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, etc.)
- Shows top 20 European teams for selected bet type and threshold

#### "Asia" Filter
- Analyzes Asian leagues (J-League, K-League, Chinese Super League, etc.)
- Shows top 20 Asian teams for selected bet type and threshold

#### "Americas" Filter
- Analyzes American leagues (MLS, Liga MX, Brazilian Serie A, Argentine Primera, etc.)
- Shows top 20 American teams for selected bet type and threshold

### 5. Data Calculation Logic

#### For Each Team:
1. Fetch last 20 games (current season)
2. Calculate statistics for ALL thresholds:

**Goals:**
- Count games with 1.5+ total goals → O1.5%
- Count games with 2.5+ total goals → O2.5%
- Count games with 3.5+ total goals → O3.5%
- Count games with 4.5+ total goals → O4.5%
- Calculate average total goals per game

**Corners:**
- Count games with 8.5+ total corners → O8.5%
- Count games with 9.5+ total corners → O9.5%
- Count games with 10.5+ total corners → O10.5%
- Count games with 11.5+ total corners → O11.5%
- Count games with 12.5+ total corners → O12.5%
- Calculate average total corners per game

**Cards:**
- Count games with 2.5+ total cards → O2.5%
- Count games with 3.5+ total cards → O3.5%
- Count games with 4.5+ total cards → O4.5%
- Count games with 5.5+ total cards → O5.5%
- Calculate average total cards per game

**BTTS:**
- Count games where both teams scored → BTTS%
- Calculate average goals scored per game
- Calculate average goals conceded per game

#### Ranking:
1. Calculate percentages for ALL teams from ~200 main leagues for ALL thresholds
2. User selects tab (Goals/Corners/Cards/BTTS)
3. User selects threshold (if applicable)
4. User selects region filter
5. Sort by percentage for selected threshold (highest first)
6. Apply region filter if selected
7. Take top 20 teams
8. Display with rank numbers 1-20

### 6. Performance Requirements
- **Initial Load**: Must complete within 60 seconds
- **Caching**: Cache ALL team stats for 24 hours
- **Daily Refresh**: Auto-refresh at 4 AM UTC
- **Manual Refresh**: Allow admin to trigger refresh
- **Threshold Switching**: Instant (< 100ms) - data pre-calculated
- **Team Search**: Instant (< 100ms) - client-side filtering from cache

### 7. Technical Implementation

#### Recommended Architecture:
```
1. Initial Full Calculation (First Run):
   - Fetch ~200 main leagues from API-Football (filter out women's/youth)
   - For each league, fetch all teams
   - For each team, fetch last 20 games
   - Calculate ALL statistics for ALL thresholds
   - Store in MongoDB with region mapping
   - Cache ALL teams (not just top 20) for search functionality

2. Daily Incremental Update (4 AM UTC Cron):
   - Fetch yesterday's completed fixtures only
   - For each fixture, identify the 2 teams involved
   - Fetch updated last 20 games for those teams only
   - Recalculate statistics using rolling window (drop oldest game, add newest)
   - Update MongoDB records for affected teams only
   - Much faster than full recalculation (only updates teams that played)

3. Frontend:
   - Load pre-calculated data from cache/API
   - Apply region filter client-side
   - Apply threshold filter client-side
   - Sort and display top 20
   - Support team search from cached data
   - Instant loading (< 1 second)
   - Instant threshold switching (< 100ms)
   - Instant team search (< 100ms)

4. Cache Storage:
   - MongoDB (preferred - already configured)
   - Store ALL teams with ALL stats
   - Enable fast queries by region + threshold
   - Support team name search with indexing
```

#### MongoDB Connection:
```
MONGODB_URI=***REMOVED***
```

#### API-Football Endpoints:
```
GET /leagues - Get all leagues (filter to ~200 main leagues)
GET /teams?league={id}&season=2024 - Get teams in league
GET /fixtures?team={id}&last=20 - Get last 20 games
GET /fixtures/statistics?fixture={id} - Get game statistics
GET /fixtures?date={YYYY-MM-DD} - Get yesterday's fixtures for incremental update
```

### 8. Data Structure

#### Cached Data Format (MongoDB Collection: "team_stats"):
```json
{
  "_id": "ObjectId",
  "team_id": 123,
  "name": "SJK",
  "league_id": 244,
  "league": "Veikkausliiga",
  "country": "Finland",
  "region": "european",
  "played": 25,
  "last_updated": "2026-01-07T04:00:00Z",
  "stats": {
    "goals": {
      "over_1_5_count": 23,
      "over_1_5_pct": 92,
      "over_2_5_count": 19,
      "over_2_5_pct": 76,
      "over_3_5_count": 14,
      "over_3_5_pct": 56,
      "over_4_5_count": 8,
      "over_4_5_pct": 32,
      "avg_total": 3.2
    },
    "corners": {
      "over_8_5_count": 22,
      "over_8_5_pct": 88,
      "over_9_5_count": 18,
      "over_9_5_pct": 72,
      "over_10_5_count": 15,
      "over_10_5_pct": 60,
      "over_11_5_count": 12,
      "over_11_5_pct": 48,
      "over_12_5_count": 8,
      "over_12_5_pct": 32,
      "avg_total": 10.5
    },
    "cards": {
      "over_2_5_count": 20,
      "over_2_5_pct": 80,
      "over_3_5_count": 15,
      "over_3_5_pct": 60,
      "over_4_5_count": 10,
      "over_4_5_pct": 40,
      "over_5_5_count": 5,
      "over_5_5_pct": 20,
      "avg_total": 4.2
    },
    "btts": {
      "count": 17,
      "pct": 68,
      "avg_scored": 1.8,
      "avg_conceded": 1.4
    }
  },
  "recent_games": [
    {
      "fixture_id": 12345,
      "date": "2026-01-06",
      "goals": 3,
      "corners": 11,
      "cards": 5,
      "scored": 2,
      "conceded": 1,
      "btts": true
    }
    // ... last 20 games for rolling calculation
  ]
}
```

#### MongoDB Indexes:
```javascript
// For fast region + threshold queries
db.team_stats.createIndex({ "region": 1, "stats.goals.over_2_5_pct": -1 })
db.team_stats.createIndex({ "region": 1, "stats.corners.over_9_5_pct": -1 })
db.team_stats.createIndex({ "region": 1, "stats.cards.over_3_5_pct": -1 })
db.team_stats.createIndex({ "region": 1, "stats.btts.pct": -1 })

// For team search
db.team_stats.createIndex({ "name": "text" })
```

### 9. Current Issues
- ❌ Only showing 3 hardcoded teams (Man United, Man City, Liverpool)
- ❌ Not analyzing all teams worldwide
- ❌ Region filters don't work (all show same teams)
- ❌ Data is fake/sample data, not real statistics
- ❌ No background job to fetch real data
- ❌ No threshold selection (only shows one threshold per bet type)
- ❌ Missing multiple goal/corner/card thresholds
- ❌ No league filtering (includes women's/youth leagues)
- ❌ No team search functionality
- ❌ No incremental update strategy

### 10. What Needs To Be Built

#### Phase 1: Data Collection Script (Initial Full Load)
Create `scripts/fetch-all-teams-stats.js`:
- Fetch ALL leagues from API-Football
- **Filter to ~200 main leagues** (exclude women's, U21, youth by name/type)
- Map each league to a region (UK/European/Asia/Americas)
- For each league, get all teams
- For each team, fetch last 20 games
- Calculate ALL statistics for ALL thresholds
- Store in MongoDB with region mapping
- Store recent_games array for rolling calculations
- Handle API rate limits (10 requests/second)
- Log progress (leagues processed, teams processed, API calls made)

#### Phase 2: Incremental Update Script
Create `scripts/update-daily-stats.js`:
- Fetch yesterday's completed fixtures from API-Football
- Extract unique team IDs from fixtures
- For each team that played:
  - Fetch updated last 20 games
  - Recalculate ALL statistics using rolling window
  - Update MongoDB record
- Much faster than full recalculation (only ~100-500 teams/day vs all teams)
- Reduces API calls by 90%+

#### Phase 3: Cron Job
Create `pages/api/cron/refresh-all-stats.ts`:
- Runs daily at 4 AM UTC
- Calls incremental update script (not full recalculation)
- Updates cache/database for teams that played yesterday
- Protected with CRON_SECRET
- Returns summary (teams updated, API calls made, duration)

#### Phase 4: API Endpoint
Create `pages/api/stats.ts`:
- Fetch from MongoDB
- Support query parameters:
  - `region`: all/uk/european/asia/americas
  - `betType`: goals/corners/cards/btts
  - `threshold`: 1.5/2.5/3.5/4.5 (goals), 8.5-12.5 (corners), etc.
  - `search`: team name (optional)
- Return top 20 for requested filters OR searched team stats
- Fast response (< 500ms)
- Cache response for 1 hour

#### Phase 5: Frontend Updates
Update `src/components/sections/RealFormTablesSection.tsx`:
- Add threshold selection UI (buttons/dropdown)
- Add team search input box
- Load from real API endpoint (not hardcoded data)
- Implement region filtering correctly
- Implement threshold filtering correctly
- Show different teams per region AND threshold
- Display actual calculated statistics
- Instant threshold switching (data pre-loaded)
- Instant team search (client-side filtering)

### 11. Success Criteria
✅ ~200 main professional leagues analyzed (no women's/youth)
✅ Form Tables shows 20 different teams per bet type per threshold
✅ Teams are from all over the world (not just top leagues)
✅ Region filters show different teams per region
✅ Threshold filters show different teams per threshold
✅ "All Regions" shows truly global top 20
✅ User can switch between Over 1.5, 2.5, 3.5, 4.5 goals
✅ User can switch between Over 8.5, 9.5, 10.5, 11.5, 12.5 corners
✅ User can switch between Over 2.5, 3.5, 4.5, 5.5 cards
✅ User can search for any team and view their stats
✅ Data is real, calculated from actual games
✅ Updates automatically every 24 hours (incremental)
✅ Loads instantly (< 1 second)
✅ Threshold switching is instant (< 100ms)
✅ Team search is instant (< 100ms)

### 12. Example Expected Output

#### Goals Tab - Over 2.5 - All Regions:
1. SJK (Finland) - 76%
2. Nacional (Portugal) - 66%
3. Stromsgodset (Norway) - 80%
4. Shanghai Port (China) - 80%
5. HJK (Finland) - 75%
... (15 more teams from various leagues)

#### Goals Tab - Over 3.5 - All Regions:
1. Team A (Country X) - 68%
2. Team B (Country Y) - 65%
3. Team C (Country Z) - 62%
... (17 more different teams - different from Over 2.5 list)

#### Corners Tab - Over 9.5 - UK Filter:
1. Manchester City - 72%
2. Liverpool - 68%
3. Arsenal - 65%
... (17 more UK teams)

#### Corners Tab - Over 10.5 - UK Filter:
1. Team D - 58%
2. Team E - 55%
3. Team F - 52%
... (17 more different UK teams - different from Over 9.5 list)

#### Team Search - "Liverpool":
Shows Liverpool's stats for all bet types and thresholds even if not in top 20

### 13. Files To Modify/Create

#### New Files:
- `scripts/fetch-all-teams-stats.js` - Initial full data collection (calculate ALL thresholds, filter leagues)
- `scripts/update-daily-stats.js` - Incremental daily update (only teams that played)
- `pages/api/cron/refresh-all-stats.ts` - Cron job (calls incremental update)
- `pages/api/stats.ts` - API endpoint (support threshold + region + search parameters)
- `IMPLEMENTATION_LOG.md` - Track progress

#### Modify:
- `src/components/sections/RealFormTablesSection.tsx` - Add threshold selection UI, team search, use real data
- `src/services/directStats.ts` - Fetch from correct endpoint with threshold + region + search parameters
- `vercel.json` - Update cron schedule

### 14. API-Football Rate Limits
- **Free Plan**: 100 requests/day
- **Basic Plan**: 10 requests/second, 3000/day
- **Strategy**: 
  - Initial full load: ~2000-3000 API calls (one-time)
  - Daily incremental: ~100-500 API calls (only teams that played)
  - Cache aggressively (24 hours)
  - Update once daily at 4 AM UTC

### 15. Deployment Info
- **Vercel**: https://vercel.com/dannythehat/golden-bet-ai
- **Render API**: rnd_ww1Xfqmo6fxzZkjdCYc5CtqNZFHV
- **Vercel API Key**: Wk8u4Yp7w4RAwGoExza49vaY49vaY
- **GitHub Repo**: https://github.com/dannythehat/golden-bet-ai (PUBLIC)

---

## CRITICAL NOTES FOR IMPLEMENTATION:

### League Filtering (CRITICAL):
1. Fetch all leagues from API-Football
2. Filter to ~200 main professional leagues
3. **EXCLUDE** leagues with these keywords in name/type:
   - "Women", "Women's", "Feminine", "Femenina"
   - "U21", "U19", "U18", "U17", "Under 21", "Under 19", "Under 18"
   - "Youth", "Junior", "Reserve", "B Team", "Amateur"
4. **INCLUDE** only main professional leagues:
   - Premier League, Championship, League One, League Two (UK)
   - La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie (Europe)
   - J-League, K-League, Chinese Super League (Asia)
   - MLS, Liga MX, Brazilian Serie A, Argentine Primera (Americas)
   - And ~180 more main leagues worldwide

### Region Mapping (CRITICAL):
Each league must be mapped to a region:
- **UK**: England, Scotland, Wales, Northern Ireland leagues
- **European**: All European countries (except UK)
- **Asia**: Japan, South Korea, China, India, Saudi Arabia, etc.
- **Americas**: USA, Mexico, Brazil, Argentina, etc.

### Caching Strategy (CRITICAL):
1. **Initial Load**: Calculate ALL teams from ~200 leagues, store in MongoDB
2. **Daily Update**: Only update teams that played yesterday (incremental)
3. **Frontend**: Load ALL cached data once, filter client-side for instant switching
4. **Team Search**: All teams cached, search is client-side filtering

### Data Calculation (CRITICAL):
1. Each team stores last 20 games in `recent_games` array
2. Calculate ALL thresholds from these 20 games
3. Daily update: Drop oldest game, add newest game, recalculate
4. Rolling window approach = efficient incremental updates

### User Experience (CRITICAL):
1. Top 20 tables show best teams per region/threshold
2. Users can search ANY team to view their stats
3. Threshold switching is instant (data pre-calculated)
4. Region switching is instant (client-side filtering)
5. Team search is instant (client-side filtering)

---

## START HERE:
1. Create `scripts/fetch-all-teams-stats.js` with league filtering (~200 main leagues)
2. Implement region mapping logic (UK/European/Asia/Americas)
3. Calculate ALL thresholds for ALL teams
4. Store in MongoDB with indexes
5. Create API endpoint with region + threshold + search support
6. Update frontend with threshold selection UI and team search
7. Implement incremental daily update script
8. Setup cron job for 4 AM UTC daily refresh
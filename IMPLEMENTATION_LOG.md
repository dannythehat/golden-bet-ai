# Form Tables Implementation Log

## Session: January 7, 2026

### Objective
Implement Form Tables feature that analyzes ~200 main professional leagues worldwide and displays top 20 teams per bet type/threshold/region.

---

## Phase 1: Initial Setup & Verification

### Step 1.1: Repository Analysis ✅
- **Time**: 14:45 UTC
- **Action**: Analyzed repository structure
- **Findings**:
  - MongoDB dependency already installed (v6.12.0)
  - Existing scripts folder with collectStats.js (uses Supabase)
  - API-Football key available: `***REMOVED***`
  - Current implementation uses Supabase, need to migrate to MongoDB
  - MongoDB URI from requirements: `***REMOVED***

### Step 1.2: Data Collection Script Created ✅
- **Time**: 14:50 UTC
- **Action**: Created `scripts/fetch-all-teams-stats.js`
- **Features Implemented**:
  - ✅ League filtering with EXCLUDE_KEYWORDS (women's, U21, youth, etc.)
  - ✅ Region mapping for UK, European, Asia, Americas
  - ✅ Comprehensive statistics calculation for ALL thresholds:
    - Goals: Over 1.5, 2.5, 3.5, 4.5
    - Corners: Over 8.5, 9.5, 10.5, 11.5, 12.5
    - Cards: Over 2.5, 3.5, 4.5, 5.5
    - BTTS: Percentage and averages
  - ✅ MongoDB storage with proper schema
  - ✅ Automatic index creation
  - ✅ Rate limiting (100ms between API calls)
  - ✅ Error tracking and logging
  - ✅ TEST MODE: Processes 5 leagues, 3 teams each for verification
- **File**: `scripts/fetch-all-teams-stats.js`
- **Status**: READY FOR TESTING

---

## Implementation Checklist

### Phase 1: Data Collection Script ✅
- [x] Create `scripts/fetch-all-teams-stats.js`
- [x] Implement league filtering (~200 main leagues, exclude women's/youth)
- [x] Implement region mapping (UK/European/Asia/Americas)
- [x] Fetch teams from filtered leagues
- [x] Calculate ALL thresholds for each team
- [x] Store in MongoDB with proper structure
- [ ] Test with sample data (NEXT STEP)
- [ ] Verify MongoDB storage (NEXT STEP)
- [ ] Run full collection (~200 leagues)

### Phase 2: Incremental Update Script ⏳
- [ ] Create `scripts/update-daily-stats.js`
- [ ] Fetch yesterday's fixtures
- [ ] Update only teams that played
- [ ] Implement rolling window calculation
- [ ] Test incremental updates

### Phase 3: API Endpoint ⏳
- [ ] Create `pages/api/stats.ts`
- [ ] Support region filtering
- [ ] Support threshold filtering
- [ ] Support team search
- [ ] Test API responses
- [ ] Verify performance (<500ms)

### Phase 4: Frontend Updates ⏳
- [ ] Update `RealFormTablesSection.tsx`
- [ ] Add threshold selection UI
- [ ] Add team search input
- [ ] Connect to real API endpoint
- [ ] Test region filtering
- [ ] Test threshold switching
- [ ] Test team search

### Phase 5: Cron Job ⏳
- [ ] Create `pages/api/cron/refresh-all-stats.ts`
- [ ] Configure for 4 AM UTC
- [ ] Test cron execution
- [ ] Update `vercel.json`

---

## Script Features & Configuration

### League Filtering
**EXCLUDE Keywords** (case-insensitive):
- Women's leagues: 'women', 'feminine', 'femenina', 'femminile', 'frauen'
- Youth leagues: 'u21', 'u19', 'u18', 'u17', 'u20', 'under 21', 'under 19', 'under 18'
- Other: 'youth', 'junior', 'reserve', 'b team', 'amateur'

### Region Mapping
- **UK**: England, Scotland, Wales, Northern Ireland
- **European**: Spain, Germany, Italy, France, Netherlands, Portugal, Belgium, Turkey, Russia, Ukraine, Greece, Austria, Switzerland, Denmark, Sweden, Norway, Poland, Czech Republic, Croatia, Serbia, Romania, Bulgaria, Hungary, Finland
- **Asia**: Japan, South Korea, China, India, Saudi Arabia, UAE, Qatar, Iran, Iraq, Thailand, Vietnam, Malaysia, Singapore, Indonesia, Australia
- **Americas**: USA, Mexico, Brazil, Argentina, Colombia, Chile, Uruguay, Paraguay, Peru, Ecuador, Bolivia, Venezuela, Canada, Costa Rica

### Statistics Calculated Per Team
For each team's last 20 games:
- **Goals**: Count and percentage for Over 1.5, 2.5, 3.5, 4.5 + average
- **Corners**: Count and percentage for Over 8.5, 9.5, 10.5, 11.5, 12.5 + average
- **Cards**: Count and percentage for Over 2.5, 3.5, 4.5, 5.5 + average
- **BTTS**: Count, percentage, avg scored, avg conceded

### Rate Limiting
- 100ms delay between API calls (10 requests/second)
- Respects API-Football rate limits

---

## Issues & Resolutions

### Issue 1: MongoDB Authentication ⚠️
- **Time**: 14:46 UTC
- **Issue**: MongoDB connection test failed with "bad auth : authentication failed"
- **Investigation**: Bhindi MongoDB agent has authentication issues
- **Resolution**: Script uses direct MongoDB connection with provided URI
- **Status**: BYPASSED - Using direct connection in script

---

## API Call Tracking

### Test Run (5 leagues, 3 teams each)
- **Estimated API Calls**: ~20-30
- **Breakdown**:
  - 1 call: Fetch all leagues
  - 5 calls: Fetch teams per league
  - 15 calls: Fetch fixtures per team (3 teams × 5 leagues)
- **Status**: READY TO RUN

### Full Production Run (~200 leagues)
- **Estimated API Calls**: 2000-3000
- **Leagues to Process**: ~200 main leagues
- **Teams to Process**: ~3000-5000 teams
- **Status**: NOT STARTED (waiting for test verification)

### Daily Incremental Updates (Not Yet Configured)
- **Estimated API Calls**: 100-500 per day
- **Status**: NOT CONFIGURED

---

## MongoDB Schema

### Collection: `team_stats`
```javascript
{
  _id: ObjectId,
  team_id: Number,
  name: String,
  league_id: Number,
  league: String,
  country: String,
  region: String, // 'uk', 'european', 'asia', 'americas'
  played: Number,
  last_updated: Date,
  stats: {
    goals: {
      over_1_5_count: Number,
      over_1_5_pct: Number,
      over_2_5_count: Number,
      over_2_5_pct: Number,
      over_3_5_count: Number,
      over_3_5_pct: Number,
      over_4_5_count: Number,
      over_4_5_pct: Number,
      avg_total: Number
    },
    corners: {
      over_8_5_count: Number,
      over_8_5_pct: Number,
      over_9_5_count: Number,
      over_9_5_pct: Number,
      over_10_5_count: Number,
      over_10_5_pct: Number,
      over_11_5_count: Number,
      over_11_5_pct: Number,
      over_12_5_count: Number,
      over_12_5_pct: Number,
      avg_total: Number
    },
    cards: {
      over_2_5_count: Number,
      over_2_5_pct: Number,
      over_3_5_count: Number,
      over_3_5_pct: Number,
      over_4_5_count: Number,
      over_4_5_pct: Number,
      over_5_5_count: Number,
      over_5_5_pct: Number,
      avg_total: Number
    },
    btts: {
      count: Number,
      pct: Number,
      avg_scored: Number,
      avg_conceded: Number
    }
  },
  recent_games: Array // Last 20 games for rolling calculations
}
```

### Indexes (Auto-created by script)
```javascript
// For fast region + threshold queries
db.team_stats.createIndex({ "region": 1, "stats.goals.over_2_5_pct": -1 })
db.team_stats.createIndex({ "region": 1, "stats.corners.over_9_5_pct": -1 })
db.team_stats.createIndex({ "region": 1, "stats.cards.over_3_5_pct": -1 })
db.team_stats.createIndex({ "region": 1, "stats.btts.pct": -1 })

// For team search
db.team_stats.createIndex({ "name": "text" })

// For unique team constraint
db.team_stats.createIndex({ "team_id": 1 }, { unique: true })
```

---

## Next Steps

### Immediate (Testing Phase)
1. ✅ Create data collection script
2. ⏳ Run test mode (5 leagues, 3 teams each)
3. ⏳ Verify MongoDB storage and data structure
4. ⏳ Check sample statistics calculations
5. ⏳ Confirm region mapping works correctly

### After Test Verification
6. Remove .slice() limits to process all ~200 leagues
7. Run full data collection
8. Monitor API usage and rate limits
9. Verify all teams stored correctly
10. Create API endpoint for frontend

---

## Test Execution Plan

### Test Command
```bash
cd /path/to/golden-bet-ai
node scripts/fetch-all-teams-stats.js
```

### Expected Test Output
- ✅ MongoDB connection successful
- ✅ Indexes created
- ✅ ~1000+ leagues fetched
- ✅ ~200+ leagues filtered (main professional only)
- ✅ 5 leagues processed (test mode)
- ✅ ~15 teams processed (3 per league)
- ✅ ~15 teams stored in MongoDB
- ✅ Sample data displayed with statistics
- ✅ ~20-30 API calls made
- ✅ Execution time: ~30-60 seconds

### Verification Checklist
- [ ] Script runs without errors
- [ ] MongoDB connection works
- [ ] Leagues filtered correctly (no women's/youth)
- [ ] Region mapping correct
- [ ] Statistics calculated correctly
- [ ] Data stored in MongoDB
- [ ] Indexes created
- [ ] Sample output shows valid percentages

---

## Notes
- User has been working on this all day - needs working solution ASAP
- Must exclude women's/youth leagues ✅
- Must support team search functionality (Phase 3)
- Must use incremental updates (Phase 2)
- All thresholds must be pre-calculated for instant switching ✅
- TEST MODE enabled: Only processes 5 leagues, 3 teams each
- Remove .slice() limits in code to run full collection

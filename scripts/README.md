# Form Tables Data Collection Scripts

## Overview
These scripts collect and process football statistics from API-Football for the Form Tables feature.

---

## Scripts

### 1. `fetch-all-teams-stats.js` - Initial Data Collection
**Purpose**: Fetch and calculate statistics for all teams from ~200 main professional leagues worldwide.

**Features**:
- Filters to main professional leagues (excludes women's, U21, youth)
- Maps leagues to regions (UK, European, Asia, Americas)
- Calculates ALL thresholds for each team:
  - Goals: Over 1.5, 2.5, 3.5, 4.5
  - Corners: Over 8.5, 9.5, 10.5, 11.5, 12.5
  - Cards: Over 2.5, 3.5, 4.5, 5.5
  - BTTS: Percentage and averages
- Stores in MongoDB with proper indexing
- Rate limited (10 requests/second)

**Test Mode**: Currently processes 5 leagues, 3 teams each for verification.

**Usage**:
```bash
# Install dependencies first
npm install

# Run test mode (5 leagues, 3 teams each)
node scripts/fetch-all-teams-stats.js

# Expected output:
# - ~20-30 API calls
# - ~15 teams stored
# - ~30-60 seconds execution time
```

**To Run Full Collection**:
1. Open `scripts/fetch-all-teams-stats.js`
2. Find these lines:
   ```javascript
   const testLeagues = mainLeagues.slice(0, 5);  // Line ~350
   const testTeams = teamsData.response.slice(0, 3);  // Line ~370
   ```
3. Change to:
   ```javascript
   const testLeagues = mainLeagues;  // Process ALL leagues
   const testTeams = teamsData.response;  // Process ALL teams
   ```
4. Run: `node scripts/fetch-all-teams-stats.js`
5. Expected: ~2000-3000 API calls, ~3000-5000 teams, ~30-60 minutes

---

## Environment Variables Required

Add to `.env` file:
```env
VITE_API_FOOTBALL_KEY="***REMOVED***"
MONGODB_URI="***REMOVED***"
```

---

## MongoDB Schema

### Collection: `team_stats`
```javascript
{
  team_id: Number,           // Unique team ID from API-Football
  name: String,              // Team name
  league_id: Number,         // League ID
  league: String,            // League name
  country: String,           // Country name
  region: String,            // 'uk', 'european', 'asia', 'americas'
  played: Number,            // Games played (usually 20)
  last_updated: Date,        // Last update timestamp
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
    corners: { /* similar structure */ },
    cards: { /* similar structure */ },
    btts: {
      count: Number,
      pct: Number,
      avg_scored: Number,
      avg_conceded: Number
    }
  },
  recent_games: Array        // Last 20 games for rolling calculations
}
```

### Indexes (Auto-created)
- `team_id` (unique)
- `region + stats.goals.over_2_5_pct` (for fast queries)
- `region + stats.corners.over_9_5_pct`
- `region + stats.cards.over_3_5_pct`
- `region + stats.btts.pct`
- `name` (text search)

---

## Verification Steps

After running the script:

1. **Check MongoDB**:
   ```javascript
   // Connect to MongoDB and verify
   use footy-oracle
   db.team_stats.countDocuments()  // Should show number of teams
   db.team_stats.findOne()         // Check structure
   ```

2. **Verify Data Quality**:
   ```javascript
   // Check region distribution
   db.team_stats.aggregate([
     { $group: { _id: "$region", count: { $sum: 1 } } }
   ])
   
   // Check top teams for Over 2.5 Goals
   db.team_stats.find({}).sort({ "stats.goals.over_2_5_pct": -1 }).limit(10)
   ```

3. **Check Logs**:
   - Look for "✅ TEST RUN COMPLETE" message
   - Verify API calls count
   - Check for errors

---

## Troubleshooting

### MongoDB Connection Failed
- Verify MONGODB_URI in .env file
- Check network connectivity
- Ensure MongoDB Atlas allows your IP

### API Rate Limit Exceeded
- Script has 100ms delay between calls (10/second)
- If still hitting limits, increase delay in code
- Check API-Football dashboard for usage

### Missing Statistics
- Some leagues may not have corner/card data
- Script handles missing data gracefully
- Check API-Football documentation for data availability

---

## Next Steps

After successful test run:
1. ✅ Verify MongoDB data
2. ✅ Check sample statistics
3. ✅ Confirm region mapping
4. Remove test limits and run full collection
5. Create API endpoint for frontend
6. Update frontend to use real data
7. Setup daily incremental updates

---

## API Usage Tracking

### Test Run (Current)
- Leagues fetched: ~1000+
- Leagues filtered: ~200+ main leagues
- Leagues processed: 5 (test mode)
- Teams processed: ~15
- API calls: ~20-30
- Duration: ~30-60 seconds

### Full Run (After Test)
- Leagues processed: ~200
- Teams processed: ~3000-5000
- API calls: ~2000-3000
- Duration: ~30-60 minutes

### Daily Updates (Future)
- API calls: ~100-500
- Duration: ~5-10 minutes
- Only updates teams that played yesterday

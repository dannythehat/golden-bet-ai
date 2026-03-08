# COMPLETE BACKFILL: Goals + Corners + Cards

## ✅ IMPLEMENTATION COMPLETE

### What Was Built

**1. Database Schema** (`RegionalStats`)
- Added `category` field: GOALS, CORNERS, CARDS
- Changed `avgGoalsPerGame` → `avgPerGame` (generic)
- Supports 20 markets total

**2. Bootstrap Script** (`bootstrapAllStats.ts`)
- Fetches last 20 matches for ALL teams in 70+ leagues
- Calculates stats for ALL 20 markets
- Safe rate: 10 calls/minute (6 second delay)
- Estimated time: 36 hours
- Creates ~220k documents in MongoDB

**3. Frontend** (`RealFormTablesSection.tsx`)
- 3 category tabs: Goals | Corners | Cards
- Market buttons per category
- Flow: Region → Category → Market → Top 30 table

**4. API** (`regionalStats.ts`)
- New endpoint: `/api/regions/:region/categories/:category/markets/:market`
- Returns top 30 teams sorted by success percentage

**5. Daily Rolling Job** (`updateRegionalStatsDaily.ts`)
- Fetches YESTERDAY'S finished matches
- Updates ALL 20 markets for both teams
- Rolling window: adds yesterday, keeps 20-match limit

## Markets Configuration

### GOALS (8 markets)
- OVER_1_5, OVER_2_5, OVER_3_5, OVER_4_5
- UNDER_1_5, UNDER_2_5, UNDER_3_5, UNDER_4_5

### CORNERS (4 markets)
- OVER_8_5, OVER_9_5, OVER_10_5, OVER_11_5

### CARDS (8 markets)
- OVER_2_5, OVER_3_5, OVER_4_5, OVER_5_5
- UNDER_2_5, UNDER_3_5, UNDER_4_5, UNDER_5_5

**Total: 20 markets**

## Data Sources

### API-Football Endpoints Used

**Fixtures:**
```
GET /fixtures?date=YYYY-MM-DD&status=FT
GET /fixtures?team={teamId}&season=2024&last=20
```

**Statistics:**
```
GET /fixtures/statistics?fixture={fixtureId}
```

**Response Fields:**
- `corners.home` + `corners.away` = Total corners
- `cards.yellow.home` + `cards.yellow.away` = Yellow cards
- `cards.red.home` + `cards.red.away` = Red cards
- **Cards calculation:** yellows + (reds × 2)

## User Flow

### Example: Europe → Corners → Over 9.5

1. User clicks **EUROPE** region button
2. User clicks **CORNERS** tab
3. User clicks **OVER 9.5** market button
4. Frontend fetches: `/api/regions/EUROPE/categories/CORNERS/markets/OVER_9_5`
5. Table shows top 30 teams with highest corner success rates

**Sample Result:**
```
#1  Real Madrid (La Liga)        P:20  95%  Avg:11.2  Plays Today: Yes
#2  Bayern Munich (Bundesliga)   P:20  90%  Avg:10.8  Plays Today: No
#3  Man City (Premier League)    P:20  85%  Avg:10.5  Plays Today: Yes
```

## Bootstrap Process

### How to Run

```bash
# Start bootstrap (background process)
npm run bootstrap:all-stats

# Monitor progress (logs every hour)
tail -f logs/bootstrap.log
```

### Progress Tracking

- Logs team name, league, region every update
- Shows total teams processed and API calls made
- Estimated completion: 36 hours

### What Happens

```
For each REGION (EUROPE, ASIA, AMERICAS, AFRICA):
  For each LEAGUE in region (70+ total):
    For each TEAM in league (~150 teams):
      Fetch last 20 fixtures
      For each fixture:
        Fetch statistics (corners, cards)
      Calculate success rates for:
        - 8 GOALS markets
        - 4 CORNERS markets
        - 8 CARDS markets
      Upsert 20 documents to MongoDB
      Sleep 6 seconds (rate limit)
```

## Daily Rolling Update

### How It Works

**4am UTC Daily:**
1. Fetch ALL finished matches from YESTERDAY
2. For each match:
   - Fetch fixture statistics
   - Extract goals, corners, cards
   - Update BOTH teams for ALL 20 markets
   - Rolling window: add yesterday, keep 20-match limit

**Example:**
- Team had 20 matches, 15 successes for OVER_2_5 (75%)
- Yesterday: scored 3 goals (success)
- New stats: 20 matches, 16 successes (80%)

## API Efficiency

### Bootstrap (One-Time)
- ~11,000 teams × 20 fixtures = 220,000 fixture calls
- ~220,000 fixtures × 1 stats call = 220,000 stats calls
- **Total: ~440,000 API calls over 36 hours**

### Daily Rolling (Ongoing)
- ~500 matches/day × 1 stats call = 500 calls
- **Total: ~500 API calls/day**

## Testing

### Test Bootstrap
```bash
# Check if data exists
curl http://localhost:3000/api/regions/EUROPE/categories/GOALS/markets/OVER_2_5

# Should return top 30 teams with stats
```

### Test Frontend
1. Navigate to Form Tables section
2. Click **EUROPE** region
3. Click **CORNERS** tab
4. Click **OVER 9.5** market
5. Should see top 30 teams table

### Test Rolling Update
```bash
# Run manually
npm run cron:rolling-update

# Check logs
tail -f logs/rolling-update.log
```

## Database Stats

### Expected Documents
- 70 leagues × ~150 teams = ~11,000 teams
- 11,000 teams × 20 markets = ~220,000 documents
- Each document ~200 bytes = ~44 MB total

### Indexes
```javascript
{ region: 1, category: 1, market: 1, successPercent: -1 }
{ teamId: 1 }
```

## Deployment Checklist

- [x] Update MongoDB schema
- [x] Create bootstrap script
- [x] Update frontend with category tabs
- [x] Update API endpoints
- [x] Create daily rolling job
- [ ] Run bootstrap (36 hours)
- [ ] Schedule daily cron job
- [ ] Test all 20 markets
- [ ] Monitor API usage

## Commits

- `5067d22` - Update schema for Goals + Corners + Cards
- `b1e41ef` - Create complete bootstrap script
- `8fb453b` - Update frontend with category tabs
- `1faf60f` - Update API for categories
- `57ad821` - Create extended daily rolling job

---

**Status:** ✅ CODE COMPLETE - Ready for bootstrap
**Next Step:** Run `npm run bootstrap:all-stats` (36 hour process)

# Regional Form Tables - Simple System

## Overview
Complete rebuild of form tables using region → market → top 30 approach.

## Architecture

### Frontend
- **Component**: `RealFormTablesSection.tsx`
- **Flow**: Select Region → Select Market → View Top 30 Teams
- **No Calculations**: All data comes from 4am cache

### Backend
- **API Endpoints**:
  - `GET /api/regions` - List regions
  - `GET /api/regions/:region/markets` - List markets
  - `GET /api/regions/:region/markets/:market` - Get top 30 teams

### Database
- **Collection**: `regionalGoalStats`
- **Schema**:
  ```json
  {
    "region": "EUROPE",
    "market": "OVER_2_5",
    "teamId": 12345,
    "teamName": "Kashmir FC",
    "matchesSampled": 20,
    "successCount": 20,
    "successPercent": 100,
    "avgGoalsPerGame": 3.8,
    "lastUpdated": "2026-01-09T04:00:00Z"
  }
  ```

### Cron Job
- **File**: `src/jobs/updateRegionalStats.ts`
- **Schedule**: Daily at 4:00 AM UTC
- **Process**:
  1. For each region (EUROPE, ASIA, AMERICAS, AFRICA, WORLD)
  2. For each league in region
  3. For each team in league
  4. Fetch last 20 fixtures
  5. Calculate success rates for all 8 markets
  6. Upsert to MongoDB

## Regions
- EUROPE (13 leagues)
- ASIA (6 leagues)
- AMERICAS (5 leagues)
- AFRICA (2 leagues)
- WORLD (all leagues)

## Markets
- OVER_1_5, OVER_2_5, OVER_3_5, OVER_4_5
- UNDER_1_5, UNDER_2_5, UNDER_3_5, UNDER_4_5

## User Flow
1. Click **EUROPE** region button
2. Click **OVER 2.5** market button
3. See top 30 teams across ALL European leagues
4. Teams sorted by success percentage (descending)
5. Shows: Team | P | % | Avg | Plays Today

## Key Features
- ✅ No league dropdowns
- ✅ No live calculations
- ✅ All data from 4am cache
- ✅ Top 30 across entire region
- ✅ Mixed leagues in results
- ✅ Simple and fast

## Example
**User Action**: Click EUROPE + OVER 2.5

**Result**:
```
#1  Real Madrid (La Liga)        20  95%  3.5  Yes
#2  Bayern Munich (Bundesliga)   20  90%  3.2  No
#3  Man City (Premier League)    20  85%  3.0  Yes
...
#30 Some Team (Belgian League)   20  65%  2.8  No
```

## API Usage
- **Daily**: ~25,000 calls (26 leagues × ~20 teams × 20 fixtures)
- **User Interaction**: 0 calls (reads from cache)
- **Cache Duration**: 24 hours (refreshes at 4am)

## Deployment
1. Push code to GitHub
2. Loveable auto-deploys
3. Run initial cron job manually to populate data
4. Schedule daily 4am cron job

## Testing
```bash
# Test API endpoints
curl http://localhost:3000/api/regions
curl http://localhost:3000/api/regions/EUROPE/markets
curl http://localhost:3000/api/regions/EUROPE/markets/OVER_2_5

# Run cron job manually
npm run cron:regional-stats
```

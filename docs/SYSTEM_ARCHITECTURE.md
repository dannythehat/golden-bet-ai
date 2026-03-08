# Complete Stats System Architecture

## Overview
This system fetches data from API-Football, calculates betting statistics for ALL major leagues worldwide, stores in MongoDB, and provides filtering by bet type and region.

---

## 🎯 User Features

### 1. **Form Teams Filter**
- Select **Bet Type**: O2.5 Goals, O8.5 Corners, O3.5 Cards, BTTS Yes, etc.
- Select **Region**: UK, Europe, Asia, Americas, All
- See **ranked teams** with best stats for that bet type

### 2. **Today's Fixtures**
- View all today's matches
- Select **Bet Type**
- See **both teams' stats** for that bet type
- Example: "Man City O2.5: 75% | Arsenal O2.5: 60%"

---

## 📊 Data Coverage

### Leagues: **80+ Major Leagues**
- **UK**: 5 leagues (Premier League, Championship, etc.)
- **Europe**: 30 leagues (La Liga, Bundesliga, Serie A, etc.)
- **Asia**: 12 leagues (J1 League, Saudi Pro League, etc.)
- **Americas**: 15 leagues (Brasileirão, Liga MX, MLS, etc.)
- **Africa**: 8 leagues (Egyptian Premier League, etc.)

### Teams: **1,500+ teams**
- ALL teams from ALL major leagues
- No U21 or Women's leagues

### Stats Calculated (Per Team):
**Goals:**
- Over/Under: 0.5, 1.5, 2.5, 3.5
- Average goals per game

**Corners:**
- Over/Under: 7.5, 8.5, 9.5, 10.5
- Average corners per game

**Cards:**
- Over/Under: 2.5, 3.5, 4.5, 5.5
- Average cards per game

**BTTS:**
- Yes/No percentage
- Avg goals scored/conceded

### Data Window:
- **Last 20 games** per team (rolling window)
- **Daily updates** at 4:00 AM UTC

---

## 🏗️ System Architecture

### Files Created:

1. **`src/types/database.ts`**
   - MongoDB schema definitions
   - Collections: leagues, teams, team_stats, fixtures, last_update
   - Indexes for performance

2. **`src/config/leagues.ts`**
   - 80+ major leagues configuration
   - League IDs, names, countries, regions
   - Helper functions to filter by region

3. **`src/services/statsCalculator.ts`**
   - Calculates all bet type statistics
   - Processes fixture data
   - Returns percentages and averages

4. **`src/services/footballApi.ts`** (Updated)
   - Added `getAllLeagues()`
   - Added `getTodaysFixtures()`
   - Added `getFixturesByDate()`

---

## 🗄️ MongoDB Collections

### 1. **leagues**
```javascript
{
  _id: ObjectId,
  league_id: 39,
  name: "Premier League",
  country: "England",
  region: "uk",
  season: 2024,
  is_active: true,
  created_at: Date,
  updated_at: Date
}
```

### 2. **teams**
```javascript
{
  _id: ObjectId,
  team_id: 50,
  name: "Manchester City",
  league_id: 39,
  league_name: "Premier League",
  country: "England",
  region: "uk",
  logo: "https://...",
  created_at: Date,
  updated_at: Date
}
```

### 3. **team_stats** (Main Collection)
```javascript
{
  _id: ObjectId,
  team_id: 50,
  team_name: "Manchester City",
  league_id: 39,
  league_name: "Premier League",
  region: "uk",
  season: 2024,
  games_analyzed: 20,
  
  goals: {
    over_0_5: 95,  // 95% of games had 0.5+ goals
    over_1_5: 85,
    over_2_5: 75,
    over_3_5: 60,
    under_2_5: 25,
    avg_goals: 3.2
  },
  
  corners: {
    over_7_5: 80,
    over_8_5: 75,
    over_9_5: 70,
    over_10_5: 60,
    avg_corners: 11.2
  },
  
  cards: {
    over_2_5: 65,
    over_3_5: 50,
    over_4_5: 35,
    over_5_5: 20,
    avg_cards: 3.8
  },
  
  btts: {
    yes: 70,  // 70% of games both teams scored
    no: 30,
    avg_goals_scored: 2.1,
    avg_goals_conceded: 1.1
  },
  
  last_updated: Date,
  created_at: Date
}
```

### 4. **fixtures** (Today's Matches)
```javascript
{
  _id: ObjectId,
  fixture_id: 12345,
  date: "2024-01-07",
  time: "15:00",
  home_team_id: 50,
  home_team_name: "Manchester City",
  away_team_id: 33,
  away_team_name: "Arsenal",
  league_id: 39,
  league_name: "Premier League",
  region: "uk",
  status: "Not Started",
  created_at: Date
}
```

### 5. **last_update** (Tracking)
```javascript
{
  _id: ObjectId,
  collection_name: "team_stats",
  last_update: Date,
  status: "success",
  records_updated: 1500,
  error_message: null
}
```

---

## 🔄 Data Flow

### Daily Update Process (4:00 AM UTC):

```
1. Fetch all leagues from API-Football
   ↓
2. For each league:
   - Fetch all teams
   - Store in 'teams' collection
   ↓
3. For each team:
   - Fetch last 20 fixtures
   - Fetch statistics for each fixture
   - Calculate all bet type stats
   - Store in 'team_stats' collection
   ↓
4. Fetch today's fixtures
   - Store in 'fixtures' collection
   ↓
5. Update 'last_update' tracking
```

### Query Process (User Request):

```
User selects: "Over 2.5 Goals" + "Europe"
   ↓
Query MongoDB:
   db.team_stats.find({
     region: "european"
   }).sort({
     "goals.over_2_5": -1
   }).limit(20)
   ↓
Return top 20 teams with highest O2.5 percentage
```

---

## 📈 API Usage Estimate

### Daily Data Refresh:
```
80 leagues × 20 teams = 1,600 teams
1,600 teams × 20 fixtures = 32,000 fixtures
32,000 fixtures × statistics = 32,000 stats calls
────────────────────────────────────────────────
Total: ~65,000 API calls per day
```

**Usage**: 65% of 100k daily limit
**Remaining**: 35,000 calls for other features

---

## 🎨 UI Components Needed

### 1. **Form Teams Section** (Update existing)
```tsx
<FormTeamsFilter>
  <BetTypeSelector>
    - Over 2.5 Goals
    - Over 8.5 Corners
    - Over 3.5 Cards
    - BTTS Yes
    - etc.
  </BetTypeSelector>
  
  <RegionSelector>
    - All
    - UK
    - Europe
    - Asia
    - Americas
  </RegionSelector>
  
  <TeamsList>
    {teams.map(team => (
      <TeamCard>
        {team.name} - {team.league}
        Stat: {team.stat_percentage}%
        Games: {team.games_analyzed}
      </TeamCard>
    ))}
  </TeamsList>
</FormTeamsFilter>
```

### 2. **Today's Fixtures Section** (New)
```tsx
<TodaysFixtures>
  <BetTypeSelector />
  
  <FixturesList>
    {fixtures.map(fixture => (
      <FixtureCard>
        {fixture.home_team} vs {fixture.away_team}
        Home: {home_stat}%
        Away: {away_stat}%
        Combined: {combined_probability}
      </FixtureCard>
    ))}
  </FixturesList>
</TodaysFixtures>
```

---

## 🚀 Next Steps

### Phase 1: Backend Setup (Need to build)
1. **MongoDB Connection Service**
   - Connect to your MongoDB
   - Create collections with indexes
   
2. **Data Aggregator Service**
   - Fetch from API-Football
   - Calculate stats using statsCalculator
   - Store in MongoDB
   
3. **API Endpoints** (Backend)
   - GET /api/stats/teams?betType=over_2_5&region=europe
   - GET /api/fixtures/today
   - GET /api/stats/update (trigger manual update)

### Phase 2: Frontend Integration
1. **Update Form Tables Section**
   - Add bet type selector
   - Connect to MongoDB API
   - Display ranked teams
   
2. **Create Today's Fixtures Section**
   - Fetch today's matches
   - Show both teams' stats
   - Calculate combined probabilities

### Phase 3: Automation
1. **Scheduled Job** (Vercel Cron or separate service)
   - Runs daily at 4:00 AM UTC
   - Triggers data update
   - Updates all team stats

---

## 🛠️ Technologies Needed

### Backend:
- **Node.js** (for data aggregator)
- **MongoDB Driver** (to connect and query)
- **API Routes** (Next.js API routes or Express)
- **Cron Job** (for daily updates)

### Frontend:
- **React Query** (for data fetching)
- **Updated UI Components** (bet type filters)

---

## ❓ Questions to Answer

1. **Backend Framework**: Do you want to use Next.js API routes or separate Node.js backend?
2. **Deployment**: Where will the data aggregator run? (Vercel Cron, separate server, etc.)
3. **Initial Data Load**: Should we start with high-priority leagues first, then expand?
4. **Update Frequency**: Daily at 4 AM is good, or need more frequent updates?

---

## 📝 Summary

**What's Done:**
✅ MongoDB schema designed
✅ 80+ leagues configured
✅ Stats calculator built
✅ API functions added

**What's Needed:**
❌ Backend data aggregator service
❌ MongoDB connection and queries
❌ API endpoints for frontend
❌ Updated UI components
❌ Scheduled daily updates

**Ready to build the backend data aggregator?** Let me know and I'll create it!

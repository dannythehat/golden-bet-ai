# Backend Data Aggregator - Setup & Usage

## 🎯 Overview

The backend data aggregator fetches data from API-Football, calculates betting statistics, and stores everything in MongoDB.

**Database**: `betting-stats` (separate from your existing `footy-oracle` data)

---

## 📦 Installation

```bash
# Install MongoDB driver
npm install mongodb

# Install TypeScript types
npm install --save-dev @types/mongodb
```

---

## 🔧 Configuration

### Environment Variables

Add to your `.env` file:

```env
# MongoDB (uses separate database: betting-stats)
MONGODB_URI=***REMOVED***

# API-Football
VITE_API_FOOTBALL_KEY=***REMOVED***
```

**Note**: The database name is `betting-stats` - completely separate from your existing data.

---

## 🚀 Usage

### Run Data Aggregation

```bash
# Full aggregation (takes 30-60 minutes)
npm run aggregate

# Check status
npm run aggregate:status
```

### What It Does:

1. **Updates Leagues** (80+ leagues)
2. **Fetches Teams** (1,500+ teams)
3. **Calculates Stats** (last 20 games per team)
   - Goals: O/U 0.5, 1.5, 2.5, 3.5
   - Corners: O/U 7.5, 8.5, 9.5, 10.5
   - Cards: O/U 2.5, 3.5, 4.5, 5.5
   - BTTS: Yes/No %
4. **Fetches Today's Fixtures**

---

## 📊 MongoDB Collections

### Database: `betting-stats`

**Collections:**
1. `leagues` - All major leagues
2. `teams` - All teams with metadata
3. `team_stats` - Calculated stats (main collection)
4. `fixtures` - Today's fixtures
5. `last_update` - Tracking info

---

## 🔍 Query Examples

### Get Top Teams for Over 2.5 Goals in Europe

```typescript
import { getTopTeamsByBetType } from './services/statsQuery';

const teams = await getTopTeamsByBetType('over_2_5_goals', 'european', 20);

// Returns:
[
  {
    team_name: "Manchester City",
    league_name: "Premier League",
    region: "uk",
    games_analyzed: 20,
    stat_value: 75,  // 75% of games had 2.5+ goals
    avg_value: 3.2,  // Average 3.2 goals per game
  },
  // ... 19 more teams
]
```

### Get Today's Fixtures with Stats

```typescript
import { getTodaysFixturesWithStats } from './services/statsQuery';

const fixtures = await getTodaysFixturesWithStats();

// Returns:
[
  {
    home_team: "Manchester City",
    away_team: "Arsenal",
    league: "Premier League",
    home_stats: { goals: {...}, corners: {...}, ... },
    away_stats: { goals: {...}, corners: {...}, ... },
  },
  // ... more fixtures
]
```

### Get Fixtures Filtered by Bet Type

```typescript
import { getTodaysFixturesByBetType } from './services/statsQuery';

// Get fixtures where BOTH teams have 60%+ O2.5 goals
const fixtures = await getTodaysFixturesByBetType('over_2_5_goals', 60);

// Returns:
[
  {
    home_team: "Man City",
    away_team: "Arsenal",
    home_stat: 75,  // Man City O2.5: 75%
    away_stat: 65,  // Arsenal O2.5: 65%
    combined_probability: 70,  // Average
  },
  // ... more fixtures
]
```

### Search Teams

```typescript
import { searchTeams } from './services/statsQuery';

const teams = await searchTeams('Manchester');

// Returns:
[
  { team_id: 50, name: "Manchester City", league: "Premier League" },
  { team_id: 33, name: "Manchester United", league: "Premier League" },
]
```

### Get Stats Summary

```typescript
import { getStatsSummary } from './services/statsQuery';

const summary = await getStatsSummary();

// Returns:
{
  total_teams: 1500,
  total_stats: 1500,
  todays_fixtures: 45,
  last_update: "2024-01-07T04:00:00Z",
  status: "success",
  by_region: {
    uk: 120,
    european: 600,
    asia: 240,
    americas: 300,
    other: 240
  }
}
```

---

## 📅 Scheduling (Daily Updates)

### Option 1: Vercel Cron (Recommended)

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/aggregate",
      "schedule": "0 4 * * *"
    }
  ]
}
```

Create API route `pages/api/cron/aggregate.ts`:

```typescript
import { aggregateAllData } from '@/services/dataAggregator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    await aggregateAllData();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Option 2: Node-Cron (Self-hosted)

```typescript
import cron from 'node-cron';
import { aggregateAllData } from './services/dataAggregator';

// Run daily at 4:00 AM UTC
cron.schedule('0 4 * * *', async () => {
  console.log('🕐 Running scheduled aggregation...');
  await aggregateAllData();
});
```

---

## 🎨 Frontend Integration

### Create API Routes

**`pages/api/stats/teams.ts`**

```typescript
import { getTopTeamsByBetType } from '@/services/statsQuery';

export default async function handler(req, res) {
  const { betType, region, limit } = req.query;
  
  try {
    const teams = await getTopTeamsByBetType(
      betType as any,
      region as any,
      parseInt(limit as string) || 20
    );
    
    res.status(200).json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

**`pages/api/fixtures/today.ts`**

```typescript
import { getTodaysFixturesWithStats } from '@/services/statsQuery';

export default async function handler(req, res) {
  try {
    const fixtures = await getTodaysFixturesWithStats();
    res.status(200).json(fixtures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### Use in React Components

```typescript
import { useQuery } from '@tanstack/react-query';

function FormTables() {
  const [betType, setBetType] = useState('over_2_5_goals');
  const [region, setRegion] = useState('all');
  
  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams', betType, region],
    queryFn: async () => {
      const res = await fetch(`/api/stats/teams?betType=${betType}&region=${region}`);
      return res.json();
    },
  });
  
  return (
    <div>
      <select onChange={(e) => setBetType(e.target.value)}>
        <option value="over_2_5_goals">Over 2.5 Goals</option>
        <option value="over_9_5_corners">Over 9.5 Corners</option>
        {/* ... more options */}
      </select>
      
      <select onChange={(e) => setRegion(e.target.value)}>
        <option value="all">All Regions</option>
        <option value="uk">UK</option>
        <option value="european">Europe</option>
        {/* ... more options */}
      </select>
      
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <table>
          {teams.map(team => (
            <tr key={team.team_id}>
              <td>{team.team_name}</td>
              <td>{team.league_name}</td>
              <td>{team.stat_value}%</td>
              <td>{team.games_analyzed} games</td>
            </tr>
          ))}
        </table>
      )}
    </div>
  );
}
```

---

## 📈 API Usage

### Estimated API Calls Per Day:

```
80 leagues × 20 teams = 1,600 team fetches
1,600 teams × 20 fixtures = 32,000 fixture fetches
32,000 fixtures × statistics = 32,000 stats calls
────────────────────────────────────────────────
Total: ~65,000 API calls per day
```

**Usage**: 65% of 100k daily limit  
**Remaining**: 35,000 calls available

---

## 🐛 Troubleshooting

### "Authentication failed"
- Check MongoDB URI in `.env`
- Ensure database name is `betting-stats`

### "Rate limit exceeded"
- Aggregator has built-in delays (500ms-1s between requests)
- If still hitting limits, increase delays in `dataAggregator.ts`

### "No data returned"
- Run `npm run aggregate:status` to check if data exists
- Run `npm run aggregate` to populate database

### "Aggregation takes too long"
- Normal! First run takes 30-60 minutes
- Subsequent runs are faster (updates existing data)

---

## ✅ Next Steps

1. **Run Initial Aggregation**
   ```bash
   npm run aggregate
   ```

2. **Create API Routes** (see Frontend Integration above)

3. **Update UI Components** to use new API

4. **Set Up Daily Cron** (Vercel Cron or Node-Cron)

5. **Test Queries** using the examples above

---

## 📞 Support

- **MongoDB Issues**: Check connection string and database name
- **API Issues**: Verify API key and rate limits
- **Query Issues**: Check bet type and region parameters

**Database is completely separate from your existing data!** 🎉

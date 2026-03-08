# How to Populate Real Statistics

## Step 1: Create Supabase Table

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click "SQL Editor"
3. Copy and paste the contents of `supabase/schema.sql`
4. Click "Run"

This creates the `team_stats` table.

## Step 2: Run the Stats Collector

You need to run the stats collector script to fetch data from API-Football and store it in Supabase.

### Option A: Run Locally (One-time)

```bash
# Install dependencies
npm install

# Run the collector script
node scripts/collectStats.js
```

This will:
- Fetch data from 14 major leagues
- Calculate Over/Under percentages for each team
- Store in Supabase
- Takes ~30-60 minutes

### Option B: Set up Automated Daily Updates (Recommended)

Create a Vercel Cron Job:

1. Create `api/cron/update-stats.js`:
```javascript
import { fetchAndStoreStats } from '../../src/services/statsCollector.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch all stats
    const allStats = await fetchAndStoreStats();

    // Store in Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY // Use service key for write access
    );

    // Upsert all stats
    const { error } = await supabase
      .from('team_stats')
      .upsert(allStats, { onConflict: 'team_id' });

    if (error) throw error;

    res.status(200).json({ 
      success: true, 
      teams: allStats.length,
      message: 'Statistics updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

2. Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/update-stats",
    "schedule": "0 2 * * *"
  }]
}
```

This runs daily at 2 AM UTC.

## Step 3: Verify Data

Check your Supabase table:

```sql
-- Count total teams
SELECT COUNT(*) FROM team_stats;

-- Top 20 Over 2.5 goals
SELECT team_name, league, over_2_5_goals_pct 
FROM team_stats 
ORDER BY over_2_5_goals_pct DESC 
LIMIT 20;

-- Top 20 Over 9.5 corners
SELECT team_name, league, over_9_5_corners_pct 
FROM team_stats 
ORDER BY over_9_5_corners_pct DESC 
LIMIT 20;
```

## What the App Shows

Once the database is populated, the app will display:

### Goals Tab:
- Top 20 teams with highest Over 2.5 goals percentage
- Shows: Team, League, Games Played, O2.5%, Count

### Corners Tab:
- Top 20 teams with highest Over 9.5 corners percentage
- Shows: Team, League, Games Played, O9.5%, Average

### Cards Tab:
- Top 20 teams with highest Over 3.5 cards percentage
- Shows: Team, League, Games Played, O3.5%, Average

### BTTS Tab:
- Top 20 teams with highest BTTS Yes percentage
- Shows: Team, League, Games Played, BTTS%, Goals Scored, Goals Conceded

## Regional Filtering

Use the region buttons to filter:
- **All Regions**: Top 20 globally
- **UK**: Top 20 from UK leagues
- **European**: Top 20 from European leagues
- **Asia**: Top 20 from Asian leagues
- **Americas**: Top 20 from American leagues

## API Usage

With 100k requests/day:
- Full collection: ~1,200 requests
- Can run 80+ times per day
- Recommended: Once per day (automated)

## Troubleshooting

### "Failed to load statistics"
- Check Supabase connection
- Verify table exists
- Check RLS policies

### "No data showing"
- Run the stats collector script
- Verify data in Supabase
- Check browser console for errors

### "Loading forever"
- Check API key is set
- Verify Supabase credentials
- Check network tab for errors

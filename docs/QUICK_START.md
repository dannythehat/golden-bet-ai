# 🚀 Quick Start - Run Data Aggregation

## Option 1: Via API Endpoint (Easiest)

### Step 1: Deploy to Vercel
```bash
git push origin main
```

### Step 2: Test MongoDB Connection
```bash
curl https://your-app.vercel.app/api/test-db
```

Should return:
```json
{
  "success": true,
  "message": "MongoDB connection successful",
  "database": "betting-stats",
  "collections": [],
  "document_counts": {}
}
```

### Step 3: Trigger Aggregation
```bash
curl -X POST https://your-app.vercel.app/api/aggregate
```

Should return:
```json
{
  "success": true,
  "message": "Aggregation started in background..."
}
```

### Step 4: Check Status
```bash
curl https://your-app.vercel.app/api/aggregate
```

---

## Option 2: Via Local Script

### Step 1: Install Dependencies
```bash
npm install mongodb
npm install --save-dev @types/mongodb tsx
```

### Step 2: Add Scripts to package.json
```json
{
  "scripts": {
    "aggregate": "tsx src/scripts/aggregate.ts",
    "aggregate:status": "tsx src/scripts/aggregate.ts status"
  }
}
```

### Step 3: Create .env file
```env
MONGODB_URI=***REMOVED***
VITE_API_FOOTBALL_KEY=***REMOVED***
```

### Step 4: Run Aggregation
```bash
npm run aggregate
```

---

## Option 3: Via Vercel Dashboard

### Step 1: Go to Vercel Dashboard
1. Open your project
2. Go to "Deployments"
3. Click on latest deployment
4. Go to "Functions"

### Step 2: Find the aggregate function
Look for `/api/aggregate`

### Step 3: Test it
Click "Invoke" or use the test feature

---

## Troubleshooting

### "Authentication failed"
- Check MongoDB URI in environment variables
- Ensure database name is `betting-stats`
- Verify credentials are correct

### "Module not found"
```bash
npm install mongodb
```

### "Cannot find tsx"
```bash
npm install --save-dev tsx
```

### Vercel timeout (60 seconds)
The aggregation takes 30-60 minutes, so it will timeout on Vercel.

**Solution**: Use a background job service like:
- **Railway** (recommended)
- **Render**
- **Heroku**
- Or run locally once

---

## Recommended Approach

### 1. Run Initial Aggregation Locally
```bash
npm install mongodb tsx
npm run aggregate
```

This will take 30-60 minutes but will populate your entire database.

### 2. Set Up Daily Updates via Cron
Once data is populated, use Vercel Cron for daily updates:

**vercel.json:**
```json
{
  "crons": [{
    "path": "/api/aggregate",
    "schedule": "0 4 * * *"
  }]
}
```

Daily updates are much faster (5-10 minutes) since they only update existing data.

---

## What Happens During Aggregation?

```
1. Fetching 80+ leagues... (1 min)
2. Fetching 1,500+ teams... (5-10 min)
3. Calculating stats for each team... (20-40 min)
   - Fetches last 20 fixtures per team
   - Fetches statistics for each fixture
   - Calculates all bet type percentages
4. Fetching today's fixtures... (1 min)
5. Done! ✅
```

---

## After Aggregation Completes

You can query the data:

```bash
# Check status
curl https://your-app.vercel.app/api/aggregate

# Get top teams for Over 2.5 Goals in Europe
curl https://your-app.vercel.app/api/stats/teams?betType=over_2_5_goals&region=european

# Get today's fixtures
curl https://your-app.vercel.app/api/fixtures/today
```

---

## Need Help?

1. **Test DB connection first**: `/api/test-db`
2. **Check logs**: Vercel dashboard → Functions → Logs
3. **Run locally**: More control and better error messages

**The easiest way is to run it locally once, then use Vercel Cron for daily updates!**

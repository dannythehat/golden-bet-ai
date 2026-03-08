# HOW TO EXECUTE BOOTSTRAP

## Prerequisites
- MongoDB connection string in environment variables
- API-Football API key in environment variables
- Node.js installed on server

## Option 1: Direct Execution (Recommended)

### On Your Server/Hosting:

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies (if needed)
npm install

# 3. Set environment variables
export MONGODB_URI="your_mongodb_connection_string"
export VITE_API_FOOTBALL_KEY="your_api_key"

# 4. Run bootstrap (background process)
nohup node scripts/runBootstrap.js > logs/bootstrap.log 2>&1 &

# 5. Monitor progress
tail -f logs/bootstrap.log
```

## Option 2: Using PM2 (Production)

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Start bootstrap with PM2
pm2 start scripts/runBootstrap.js --name "bootstrap-stats"

# 3. Monitor logs
pm2 logs bootstrap-stats

# 4. Check status
pm2 status
```

## Option 3: Using Screen (Linux)

```bash
# 1. Start screen session
screen -S bootstrap

# 2. Run bootstrap
node scripts/runBootstrap.js

# 3. Detach from screen (Ctrl+A, then D)

# 4. Reattach later
screen -r bootstrap
```

## Option 4: Loveable/Railway Deployment

### If using Loveable:

1. **Push code to GitHub** (already done ✅)
2. **Loveable auto-deploys** the new code
3. **SSH into Loveable container:**
   ```bash
   # Get SSH access from Loveable dashboard
   ssh user@your-loveable-instance
   
   # Run bootstrap
   node scripts/runBootstrap.js
   ```

### If using Railway:

1. **Deploy to Railway** (push triggers deploy)
2. **Open Railway shell:**
   - Go to Railway dashboard
   - Click on your service
   - Click "Shell" tab
   - Run: `node scripts/runBootstrap.js`

## What Happens During Bootstrap

```
[0h 0m] EUROPE | League 39 | Manchester City
  Teams: 1 | API Calls: 42

[0h 5m] EUROPE | League 39 | Arsenal
  Teams: 2 | API Calls: 84

[1h 0m] EUROPE | League 140 | Real Madrid
  Teams: 45 | API Calls: 1890

... continues for 36 hours ...

[36h 0m] AFRICA | League 27 | Last Team
  Teams: 11000 | API Calls: 440000

✅ BOOTSTRAP COMPLETE!
```

## Monitoring Progress

### Check MongoDB:
```bash
# Connect to MongoDB
mongo your_connection_string

# Check document count
use your_database
db.regionalstats.count()

# Should grow to ~220,000 documents
```

### Check Logs:
```bash
# Real-time monitoring
tail -f logs/bootstrap.log

# Search for errors
grep "ERROR" logs/bootstrap.log

# Count teams processed
grep "✅ Updated" logs/bootstrap.log | wc -l
```

## Troubleshooting

### If Bootstrap Stops:
- Check API rate limits (should be 10 calls/min)
- Check MongoDB connection
- Check API key validity
- Restart from where it stopped (script handles duplicates via upsert)

### If API Limit Reached:
- Wait 24 hours for limit reset
- Resume bootstrap (will skip already processed teams)

### If MongoDB Connection Lost:
- Script will auto-reconnect
- Upsert ensures no duplicate data

## After Bootstrap Completes

1. **Verify Data:**
   ```bash
   curl http://localhost:3000/api/regions/EUROPE/categories/GOALS/markets/OVER_2_5
   ```

2. **Schedule Daily Cron:**
   ```bash
   # Add to crontab
   0 4 * * * node /path/to/scripts/runDailyCron.js
   ```

3. **Test Frontend:**
   - Navigate to Form Tables
   - Click EUROPE → CORNERS → OVER 9.5
   - Should see top 30 teams

## Estimated Costs

- **API Calls:** ~440,000 (one-time)
- **Time:** 36 hours
- **MongoDB Storage:** ~44 MB
- **Daily Maintenance:** ~500 API calls/day

---

**Current Status:** Code deployed to GitHub ✅
**Next Step:** Execute bootstrap on your server using one of the options above

# Setup Guide - Vercel KV & Daily Cache

## Quick Setup (5 minutes)

### 1. Create Vercel KV Database
1. Go to your Vercel project dashboard
2. Click **Storage** tab
3. Click **Create Database**
4. Select **KV** (Key-Value Store)
5. Name it: `football-stats-cache`
6. Click **Create**

Vercel will automatically add these environment variables:
- `KV_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

### 2. Set Environment Variables
In Vercel project settings → Environment Variables, add:

```
CRON_SECRET=***REMOVED***-use-strong-password
VITE_API_FOOTBALL_KEY=***REMOVED***
```

**Generate CRON_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Deploy
```bash
git push
```

Vercel will automatically deploy with:
- ✅ Vercel KV connected
- ✅ Cron job scheduled for 4 AM UTC
- ✅ Environment variables loaded

### 4. Trigger Initial Cache Population
```bash
curl -X GET https://bet-ai.vercel.app/api/cron/refresh-stats \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

This will take ~5-10 minutes to complete.

### 5. Verify Cache
```bash
curl https://bet-ai.vercel.app/api/stats-cache
```

Should return:
```json
{
  "success": true,
  "data": {
    "goals": [...],
    "corners": [...],
    "cards": [...],
    "btts": [...]
  },
  "meta": {
    "cached": true,
    "lastRefresh": "2026-01-07T08:00:00.000Z",
    "nextRefresh": "2026-01-08T04:00:00.000Z",
    "cacheAge": "0.5 hours"
  }
}
```

## How It Works

### Daily Automatic Refresh (4 AM UTC)
```
4:00 AM UTC → Cron triggers /api/cron/refresh-stats
              ↓
              Fetches data from 250+ leagues
              ↓
              Processes ~5,000 teams
              ↓
              Calculates all statistics
              ↓
              Stores in Vercel KV
              ↓
              Takes ~10-15 minutes
```

### User Visits Form Tables
```
User → /form-tables page
       ↓
       Calls /api/stats-cache
       ↓
       Reads from Vercel KV
       ↓
       Returns instantly (< 100ms)
```

## Monitoring

### Check Cron Job Status
1. Vercel Dashboard → Your Project
2. **Deployments** → Latest deployment
3. **Functions** tab
4. Find `/api/cron/refresh-stats`
5. View execution logs

### Check Cache Health
```bash
# Get cache metadata
curl https://bet-ai.vercel.app/api/stats-cache | jq '.meta'

# Output:
{
  "cached": true,
  "lastRefresh": "2026-01-07T04:00:00.000Z",
  "nextRefresh": "2026-01-08T04:00:00.000Z",
  "cacheAge": "12.5 hours"
}
```

## Troubleshooting

### Error: "Cache not initialized"
**Problem:** Vercel KV is empty
**Solution:** Trigger manual refresh (step 4 above)

### Error: "Unauthorized" when triggering cron
**Problem:** Wrong CRON_SECRET
**Solution:** Check environment variable matches your request header

### Error: "Failed to connect to KV"
**Problem:** Vercel KV not set up
**Solution:** Complete step 1 above

### Cron job not running at 4 AM
**Problem:** Cron configuration issue
**Solution:** 
1. Check `vercel.json` has correct cron config
2. Redeploy project
3. Check Vercel Dashboard → Settings → Cron Jobs

## Cost

### Vercel KV Pricing
- **Hobby Plan:** FREE
  - 256 MB storage
  - 3,000 commands/day
  - Perfect for this use case!

- **Pro Plan:** $20/month
  - 1 GB storage
  - 100,000 commands/day

### Our Usage
- **Storage:** ~500 KB (well within free tier)
- **Commands:** ~30/day (1 write + ~29 reads)
- **Cost:** $0/month ✅

## Expanding to 250+ Leagues

Currently using ~20 top leagues for faster processing. To expand:

1. Edit `pages/api/cron/refresh-stats.ts`
2. Replace `LEAGUES` array with full 250+ league list from `src/data/leagues.ts`
3. Increase Vercel function timeout (Pro plan needed for 15+ min functions)
4. Or split into multiple cron jobs (one per region)

## Next Steps

- [ ] Set up Vercel KV (step 1)
- [ ] Add environment variables (step 2)
- [ ] Deploy (step 3)
- [ ] Trigger initial cache (step 4)
- [ ] Verify working (step 5)
- [ ] Wait for 4 AM UTC tomorrow for automatic refresh
- [ ] Expand to 250+ leagues (optional)

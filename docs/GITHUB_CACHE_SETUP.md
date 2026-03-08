# Quick Setup - GitHub-Based Cache (No Vercel KV Needed!)

## Simple 3-Step Setup

### Step 1: Create GitHub Personal Access Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: `vercel-cache-access`
4. Select scopes: ✅ `repo` (full control)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

### Step 2: Add Environment Variables to Vercel
1. Go to https://vercel.com/dannythehat/golden-bet-ai/settings/environment-variables
2. Add these variables:

```
GITHUB_TOKEN=ghp_your_token_here
CRON_SECRET=***REMOVED***
VITE_API_FOOTBALL_KEY=***REMOVED***
```

Generate CRON_SECRET:
```bash
openssl rand -base64 32
```

### Step 3: Deploy & Trigger
```bash
# The changes are already pushed, just redeploy
# Vercel will auto-deploy, or trigger manually:
vercel --prod

# Then trigger initial cache (replace YOUR_CRON_SECRET):
curl -X GET https://bet-ai.vercel.app/api/cron/refresh-stats-github \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## How It Works

**Storage:** Cache is stored as `cache/stats-cache.json` in your GitHub repo
**Daily Refresh:** Cron job updates the file at 4 AM UTC
**No Vercel KV needed:** Uses GitHub as free storage!

## Verify It's Working

```bash
# Check cache (should show data after ~5 minutes):
curl https://bet-ai.vercel.app/api/stats-cache-github

# Should return:
{
  "success": true,
  "data": {
    "goals": [...20 teams...],
    "corners": [...20 teams...],
    "cards": [...20 teams...],
    "btts": [...20 teams...]
  },
  "meta": {
    "cached": true,
    "lastRefresh": "2026-01-07T08:30:00.000Z",
    "nextRefresh": "2026-01-08T04:00:00.000Z",
    "cacheAge": "0.5 hours"
  }
}
```

## Update Frontend to Use GitHub Cache

Update `src/services/directStats.ts`:
```typescript
const CACHE_API_URL = '/api/stats-cache-github'; // Changed from stats-cache
```

## Benefits

✅ **No Vercel KV setup needed**
✅ **Free storage** (uses GitHub)
✅ **Version controlled** (cache changes tracked in Git)
✅ **Transparent** (you can see cache file in repo)
✅ **Same performance** (instant loading)

## Update Cron Configuration

Update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-stats-github",
      "schedule": "0 4 * * *"
    }
  ]
}
```

That's it! Much simpler than Vercel KV setup.

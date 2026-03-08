# 🚀 QUICK START - Bootstrap Setup

## ✅ Your Secrets Are Already Configured!

I've added all your secrets to the `.env` file:

```bash
MONGODB_URI="***REMOVED***"
VITE_API_FOOTBALL_KEY="***REMOVED***"
CRON_SECRET="a8f3c9e2d7b4f1a6e9c3d8b2f5a1e7c4d9b6f3a8e2c7d1b5f9a4e8c3d7b2f6a1"
```

## 🎯 Next Steps

### 1. Wait for Vercel to Deploy (2-3 minutes)

Vercel will automatically:
- Pull the latest code
- Read the `.env` file
- Deploy the bootstrap system
- Activate the cron job

### 2. Test the Setup

Once deployed, visit:
```
https://your-app.vercel.app/bootstrap-control.html
```

This control panel will:
- ✅ Verify all environment variables are working
- ▶️ Let you manually trigger the bootstrap
- 📊 Show real-time progress
- 📈 Display completion percentage

### 3. Run Your First Bootstrap

**Option A: Use the Control Panel (Easiest)**
1. Go to `https://your-app.vercel.app/bootstrap-control.html`
2. Click "Run Bootstrap (50 teams)"
3. Watch the logs in real-time

**Option B: Use API Directly**
```bash
curl -X POST https://your-app.vercel.app/api/cron/incremental-bootstrap \
  -H "Authorization: Bearer a8f3c9e2d7b4f1a6e9c3d8b2f5a1e7c4d9b6f3a8e2c7d1b5f9a4e8c3d7b2f6a1"
```

**Option C: Wait for Automatic Cron**
- Runs every 6 hours automatically
- No action needed!

## 📊 What to Expect

### First Run
- **Duration:** 20-30 minutes
- **Teams processed:** 50
- **Documents created:** ~1,000 (50 teams × 20 markets)
- **Progress:** ~0.45%

### After 10 Runs
- **Teams processed:** 500
- **Documents created:** ~10,000
- **Progress:** ~4.5%

### Complete Bootstrap
- **Total runs needed:** ~220
- **Total teams:** 11,000
- **Total documents:** 220,000
- **Time (auto):** 55 days
- **Time (manual):** As fast as you trigger it!

## 🔍 Monitoring

### Check Environment Variables
Visit: `https://your-app.vercel.app/api/test-env`

Should show:
```json
{
  "mongodb": "✅ Set",
  "apiKey": "✅ Set",
  "cronSecret": "✅ Set"
}
```

### Check Progress Anytime
```bash
# Connect to MongoDB
mongosh "***REMOVED***"

# Count documents
db.regionalstats.countDocuments()

# Check progress
# Target: 220,000 documents
# Current / 220,000 * 100 = Progress %
```

### View Vercel Logs
1. Go to Vercel Dashboard
2. Click your project
3. Go to "Functions" tab
4. Click `/api/cron/incremental-bootstrap`
5. View execution logs

## ⚡ Speed Up Completion

Want to finish faster? Run multiple times:

### Using Control Panel
1. Go to `bootstrap-control.html`
2. Click "Run Bootstrap" 
3. Wait 30 minutes
4. Click again
5. Repeat as many times as you want

### Using Script
```bash
# Run 10 times (processes 500 teams)
for i in {1..10}; do
  curl -X POST https://your-app.vercel.app/api/cron/incremental-bootstrap \
    -H "Authorization: Bearer a8f3c9e2d7b4f1a6e9c3d8b2f5a1e7c4d9b6f3a8e2c7d1b5f9a4e8c3d7b2f6a1"
  echo "Run $i complete, waiting 30 minutes..."
  sleep 1800
done
```

## 🎉 When Complete

The bootstrap will automatically detect when all teams are processed and return:
```json
{
  "complete": true,
  "progress": 100,
  "totalInDb": 220000
}
```

After that:
- ✅ All 20 markets will work on your frontend
- ✅ Daily cron keeps data fresh
- ✅ No more manual intervention needed

## 🆘 Troubleshooting

### Environment variables not working?
1. Check Vercel deployed successfully
2. Visit `/api/test-env` to verify
3. Check Vercel Dashboard → Settings → Environment Variables

### Bootstrap not running?
1. Check Vercel Functions logs
2. Verify CRON_SECRET matches in both `.env` and control panel
3. Try manual trigger via control panel

### Progress seems stuck?
1. Check MongoDB connection
2. Verify API key is valid (not rate limited)
3. Check Vercel function logs for errors

## 📝 Files Created

1. ✅ `.env` - All your secrets configured
2. ✅ `api/test-env.ts` - Environment checker
3. ✅ `api/cron/incremental-bootstrap.ts` - Bootstrap endpoint
4. ✅ `public/bootstrap-control.html` - Control panel
5. ✅ `scripts/incrementalBootstrap.js` - Bootstrap logic
6. ✅ `vercel.json` - Cron configuration

## 🚀 Ready to Go!

Everything is configured and ready. Just:
1. Wait for Vercel to deploy (check dashboard)
2. Visit the control panel
3. Click "Run Bootstrap"
4. Watch it work!

---

**Status:** ✅ FULLY CONFIGURED
**Next:** Wait for Vercel deployment, then visit control panel
**ETA:** 2-3 minutes for deployment

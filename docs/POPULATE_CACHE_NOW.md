# 🚀 URGENT: Populate Cache with REAL Data

## Problem
The cache currently has **FAKE/MOCK data** - only 20 teams, all European/UK, no Asia/Americas.

## Solution
Run the real stats fetcher script to populate with **ACTUAL data from API-Football**.

---

## ⚡ Quick Start - Run NOW

### Option 1: GitHub Actions (Easiest - Recommended)

1. Go to: https://github.com/dannythehat/golden-bet-ai/actions
2. Click "Fetch Real Stats Daily" workflow
3. Click "Run workflow" button
4. Click green "Run workflow" button
5. Wait 10-15 minutes for completion
6. Cache will be automatically updated with REAL data!

### Option 2: Run Locally

```bash
# 1. Clone repo (if not already)
git clone https://github.com/dannythehat/golden-bet-ai.git
cd golden-bet-ai

# 2. Install dependencies
npm install

# 3. Set API key (if not in .env)
export VITE_API_FOOTBALL_KEY=***REMOVED***

# 4. Run the fetcher
npm run fetch-stats

# 5. Commit and push
git add cache/stats-cache.json
git commit -m "Update cache with real API data"
git push origin main
```

---

## 📊 What It Does

The script will:

1. **Fetch from 60+ leagues worldwide:**
   - ✅ UK (5 leagues): Premier League, Championship, etc.
   - ✅ Europe (15 leagues): La Liga, Bundesliga, Serie A, etc.
   - ✅ Asia (15 leagues): J1 League, Saudi Pro, K League, etc.
   - ✅ Americas (15 leagues): Brasileirão, Liga MX, MLS, etc.
   - ✅ Africa (10 leagues): Egyptian Premier, South African, etc.

2. **Process 500-1000+ teams** (top 20 per league)

3. **Calculate REAL statistics:**
   - Goals: Over 2.5 percentage
   - Corners: Over 9.5 percentage + average
   - Cards: Over 3.5 percentage + average
   - BTTS: Both Teams To Score percentage

4. **Save to `cache/stats-cache.json`**

---

## ⏱️ Expected Duration

- **Full run**: 15-20 minutes
- **API calls**: ~10,000-15,000 (well within 100k daily limit)
- **Result**: 500-1000 teams with REAL data

---

## 🔍 Verify It Worked

After running, check:

```bash
# Check file size (should be 100KB+, not 29KB)
ls -lh cache/stats-cache.json

# Check team count
cat cache/stats-cache.json | jq '.goals | length'
# Should output: 500+ (not 20)

# Check regions
cat cache/stats-cache.json | jq '.meta.regions'
# Should show teams in all regions
```

Or visit your app:
- Go to Form Tables
- Switch to "Asia" region
- Should see 20+ teams (not empty!)

---

## 🤖 Automatic Updates

Once you run it once, the GitHub Action will:
- ✅ Run daily at 4:00 AM UTC
- ✅ Fetch fresh data from API
- ✅ Update cache automatically
- ✅ Commit and push changes

No manual intervention needed!

---

## 🚨 Troubleshooting

### "API Error: 401"
- Check API key is set correctly
- Verify key in GitHub Secrets: `VITE_API_FOOTBALL_KEY`

### "API Error: 429 (Rate Limit)"
- Wait a few minutes
- API has 100k calls/day limit
- Script uses ~15k calls

### "No teams for Asia"
- Script might have failed mid-run
- Check console logs for errors
- Re-run the script

### Script takes too long
- Normal! Processing 500+ teams takes time
- Each team needs 20+ API calls
- Be patient, it's worth it!

---

## 📝 What Gets Updated

**Before (FAKE DATA):**
```json
{
  "goals": [20 teams, all European/UK],
  "corners": [same 20 teams],
  "cards": [same 20 teams],
  "btts": [same 20 teams]
}
```

**After (REAL DATA):**
```json
{
  "goals": [500+ teams, ALL regions],
  "corners": [500+ teams, ALL regions],
  "cards": [500+ teams, ALL regions],
  "btts": [500+ teams, ALL regions],
  "meta": {
    "totalTeams": 500+,
    "regions": {
      "uk": 100,
      "european": 300,
      "asia": 300,
      "americas": 300,
      "africa": 200
    }
  }
}
```

---

## ✅ Success Indicators

You'll know it worked when:

1. **Cache file is larger**: 100KB+ (was 29KB)
2. **More teams**: 500+ teams (was 20)
3. **All regions have data**:
   - Asia: 100+ teams
   - Americas: 100+ teams
   - Africa: 50+ teams
4. **Real percentages**: Not all 45%, 50%, 55%
5. **Frontend shows variety**: Different teams in each region

---

## 🎯 Next Steps

After populating cache:

1. ✅ Verify data in app (check all regions)
2. ✅ Confirm GitHub Action is enabled
3. ✅ Wait for tomorrow's 4 AM refresh
4. ✅ Enjoy REAL football statistics!

---

## 💡 Pro Tips

- **Quick test**: Use `npm run fetch-stats:quick` for faster testing (fewer teams)
- **Monitor progress**: Watch console output for real-time updates
- **Check API usage**: Script logs total API calls at end
- **Backup cache**: Keep a copy before running (just in case)

---

**Ready? Run it now!** 🚀

```bash
npm run fetch-stats
```

Or use GitHub Actions (easier):
https://github.com/dannythehat/golden-bet-ai/actions/workflows/fetch-stats-daily.yml

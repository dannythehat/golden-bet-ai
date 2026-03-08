# How to Run Data Collection from Browser

## ✅ READY TO USE!

I've created a Vercel API endpoint that you can trigger directly from your browser. No PowerShell or local setup needed!

---

## 🚀 How to Run:

### Just Click This Link:

**https://golden-bet-ai.vercel.app/api/admin/collect-data?secret=golden-bet-2026**

That's it! The script will run and show you live progress.

---

## 📺 What You'll See:

The page will show **live progress** as the script runs:

```
🚀 Form Tables Data Collection

🔌 Connecting to MongoDB...
✅ MongoDB connected

📊 Creating indexes...
✅ Indexes created

🌍 Step 1: Fetching all leagues...
✅ Fetched 1000+ leagues

🔍 Step 2: Filtering to main professional leagues...
✅ Filtered to 200+ main professional leagues

⚙️ Step 3: Processing leagues (TEST MODE: 5 leagues, 3 teams each)...

📍 Processing: Premier League (England) [uk]
   Found 20 teams
   ⚽ Processing team: Manchester City...
      ✅ Stored (20 games, O2.5: 75%)
   ⚽ Processing team: Arsenal...
      ✅ Stored (20 games, O2.5: 68%)
   ...

📊 EXECUTION SUMMARY
⏱️ Duration: 45s
🌍 Leagues Fetched: 1000+
🔍 Leagues Filtered: 200+ main professional leagues
⚙️ Leagues Processed: 5 (TEST MODE)
⚽ Teams Processed: 15
💾 Teams Stored: 15
📡 API Calls Made: 25
❌ Errors: 0

✅ TEST RUN COMPLETE
```

---

## 🔒 Security:

The endpoint is protected with a secret: `golden-bet-2026`

You must include `?secret=golden-bet-2026` in the URL or you'll get:
```
{ "error": "Unauthorized" }
```

---

## ⏱️ Expected Time:

- **Test Mode** (5 leagues, 3 teams): ~30-60 seconds
- **Full Mode** (200 leagues, all teams): ~30-60 minutes

---

## 🎯 What Happens:

1. Connects to MongoDB
2. Creates indexes
3. Fetches all leagues from API-Football
4. Filters to ~200 main professional leagues (no women's/youth)
5. Processes 5 leagues (test mode)
6. For each team: fetches last 20 games
7. Calculates ALL threshold statistics
8. Stores in MongoDB
9. Shows summary and sample data

---

## ✅ After Success:

Once you see "✅ TEST RUN COMPLETE":
1. Check the summary stats
2. Verify sample data looks correct
3. Let me know it worked
4. I'll update the code to run full collection (all 200 leagues)

---

## 🐛 Troubleshooting:

### "Unauthorized" Error
- Make sure you included `?secret=golden-bet-2026` in the URL
- Use the full URL: https://golden-bet-ai.vercel.app/api/admin/collect-data?secret=golden-bet-2026

### "MongoDB connection failed"
- The MongoDB URI is already configured in your .env
- Vercel should have access to it automatically
- Check Vercel environment variables

### "API Error"
- Check your API-Football key is valid
- Verify you haven't exceeded rate limits
- Check Vercel logs for details

### Page Times Out
- Vercel has a 60-second timeout for serverless functions
- Test mode should complete in ~30-60 seconds
- If it times out, we may need to adjust the approach

### Page Shows Error
- Check Vercel deployment logs
- Verify environment variables are set
- Make sure MongoDB URI is correct

---

## 📝 Next Steps:

1. **YOU**: Click the link above
2. **WATCH**: Live progress as it runs
3. **VERIFY**: Check the summary at the end
4. **REPORT**: Let me know if it worked!
5. **THEN**: I'll update to run full collection

---

## 🔗 Your URLs:

- **Production Site**: https://golden-bet-ai.vercel.app
- **Data Collection**: https://golden-bet-ai.vercel.app/api/admin/collect-data?secret=golden-bet-2026
- **Vercel Dashboard**: https://vercel.com/danny

---

**Ready to try? Just click the link!** 🚀

https://golden-bet-ai.vercel.app/api/admin/collect-data?secret=golden-bet-2026

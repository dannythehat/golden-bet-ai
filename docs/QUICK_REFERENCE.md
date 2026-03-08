# ⚡ Quick Reference - Golden Bet AI

## 🚀 Quick Start

```bash
# 1. Clone and install
git clone https://github.com/dannythehat/golden-bet-ai.git
cd golden-bet-ai
npm install

# 2. Add API key to .env
echo "VITE_API_FOOTBALL_KEY=your_key_here" > .env

# 3. Run locally
npm run dev

# 4. Deploy to Vercel
git push origin main
```

---

## 🔑 Environment Variables

```env
# Required for real-time stats
VITE_API_FOOTBALL_KEY=your_api_key_here

# Optional (for user features)
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
VITE_SUPABASE_URL=your_url
```

**Get API Key**: https://api-sports.io

---

## 📊 What Each Market Shows

| Market | Shows | Example |
|--------|-------|---------|
| **Goals** | Teams with highest Over 2.5 goals % | Man City: 75% O2.5 |
| **Corners** | Teams with highest Over 9.5 corners % | Bayern: 80% O9.5 |
| **Cards** | Teams with highest Over 3.5 cards % | Atletico: 70% O3.5 |
| **BTTS** | Teams with highest BTTS Yes % | Dortmund: 85% BTTS |

---

## 🌍 Regional Filters

- **All Regions**: Top 20 teams worldwide
- **UK**: Premier League, Championship, Scottish Premiership
- **European**: La Liga, Bundesliga, Serie A, Ligue 1, etc.
- **Asia**: J1 League, Saudi Pro League, K League, etc.
- **Americas**: Brasileirão, Liga MX, MLS, etc.

---

## 🎨 Color Coding

- 🟢 **Green (75%+)**: Very high probability - Strong bet
- 🟡 **Gold (60-74%)**: High probability - Good bet
- 🟠 **Orange (45-59%)**: Medium probability - Moderate bet
- 🔴 **Red (<45%)**: Low probability - Risky bet

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
node scripts/testApi.js YOUR_API_KEY  # Test API connection

# Deployment
git add .
git commit -m "Update"
git push origin main     # Auto-deploys to Vercel
```

---

## 🐛 Quick Troubleshooting

### Error Loading Statistics
1. Check API key in `.env` or Vercel
2. Verify API rate limit not exceeded
3. Click "Retry" button

### No Data for Region
1. Try "All Regions" first
2. Click "Refresh Data"
3. Wait 1-2 minutes for initial load

### Slow Loading
1. First load takes 1-2 minutes (normal)
2. Subsequent loads are instant (cached)
3. Cache refreshes every 5 minutes

---

## 📁 Key Files

```
src/
├── services/
│   └── statsAggregator.ts      # API integration
├── hooks/
│   └── useFormStats.ts         # State management
└── components/sections/
    └── FormTablesSection.tsx   # UI component

docs/
├── API_INTEGRATION.md          # Full setup guide
├── DEPLOYMENT_CHECKLIST.md     # Deployment steps
└── IMPLEMENTATION_SUMMARY.md   # What was built
```

---

## 🎯 Feature Checklist

- ✅ Real-time data from API-Football
- ✅ 25+ leagues worldwide
- ✅ Top 20 rankings per market
- ✅ Regional filtering
- ✅ Overs/Unders toggle
- ✅ Smart caching (5 minutes)
- ✅ Loading states
- ✅ Error handling
- ✅ Manual refresh button
- ✅ Mobile responsive

---

## 📈 API Usage

**Free Tier**: 100 requests/day

**Optimization**:
- Data cached for 5 minutes
- Processes top 10 teams per league
- Analyzes last 15 games per team
- Rate limiting between requests

**Upgrade**: https://api-sports.io/pricing

---

## 🆘 Need Help?

| Issue | Solution |
|-------|----------|
| API Setup | See `docs/API_INTEGRATION.md` |
| Deployment | See `docs/DEPLOYMENT_CHECKLIST.md` |
| Features | See `docs/IMPLEMENTATION_SUMMARY.md` |
| General | Open GitHub issue |

---

## 🔗 Quick Links

- **API Docs**: https://api-sports.io/documentation/football/v3
- **Deploy**: https://vercel.com/signup
- **Supabase**: https://supabase.com
- **React Query**: https://tanstack.com/query/latest

---

## 💡 Pro Tips

1. **First Load**: Be patient (1-2 minutes)
2. **Cache**: Data refreshes every 5 minutes automatically
3. **Refresh**: Use button to manually update
4. **Regions**: Start with "All Regions" to see all data
5. **API Limit**: Monitor usage in API-Football dashboard
6. **Performance**: Increase cache time if needed
7. **Mobile**: App is fully responsive
8. **Errors**: Check API key first if issues occur

---

**⚽ Good luck with your bets! 🍀**

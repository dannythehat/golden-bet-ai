# Golden Bet AI ⚽🤖

AI-powered football betting predictions with **comprehensive statistics** from 80+ leagues worldwide.

## 🚀 **Quick Start - No PowerShell Needed!**

### Option 1: Web Dashboard (Easiest!)
1. Deploy to Vercel (auto-deploys from GitHub)
2. Visit: `https://your-app.vercel.app/admin`
3. Click **"Start Aggregation"** button
4. Wait 30-60 minutes
5. Done! ✅

**No sign-in required** - it's a public admin page.

### Option 2: GitHub Actions (Automated!)
1. Go to repo **Settings** → **Secrets** → **Actions**
2. Add `MONGODB_URI` and `VITE_API_FOOTBALL_KEY` secrets
3. Go to **Actions** tab → **Run Data Aggregation**
4. Click **Run workflow**
5. Done! Runs daily at 4 AM UTC automatically ✅

**See [NO_POWERSHELL_GUIDE.md](docs/NO_POWERSHELL_GUIDE.md) for detailed instructions.**

---

## ✨ Features

### 🎯 Form Teams Filter
- Select **bet type** (O2.5 Goals, O9.5 Corners, O3.5 Cards, BTTS)
- Select **region** (UK, Europe, Asia, Americas)
- See **top 20 teams** ranked by that stat

### 📅 Today's Fixtures
- View all today's matches
- See **both teams' stats** for any bet type
- Filter fixtures where both teams meet criteria

### 📊 Comprehensive Stats
- **80+ leagues** worldwide
- **1,500+ teams** analyzed
- **Last 20 games** per team
- **Daily updates** at 4 AM UTC

### 📈 P&L Hub
- Track betting performance
- Daily profit/loss tracking
- ROI calculations

---

## 🌍 Coverage

### 80+ Major Leagues:
- **UK** (5): Premier League, Championship, League One, League Two, Scottish Premiership
- **Europe** (30): La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, and more
- **Asia** (12): J1 League, Saudi Pro League, K League, Chinese Super League, and more
- **Americas** (15): Brasileirão, Liga MX, MLS, Argentine Primera, and more
- **Africa** (8): Egyptian Premier League, South African Premier, and more

### Stats Calculated:
**Goals:** O/U 0.5, 1.5, 2.5, 3.5 + Average  
**Corners:** O/U 7.5, 8.5, 9.5, 10.5 + Average  
**Cards:** O/U 2.5, 3.5, 4.5, 5.5 + Average  
**BTTS:** Yes/No % + Avg Goals Scored/Conceded

---

## 🏗️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **State**: React Query
- **API**: API-Football (100k calls/day)
- **Database**: MongoDB (separate `betting-stats` database)
- **Deployment**: Vercel

---

## 📊 How It Works

### Data Flow:
```
API-Football → Data Aggregator → MongoDB → Frontend API → UI
```

### Daily Process:
```
4:00 AM UTC
    ↓
Fetch 80+ leagues
    ↓
Fetch 1,500+ teams
    ↓
Calculate stats (last 20 games per team)
    ↓
Fetch today's fixtures
    ↓
Store in MongoDB
    ↓
Ready to query!
```

---

## 🗄️ MongoDB Structure

**Database:** `betting-stats` (separate from existing data)

**Collections:**
1. `leagues` - 80+ major leagues
2. `teams` - 1,500+ teams with metadata
3. `team_stats` - Calculated statistics (main collection)
4. `fixtures` - Today's fixtures
5. `last_update` - Tracking information

---

## 📈 API Usage

**Daily API Calls:** ~65,000 (65% of 100k limit)

```
80 leagues × 20 teams = 1,600 teams
1,600 teams × 20 fixtures = 32,000 fixtures
32,000 fixtures × statistics = 32,000 stats
────────────────────────────────────────────
Total: ~65,000 calls per day
```

**Remaining:** 35,000 calls for other features

---

## 🎨 User Experience

### 1. Filter by Bet Type + Region
```
User selects: "Over 2.5 Goals" + "Europe"
→ Shows top 20 European teams with highest O2.5%
```

### 2. View Today's Fixtures
```
User clicks: "Today's Fixtures"
→ Shows all today's matches with both teams' stats
```

### 3. Filter Fixtures by Bet Type
```
User selects: "Over 9.5 Corners" + "Today's Fixtures"
→ Shows only fixtures where BOTH teams have high corner stats
```

---

## 📁 Project Structure

```
golden-bet-ai/
├── src/
│   ├── components/
│   │   └── sections/
│   │       ├── FormTablesSection.tsx      # Stats tables
│   │       ├── StatsCheckerSection.tsx    # Team search
│   │       └── PredictionsSection.tsx     # Golden Bets
│   ├── pages/
│   │   ├── Index.tsx                      # Main page
│   │   └── AdminDashboard.tsx             # Admin dashboard
│   ├── services/
│   │   ├── database.ts                    # MongoDB connection
│   │   ├── dataAggregator.ts              # Main aggregation service
│   │   ├── statsCalculator.ts             # Stats calculation
│   │   ├── statsQuery.ts                  # Query functions
│   │   └── footballApi.ts                 # API-Football wrapper
│   ├── config/
│   │   └── leagues.ts                     # 80+ leagues config
│   ├── types/
│   │   ├── database.ts                    # MongoDB schemas
│   │   └── betting.ts                     # TypeScript types
│   └── scripts/
│       └── aggregate.ts                   # CLI script
├── pages/api/
│   ├── aggregate.ts                       # Trigger aggregation
│   ├── test-db.ts                         # Test MongoDB
│   └── admin/
│       └── dashboard.ts                   # Web dashboard (legacy)
├── .github/workflows/
│   └── aggregate.yml                      # GitHub Actions
└── docs/
    ├── SYSTEM_ARCHITECTURE.md             # Complete system docs
    ├── BACKEND_SETUP.md                   # Setup guide
    ├── NO_POWERSHELL_GUIDE.md             # No terminal guide
    └── QUICK_START.md                     # Quick reference
```

---

## 🚀 Deployment

### Automatic Deployment
Every push to `main` branch automatically deploys to Vercel.

### Environment Variables
```env
# API-Football
VITE_API_FOOTBALL_KEY=***REMOVED***

# MongoDB (separate database: betting-stats)
MONGODB_URI=***REMOVED***
```

---

## 📚 Documentation

- **[NO_POWERSHELL_GUIDE.md](docs/NO_POWERSHELL_GUIDE.md)** - Run without terminal
- **[SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md)** - Complete system overview
- **[BACKEND_SETUP.md](docs/BACKEND_SETUP.md)** - Detailed setup guide
- **[QUICK_START.md](docs/QUICK_START.md)** - Quick reference

---

## 🔮 Roadmap

- [x] Real-time API integration
- [x] 80+ leagues worldwide
- [x] MongoDB storage
- [x] Stats calculator
- [x] Web dashboard
- [x] GitHub Actions automation
- [ ] Frontend UI for bet type filtering
- [ ] Today's fixtures view
- [ ] Historical data comparison
- [ ] Export statistics to CSV
- [ ] Live match tracking
- [ ] Push notifications

---

## 🆘 Support

### Quick Links:
- **Admin Dashboard**: `/admin` (no sign-in required)
- **Test MongoDB**: `/api/test-db`
- **Check Status**: `/api/aggregate` (GET)
- **Start Aggregation**: `/api/aggregate` (POST)

### Documentation:
- **No PowerShell Guide**: [docs/NO_POWERSHELL_GUIDE.md](docs/NO_POWERSHELL_GUIDE.md)
- **System Architecture**: [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md)
- **Backend Setup**: [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md)

---

## 🎯 Next Steps

1. ✅ **Deploy to Vercel** (auto-deploys from GitHub)
2. ✅ **Open Admin Dashboard** at `/admin`
3. ✅ **Click "Start Aggregation"**
4. ✅ **Wait 30-60 minutes**
5. ✅ **Data is ready!**

Then:
- Create frontend API routes
- Update UI components with bet type filters
- Add today's fixtures view

---

## 📄 License

MIT License - feel free to use this project for your own betting analysis!

---

**Built with ❤️ for football betting enthusiasts**

⚽ **Good luck with your bets!** 🍀

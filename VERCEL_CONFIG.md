# Vercel Deployment Configuration

## Production URL
**https://golden-bet-ai.vercel.app**

## Project Details
- **Project Name**: golden-bet-ai
- **Repository**: dannythehat/golden-bet-ai
- **Vercel Dashboard**: https://vercel.com/danny

## API Endpoints

### Data Collection Endpoint
**URL**: https://golden-bet-ai.vercel.app/api/admin/collect-data?secret=golden-bet-2026

**Purpose**: Trigger data collection script from browser

**Method**: GET

**Authentication**: Query parameter `secret=golden-bet-2026`

**Response**: Live HTML streaming with progress updates

**Expected Time**: 30-60 seconds (test mode)

---

## Environment Variables

Ensure these are set in Vercel:
- `VITE_API_FOOTBALL_KEY`
- `MONGODB_URI`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `ADMIN_SECRET` (optional, defaults to "golden-bet-2026")

---

## Quick Links

- **Production Site**: https://golden-bet-ai.vercel.app
- **Data Collection**: https://golden-bet-ai.vercel.app/api/admin/collect-data?secret=golden-bet-2026
- **Vercel Dashboard**: https://vercel.com/danny
- **GitHub Repo**: https://github.com/dannythehat/golden-bet-ai

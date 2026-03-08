# 🚀 Deployment Checklist

Use this checklist to ensure your Golden Bet AI app is properly configured and deployed.

## ✅ Pre-Deployment

### 1. API Keys Setup
- [ ] Created API-Football account at https://api-sports.io
- [ ] Obtained API key from dashboard
- [ ] Added `VITE_API_FOOTBALL_KEY` to `.env` file
- [ ] Tested API key with `node scripts/testApi.js YOUR_API_KEY`

### 2. Supabase Setup (Optional)
- [ ] Created Supabase project
- [ ] Obtained project credentials
- [ ] Added Supabase keys to `.env`:
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_URL`

### 3. Local Testing
- [ ] Installed dependencies: `npm install`
- [ ] Started dev server: `npm run dev`
- [ ] Verified Form Tables load with real data
- [ ] Tested regional filters (UK, European, Asia, Americas)
- [ ] Tested Overs/Unders toggle
- [ ] Verified Refresh Data button works
- [ ] Checked all 4 tabs (Goals, Corners, Cards, BTTS)

### 4. Code Quality
- [ ] No console errors in browser
- [ ] No TypeScript errors: `npm run build`
- [ ] All imports resolved correctly
- [ ] Loading states display properly
- [ ] Error handling works (test with invalid API key)

---

## 🌐 Vercel Deployment

### 1. Connect Repository
- [ ] Signed up/logged in to Vercel
- [ ] Connected GitHub account
- [ ] Imported `golden-bet-ai` repository

### 2. Configure Environment Variables
Add these in Vercel project settings → Environment Variables:

**Required:**
- [ ] `VITE_API_FOOTBALL_KEY` = `your_api_key_here`

**Optional (for user features):**
- [ ] `VITE_SUPABASE_PROJECT_ID` = `your_project_id`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` = `your_key`
- [ ] `VITE_SUPABASE_URL` = `your_url`

### 3. Deploy
- [ ] Clicked "Deploy" button
- [ ] Waited for build to complete (2-3 minutes)
- [ ] Verified deployment succeeded
- [ ] Opened deployed URL

### 4. Post-Deployment Testing
- [ ] App loads without errors
- [ ] Form Tables display real data
- [ ] Regional filters work
- [ ] Refresh button works
- [ ] All tabs functional
- [ ] Mobile responsive design works

---

## 🔧 Troubleshooting

### Issue: "Error Loading Statistics"
**Check:**
- [ ] API key is correct in Vercel environment variables
- [ ] API key has not exceeded rate limit (100 requests/day on free tier)
- [ ] Vercel deployment completed successfully
- [ ] No build errors in Vercel logs

**Fix:**
1. Go to Vercel project → Settings → Environment Variables
2. Verify `VITE_API_FOOTBALL_KEY` is set correctly
3. Redeploy: Deployments → ⋯ → Redeploy

### Issue: "No data available for this region"
**Check:**
- [ ] Selected "All Regions" first to verify data loads
- [ ] Waited for initial data fetch (can take 1-2 minutes)
- [ ] Clicked "Refresh Data" button

**Fix:**
1. Try "All Regions" filter
2. Click "Refresh Data"
3. Wait 1-2 minutes for data to load

### Issue: Slow Loading
**Check:**
- [ ] First-time load (expected to be slow)
- [ ] API rate limits not exceeded
- [ ] Network connection stable

**Fix:**
1. Be patient on first load (1-2 minutes)
2. Data will be cached after first fetch
3. Subsequent loads will be instant (5-minute cache)

### Issue: Build Fails
**Check:**
- [ ] All dependencies installed: `npm install`
- [ ] No TypeScript errors: `npm run build`
- [ ] All imports correct
- [ ] Environment variables set

**Fix:**
1. Check Vercel build logs for specific error
2. Run `npm run build` locally to reproduce
3. Fix any TypeScript/import errors
4. Push changes and redeploy

---

## 📊 Monitoring

### API Usage
- [ ] Check API-Football dashboard for request count
- [ ] Monitor daily limit (100 requests/day on free tier)
- [ ] Upgrade plan if needed for more requests

### Performance
- [ ] Check Vercel Analytics for page load times
- [ ] Monitor error rates in Vercel logs
- [ ] Verify caching is working (5-minute cache)

### User Experience
- [ ] Test on different devices (mobile, tablet, desktop)
- [ ] Verify all features work as expected
- [ ] Check loading states are clear
- [ ] Ensure error messages are helpful

---

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ App loads without errors
- ✅ Form Tables display real-time data from API-Football
- ✅ All 4 tabs work (Goals, Corners, Cards, BTTS)
- ✅ Regional filters work (UK, European, Asia, Americas)
- ✅ Overs/Unders toggle works
- ✅ Refresh Data button works
- ✅ Loading states display properly
- ✅ Error handling works gracefully
- ✅ Mobile responsive design works
- ✅ Data caching works (fast subsequent loads)

---

## 📈 Next Steps

After successful deployment:

1. **Share Your App**
   - Copy your Vercel URL
   - Share with friends/users
   - Get feedback

2. **Monitor Usage**
   - Check API request count daily
   - Monitor Vercel analytics
   - Track user engagement

3. **Optimize**
   - Adjust cache times if needed
   - Optimize API calls if hitting limits
   - Consider upgrading API plan

4. **Enhance**
   - Add more features from roadmap
   - Implement user feedback
   - Expand league coverage

---

## 🆘 Need Help?

- **API Issues**: https://api-sports.io/documentation/football/v3
- **Vercel Issues**: https://vercel.com/docs
- **Project Issues**: Open an issue on GitHub
- **General Help**: Check [docs/API_INTEGRATION.md](API_INTEGRATION.md)

---

**Good luck with your deployment! ⚽🚀**

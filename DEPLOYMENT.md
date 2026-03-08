# Auto-Deployment Setup Guide

Your repository is now configured for automatic deployment! Choose one of the options below:

## 🚀 Option 1: Vercel (Recommended)

### Quick Setup (No PowerShell Needed):

1. **Go to Vercel**: https://vercel.com/signup
2. **Sign up with GitHub** (use your dannythehat account)
3. **Import Project**:
   - Click "Add New..." → "Project"
   - Select `dannythehat/golden-bet-ai`
   - Click "Import"
4. **Configure Environment Variables**:
   - Add these in the Vercel dashboard:
     ```
     VITE_SUPABASE_PROJECT_ID=ffonednbxcfhzxardvry
     VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmb25lZG5ieGNmaHp4YXJkdnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzkxMDEsImV4cCI6MjA4MzMxNTEwMX0.nd7uJnY3aTRWvemEXwkWC9sPYI8BmxRa4Ezj75tIfMQ
     VITE_SUPABASE_URL=https://ffonednbxcfhzxardvry.supabase.co
     VITE_API_FOOTBALL_KEY=***REMOVED***
     ```
5. **Deploy**: Click "Deploy"

**That's it!** Every push to `main` branch will auto-deploy.

Your app will be live at: `https://golden-bet-ai.vercel.app` (or similar)

---

## 🌐 Option 2: Netlify

### Quick Setup:

1. **Go to Netlify**: https://app.netlify.com/signup
2. **Sign up with GitHub**
3. **Import Project**:
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub → Select `dannythehat/golden-bet-ai`
4. **Configure Build Settings** (auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Add Environment Variables**:
   - Go to Site settings → Environment variables
   - Add the same variables as above
6. **Deploy**: Click "Deploy site"

Your app will be live at: `https://golden-bet-ai.netlify.app` (or similar)

---

## 📋 What I've Set Up:

### Files Created:
1. **`vercel.json`** - Vercel configuration
2. **`netlify.toml`** - Netlify configuration  
3. **`.github/workflows/deploy.yml`** - GitHub Actions workflow (optional)

### Auto-Deployment Features:
- ✅ Automatic deployment on every push to `main`
- ✅ Preview deployments for pull requests
- ✅ Environment variables support
- ✅ SPA routing configured (all routes → index.html)
- ✅ Build optimization

---

## 🔒 Security Note:

**Important**: After deployment, you should:

1. **Remove `.env` from Git** (it contains sensitive keys):
   ```bash
   git rm --cached .env
   echo ".env" >> .gitignore
   git commit -m "Remove .env from repository"
   git push
   ```

2. **Use platform environment variables** instead (already configured in steps above)

---

## 🎯 Recommended: Vercel

**Why Vercel?**
- ✅ Built for React/Vite apps
- ✅ Fastest deployment
- ✅ Best developer experience
- ✅ Free SSL certificates
- ✅ Global CDN
- ✅ Automatic HTTPS

---

## 📱 After Deployment:

Once deployed, you'll get:
- **Live URL**: Share with anyone
- **Auto-updates**: Every git push deploys automatically
- **Preview URLs**: Test changes before merging
- **Analytics**: See visitor stats
- **Custom domain**: Add your own domain (optional)

---

## 🆘 Need Help?

If you encounter any issues:
1. Check the deployment logs in Vercel/Netlify dashboard
2. Verify all environment variables are set correctly
3. Make sure the build succeeds locally first: `npm run build`

---

**Next Steps:**
1. Choose Vercel or Netlify
2. Follow the quick setup steps above
3. Your app will be live in ~2 minutes! 🚀

Let me know once you've deployed and I can help with any issues!

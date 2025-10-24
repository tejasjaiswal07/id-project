# Quick Start to Production

Complete this guide to get VidGrab Pro live in production.

**Estimated Time:** 2-3 hours setup + 1-2 weeks testing

---

## 🚀 Before You Start

- [ ] You have access to Google Cloud Console (for YouTube API)
- [ ] You have access to Firebase Console
- [ ] You have access to Vercel or AWS account
- [ ] You have Node.js 16+ installed
- [ ] You have git installed

---

## ⚙️ Step 1: Setup Environment (30 minutes)

### 1.1 Create YouTube API Key

```bash
# 1. Go to https://console.cloud.google.com/
# 2. Create new project (or select existing)
# 3. Enable "YouTube Data API v3"
# 4. Go to Credentials → Create API Key
# 5. Copy your new API key
# 6. Edit .env.local and add:
NEXT_PUBLIC_YOUTUBE_API_KEY=your_new_key_here

# 7. Disable the old exposed key in Google Cloud Console
# Search for "AIzaSyARuICBbpyNiHgzjhdbcQaLEwnTJSVUz5k" and disable it
```

### 1.2 Configure Firebase

```bash
# 1. Go to https://console.firebase.google.com/
# 2. Create new project (or select existing)
# 3. Go to Project Settings
# 4. Copy Web App configuration
# 5. Edit .env.local and add all these:

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 1.3 Setup Base URL

```bash
# In .env.local, set your production URL:
NEXT_PUBLIC_BASE_URL=https://your-domain.com
# Or for testing:
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 🧪 Step 2: Test Locally (30 minutes)

### 2.1 Install Dependencies

```bash
cd c:\Users\ASUS\Desktop\id-project
npm install
```

### 2.2 Validate Environment

```bash
npm run validate:env
# Should show: ✓ Configuration status
```

### 2.3 Run Tests

```bash
npm test
# Should show: PASS with coverage report
```

### 2.4 Build the Project

```bash
npm run build
# Should complete without errors
```

### 2.5 Run Locally

```bash
npm run dev
# Visit http://localhost:3000
# Test Instagram download with a public post URL
# Check /api/health endpoint
```

---

## 📋 Step 3: Pre-Deployment Check (15 minutes)

```bash
# Verify all checks pass:
✓ npm run validate:env     # Environment is correct
✓ npm test                 # Tests pass
✓ npm run build            # Build succeeds
✓ npm run lint             # No linting issues

# Check manual items:
✓ No .env.local committed to git (check git status)
✓ No hardcoded API keys in code
✓ README.md exists
✓ DEPLOYMENT-GUIDE.md exists
```

---

## 🌐 Step 4: Deploy to Production (Choose One)

### Option A: Deploy to Vercel (RECOMMENDED)

**Time: 15 minutes**

#### 4A.1 Push to GitHub

```bash
git add .
git commit -m "Production deployment - code improvements and security hardening"
git push origin main
```

#### 4A.2 Setup on Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (first time)
vercel --prod

# Or use GitHub integration at https://vercel.com/new
```

#### 4A.3 Set Environment Variables

In Vercel dashboard:
- Go to Settings → Environment Variables
- Add all variables from `.env.local`:
  - NEXT_PUBLIC_BASE_URL
  - NEXT_PUBLIC_YOUTUBE_API_KEY
  - NEXT_PUBLIC_FIREBASE_* (all 8)
  - NEXT_PUBLIC_SENTRY_DSN (optional)
  - CRON_SECRET_KEY
  - CLEANUP_KEY

### Option B: Deploy to AWS

**Time: 30 minutes**

See [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) → "Deployment to AWS" section

---

## ✅ Step 5: Post-Deployment Verification (15 minutes)

```bash
# Replace "your-domain.com" with your actual domain

# 1. Health Check
curl https://your-domain.com/api/health

# Expected: {"status":"ok",...}

# 2. Performance Check
curl https://your-domain.com/api/health/performance

# Expected: Performance metrics

# 3. Test Instagram Download
curl -X POST https://your-domain.com/api/download/optimized \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.instagram.com/p/YOUR_POST_ID/","type":"instagram"}'

# 4. Test Rate Limiting (optional)
# Make 35 requests - should get 429 on the 31st

# 5. Check Monitoring
# - Open Sentry dashboard (if configured)
# - Check for any errors

# 6. View Your Site
# Go to https://your-domain.com in browser
# Test download functionality
```

---

## 🔒 Step 6: Finalize Security (10 minutes)

### 6.1 Verify No Secrets in Git

```bash
# Check that secrets are NOT in git
git log --all --oneline --source | grep -i "api" | head -20
# Should not show any actual API keys

# Check current working directory
git status
# Should NOT show .env.local as untracked
```

### 6.2 Verify Environment Variables

In your production platform (Vercel/AWS):
- [ ] NEXT_PUBLIC_YOUTUBE_API_KEY is set (new key, not old one)
- [ ] All FIREBASE variables are set
- [ ] CRON_SECRET_KEY is set
- [ ] CLEANUP_KEY is set
- [ ] No credentials visible in logs

### 6.3 Configure Cron Jobs

For Vercel (already configured in vercel.json):
- Cleanup runs hourly at 0 minutes: `0 * * * *`
- Verify it's working in Vercel dashboard

For AWS:
- Set up CloudWatch Events for `/api/cron/cleanup`

---

## 📊 Step 7: Monitoring Setup (Optional but Recommended)

### 7.1 Sentry Error Tracking

```bash
# 1. Go to https://sentry.io/
# 2. Create account and new project
# 3. Copy DSN
# 4. Set in environment variable:
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# 5. Test error is captured:
curl -X POST https://your-domain.com/api/download/optimized \
  -H "Content-Type: application/json" \
  -d '{"url":"invalid-url","type":"invalid"}'

# 6. Check Sentry dashboard - error should appear
```

### 7.2 Vercel Analytics (Already Enabled)

- Automatically tracks performance
- View in Vercel dashboard
- Monitor Core Web Vitals

---

## 📝 Step 8: Documentation & Handoff (10 minutes)

Ensure these are in your repository:
- [x] README.md - Main documentation
- [x] DEPLOYMENT-GUIDE.md - How to deploy
- [x] PRE-DEPLOYMENT-CHECKLIST.md - Verification steps
- [x] .env.example - Environment template
- [x] CODE-IMPROVEMENTS-SUMMARY.md - What was changed

Share with your team:
- Production URL
- How to report issues
- Monitoring dashboards (Sentry, Vercel)
- How to contact support

---

## 🎯 Common Issues & Quick Fixes

### Issue: "API key not found" in production

**Fix:**
```bash
# Check environment variables are set
vercel env ls        # Vercel
# or
echo $NEXT_PUBLIC_YOUTUBE_API_KEY  # AWS

# Re-deploy if needed
vercel --prod
```

### Issue: Slow downloads in production

**Fix:**
1. Check performance dashboard at `/performance`
2. May need to increase browser pool size
3. Check network conditions
4. See DEPLOYMENT-GUIDE.md → Troubleshooting

### Issue: Rate limiting too strict

**Fix:**
```bash
# Adjust in environment variables
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_WINDOW_MS=60000
```

### Issue: Firebase not connecting

**Fix:**
1. Verify all FIREBASE variables are correct (copy-paste from Firebase console)
2. Ensure Firebase project has required services enabled
3. Check if credentials are restricted to your domain

---

## 🚀 Success Checklist

You're done when all these are checked:

- [x] Code improvements implemented (all 15 files created)
- [ ] YouTube API key regenerated and configured
- [ ] Firebase configured with all 8 credentials
- [ ] Sentry configured (optional)
- [ ] Environment variables set in production
- [ ] Application built successfully
- [ ] Tests pass locally
- [ ] Deployed to production (Vercel/AWS)
- [ ] Health check endpoint returns 200 OK
- [ ] Instagram download tested and working
- [ ] Rate limiting verified working
- [ ] Error tracking verified working
- [ ] Monitoring dashboards accessible
- [ ] Team informed of launch
- [ ] Rollback plan documented
- [ ] Performance acceptable

---

## 📞 Next Steps

1. **For immediate issues:** Check logs in Vercel/AWS dashboard
2. **For deployment help:** See DEPLOYMENT-GUIDE.md
3. **For verification:** See PRE-DEPLOYMENT-CHECKLIST.md
4. **For code questions:** See CODE-IMPROVEMENTS-SUMMARY.md
5. **For general info:** See README.md

---

## 📈 After Launch (Important!)

### First 24 Hours
- [ ] Monitor error rates (Sentry)
- [ ] Monitor performance (Vercel Analytics)
- [ ] Check for user issues
- [ ] Verify cron jobs running

### First Week
- [ ] Review all errors
- [ ] Analyze performance trends
- [ ] Verify backups working
- [ ] Update team documentation

### Ongoing (Weekly)
- [ ] Review metrics
- [ ] Update dependencies
- [ ] Rotate API keys (quarterly)
- [ ] Test backup/restore

---

## 🎓 Learning Resources

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [YouTube API Docs](https://developers.google.com/youtube/v3)
- [Sentry Docs](https://docs.sentry.io/)

---

**Estimated Timeline:**
- Setup: 30 minutes
- Local testing: 30 minutes
- Pre-checks: 15 minutes
- Deployment: 15-30 minutes
- Verification: 15 minutes
- **Total: ~2 hours**

Then monitor for 1-2 weeks in staging before considering it production-stable.

---

**Ready to deploy? Start with Step 1: Setup Environment**

Good luck! 🚀
# VidGrab Pro - Production Deployment Guide

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Deployment to Vercel](#deployment-to-vercel)
4. [Deployment to AWS](#deployment-to-aws)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

### Security
- [ ] **API Keys Secured**: All API keys are removed from source code and stored securely
  - [ ] YouTube API key: Store in Vercel Environment Variables or AWS Secrets Manager
  - [ ] Firebase credentials: Store in Vercel Environment Variables or AWS Secrets Manager
  - [ ] Sentry DSN: Store in environment variables
  - [ ] Cron secret keys: Generate secure random values

- [ ] **Environment Variables**: No `.env.local` is committed to git
  - [ ] `.env.local` is in `.gitignore` ✓
  - [ ] `.env.example` exists for reference ✓

- [ ] **Secrets Management**: Use proper secret management for production
  - Option 1: Vercel Environment Variables (Recommended for Vercel)
  - Option 2: AWS Secrets Manager (for AWS deployment)
  - Option 3: HashiCorp Vault (enterprise option)

### Code Quality
- [ ] Build succeeds locally: `npm run build`
- [ ] No console errors or warnings
- [ ] All dependencies updated: `npm update`
- [ ] Tests pass (when available): `npm test`
- [ ] Linting passes: `npm run lint`

### Configuration
- [ ] Firebase project created and configured
- [ ] YouTube API key regenerated (old key disabled)
- [ ] Sentry project created (optional but recommended)
- [ ] Domain/SSL certificate configured

### Performance
- [ ] Performance dashboard tested locally
- [ ] Health check endpoint working
- [ ] Rate limiting configured appropriately

---

## Environment Configuration

### 1. Create Environment Variables File

Create a secure configuration for production. Never commit actual values to git.

### 2. Vercel Environment Variables Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variables for production
vercel env add NEXT_PUBLIC_BASE_URL
vercel env add NEXT_PUBLIC_YOUTUBE_API_KEY
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID
vercel env add NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
vercel env add NEXT_PUBLIC_SENTRY_DSN (optional)
vercel env add CRON_SECRET_KEY
vercel env add CLEANUP_KEY
```

### 3. Firebase Configuration

**Important**: You need to complete the Firebase setup yourself:

```bash
# 1. Create a Firebase project at https://console.firebase.google.com/
# 2. Get your Firebase credentials
# 3. Add them to environment variables (not committed to git)
# 4. Create Firestore database (if needed)
# 5. Enable required Firebase services (Analytics, Storage, etc.)
```

### 4. YouTube API Configuration

```bash
# 1. Create API key in Google Cloud Console
#    https://console.cloud.google.com/
# 2. Enable YouTube Data API v3
# 3. Restrict key to authorized referers
# 4. Add key to environment variables (never commit to git)
```

### 5. Sentry Configuration (Optional but Recommended)

```bash
# 1. Create Sentry account at https://sentry.io/
# 2. Create new project for your app
# 3. Copy DSN to environment variables
```

---

## Deployment to Vercel

### Option A: Deploy via Vercel CLI (Recommended)

```bash
# 1. Authenticate with Vercel
vercel login

# 2. Set up project (first time)
vercel --prod

# 3. Subsequent deployments
vercel --prod
```

### Option B: Deploy via GitHub Integration

```bash
# 1. Push code to GitHub repository
git push origin main

# 2. Connect repository to Vercel
#    - Go to https://vercel.com/new
#    - Select your repository
#    - Configure environment variables
#    - Click Deploy

# 3. Subsequent deployments (automatic on git push)
```

### Vercel Configuration Verification

Check that `vercel.json` is properly configured:

```json
{
  "crons": [{
    "path": "/api/cron/cleanup",
    "schedule": "0 * * * *"
  }],
  "env": {
    "NEXT_PUBLIC_BASE_URL": "@next_public_base_url",
    "NEXT_PUBLIC_YOUTUBE_API_KEY": "@youtube_api_key",
    // ... other vars
  }
}
```

---

## Deployment to AWS

### Option A: AWS Amplify

```bash
# 1. Install Amplify CLI
npm install -g @aws-amplify/cli

# 2. Initialize Amplify
amplify init

# 3. Add hosting
amplify add hosting

# 4. Deploy
amplify publish
```

### Option B: AWS EC2 + S3 + CloudFront

```bash
# 1. Build the application
npm run build

# 2. Upload to S3
aws s3 sync .next/static s3://your-bucket-name/static

# 3. Deploy to EC2
ssh -i your-key.pem ec2-user@your-instance.amazonaws.com
# Then pull latest code and restart app
```

### Option C: AWS Lambda + API Gateway (Serverless)

```bash
# 1. Use Serverless Framework
npm i -g serverless
serverless create --template aws-nodejs-next

# 2. Deploy
serverless deploy
```

### AWS Secrets Manager Setup

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name vidgrab/youtube-api-key \
  --secret-string "your-api-key"

# Retrieve in application
aws secretsmanager get-secret-value \
  --secret-id vidgrab/youtube-api-key
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
# Test health endpoint
curl https://your-domain.com/api/health

# Expected response:
# {
#   "status": "ok",
#   "uptime": 123.45,
#   "environment": "production",
#   "timestamp": "2024-01-01T00:00:00Z"
# }
```

### 2. Performance Check

```bash
# Test performance dashboard
curl https://your-domain.com/performance

# Test performance API
curl https://your-domain.com/api/health/performance
```

### 3. Instagram Download Test

```bash
# Test Instagram download functionality
curl -X POST https://your-domain.com/api/download/optimized \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.instagram.com/p/EXAMPLE_POST_ID/",
    "type": "instagram"
  }'
```

### 4. YouTube Download Test

```bash
# Test YouTube download functionality
curl -X POST https://your-domain.com/api/download/optimized \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=EXAMPLE_VIDEO_ID",
    "type": "youtube"
  }'
```

### 5. Error Tracking Check

```bash
# Verify Sentry is receiving errors
# Test by making an invalid request
curl -X POST https://your-domain.com/api/download/optimized \
  -H "Content-Type: application/json" \
  -d '{"url": "invalid-url"}'

# Check Sentry dashboard for error
```

### 6. Rate Limiting Test

```bash
# Make multiple requests to test rate limiting
for i in {1..35}; do
  curl -X POST https://your-domain.com/api/health
  echo "\nRequest $i"
done

# Should get 429 (Too Many Requests) after 30 requests
```

---

## Monitoring & Maintenance

### 1. Set Up Monitoring

#### Vercel Analytics
```javascript
// Already integrated in _app.jsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

#### Sentry Monitoring
- Dashboard: https://sentry.io/
- Set alerts for:
  - Error rate > 5%
  - Performance issues > 3s response time
  - Crash-free rate drops

### 2. Scheduled Maintenance

The cleanup cron job is configured to run hourly:
```
0 * * * * /api/cron/cleanup
```

Monitor it in Vercel Cron Job Dashboard.

### 3. Performance Optimization

Check the performance dashboard regularly:
```
https://your-domain.com/performance
```

Monitor:
- API response times
- Browser memory usage
- Success/failure rates
- Cache hit rates

### 4. Logging & Debugging

#### View Logs in Vercel
```bash
vercel logs vidgrab-pro
```

#### View Logs in AWS CloudWatch
```bash
aws logs tail /aws/lambda/your-function-name --follow
```

### 5. Security Monitoring

- [ ] Regularly rotate API keys (quarterly)
- [ ] Monitor for unauthorized API usage
- [ ] Review Sentry for security-related errors
- [ ] Check rate limiting effectiveness

### 6. Backup & Recovery

```bash
# Backup production data
aws s3 sync s3://your-bucket production-backup/

# Restore from backup if needed
aws s3 sync production-backup/ s3://your-bucket --delete
```

---

## Troubleshooting

### Issue: "API key not found" error

**Solution**: Verify environment variables are set in production
```bash
vercel env ls
# or
aws secretsmanager list-secrets
```

### Issue: Slow download response times

**Solution**: Check performance dashboard and optimize:
1. Increase Puppeteer browser pool size
2. Increase rate limit window
3. Check server resources

### Issue: High error rate on Instagram downloads

**Solution**: Instagram frequently changes their structure
1. Update Instagram scraping logic
2. Implement fallback download methods
3. Monitor for Instagram API changes

### Issue: Rate limit too strict

**Solution**: Adjust in environment variables:
```
RATE_LIMIT_REQUESTS_PER_MINUTE=60
RATE_LIMIT_WINDOW_MS=60000
```

### Issue: Cron jobs not running

**Solution**: Check Vercel Cron Job settings:
1. Verify `vercel.json` has correct cron schedule
2. Check that `CRON_SECRET_KEY` is configured
3. Review logs for errors

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` for development (not committed)
   - Use environment variables for production

2. **Rotate API keys regularly**
   - Change YouTube API key quarterly
   - Change Firebase keys when team changes
   - Rotate Sentry DSN if exposed

3. **Monitor for suspicious activity**
   - Set up alerts for unusual API usage patterns
   - Monitor rate limit violations
   - Review error logs for attack patterns

4. **Use HTTPS everywhere**
   - Vercel provides free SSL/TLS
   - Enable HSTS header
   - Configure CSP headers

5. **Keep dependencies updated**
   ```bash
   npm audit
   npm update
   npm audit fix
   ```

---

## Next Steps

1. [ ] Complete Firebase setup with production credentials
2. [ ] Generate new YouTube API key and disable old one
3. [ ] Deploy to Vercel or AWS using this guide
4. [ ] Verify all systems are working via post-deployment checklist
5. [ ] Set up monitoring (Sentry, Vercel Analytics)
6. [ ] Configure domain and SSL
7. [ ] Test with real users in staging environment
8. [ ] Monitor metrics for 24-48 hours before marking as stable

---

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [YouTube API Documentation](https://developers.google.com/youtube/v3)
- [Sentry Documentation](https://docs.sentry.io/)
- [GitHub Issues](https://github.com/your-org/vidgrab-pro/issues)

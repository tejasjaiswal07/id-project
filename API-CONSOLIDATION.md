# API Consolidation Guide

## Overview
This document outlines the consolidation of redundant API endpoints in the VidGrab Pro application. The goal is to reduce code duplication and improve maintainability.

## Current Redundant Endpoints

### Download Endpoints (Consolidate to `/api/download/optimized.js`)
| Legacy Endpoint | Status | Migration Path |
|---|---|---|
| `/api/download/instagram.js` | Redundant | Migrate to optimized.js |
| `/api/download/instagram-direct.js` | Redundant | Migrate to optimized.js |
| `/api/download/instagram-direct-file.js` | Redundant | Migrate to optimized.js |
| `/api/download/direct.js` | Redundant | Migrate to optimized.js |
| `/api/download/file.js` | Redundant | Migrate to optimized.js |
| `/api/download/youtube.js` | Redundant | Migrate to optimized.js |
| `/api/download/optimized.js` | PRIMARY | Keep as main endpoint |

### Info Endpoints (Consolidate to `/api/info/enhanced.js`)
| Legacy Endpoint | Status | Migration Path |
|---|---|---|
| `/api/info/instagram.js` | Redundant | Migrate to enhanced.js |
| `/api/info/instagram-placeholder.js` | Redundant | Remove |
| `/api/info/instagram-thumbnail.js` | Redundant | Migrate to enhanced.js |
| `/api/info/youtube.js` | Redundant | Migrate to enhanced.js |
| `/api/info/enhanced.js` | PRIMARY | Keep as main endpoint |

### Deprecated Endpoints (Remove)
| Endpoint | Reason |
|---|---|
| `/api/download/progress.js` | Progress tracking handled in optimized.js |
| `/api/download/start.js` | Handled by optimized.js |
| `/api/youtube-download.js` | Legacy endpoint |
| `/api/test-youtube.js` | Test endpoint - remove after verification |

## Migration Strategy

### Phase 1: Create Unified Endpoint Wrappers (COMPLETED)
- ✓ Primary endpoint `/api/download/optimized.js` is already optimized
- ✓ Created environment validators and error tracking
- ✓ Created rate limiting middleware

### Phase 2: Update Frontend Components
Update components to use only the primary endpoints:

**InstagramDownloader.jsx** should only call:
```javascript
POST /api/download/optimized
```

**YouTubeDownloader.jsx** should only call:
```javascript
POST /api/download/optimized
```

### Phase 3: Deprecate Legacy Endpoints
1. Add deprecation warnings to legacy endpoints
2. Redirect traffic to optimized endpoint
3. Monitor usage for 1 week
4. Remove legacy endpoints

## Implementation Details

### Unified Download Endpoint (`/api/download/optimized.js`)
Supports:
- Instagram: videos, photos, reels, IGTV
- YouTube: videos (when enabled)
- Direct file downloads
- Progress tracking
- Error recovery with retries
- Browser pooling for Instagram

### Unified Info Endpoint (`/api/info/enhanced.js`)
Supports:
- Media metadata extraction
- Thumbnail generation
- Duration calculation
- View count and statistics
- Format/quality information

## Frontend Migration Checklist

- [ ] Update InstagramDownloader.jsx to use `/api/download/optimized`
- [ ] Update YouTubeDownloader.jsx to use `/api/download/optimized`
- [ ] Update any info fetching to use `/api/info/enhanced`
- [ ] Test all download scenarios
- [ ] Verify error handling works correctly

## Backend Migration Checklist

- [ ] Create deprecation wrapper endpoints for legacy paths
- [ ] Add rate limiting to consolidated endpoints
- [ ] Add error tracking (Sentry integration)
- [ ] Update health check to include endpoint consolidation status
- [ ] Add monitoring for deprecated endpoint usage

## Monitoring Deprecated Endpoints

After consolidation, monitor usage with this metric in `/api/health/performance.js`:
```javascript
{
  deprecatedEndpointsUsed: [
    '/api/download/instagram',
    '/api/download/youtube',
    // etc...
  ],
  usage: trackDeprecatedEndpoints()
}
```

## Rollback Plan

If issues occur after consolidation:
1. Legacy endpoints can be restored from git history
2. Frontend can be reverted to call multiple endpoints
3. No data loss occurs (all data in optimized.js is non-destructive)

## Timeline

- **Week 1**: Deploy consolidated endpoints with rate limiting
- **Week 2**: Monitor usage and performance metrics
- **Week 3**: Deprecate legacy endpoints (return 301 redirects)
- **Week 4**: Remove legacy endpoints from codebase

## Performance Improvements Expected

- **Response time**: 40% faster (consolidated logic)
- **Memory usage**: 20% reduction (browser pooling)
- **Error rate**: <5% (improved retry logic)
- **Throughput**: 60% higher (optimized configuration)

## References

- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [Puppeteer Performance Tips](https://pptr.dev/guides/performance)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
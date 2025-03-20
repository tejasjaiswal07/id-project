# Cleanup System Documentation

This document explains how to use the temporary file cleanup system for the YouTube downloader application.

## Overview

The cleanup system handles automatic removal of temporary files created during video downloads. It helps prevent disk space issues and ensures smooth operation of the application.

## Components

1. **API Endpoints**:
   - `/api/download/cleanup` - Manual cleanup endpoint
   - `/api/cron/cleanup` - Automated cron job endpoint

2. **Scripts**:
   - `scripts/cleanup.js` - Node.js script for direct file cleanup

3. **Configuration**:
   - `vercel.json` - Vercel cron job configuration
   - `.env.local` - Environment variables for local development

## Using the Cleanup System

### Local Development

1. **Setup**:
   - Ensure you have the required environment variables in `.env.local`:
     ```
     CLEANUP_KEY=your-secure-cleanup-key-here
     CRON_SECRET_KEY=your-secure-cron-key-here
     ```

2. **Manual Cleanup**:
   - Run `npm run cleanup` to manually clean temporary files
   - This works even when the server is not running

3. **During Development**:
   - When the server is running, the cleanup API endpoints are available
   - You can test them by making a POST request to `/api/download/cleanup` with the CLEANUP_KEY

### Production Deployment

1. **Environment Variables**:
   - Set the following environment variables in your Vercel project:
     - `CLEANUP_KEY` - For manual cleanup endpoint
     - `CRON_SECRET_KEY` - For cron job endpoint

2. **Automated Cleanup**:
   - The cron job automatically runs every hour (at minute 0)
   - It cleans up temporary files older than 1 hour
   - No manual intervention required

3. **Manual Cleanup**:
   - You can trigger a manual cleanup by making a POST request to `/api/download/cleanup` with your `CLEANUP_KEY`

## Troubleshooting

- **Missing Files**: If the cleanup script reports "File not found" errors, it means the temporary directories haven't been created yet. This is normal for a new installation.

- **Permission Issues**: If you encounter permission errors, ensure the application has write access to the `tmp` directory.

- **Cron Job Not Running**: Check your Vercel logs to ensure the cron job is properly configured and running.

## Implementation Details

The cleanup system performs the following actions:

1. Removes expired downloads from the global `activeDownloads` map
2. Deletes temporary download files from the `tmp/downloads` directory
3. Cleans up progress tracking files from the `tmp/progress` directory
4. Kills any lingering download processes
5. Provides detailed results of the cleanup operation

## Security Considerations

Both cleanup endpoints are protected by secret keys to prevent unauthorized access. Make sure to:

1. Use strong, unique keys for both `CLEANUP_KEY` and `CRON_SECRET_KEY`
2. Never expose these keys in client-side code
3. Rotate the keys periodically for enhanced security 
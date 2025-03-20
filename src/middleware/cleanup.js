import { startTempFileCleanupSchedule, initializeTempDirectory } from '../utils/temp-file-cleanup';

// Start the temp file cleanup schedule
let cleanupInterval = null;

if (typeof window === 'undefined') {
  // Only run on server side
  console.log('[Middleware] Starting temp file system initialization');
  
  // Initialize temp directory first
  initializeTempDirectory().then(() => {
    console.log('[Middleware] Starting temp file cleanup schedule');
    cleanupInterval = startTempFileCleanupSchedule();
  }).catch(error => {
    console.error('[Middleware] Failed to initialize temp directory:', error);
  });
}

export function stopCleanupSchedule() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[Middleware] Stopped temp file cleanup schedule');
  }
}

/**
 * API directory initializer
 * This file initializes server-side components when the server starts
 * It runs once on server startup because it's imported by the API file structure
 */
import { initializeTempDirectory, startTempFileCleanupSchedule } from '../../utils/temp-file-cleanup';

// Only run in server environment
if (typeof window === 'undefined') {
  console.log('[API Init] Starting server initialization');
  
  // Immediately invoke async function
  (async () => {
    try {
      console.log('[API Init] Initializing temp directory');
      await initializeTempDirectory();
      console.log('[API Init] Temp directory initialized successfully');
      
      console.log('[API Init] Starting temp file cleanup schedule');
      startTempFileCleanupSchedule();
    } catch (error) {
      console.error('[API Init] Initialization error:', error);
    }
  })();
}

// This isn't a real API route, so we'll return 404 if it's accidentally called
export default function handler(req, res) {
  res.status(404).json({
    error: 'This is an initialization file, not an API endpoint'
  });
}

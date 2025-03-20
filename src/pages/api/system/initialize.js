/**
 * System initialization API endpoint
 * This endpoint initializes required server-side components like the temp directory
 * This should be pinged by the frontend on application start
 */
import { initializeTempDirectory, startTempFileCleanupSchedule } from '../../../utils/temp-file-cleanup';

// Track if initialization has been performed
let initialized = false;
let cleanupInterval = null;

export default async function handler(req, res) {
  try {
    // Only perform initialization once
    if (!initialized) {
      console.log('[API] Starting temp file system initialization');
      
      // Initialize temp directory
      await initializeTempDirectory();
      console.log('[API] Temp directory initialized successfully');
      
      // Start cleanup schedule if not already running
      if (!cleanupInterval) {
        console.log('[API] Starting temp file cleanup schedule');
        cleanupInterval = startTempFileCleanupSchedule();
      }
      
      initialized = true;
    }
    
    res.status(200).json({ 
      success: true, 
      initialized,
      tempDirectory: 'initialized',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] Failed to initialize system:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'System initialization failed' 
    });
  }
}

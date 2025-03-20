import fs from 'fs/promises';
import path from 'path';

/**
 * Periodic cleanup of temporary files
 * This ensures that lingering files from incomplete downloads
 * don't consume too much disk space over time
 */

// Maximum age of temp files before cleanup (2 hours in milliseconds)
const MAX_FILE_AGE_MS = 2 * 60 * 60 * 1000;

// Track already processed folders to avoid redundant cleanups
const processedFolders = new Set();

/**
 * Delete a folder and its contents recursively
 * @param {string} folderPath - Path to folder to delete
 */
async function deleteFolder(folderPath) {
  try {
    // Get folder stats to check if it exists
    const stats = await fs.stat(folderPath).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      return;
    }
    
    // Read contents of the directory
    const files = await fs.readdir(folderPath);
    
    // Delete each file/subfolder in the directory
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const fileStat = await fs.stat(filePath).catch(() => null);
      
      if (fileStat) {
        if (fileStat.isDirectory()) {
          // Recursively delete subdirectories
          await deleteFolder(filePath);
        } else {
          // Delete file
          await fs.unlink(filePath);
        }
      }
    }
    
    // Delete the empty directory
    await fs.rmdir(folderPath);
    console.log(`[TempCleanup] Deleted old temp folder: ${folderPath}`);
  } catch (error) {
    console.error(`[TempCleanup] Error deleting folder ${folderPath}:`, error);
  }
}

/**
 * Clean up temporary files older than MAX_FILE_AGE_MS
 */
export async function cleanupTempFiles() {
  try {
    const tempDir = path.join(process.cwd(), 'temp');
    
    // Check if temp directory exists
    try {
      await fs.access(tempDir);
    } catch (error) {
      // Create temp directory if it doesn't exist
      await fs.mkdir(tempDir, { recursive: true });
      return; // Nothing to clean up
    }
    
    // Get all folders in the temp directory
    const folders = await fs.readdir(tempDir);
    const now = Date.now();
    
    for (const folder of folders) {
      const folderPath = path.join(tempDir, folder);
      
      // Skip if already processed recently
      if (processedFolders.has(folderPath)) {
        continue;
      }
      
      try {
        const stats = await fs.stat(folderPath);
        
        // If folder is old enough, delete it
        if (now - stats.mtimeMs > MAX_FILE_AGE_MS) {
          await deleteFolder(folderPath);
        } else {
          // Mark as processed to avoid checking it again too soon
          processedFolders.add(folderPath);
          
          // Remove from processed set after some time
          setTimeout(() => {
            processedFolders.delete(folderPath);
          }, 30 * 60 * 1000); // 30 minutes
        }
      } catch (error) {
        console.error(`[TempCleanup] Error processing ${folderPath}:`, error);
      }
    }
    
    console.log(`[TempCleanup] Completed temp folder cleanup check`);
  } catch (error) {
    console.error('[TempCleanup] Error in cleanup process:', error);
  }
}

/**
 * Initialize temp directory
 */
export async function initializeTempDirectory() {
  try {
    const tempDir = path.join(process.cwd(), 'temp');
    
    // Check if temp directory exists and create it if it doesn't
    try {
      await fs.access(tempDir);
      console.log('[TempSystem] Temp directory exists');
    } catch (error) {
      console.log('[TempSystem] Creating temp directory');
      await fs.mkdir(tempDir, { recursive: true });
    }
    
    return tempDir;
  } catch (error) {
    console.error('[TempSystem] Error initializing temp directory:', error);
    return null;
  }
}

// Run cleanup periodically
export function startTempFileCleanupSchedule() {
  // Initialize temp directory
  initializeTempDirectory().then(() => {
    // Run initial cleanup
    cleanupTempFiles();
    
    // Schedule cleanup every 30 minutes
    const interval = setInterval(cleanupTempFiles, 30 * 60 * 1000);
    
    return interval;
  });
}

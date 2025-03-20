import { readdir, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// API endpoint for cron job to clean up old files
export default async function handler(req, res) {
  // Only allow POST requests with a secret key for security
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  // Verify cron secret key
  const { key } = req.body;
  const expectedKey = process.env.CRON_SECRET_KEY || 'change-this-key';
  
  if (key !== expectedKey) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  try {
    // Define temp directories
    const TEMP_DIR = join(process.cwd(), 'tmp');
    const DOWNLOADS_DIR = join(TEMP_DIR, 'downloads');
    const PROGRESS_DIR = join(TEMP_DIR, 'progress');
    
    // Track cleaning results
    const results = {
      downloadFilesDeleted: 0,
      progressFilesDeleted: 0,
      downloadsRemoved: 0,
      errors: []
    };
    
    // Clean up expired downloads from global map
    if (global.activeDownloads) {
      const now = Date.now();
      const expirationTime = 3600000; // 1 hour in milliseconds
      
      for (const [downloadId, downloadData] of global.activeDownloads.entries()) {
        try {
          // Check when download was created
          const created = new Date(downloadData.progressData.created || 0).getTime();
          
          // If download is more than 1 hour old or completed, clean it up
          if (now - created > expirationTime || 
              downloadData.progressData.status === 'complete' || 
              downloadData.progressData.status === 'error') {
            
            // Kill process if still running
            if (downloadData.process && typeof downloadData.process.kill === 'function') {
              try {
                downloadData.process.kill();
              } catch (error) {
                console.error(`Error killing process for ${downloadId}:`, error);
              }
            }
            
            // Remove from global map
            global.activeDownloads.delete(downloadId);
            results.downloadsRemoved++;
          }
        } catch (error) {
          console.error(`Error cleaning up download ${downloadId}:`, error);
          results.errors.push(`Failed to clean up download ${downloadId}: ${error.message}`);
        }
      }
    }
    
    // Current time for file age comparison
    const now = Date.now();
    const expirationTime = 3600000; // 1 hour in milliseconds
    
    // Clean up download files older than 1 hour
    if (existsSync(DOWNLOADS_DIR)) {
      const files = await readdir(DOWNLOADS_DIR);
      for (const file of files) {
        try {
          const filePath = join(DOWNLOADS_DIR, file);
          const stats = await stat(filePath);
          const fileAge = now - stats.mtime.getTime();
          
          if (fileAge > expirationTime) {
            await unlink(filePath);
            results.downloadFilesDeleted++;
          }
        } catch (error) {
          console.error(`Error processing download file ${file}:`, error);
          results.errors.push(`Failed to process download file ${file}: ${error.message}`);
        }
      }
    }
    
    // Clean up progress files older than 1 hour
    if (existsSync(PROGRESS_DIR)) {
      const files = await readdir(PROGRESS_DIR);
      for (const file of files) {
        try {
          const filePath = join(PROGRESS_DIR, file);
          const stats = await stat(filePath);
          const fileAge = now - stats.mtime.getTime();
          
          if (fileAge > expirationTime) {
            await unlink(filePath);
            results.progressFilesDeleted++;
          }
        } catch (error) {
          console.error(`Error processing progress file ${file}:`, error);
          results.errors.push(`Failed to process progress file ${file}: ${error.message}`);
        }
      }
    }
    
    // Return results
    return res.status(200).json({
      message: 'Cron cleanup completed',
      results
    });
    
  } catch (error) {
    console.error('Error in cron cleanup routine:', error);
    return res.status(500).json({
      message: 'Error during cron cleanup',
      error: error.message
    });
  }
} 
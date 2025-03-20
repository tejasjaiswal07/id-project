import { createReadStream, statSync, existsSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { promises as fsPromises } from 'fs';
import { initializeTempDirectory } from '../../../utils/temp-file-cleanup';

// Track active downloads to prevent file contention
const activeDownloads = new Map();
// Track completed downloads for better caching
const completedDownloads = new Map();

// Max time a download lock can be held (30 seconds)
const MAX_LOCK_TIME = 30 * 1000;
// Max time to cache completed download info (30 minutes)
const MAX_CACHE_TIME = 30 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const requestId = `${clientIp}-${startTime}-${Math.floor(Math.random() * 1000)}`;

  try {
    // Get file path from query params
    const { filePath, fileName, type } = req.query;
    
    if (!filePath || !fileName) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const fileId = `${filePath}/${fileName}`;
    console.log(`[${requestId}] Processing direct download request for: ${fileId}`);
    
    // Check if this file is already being downloaded
    if (activeDownloads.has(fileId)) {
      // If the request was made less than 5 seconds ago, tell client to retry
      const timeSinceRequest = Date.now() - activeDownloads.get(fileId);
      if (timeSinceRequest < 5000) {
        console.log(`[${requestId}] File ${fileId} is already being downloaded, requesting retry after 5s`);
        res.setHeader('Retry-After', '5');
        return res.status(429).json({ 
          error: 'File is currently being processed by another request',
          retryAfter: 5
        });
      } else {
        // Remove stale lock
        console.log(`[${requestId}] Removing stale lock for ${fileId} after ${timeSinceRequest}ms`);
        activeDownloads.delete(fileId);
      }
    }
    
    // Mark this file as being downloaded
    activeDownloads.set(fileId, Date.now());
    console.log(`[${requestId}] Set active download lock for ${fileId}`);
    
    // Auto-remove from active downloads after 30 seconds regardless of outcome
    const lockTimeout = setTimeout(() => {
      if (activeDownloads.has(fileId)) {
        console.log(`[${requestId}] Auto-removing lock for ${fileId} after 30s timeout`);
        activeDownloads.delete(fileId);
      }
    }, MAX_LOCK_TIME);
    
    // Initialize temp directory if needed
    await initializeTempDirectory();
    
    // Security check - ensure the file is in the temp directory
    const fullPath = join(process.cwd(), 'temp', filePath, fileName);
    
    // Normalize paths for security validation
    const tempDirPath = join(process.cwd(), 'temp');
    const normalizedFullPath = join(fullPath); // Normalize the path
    const normalizedTempDir = join(tempDirPath); // Normalize the temp directory path
    
    // Security check - verify the file is inside the temp directory
    if (!normalizedFullPath.startsWith(normalizedTempDir)) {
      console.error(`[${requestId}] Security violation: Attempted to access file outside temp directory: ${fullPath}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      console.error(`[${requestId}] File not found: ${fullPath}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file stats
    const stats = statSync(fullPath);
    if (!stats.isFile()) {
      console.error(`[${requestId}] Not a file: ${fullPath}`);
      return res.status(400).json({ error: 'Not a file' });
    }
    
    const fileSize = stats.size;
    console.log(`[${requestId}] Found file: ${fullPath}, size: ${fileSize} bytes`);
    
    // Set appropriate content type based on the file type
    if (type === 'video') {
      res.setHeader('Content-Type', 'video/mp4');
    } else {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    
    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    try {
      // Create a read stream for the file
      const fileStream = createReadStream(fullPath);
      
      // Handle stream errors
      fileStream.on('error', (err) => {
        console.error(`[${requestId}] Error streaming file:`, err);
        
        // Cleanup
        clearTimeout(lockTimeout);
        activeDownloads.delete(fileId);
        
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' });
        }
      });
      
      // Use pipeline for proper stream handling
      await pipeline(fileStream, res);
      
      // Record successful download in cache
      completedDownloads.set(fileId, {
        timestamp: Date.now(),
        size: fileSize,
        type
      });
      
      // Auto-cleanup cache entry after 30 minutes
      setTimeout(() => {
        completedDownloads.delete(fileId);
      }, MAX_CACHE_TIME);
      
      // Log success and timing
      const elapsed = Date.now() - startTime;
      console.log(`[${requestId}] Successfully streamed ${fileSize} bytes in ${elapsed}ms`);
      
      // Remove lock
      clearTimeout(lockTimeout);
      activeDownloads.delete(fileId);
      
    } catch (streamError) {
      console.error(`[${requestId}] Error streaming file:`, streamError);
      
      // Remove lock
      clearTimeout(lockTimeout);
      activeDownloads.delete(fileId);
      
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file to client' });
      }
    }
    
  } catch (error) {
    console.error(`[${requestId}] Error processing direct download:`, error);
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error processing download' });
    }
  }
}

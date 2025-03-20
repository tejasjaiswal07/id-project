import { createReadStream, statSync, existsSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import { createWriteStream, stat } from 'fs';
import { promises as fsPromises } from 'fs';
import { initializeTempDirectory } from '../../../utils/temp-file-cleanup';
import crypto from 'crypto';
import path from 'path';

// Add stealth plugin to puppeteer (helps avoid detection)
puppeteer.use(StealthPlugin());

// Cache of active downloads to prevent duplicate requests
const activeDownloads = new Map();
const completedDownloads = new Map();

// Maximum time to keep a download lock (30 seconds)
const MAX_LOCK_TIME = 30000;
// Maximum time to keep completed download in cache (30 minutes)
const MAX_CACHE_TIME = 30 * 60 * 1000;

/**
 * Extracts post information from an Instagram URL
 * @param {string} url 
 * @returns {Object|null}
 */
function extractPostInfo(url) {
  if (!url) return null;
  
  // Support various Instagram URL formats
  const patterns = {
    post: /instagram\.com\/p\/([^/?#]+)/i,
    reel: /instagram\.com\/reel\/([^/?#]+)/i,
    story: /instagram\.com\/stories\/([^/?#]+)\/([^/?#]+)/i,
    tv: /instagram\.com\/tv\/([^/?#]+)/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    const match = url.match(pattern);
    if (match) {
      const result = {
        type,
        id: type === 'story' ? { username: match[1], storyId: match[2] } : match[1],
        // For reels, explicitly set content type as video
        mediaType: type === 'reel' || type === 'tv' ? 'video' : null
      };
      return result;
    }
  }

  return null;
}

/**
 * Creates a temporary directory for storing downloaded files
 * @returns {Promise<string>} Path to the temporary directory
 */
async function createTempFolder() {
  // Initialize temp directory if needed
  await initializeTempDirectory();
  
  // Create a unique folder for this download
  const downloadId = `instagram_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const tempFolderPath = join(process.cwd(), 'temp', downloadId);
  
  try {
    await fsPromises.mkdir(tempFolderPath, { recursive: true });
    return tempFolderPath;
  } catch (err) {
    console.error(`Error creating temp folder:`, err);
    throw new Error('Failed to create temporary storage');
  }
}

/**
 * Downloads media from Instagram
 * @param {string} url 
 * @param {string} tempFolderPath 
 * @returns {Promise<Object>}
 */
async function downloadInstagramMedia(url, tempFolderPath, requestId) {
  try {
    // Extract post info from URL
    const postInfo = extractPostInfo(url);
    if (!postInfo) {
      throw new Error('Invalid Instagram URL format');
    }
    
    // Check if this is a reel
    const isReel = url.includes('/reel/') || postInfo.type === 'reel';
    console.log(`[${requestId}] Content type: ${isReel ? 'REEL' : 'POST'}`);
    
    // Force video type for reels
    if (isReel) {
      console.log(`[${requestId}] Forcing content type to VIDEO for reel`);
      postInfo.mediaType = 'video';
    }
    
    // Make a request to our own Instagram API endpoint
    console.log(`[${requestId}] Requesting content from Instagram API for URL: ${url}`);
    const apiResponse = await axios({
      method: 'get',
      url: '/api/download/instagram',
      baseURL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      params: {
        url,
        directStream: 'false'
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 500
    });
    
    if (!apiResponse.data.success || !apiResponse.data.fileInfo) {
      console.error(`[${requestId}] API response error:`, apiResponse.data);
      throw new Error('Failed to get file information from API');
    }
    
    const fileInfo = apiResponse.data.fileInfo;
    console.log(`[${requestId}] Got file info:`, fileInfo);
    
    // Check if we have the file in our global cache
    if (global.instagramTempFiles && global.instagramTempFiles[fileInfo.id]) {
      const cachedFile = global.instagramTempFiles[fileInfo.id];
      console.log(`[${requestId}] Found file in global cache:`, cachedFile);
      
      // Verify the file exists
      if (existsSync(cachedFile.path)) {
        return {
          filePath: cachedFile.path,
          fileName: cachedFile.fileName,
          contentType: cachedFile.contentType,
          fileSize: cachedFile.fileSize,
          type: cachedFile.type
        };
      } else {
        console.log(`[${requestId}] Cached file doesn't exist on disk:`, cachedFile.path);
      }
    }
    
    // If we can't find it in the cache, look for it in the temp directory
    const tempDir = join(process.cwd(), 'temp');
    console.log(`[${requestId}] Searching for file in temp directory:`, tempDir);
    
    // Search for folders starting with instagram_
    const dirEntries = await fsPromises.readdir(tempDir, { withFileTypes: true });
    let foundFilePath = null;
    
    for (const entry of dirEntries) {
      if (entry.isDirectory() && entry.name.startsWith('instagram_')) {
        const subDir = join(tempDir, entry.name);
        
        try {
          const files = await fsPromises.readdir(subDir);
          
          // For reels, look for files with "reel" in the name
          const targetFile = isReel
            ? files.find(f => f.includes('reel') && f.endsWith('.mp4'))
            : files.find(f => f.startsWith('instagram_'));
            
          if (targetFile) {
            foundFilePath = join(subDir, targetFile);
            console.log(`[${requestId}] Found matching file:`, foundFilePath);
            
            const stats = statSync(foundFilePath);
            
            return {
              filePath: foundFilePath,
              fileName: targetFile,
              contentType: isReel ? 'video/mp4' : 'image/jpeg',
              fileSize: stats.size,
              type: isReel ? 'video' : 'image'
            };
          }
        } catch (e) {
          console.log(`[${requestId}] Error reading subdirectory:`, e.message);
        }
      }
    }
    
    throw new Error('Could not find the downloaded file');
  } catch (error) {
    console.error(`[${requestId}] Error downloading Instagram media:`, error);
    throw error;
  }
}

/**
 * Direct API handler for downloading Instagram content
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const requestId = `${startTime}-${Math.floor(Math.random() * 10000)}`;

  try {
    // Get URL and download ID from query params
    const { url, downloadId } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Missing required URL parameter' });
    }
    
    console.log(`[${requestId}] Processing direct file download request for URL: ${url}`);
    
    // Generate a unique file ID based on the URL
    const fileId = crypto.createHash('md5').update(url).digest('hex');
    
    // Check if this URL is already being processed
    if (activeDownloads.has(fileId)) {
      const timeSinceRequest = Date.now() - activeDownloads.get(fileId);
      if (timeSinceRequest < 5000) {
        console.log(`[${requestId}] URL ${url} is already being processed, requesting retry after 5s`);
        res.setHeader('Retry-After', '5');
        return res.status(429).json({ 
          error: 'URL is currently being processed by another request',
          retryAfter: 5
        });
      } else {
        // Remove stale lock
        console.log(`[${requestId}] Removing stale lock for ${url} after ${timeSinceRequest}ms`);
        activeDownloads.delete(fileId);
      }
    }
    
    // Mark this URL as being downloaded
    activeDownloads.set(fileId, Date.now());
    console.log(`[${requestId}] Set active download lock for ${url}`);
    
    // Auto-remove from active downloads after 30 seconds regardless of outcome
    const lockTimeout = setTimeout(() => {
      if (activeDownloads.has(fileId)) {
        console.log(`[${requestId}] Auto-removing lock for ${url} after 30s timeout`);
        activeDownloads.delete(fileId);
      }
    }, MAX_LOCK_TIME);
    
    try {
      // Get file information
      const fileInfo = await downloadInstagramMedia(url, null, requestId);
      
      console.log(`[${requestId}] Download successful:`, fileInfo);
      
      // Set appropriate content type
      res.setHeader('Content-Type', fileInfo.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.fileName)}"`);
      res.setHeader('Content-Length', fileInfo.fileSize);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      // Create read stream for the file
      const fileStream = createReadStream(fileInfo.filePath);
      
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
      
      console.log(`[${requestId}] File stream completed successfully`);
      
      // Add to completed downloads cache
      completedDownloads.set(fileId, {
        timestamp: Date.now(),
        filePath: fileInfo.filePath,
        fileName: fileInfo.fileName,
        contentType: fileInfo.contentType,
        fileSize: fileInfo.fileSize,
        type: fileInfo.type
      });
      
      // Auto-cleanup cache entry after 30 minutes
      setTimeout(() => {
        completedDownloads.delete(fileId);
      }, MAX_CACHE_TIME);
      
      // Remove lock
      clearTimeout(lockTimeout);
      activeDownloads.delete(fileId);
      
    } catch (downloadErr) {
      console.error(`[${requestId}] Error during download:`, downloadErr);
      
      // Remove lock
      clearTimeout(lockTimeout);
      activeDownloads.delete(fileId);
      
      if (!res.headersSent) {
        res.status(500).json({ error: `Download failed: ${downloadErr.message}` });
      }
    }
  } catch (error) {
    console.error(`[${requestId}] Server error:`, error);
    
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server error' });
    }
  }
}

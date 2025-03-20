import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import { createReadStream, createWriteStream, writeFile, stat, existsSync, statSync } from 'fs';
import { join } from 'path';
import { unlink, mkdir, readdir, rmdir, access } from 'fs/promises';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { pipeline } from 'stream/promises';
import { initializeTempDirectory } from '../../../utils/temp-file-cleanup';
import * as fs from 'fs/promises';

// Map to track active downloads and prevent duplicate processing
const activeDownloads = new Map();

// Download progress tracking
const downloadProgress = new Map();

// Function to check if download is active for a URL
const isDownloadActive = (url) => {
  if (!activeDownloads.has(url)) {
    return false;
  }
  
  // Get download info
  const downloadInfo = activeDownloads.get(url);
  
  // If more than 5 minutes passed, consider the download as stale
  if (Date.now() - downloadInfo.timestamp > 5 * 60 * 1000) {
    activeDownloads.delete(url);
    return false;
  }
  
  return true;
};

// Mark download as active
const setDownloadActive = (url, id) => {
  activeDownloads.set(url, {
    id,
    timestamp: Date.now()
  });
  
  // Set auto-expiration after 5 minutes
  setTimeout(() => {
    // Only delete if it's still the same download ID (hasn't been updated)
    const current = activeDownloads.get(url);
    if (current && current.id === id) {
      activeDownloads.delete(url);
    }
  }, 5 * 60 * 1000);
};

// Mark download as complete
const markDownloadComplete = (url) => {
  activeDownloads.delete(url);
};

// Update progress tracking
const updateProgress = async (id, progress, status = null) => {
  try {
    const progressData = downloadProgress.get(id) || { progress: 0, status: 'initializing' };
    
    if (progress !== undefined) {
      progressData.progress = progress;
    }
    
    if (status) {
      progressData.status = status;
    }
    
    downloadProgress.set(id, progressData);
    
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      downloadProgress.delete(id);
    }, 5 * 60 * 1000);
    
    // Send progress update to API
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '');
    await axios.post(`${baseUrl}/api/download/progress?type=download`, {
      id,
      progress: progressData.progress,
      status: progressData.status
    }).catch(err => {
      // Suppress errors from progress updates
      console.warn('Error sending progress update:', err.message);
    });
    
    return progressData;
  } catch (error) {
    console.error('Error updating progress:', error);
    return { progress: 0, status: 'error' };
  }
};

// Helper function to extract post info from URL
const extractPostInfo = (url) => {
  if (url.includes('/reel/') || url.includes('/reels/')) {
    const match = url.match(/\/(?:reel|reels)\/([^/?]+)/);
    return match ? { id: match[1], type: 'reel' } : null;
  } else if (url.includes('/p/')) {
    const match = url.match(/\/p\/([^/?]+)/);
    return match ? { id: match[1], type: 'post' } : null;
  } else if (url.includes('/stories/')) {
    const match = url.match(/\/stories\/([^/?]+)/);
    return match ? { id: match[1], type: 'story' } : null;
  }
  return null;
};

// Helper to delete a folder and its contents
const deleteFolder = async (folderPath) => {
  if (!folderPath) return;
  
  try {
    // Check if folder exists
    await access(folderPath).catch(() => {
      // Folder doesn't exist, nothing to delete
      return null;
    });
    
    const files = await readdir(folderPath);
    
    for (const file of files) {
      await unlink(join(folderPath, file));
    }
    
    await rmdir(folderPath);
  } catch (error) {
    console.error('Error deleting folder:', error);
  }
};

// Helper to create a temporary folder
const createTempFolder = async () => {
  // Get the base temp directory from our utility function
  const baseTemp = await initializeTempDirectory();
  
  // If the base temp dir couldn't be created, fall back to system temp
  const baseTempPath = baseTemp || tmpdir();
  
  // Create a unique subfolder for this download
  const uniqueFolderName = `instagram_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const folderPath = join(baseTempPath, uniqueFolderName);
  
  try {
    await mkdir(folderPath, { recursive: true });
    return folderPath;
  } catch (error) {
    console.error('Error creating temp folder:', error);
    
    // Fall back to system temp directory
    const systemTempFolder = join(tmpdir(), uniqueFolderName);
    await mkdir(systemTempFolder, { recursive: true });
    return systemTempFolder;
  }
};

// Add stealth plugin to puppeteer (helps avoid detection)
puppeteer.use(StealthPlugin());

// Configure API to handle larger files
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  // Support both GET and POST requests
  const { url } = req.method === 'POST' ? req.body : req.query;
  if (!url) {
    return res.status(400).json({ message: 'Instagram URL is required' });
  }

  // Add requestId for tracking
  const requestId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  console.log(`[${requestId}] Processing Instagram URL: ${url}`);

  // Check for concurrent requests to the same URL
  if (isDownloadActive(url)) {
    const activeInfo = activeDownloads.get(url);
    const elapsedTime = Date.now() - activeInfo.timestamp;
    
    console.log(`[${requestId}] Download already in progress for ${url} (ID: ${activeInfo.id}, elapsed: ${elapsedTime}ms)`);
    
    // If it's a recent request (< 30 seconds), return the existing ID
    if (elapsedTime < 30000) {
      return res.status(202).json({ 
        message: 'Download already in progress', 
        downloadId: activeInfo.id 
      });
    } else {
      // If it's an older request, the previous one might be stuck
      console.log(`[${requestId}] Previous download appears stuck, removing lock and proceeding`);
      markDownloadComplete(url);
    }
  }

  // Generate download ID and mark as active
  const downloadId = uuidv4();
  setDownloadActive(url, downloadId);
  console.log(`[${requestId}] Starting new download (ID: ${downloadId})`);
  
  let browser;
  let tempFilePath = null;
  let tempFolderPath = null;
  
  // Set initial response headers
  // This ensures that the X-Download-ID is sent to client even if there's an error later
  res.setHeader('X-Download-ID', downloadId);
  
  try {
    // Create temp directory if it doesn't exist
    tempFolderPath = await createTempFolder();
    
    // Initialize progress
    await updateProgress(downloadId, 0, 'started');
    
    // Extract post type to apply different strategies
    const postInfo = extractPostInfo(url);
    if (!postInfo) {
      throw new Error('Invalid Instagram URL format');
    }
    
    console.log(`[${requestId}] Processing Instagram ${postInfo.type} URL:`, url);
    
    // Update progress to 10%
    await updateProgress(downloadId, 10, 'initializing');
    
    // Launch browser with extended options for better reliability
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set multiple user agents to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    // Set extra headers to mimic a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br'
    });

    // For reels, we need to be especially careful with resource blocking
    const isReel = postInfo.type === 'reel' || postInfo.type === 'tv';
    
    if (!isReel) {
      // Block unnecessary resources to speed up loading for regular posts
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (resourceType === 'image' || resourceType === 'font' || resourceType === 'stylesheet') {
          req.abort();
        } else {
          req.continue();
        }
      });
    }

    await updateProgress(downloadId, 20, 'accessing');
    
    // Navigate to Instagram post
    await page.goto(url, { 
      waitUntil: isReel ? 'networkidle2' : 'domcontentloaded',
      timeout: 60000
    });

    // Wait for content to load
    try {
      await page.waitForSelector('body', { timeout: 30000 });
      
      // For reels, wait a bit longer to ensure video loads
      if (isReel) {
        await page.waitForTimeout(2000);
        await page.waitForSelector('video', { timeout: 10000 }).catch(() => {
          console.log('No video element found, but continuing');
        });
      }
    } catch (e) {
      console.log('Timed out waiting for content, but continuing anyway');
    }

    await updateProgress(downloadId, 30, 'extracting');
    
    // Enhanced media extraction with special handling for reels
    let mediaInfo = null;
    
    if (isReel) {
      console.log(`[${requestId}] Handling content as a REEL - special extraction logic applied`);
      
      // For reels, we need to wait longer to ensure the video loads
      await page.waitForTimeout(3000);
      
      // Force content type to video for reels
      const forcedVideoType = 'video';
      
      // Special handling for reels
      mediaInfo = await page.evaluate(() => {
        // First look for video elements
        const videoElement = document.querySelector('video');
        if (videoElement && videoElement.src) {
          console.log('Found video element with src:', videoElement.src.substring(0, 50) + '...');
          return { url: videoElement.src, type: 'video' };
        }
        
        // Try to find video source elements
        const videoSource = document.querySelector('video source');
        if (videoSource && videoSource.src) {
          console.log('Found video source with src:', videoSource.src.substring(0, 50) + '...');
          return { url: videoSource.src, type: 'video' };
        }
        
        // Look for media in meta tags
        const metaVideo = document.querySelector('meta[property="og:video"]') || 
                          document.querySelector('meta[property="og:video:url"]');
        if (metaVideo && metaVideo.content) {
          return { url: metaVideo.content, type: 'video' };
        }
        
        // Look for video URLs in any script tags
        const scripts = Array.from(document.querySelectorAll('script:not([src])'));
        let videoUrl = null;
        
        scripts.forEach(script => {
          const content = script.textContent;
          if (content) {
            // Look for video URLs in script content
            const mp4Match = content.match(/"video_url":"([^"]+)"/);
            if (mp4Match && mp4Match[1]) {
              videoUrl = mp4Match[1].replace(/\\u0026/g, '&');
            }
          }
        });
        
        if (videoUrl) {
          return { url: videoUrl, type: 'video' };
        }
        
        return null;
      });
      
      // If we still don't have media, try taking a screenshot and analyzing the page
      if (!mediaInfo || !mediaInfo.url) {
        // Take a debug screenshot
        await page.screenshot({ path: join(tempFolderPath, 'reel_debug.png'), fullPage: true });
        
        // Try the Instagram API approach one more time
        try {
          // Get the post ID
          const postId = url.match(/\/reel\/([^/?#]+)/i)[1];
          
          // Navigate to the Instagram graphql API
          await page.goto(`https://www.instagram.com/graphql/query/?query_hash=b3055c01b4b222b8a47dc12b090e4e64&variables={"shortcode":"${postId}"}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });
          
          // Get page content
          const apiContent = await page.content();
          await fs.writeFile(join(tempFolderPath, 'api_response.json'), apiContent);
          
          // Try to extract JSON
          const jsonMatch = apiContent.match(/<pre[^>]*>(.*?)<\/pre>/s);
          if (jsonMatch && jsonMatch[1]) {
            try {
              const jsonData = JSON.parse(jsonMatch[1]);
              const videoUrl = jsonData?.data?.shortcode_media?.video_url;
              if (videoUrl) {
                mediaInfo = { url: videoUrl, type: 'video' };
              }
            } catch (jsonError) {
              console.error('Error parsing API JSON:', jsonError);
            }
          }
        } catch (apiError) {
          console.error('Error using API approach:', apiError);
        }
      }
      
      // Force type to video for reels even if we found an image
      if (mediaInfo && mediaInfo.url) {
        mediaInfo.type = forcedVideoType;
        console.log(`[${requestId}] Forcing content type to VIDEO for reel`);
      }
    } else {
      // Regular post extraction logic
      mediaInfo = await page.evaluate(() => {
        // For videos
        const videoElement = document.querySelector('video source');
        if (videoElement && videoElement.src) {
          return { url: videoElement.src, type: 'video' };
        }
        
        // Try for video in meta tags
        const metaVideo = document.querySelector('meta[property="og:video"]');
        if (metaVideo && metaVideo.content) {
          return { url: metaVideo.content, type: 'video' };
        }
        
        // Then try for regular images with high resolution
        const imageElements = document.querySelectorAll('img[srcset]');
        for (const img of Array.from(imageElements)) {
          if (img.srcset && !img.src.includes('profile_pic')) {
            // Get highest resolution from srcset
            const srcset = img.srcset.split(',');
            const lastSrc = srcset[srcset.length - 1].trim().split(' ')[0];
            return { url: lastSrc || img.src, type: 'image' };
          }
        }
        
        // Try for scontent images (Instagram CDN)
        const scontentImages = Array.from(document.querySelectorAll('img[src*="scontent"]'));
        const largeImages = scontentImages.filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > 300 && rect.height > 300;
        });
        
        if (largeImages.length > 0) {
          // Use the largest image by area
          const largestImage = largeImages.sort((a, b) => {
            const areaA = a.width * a.height;
            const areaB = b.width * b.height;
            return areaB - areaA;
          })[0];
          return { url: largestImage.src, type: 'image' };
        }
        
        // Fallback to any image that seems like content (not UI elements)
        const regularImages = document.querySelectorAll('img');
        for (const img of Array.from(regularImages)) {
          if (img.width > 300 && img.height > 300 && !img.src.includes('profile_pic')) {
            return { url: img.src, type: 'image' };
          }
        }

        // Try for og:image as last resort
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage && ogImage.content) {
          return { url: ogImage.content, type: 'image' };
        }
        
        return null;
      });
    }

    if (!mediaInfo || !mediaInfo.url) {
      // Extra attempt to find media in page content before giving up
      // Take a screenshot of the post for examination
      const screenshotPath = join(tempFolderPath, 'debug_screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      // Try to extract content from inline JSON-LD or scripts
      const scriptContent = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]'));
        return scripts.map(script => script.textContent).join('\n');
      });
      
      // Save script content for debugging
      await fs.writeFile(join(tempFolderPath, 'scripts.json'), scriptContent);
      
      throw new Error(`Media not found in Instagram ${postInfo.type}. Instagram might have changed their layout or blocked our access.`);
    }

    // Close browser before download to free resources
    await browser.close();
    browser = null;

    // Create temp file path
    const extension = mediaInfo.type === 'video' ? 'mp4' : 'jpg';
    const tempFileName = `instagram_${postInfo.type}_${Date.now()}.${extension}`;
    tempFilePath = join(tempFolderPath, tempFileName);
    
    // Log detection info for debugging
    console.log(`[${requestId}] Content detected as: ${mediaInfo.type}, post type: ${postInfo.type}`);
    console.log(`[${requestId}] Using extension: ${extension} for output file`);

    // Download media content with robust error handling and retry mechanism
    let downloadAttempts = 0;
    const maxDownloadAttempts = 3;
    let downloadSuccess = false;
    
    while (downloadAttempts < maxDownloadAttempts && !downloadSuccess) {
      downloadAttempts++;
      
      try {
        // Update progress to 40%
        const attemptMessage = downloadAttempts > 1 
          ? `downloading (attempt ${downloadAttempts}/${maxDownloadAttempts})` 
          : 'downloading';
        await updateProgress(downloadId, 40, attemptMessage);
        
        const redactedUrl = mediaInfo.url.substring(0, 30) + '...' + mediaInfo.url.substring(mediaInfo.url.length - 20);
        console.log(`[${requestId}] Downloading media from: ${redactedUrl} (attempt ${downloadAttempts}/${maxDownloadAttempts})`);
        
        // Download media content with optimized settings for reliability
        const mediaResponse = await axios({
          method: 'GET',
          url: mediaInfo.url,
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          timeout: 60000, // 60 second timeout
          maxContentLength: 1000 * 1024 * 1024, // Allow up to 1GB
          maxBodyLength: 1000 * 1024 * 1024, // Allow up to 1GB
          onDownloadProgress: async (progressEvent) => {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 40) + 40;
            await updateProgress(downloadId, Math.min(progress, 85), 'downloading');
          }
        });
        
        // Ensure content is valid
        if (!mediaResponse.data) {
          throw new Error('Empty response received from Instagram');
        }
        
        // Write media to temp file with error handling
        const buffer = Buffer.from(mediaResponse.data, 'binary');
        
        // Detect if the response is HTML instead of media content
        if (buffer.toString().substring(0, 50).includes('<!DOCTYPE html>')) {
          console.error(`[${requestId}] Received HTML response instead of media content`);
          throw new Error('Invalid media content received');
        }
        
        // Check minimum file size to ensure it's actual media (10KB)
        if (buffer.length < 10 * 1024) {
          console.error(`[${requestId}] Response too small to be valid media: ${buffer.length} bytes`);
          throw new Error('Media content too small, likely invalid');
        }
        
        // Create file
        console.log(`[${requestId}] Writing ${buffer.length} bytes to file: ${tempFilePath}`);
        const writeStream = createWriteStream(tempFilePath);
        writeStream.write(buffer);
        writeStream.end(); // Must end the stream to trigger 'finish' event
        await new Promise((resolve, reject) => {
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        });
        
        // Verify file exists and has the correct size
        try {
          await access(tempFilePath);
          const stats = await fs.stat(tempFilePath);
          
          if (!stats.isFile()) {
            throw new Error('Downloaded content is not a file');
          }
          
          if (stats.size !== buffer.length) {
            console.error(`[${requestId}] File size mismatch: Expected ${buffer.length}, got ${stats.size}`);
            throw new Error('File size verification failed');
          }
          
          console.log(`[${requestId}] Download verification successful: ${stats.size} bytes`);
          
          // For video files, perform additional validation
          if (mediaInfo.type === 'video' || isReel) {
            // Wait a moment to ensure file is completely written
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Perform basic header check for MP4 files
            const fileHeader = Buffer.alloc(8);
            const fileHandle = await fs.open(tempFilePath, 'r');
            await fileHandle.read(fileHeader, 0, 8, 0);
            await fileHandle.close();
            
            // Check for valid MP4 header (ftyp)
            if (!fileHeader.includes('ftyp')) {
              console.error(`[${requestId}] Invalid video file header`);
              await updateProgress(downloadId, 40, 'retrying');
              throw new Error('Downloaded video appears corrupted, retrying...');
            }
          }
        } catch (fileError) {
          console.error(`[${requestId}] File access error:`, fileError);
          throw new Error(`Download failed: ${fileError.message}`);
        }
        
        // Update progress to 85%
        await updateProgress(downloadId, 85, 'processing');
        
        // Mark this attempt as successful
        downloadSuccess = true;
        
      } catch (downloadError) {
        console.error(`[${requestId}] Error downloading media content (attempt ${downloadAttempts}/${maxDownloadAttempts}):`, downloadError);
        
        // If we've exhausted all attempts, rethrow the error
        if (downloadAttempts >= maxDownloadAttempts) {
          throw new Error(`Failed to download after ${maxDownloadAttempts} attempts: ${downloadError.message}`);
        }
        
        // Otherwise, wait before retrying
        const retryDelay = downloadAttempts * 2000; // Exponential backoff
        console.log(`[${requestId}] Retrying download in ${retryDelay}ms...`);
        await updateProgress(downloadId, 40, `retry in ${Math.round(retryDelay/1000)}s`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    try {
      await access(tempFilePath);
      const stats = await fs.stat(tempFilePath);
      const fileSize = stats.size;
      
      if (fileSize === 0) {
        throw new Error('Download failed: Empty file');
      }
  
      // Update progress to 90%
      await updateProgress(downloadId, 90, 'finalizing');

      // Check if directStream parameter is specified (default to true for backward compatibility)
      const { directStream = 'true' } = req.query;
      
      // If directStream is explicitly set to 'false', return file info instead
      if (directStream === 'false') {
        // Return file info for client-side download
        console.log(`[${requestId}] Returning file info instead of streaming content`);
        
        // Store the file path in a global object for retrieval by direct-file endpoint
        global.instagramTempFiles = global.instagramTempFiles || {};
        global.instagramTempFiles[downloadId] = {
          path: tempFilePath,
          fileName: tempFileName,
          contentType: isReel || mediaInfo.type === 'video' ? 'video/mp4' : 'image/jpeg',
          fileSize,
          type: isReel || mediaInfo.type === 'video' ? 'video' : 'image',
          createdAt: Date.now()
        };
        
        // Set timeout to clean up references after 5 minutes
        setTimeout(() => {
          if (global.instagramTempFiles && global.instagramTempFiles[downloadId]) {
            delete global.instagramTempFiles[downloadId];
            console.log(`[${requestId}] Removed temp file reference for ${downloadId}`);
          }
        }, 5 * 60 * 1000);
        
        res.status(200).json({
          success: true,
          fileInfo: {
            id: downloadId,
            fileName: tempFileName,
            contentType: isReel || mediaInfo.type === 'video' ? 'video/mp4' : 'image/jpeg',
            fileSize,
            type: isReel || mediaInfo.type === 'video' ? 'video' : 'image'
          }
        });
        
        // Don't clean up the file as it will be downloaded separately
        markDownloadComplete(url);
        return;
      }
      
      // Stream the file directly to the client
      console.log(`[${requestId}] Streaming file to client: ${tempFilePath}`);
      
      // Set appropriate content type
      const contentType = isReel || mediaInfo.type === 'video' ? 'video/mp4' : 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(tempFileName)}"`);
      res.setHeader('Content-Length', fileSize);
      
      // Create read stream
      const fileStream = createReadStream(tempFilePath);
      fileStream.pipe(res);
      
      // Handle stream completion
      fileStream.on('end', () => {
        console.log(`[${requestId}] File stream completed successfully`);
        updateProgress(downloadId, 100, 'completed');
      });
      
      // Handle stream errors
      fileStream.on('error', (err) => {
        console.error(`[${requestId}] Error streaming file:`, err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' });
        }
      });
      
      // Mark download as complete
      markDownloadComplete(url);
      
      // Schedule cleanup after a delay
      setTimeout(async () => {
        try {
          await deleteFolder(tempFolderPath);
          console.log(`[${requestId}] Temp folder cleaned up successfully`);
        } catch (cleanupErr) {
          console.error(`[${requestId}] Error cleaning up temp folder:`, cleanupErr);
        }
      }, 2000);
      
      return;
    } catch (fileError) {
      console.error(`[${requestId}] File access error:`, fileError);
      throw new Error(`Download failed: ${fileError.message}`);
    }
  } catch (error) {
    console.error(`[${requestId}] Instagram Download Error:`, error);
    
    // Update progress to error
    await updateProgress(downloadId, 0, 'error');
    
    // Close browser if it's still open
    if (browser) {
      try {
        await browser.close();
      } catch (browserError) {
        console.error(`[${requestId}] Error closing browser:`, browserError);
      }
    }
    
    // Clean up temp folder if it exists and an error occurred
    if (tempFolderPath && fs.existsSync(tempFolderPath)) {
      try {
        await deleteFolder(tempFolderPath);
      } catch (cleanupError) {
        console.error(`[${requestId}] Error cleaning up temp folder:`, cleanupError);
      }
    }
    
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Error processing Instagram download request',
        error: process.env.NODE_ENV === 'development' ? error.toString() : 'An error occurred during download',
        downloadId
      });
    }
  }
}

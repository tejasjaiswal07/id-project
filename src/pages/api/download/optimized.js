import { createReadStream, existsSync, mkdirSync, statSync, unlink } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import ytDlp from 'yt-dlp-exec';
import ytdl from 'ytdl-core';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';

// Add stealth plugin for better Instagram scraping
puppeteer.use(StealthPlugin());

// Optimized configuration for maximum performance
const OPTIMIZED_CONFIG = {
  // yt-dlp performance settings
  ytdlp: {
    concurrentFragments: 16,        // 2x faster parallel downloads
    fragmentRetries: 10,           // Better reliability
    retries: 3,                    // Smart retries
    bufferSize: '16K',             // Larger buffer
    httpChunkSize: '10M',         // Faster streaming
    noPart: true,                 // Skip partial downloads
    noPlaylist: true,             // Single video only
    preferFreeFormats: true,      // Avoid premium formats
    youtubeSkipDashManifest: true, // Skip unnecessary metadata
    writeInfoJson: false,         // Skip metadata files
    writeDescription: false,       // Skip description files
    writeAnnotations: false,       // Skip annotation files
    writeSubtitles: false,         // Skip subtitles unless requested
    writeAutoSub: false,          // Skip auto-generated subs
    writeThumbnail: false,        // Skip thumbnails
    embedThumbnail: false,        // Don't embed thumbnails
    addMetadata: false,           // Skip metadata embedding
    mergeOutputFormat: 'mp4',    // Force MP4 for compatibility
    noCheckCertificates: true,
    noWarnings: true,
    newline: true,
    progress: true,
    consoleTitle: false,
    noColor: true
  },
  
  // Puppeteer optimization settings
  puppeteer: {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images',           // Skip images for faster loading
      '--memory-pressure-off',
      '--max_old_space_size=4096', // Increase memory limit
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps'
    ],
    defaultViewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    ignoreDefaultArgs: ['--enable-automation'],
    timeout: 30000
  },

  // Retry configuration with exponential backoff
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    jitter: true,
    retryableErrors: [
      'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED',
      'ETIMEDOUT', 'ENETUNREACH', '429', '503', '502'
    ]
  }
};

// Download lock system to prevent multiple downloads of the same URL
const downloadLocks = new Map();
const LOCK_TIMEOUT = 30000; // 30 seconds

// Browser pool for Instagram scraping
class BrowserPool {
  constructor(maxInstances = 3) {
    this.maxInstances = maxInstances;
    this.browsers = [];
    this.available = [];
    this.busy = new Set();
  }

  async getBrowser() {
    // Return available browser if any
    if (this.available.length > 0) {
      const browser = this.available.pop();
      this.busy.add(browser);
      return browser;
    }

    // Create new browser if under limit
    if (this.browsers.length < this.maxInstances) {
      const browser = await puppeteer.launch(OPTIMIZED_CONFIG.puppeteer);
      this.browsers.push(browser);
      this.busy.add(browser);
      return browser;
    }

    // Wait for browser to become available
    return new Promise((resolve) => {
      const checkAvailable = () => {
        if (this.available.length > 0) {
          const browser = this.available.pop();
          this.busy.add(browser);
          resolve(browser);
        } else {
          setTimeout(checkAvailable, 100);
        }
      };
      checkAvailable();
    });
  }

  releaseBrowser(browser) {
    this.busy.delete(browser);
    this.available.push(browser);
  }

  async closeAll() {
    await Promise.all(this.browsers.map(browser => browser.close()));
    this.browsers = [];
    this.available = [];
    this.busy.clear();
  }
}

// Global browser pool instance
const browserPool = new BrowserPool();

// Enhanced error handling with retry logic
async function withRetry(fn, context = 'operation') {
  let lastError;
  
  for (let attempt = 0; attempt <= OPTIMIZED_CONFIG.retry.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = OPTIMIZED_CONFIG.retry.retryableErrors.some(
        retryableError => error.message.includes(retryableError) || 
                         error.code === retryableError ||
                         error.status === retryableError
      );

      if (!isRetryable || attempt === OPTIMIZED_CONFIG.retry.maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = OPTIMIZED_CONFIG.retry.baseDelay;
      const maxDelay = OPTIMIZED_CONFIG.retry.maxDelay;
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );
      
      const jitter = OPTIMIZED_CONFIG.retry.jitter ? 
        Math.random() * 0.1 * delay : 0;
      
      const totalDelay = delay + jitter;
      
      console.log(`${context} failed (attempt ${attempt + 1}/${OPTIMIZED_CONFIG.retry.maxRetries + 1}), retrying in ${Math.round(totalDelay)}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  throw lastError;
}

// COMMENTED OUT - YouTube download functionality is temporarily disabled
/*
// Optimized YouTube download
async function downloadYouTube(url, format, quality) {
  return withRetry(async () => {
    const tempDir = join(process.cwd(), 'temp', 'downloads');
    await mkdirSync(tempDir, { recursive: true });
    
    const tempFile = join(tempDir, `${uuidv4()}.${format}`);
    
    // Try ytdl-core first for speed
    try {
      if (format !== 'mp3') {
        const info = await ytdl.getInfo(url);
        const videoTitle = info.videoDetails.title.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '-');
        
        const qualityMap = {
          '144p': 'lowest',
          '240p': '240p', 
          '360p': '360p',
          '480p': '480p',
          '720p': '720p',
          '1080p': '1080p',
          '1440p': '1440p',
          '2160p': '2160p',
        };
        
        const videoQuality = qualityMap[quality] || '720p';
        const options = {
          quality: videoQuality,
          filter: 'videoandaudio',
        };
        
        const stream = ytdl(url, options);
        const writeStream = require('fs').createWriteStream(tempFile);
        
        return new Promise((resolve, reject) => {
          stream.pipe(writeStream);
          writeStream.on('finish', () => resolve({ file: tempFile, title: videoTitle }));
          stream.on('error', reject);
          writeStream.on('error', reject);
        });
      }
    } catch (ytdlError) {
      console.log('ytdl-core failed, falling back to yt-dlp:', ytdlError.message);
    }
    
    // Fallback to optimized yt-dlp
    const args = {
      ...OPTIMIZED_CONFIG.ytdlp,
      output: tempFile
    };
    
    if (format === 'mp3') {
      args.extractAudio = true;
      args.audioFormat = 'mp3';
      args.audioQuality = 0;
    } else {
      const formatMap = {
        '144p': 'bestvideo[height<=144]+bestaudio/worst',
        '240p': 'bestvideo[height<=240]+bestaudio/worst[height>144]',
        '360p': 'bestvideo[height<=360]+bestaudio/worst[height>240]',
        '480p': 'bestvideo[height<=480]+bestaudio/worst[height>360]',
        '720p': 'bestvideo[height<=720]+bestaudio/best[height>480]',
        '1080p': 'bestvideo[height<=1080]+bestaudio/best[height>720]',
        '1440p': 'bestvideo[height<=1440]+bestaudio/best[height>1080]',
        '2160p': 'bestvideo[height<=2160]+bestaudio/best[height>1440]',
      };
      
      args.format = formatMap[quality] || 'bestvideo+bestaudio/best';
    }
    
    await ytDlp(url, args);
    return { file: tempFile, title: 'YouTube Video' };
  }, 'YouTube download');
}
*/

// Optimized Instagram download with enhanced media extraction
async function downloadInstagram(url) {
  return withRetry(async () => {
    const browser = await browserPool.getBrowser();
    
    try {
      const page = await browser.newPage();
      
      // Enhanced page configuration for better Instagram scraping
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      });
      
      // Block unnecessary resources for faster loading
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        const url = req.url();
        
        // Block ads, analytics, and unnecessary resources
        if (['image', 'font', 'stylesheet', 'media'].includes(resourceType) ||
            url.includes('facebook.com') ||
            url.includes('doubleclick.net') ||
            url.includes('googlesyndication.com') ||
            url.includes('analytics')) {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      console.log(`Navigating to Instagram URL: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 45000 
      });
      
      // Wait for content to load
      await page.waitForTimeout(3000);
      
      // Enhanced media extraction with multiple fallback methods
      const mediaInfo = await page.evaluate(() => {
        console.log('Extracting media from Instagram page...');
        
        // Method 1: Direct video element
        const videoElement = document.querySelector('video');
        if (videoElement && videoElement.src) {
          console.log('Found video element with src:', videoElement.src.substring(0, 50));
          return { url: videoElement.src, type: 'video' };
        }
        
        // Method 2: Video source element
        const videoSource = document.querySelector('video source');
        if (videoSource && videoSource.src) {
          console.log('Found video source with src:', videoSource.src.substring(0, 50));
          return { url: videoSource.src, type: 'video' };
        }
        
        // Method 3: Meta tags
        const metaVideo = document.querySelector('meta[property="og:video"]') || 
                         document.querySelector('meta[property="og:video:url"]');
        if (metaVideo && metaVideo.content) {
          console.log('Found meta video:', metaVideo.content.substring(0, 50));
          return { url: metaVideo.content, type: 'video' };
        }
        
        // Method 4: Meta image (for posts)
        const metaImage = document.querySelector('meta[property="og:image"]');
        if (metaImage && metaImage.content) {
          console.log('Found meta image:', metaImage.content.substring(0, 50));
          return { url: metaImage.content, type: 'image' };
        }
        
        // Method 5: Look in script tags for JSON data
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent);
            if (data.videoObject && data.videoObject.contentUrl) {
              console.log('Found video in JSON-LD:', data.videoObject.contentUrl.substring(0, 50));
              return { url: data.videoObject.contentUrl, type: 'video' };
            }
            if (data.image && data.image.url) {
              console.log('Found image in JSON-LD:', data.image.url.substring(0, 50));
              return { url: data.image.url, type: 'image' };
            }
          } catch (e) {
            // Continue to next script
          }
        }
        
        // Method 6: Look for video URLs in any script content
        const allScripts = Array.from(document.querySelectorAll('script:not([src])'));
        for (const script of allScripts) {
          const content = script.textContent;
          if (content) {
            // Look for video URLs in script content
            const videoUrlMatch = content.match(/"video_url":"([^"]+)"/);
            if (videoUrlMatch && videoUrlMatch[1]) {
              const videoUrl = videoUrlMatch[1].replace(/\\u0026/g, '&');
              console.log('Found video URL in script:', videoUrl.substring(0, 50));
              return { url: videoUrl, type: 'video' };
            }
            
            // Look for image URLs
            const imageUrlMatch = content.match(/"display_url":"([^"]+)"/);
            if (imageUrlMatch && imageUrlMatch[1]) {
              const imageUrl = imageUrlMatch[1].replace(/\\u0026/g, '&');
              console.log('Found image URL in script:', imageUrl.substring(0, 50));
              return { url: imageUrl, type: 'image' };
            }
          }
        }
        
        console.log('No media found with any method');
        return null;
      });
      
      await page.close();
      
      if (!mediaInfo) {
        throw new Error('Could not extract media URL from Instagram post. The post might be private or the URL might be invalid.');
      }
      
      console.log(`Extracted media: ${mediaInfo.type} - ${mediaInfo.url.substring(0, 100)}...`);
      
      // Download the media with enhanced headers
      const response = await axios({
        method: 'GET',
        url: mediaInfo.url,
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.instagram.com/',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // Validate response
      if (!response.data || response.data.length === 0) {
        throw new Error('Downloaded media is empty');
      }
      
      if (response.data.length < 1000) {
        throw new Error('Downloaded media is too small, might be an error page');
      }
      
      const tempDir = join(process.cwd(), 'temp', 'downloads');
      await mkdirSync(tempDir, { recursive: true });
      
      const extension = mediaInfo.type === 'video' ? 'mp4' : 'jpg';
      const tempFile = join(tempDir, `${uuidv4()}.${extension}`);
      
      require('fs').writeFileSync(tempFile, response.data);
      
      console.log(`Downloaded ${mediaInfo.type} (${response.data.length} bytes) to ${tempFile}`);
      
      return { file: tempFile, type: mediaInfo.type };
      
    } finally {
      browserPool.releaseBrowser(browser);
    }
  }, 'Instagram download');
}

// Main optimized download handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url, format = 'mp4', quality = '720p', platform } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  let tempFile = null;
  let fileName = 'download';

  try {
    // Check if this URL is already being downloaded
    const urlHash = require('crypto').createHash('md5').update(url).digest('hex');
    
    if (downloadLocks.has(urlHash)) {
      const lockTime = downloadLocks.get(urlHash);
      const timeSinceLock = Date.now() - lockTime;
      
      if (timeSinceLock < LOCK_TIMEOUT) {
        console.log(`Download already in progress for ${url}, waiting...`);
        return res.status(429).json({ 
          message: 'Download already in progress for this URL',
          retryAfter: Math.ceil((LOCK_TIMEOUT - timeSinceLock) / 1000)
        });
      } else {
        // Remove stale lock
        downloadLocks.delete(urlHash);
      }
    }
    
    // Set download lock
    downloadLocks.set(urlHash, Date.now());
    
    // Auto-remove lock after timeout
    setTimeout(() => {
      if (downloadLocks.has(urlHash)) {
        downloadLocks.delete(urlHash);
      }
    }, LOCK_TIMEOUT);
    
    console.log(`Starting optimized download for ${url}`);
    const startTime = Date.now();

    let result;
    if (platform === 'instagram' || url.includes('instagram.com')) {
      result = await downloadInstagram(url);
      fileName = `instagram_${result.type}`;
    } else {
      // YouTube download functionality is temporarily disabled
      throw new Error('YouTube download functionality is currently disabled. Please use Instagram downloader instead.');
      
      /* COMMENTED OUT - YouTube Download Functionality
      result = await downloadYouTube(url, format, quality);
      fileName = result.title || 'youtube_video';
      */
    }

    tempFile = result.file;

    // Check if file exists and has content
    if (!existsSync(tempFile)) {
      throw new Error('Downloaded file not found');
    }

    const stats = statSync(tempFile);
    if (stats.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    const downloadTime = Date.now() - startTime;
    console.log(`Download completed in ${downloadTime}ms`);

    // Set appropriate headers
    const extension = format === 'mp3' ? 'mp3' : (result.type === 'video' ? 'mp4' : 'jpg');
    const finalFileName = `${fileName}.${extension}`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFileName)}"`);
    res.setHeader('Content-Type', 
      format === 'mp3' ? 'audio/mpeg' : 
      result.type === 'video' ? 'video/mp4' : 'image/jpeg'
    );
    res.setHeader('Content-Length', stats.size);
    res.setHeader('X-Download-Time', downloadTime);
    
    // Stream the file to the client
    const fileStream = createReadStream(tempFile);
    await pipeline(fileStream, res);
    
  } catch (error) {
    console.error('Optimized download error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Download failed',
        error: error.message 
      });
    }
  } finally {
    // Clean up download lock
    const urlHash = require('crypto').createHash('md5').update(url).digest('hex');
    downloadLocks.delete(urlHash);
    
    // Clean up temp file
    if (tempFile && existsSync(tempFile)) {
      unlink(tempFile, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }
  }
}

// Configure API for large files
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1kb',
    },
    responseLimit: false,
  },
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down browser pool...');
  await browserPool.closeAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down browser pool...');
  await browserPool.closeAll();
  process.exit(0);
});

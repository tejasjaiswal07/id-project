import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';

// Add stealth plugin for better scraping
puppeteer.use(StealthPlugin());

// Browser pool for Instagram info extraction
class InfoBrowserPool {
  constructor(maxInstances = 2) {
    this.maxInstances = maxInstances;
    this.browsers = [];
    this.available = [];
    this.busy = new Set();
  }

  async getBrowser() {
    if (this.available.length > 0) {
      const browser = this.available.pop();
      this.busy.add(browser);
      return browser;
    }

    if (this.browsers.length < this.maxInstances) {
      const browser = await puppeteer.launch({
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
          '--memory-pressure-off',
          '--max_old_space_size=2048',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps'
        ],
        defaultViewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        ignoreDefaultArgs: ['--enable-automation'],
        timeout: 30000
      });
      this.browsers.push(browser);
      this.busy.add(browser);
      return browser;
    }

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

const infoBrowserPool = new InfoBrowserPool();

// Enhanced Instagram info extraction
async function getInstagramInfo(url) {
  const browser = await infoBrowserPool.getBrowser();
  
  try {
    const page = await browser.newPage();
    
    // Enhanced configuration
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    });
    
    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      const requestUrl = req.url();
      
      if (['image', 'font', 'stylesheet', 'media'].includes(resourceType) ||
          requestUrl.includes('facebook.com') ||
          requestUrl.includes('doubleclick.net') ||
          requestUrl.includes('googlesyndication.com') ||
          requestUrl.includes('analytics')) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    console.log(`Extracting info from: ${url}`);
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 45000 
    });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Extract comprehensive media information
    const mediaInfo = await page.evaluate(() => {
      const getMetaContent = (property) => {
        const meta = document.querySelector(`meta[property="${property}"]`) || 
                    document.querySelector(`meta[name="${property}"]`);
        return meta ? meta.content : null;
      };
      
      // Determine content type
      const isVideo = !!document.querySelector('video') || 
                     getMetaContent('og:video') !== null ||
                     getMetaContent('og:video:url') !== null;
      
      // Get title and description
      const title = getMetaContent('og:title') || 
                   document.querySelector('title')?.textContent || 
                   'Instagram Post';
      
      const description = getMetaContent('og:description') || '';
      
      // Get author information
      const authorElement = document.querySelector('a[href*="/"][role="link"]') ||
                           document.querySelector('h2') ||
                           document.querySelector('[data-testid="user-name"]');
      const authorName = authorElement ? authorElement.textContent.trim() : 'Instagram User';
      
      // Get thumbnail/image
      let thumbnail = getMetaContent('og:image');
      
      // Try to get higher quality thumbnail
      if (thumbnail) {
        // Instagram often provides lower quality thumbnails in og:image
        // Try to find higher quality versions
        const highQualityMatch = thumbnail.match(/^(.*)_n\.jpg$/);
        if (highQualityMatch) {
          thumbnail = highQualityMatch[1] + '.jpg'; // Remove _n suffix for higher quality
        }
      }
      
      // Get video URL if it's a video
      let videoUrl = null;
      if (isVideo) {
        const videoElement = document.querySelector('video');
        if (videoElement && videoElement.src) {
          videoUrl = videoElement.src;
        } else {
          videoUrl = getMetaContent('og:video') || getMetaContent('og:video:url');
        }
      }
      
      // Get image URL if it's an image
      let imageUrl = null;
      if (!isVideo) {
        imageUrl = getMetaContent('og:image');
      }
      
      // Try to extract from script tags for higher quality
      const scripts = Array.from(document.querySelectorAll('script:not([src])'));
      for (const script of scripts) {
        const content = script.textContent;
        if (content) {
          // Look for higher quality image URLs
          const imageMatch = content.match(/"display_url":"([^"]+)"/);
          if (imageMatch && imageMatch[1]) {
            const highQualityImage = imageMatch[1].replace(/\\u0026/g, '&');
            if (!isVideo) {
              imageUrl = highQualityImage;
              thumbnail = highQualityImage;
            }
          }
          
          // Look for video URLs
          const videoMatch = content.match(/"video_url":"([^"]+)"/);
          if (videoMatch && videoMatch[1]) {
            const highQualityVideo = videoMatch[1].replace(/\\u0026/g, '&');
            if (isVideo) {
              videoUrl = highQualityVideo;
            }
          }
        }
      }
      
      return {
        type: isVideo ? 'video' : 'image',
        title: title,
        description: description,
        authorName: authorName,
        thumbnail: thumbnail,
        mediaUrl: isVideo ? videoUrl : imageUrl,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
    });
    
    await page.close();
    
    return mediaInfo;
    
  } finally {
    infoBrowserPool.releaseBrowser(browser);
  }
}

// Enhanced YouTube info extraction
async function getYouTubeInfo(url) {
  try {
    // Use yt-dlp to get video information
    const ytDlp = require('yt-dlp-exec');
    
    const info = await ytDlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      skipDownload: true
    });
    
    return {
      type: 'video',
      title: info.title || 'YouTube Video',
      description: info.description || '',
      authorName: info.uploader || info.channel || 'YouTube Channel',
      thumbnail: info.thumbnail || `https://img.youtube.com/vi/${info.id}/maxresdefault.jpg`,
      mediaUrl: url,
      duration: info.duration,
      viewCount: info.view_count,
      uploadDate: info.upload_date,
      url: url,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('YouTube info extraction failed:', error);
    
    // Fallback to basic extraction
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    
    if (videoId) {
      return {
        type: 'video',
        title: 'YouTube Video',
        description: '',
        authorName: 'YouTube Channel',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        mediaUrl: url,
        url: url,
        timestamp: new Date().toISOString()
      };
    }
    
    throw new Error('Invalid YouTube URL');
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url, platform } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    let mediaInfo;
    
    if (platform === 'instagram' || url.includes('instagram.com')) {
      mediaInfo = await getInstagramInfo(url);
    } else if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      mediaInfo = await getYouTubeInfo(url);
    } else {
      return res.status(400).json({ message: 'Unsupported platform' });
    }

    // Validate that we got useful information
    if (!mediaInfo || !mediaInfo.title) {
      throw new Error('Could not extract media information');
    }

    return res.status(200).json({
      success: true,
      data: mediaInfo
    });

  } catch (error) {
    console.error('Enhanced info extraction error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to extract media information',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down info browser pool...');
  await infoBrowserPool.closeAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down info browser pool...');
  await infoBrowserPool.closeAll();
  process.exit(0);
});

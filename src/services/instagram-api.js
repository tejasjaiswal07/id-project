import axios from 'axios';

// Import puppeteer only on the server side
let puppeteer = null;
let StealthPlugin = null;

// We'll use this flag to determine if we're running on the server
const isServer = typeof window === 'undefined';

if (isServer) {
  // Dynamic import for server-side only
  try {
    puppeteer = require('puppeteer-extra');
    StealthPlugin = require('puppeteer-extra-plugin-stealth');
    // Add stealth plugin to puppeteer (helps avoid detection)
    puppeteer.use(StealthPlugin());
  } catch (error) {
    console.error('Error importing puppeteer in server environment:', error);
  }
}

/**
 * Extract Instagram post ID from URL
 * @param {string} url - Instagram post URL
 * @returns {Object|null} Post type and ID or null if invalid
 */
export const extractPostInfo = (url) => {
  // Support various Instagram URL formats
  const patterns = {
    post: /instagram\.com\/p\/([^/?]+)/i,
    reel: /instagram\.com\/reel\/([^/?]+)/i,
    story: /instagram\.com\/stories\/([^/?]+)\/([^/?]+)/i,
    tv: /instagram\.com\/tv\/([^/?]+)/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    const match = url.match(pattern);
    if (match) {
      return {
        type,
        id: type === 'story' ? { username: match[1], storyId: match[2] } : match[1]
      };
    }
  }

  return null;
};

/**
 * Fetch media information using headless browser (Puppeteer)
 * This function should only be called from a server-side environment (API route)
 * @param {string} url - Instagram post URL
 * @returns {Promise<Object>} Media information
 */
export const getMediaInfo = async (url) => {
  // Check if running on client-side
  if (!isServer) {
    throw new Error('This function can only be used on the server side. Please use the API route instead.');
  }

  let browser;
  try {
    if (!puppeteer) {
      throw new Error('Puppeteer is not available in this environment.');
    }

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const page = await browser.newPage();
    
    // Set a more common user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    // Block unnecessary resources to speed up loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'font' || resourceType === 'stylesheet') {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    // Navigate to Instagram post with longer timeout and wait until DOM is ready
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for a common element to ensure page is loaded
    await page.waitForSelector('body', { timeout: 30000 });
    
    // Extract media information using multiple methods
    const mediaInfo = await page.evaluate(() => {
      // Try to extract from meta tags first
      const getMetaContent = (property) => {
        const meta = document.querySelector(`meta[property="${property}"]`) || 
                    document.querySelector(`meta[name="${property}"]`);
        return meta ? meta.content : null;
      };
      
      // Determine if this is a video
      const isVideo = !!document.querySelector('video') || 
                       getMetaContent('og:video') !== null;
      
      // Try to get the direct media URL
      let mediaUrl = null;
      
      // Method 1: From video element
      const videoElement = document.querySelector('video source');
      if (videoElement && videoElement.src) {
        mediaUrl = videoElement.src;
      }
      
      // Method 2: From meta tags
      if (!mediaUrl) {
        mediaUrl = isVideo ? getMetaContent('og:video') : getMetaContent('og:image');
      }
      
      // Method 3: From images with size filter
      if (!mediaUrl && !isVideo) {
        const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]'));
        const largeImages = imgs.filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > 300 && rect.height > 300;
        });
        
        if (largeImages.length > 0) {
          // Use the largest image by area
          mediaUrl = largeImages.sort((a, b) => {
            const areaA = a.width * a.height;
            const areaB = b.width * b.height;
            return areaB - areaA;
          })[0].src;
        }
      }
      
      // Fallback: try to get any large image
      if (!mediaUrl) {
        const allImages = Array.from(document.querySelectorAll('img'));
        const largeImages = allImages.filter(img => {
          const rect = img.getBoundingClientRect();
          return rect.width > 150 && rect.height > 150 && 
                 !img.src.includes('profile') && 
                 !img.src.includes('icon');
        });
        
        if (largeImages.length > 0) {
          mediaUrl = largeImages[0].src;
        }
      }
      
      // Construct basic info
      const authorElement = document.querySelector('a[href*="/"][role="link"]');
      const authorName = authorElement ? authorElement.textContent.trim() : 'Instagram User';
      
      return {
        type: isVideo ? 'video' : 'image',
        url: mediaUrl || window.location.href,
        title: getMetaContent('og:title') || `${authorName} on Instagram`,
        description: getMetaContent('og:description') || '',
        thumbnail: getMetaContent('og:image'),
        authorName
      };
    });

    await browser.close();
    return mediaInfo;
  } catch (error) {
    console.error('Error fetching Instagram media info:', error);
    if (browser) await browser.close();
    throw error;
  }
};

/**
 * Download media from Instagram
 * @param {string} mediaUrl - URL of the media to download
 * @returns {Promise<Object>} Media content and type
 */
export const downloadMedia = async (mediaUrl) => {
  try {
    // Set a proper user agent to avoid blocks
    const response = await axios({
      method: 'GET',
      url: mediaUrl,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
        'Referer': 'https://www.instagram.com/'
      }
    });

    const contentType = response.headers['content-type'];
    const isVideo = contentType.includes('video');

    return {
      data: response.data,
      type: isVideo ? 'video' : 'image',
      contentType
    };
  } catch (error) {
    console.error('Error downloading Instagram media:', error);
    throw error;
  }
};

/**
 * Generate thumbnail URL from Instagram post ID
 * @param {string} postId - Instagram post ID
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (postId) => {
  // Try to construct a probable thumbnail URL
  return `https://www.instagram.com/p/${postId}/media/?size=l`;
};

export default {
  extractPostInfo,
  getMediaInfo,
  downloadMedia,
  getThumbnailUrl
};

// Server-side only imports
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin
puppeteer.use(StealthPlugin());

export default async function handler(req, res) {
  // Support GET for easier testing/debugging
  const { url } = req.method === 'POST' ? req.body : req.query;
  
  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  let browser;
  try {
    // Validate Instagram URL
    const urlPattern = /instagram\.com\/(p|reel|stories|tv)\/([^/?]+)/;
    const match = url.match(urlPattern);
    if (!match) {
      return res.status(400).json({ message: 'Invalid Instagram URL' });
    }

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
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
    
    // Navigate to Instagram post with longer timeout
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for content to load
    await page.waitForSelector('body', { timeout: 30000 });

    // Extract media information
    const mediaInfo = await page.evaluate(() => {
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
    return res.status(200).json(mediaInfo);
  } catch (error) {
    console.error('Instagram Scraping Error:', error);
    if (browser) await browser.close();
    return res.status(500).json({ 
      message: 'Error fetching Instagram content',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

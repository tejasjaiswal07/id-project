import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { join } from 'path';
import fs from 'fs/promises';
import { mkdir } from 'fs/promises';
import { createReadStream, existsSync, statSync } from 'fs';

// Add stealth plugin to puppeteer
puppeteer.use(StealthPlugin());

// Configure API to optimize for thumbnails
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

// Create temp directory path
const TEMP_DIR = join(process.cwd(), 'temp');

export default async function handler(req, res) {
  const { type, id } = req.query;
  
  if (!type || !id) {
    return res.status(400).json({ message: 'Type and ID are required' });
  }
  
  let browser = null;
  let tempFilePath = null;
  
  try {
    // Create temp directory if it doesn't exist
    try {
      await mkdir(TEMP_DIR, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('Error creating temp directory:', err);
      }
    }
    
    // Define the URL based on content type
    let url;
    if (type === 'reel') {
      url = `https://www.instagram.com/reel/${id}/`;
    } else if (type === 'story') {
      url = `https://www.instagram.com/stories/${id}/`;
    } else if (type === 'post') {
      // For posts, we redirect to the standard media endpoint
      return res.redirect(`https://www.instagram.com/p/${id}/media/?size=l`);
    } else {
      return res.status(400).json({ message: 'Invalid content type' });
    }
    
    // Create a temporary file path for the thumbnail
    tempFilePath = join(TEMP_DIR, `instagram_thumbnail_${type}_${id}.jpg`);
    
    // Check if we already have a cached thumbnail
    if (existsSync(tempFilePath)) {
      const stats = statSync(tempFilePath);
      // If thumbnail is less than 1 hour old, serve it
      if (Date.now() - stats.mtimeMs < 3600000) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return createReadStream(tempFilePath).pipe(res);
      }
    }
    
    // Launch browser with stealth mode
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
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    // Navigate to the Instagram content
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait for content to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Wait a bit more for images/videos to load
    await page.waitForTimeout(1000);
    
    // Try to find the thumbnail
    let thumbnailFound = false;
    
    // For reels, we want to take a screenshot of the video poster
    if (type === 'reel') {
      try {
        // Try to find the video element or poster
        const videoElement = await page.$('video');
        if (videoElement) {
          // Take a screenshot of just the video element
          await videoElement.screenshot({ path: tempFilePath });
          thumbnailFound = true;
        } else {
          // Try to find any image that might be the thumbnail
          const images = await page.$$('img');
          for (const img of images) {
            const src = await img.evaluate(el => el.src);
            const dimensions = await img.boundingBox();
            
            // Look for larger images that are likely to be the main content
            if (src && src.includes('scontent') && dimensions && dimensions.width > 200 && dimensions.height > 200) {
              // Take a screenshot of this image element
              await img.screenshot({ path: tempFilePath });
              thumbnailFound = true;
              break;
            }
          }
        }
      } catch (e) {
        console.error('Error finding video/image element:', e);
      }
    }
    
    // If we couldn't find a specific element to screenshot, take a screenshot of the entire content area
    if (!thumbnailFound) {
      const contentArea = await page.$('main') || await page.$('body');
      if (contentArea) {
        await contentArea.screenshot({ path: tempFilePath });
        thumbnailFound = true;
      } else {
        // Fallback to full page screenshot
        await page.screenshot({ path: tempFilePath, fullPage: false });
        thumbnailFound = true;
      }
    }
    
    // Close the browser
    await browser.close();
    browser = null;
    
    // Check if we successfully saved a thumbnail
    if (thumbnailFound && existsSync(tempFilePath)) {
      // Serve the thumbnail
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return createReadStream(tempFilePath).pipe(res);
    } else {
      // If we failed to get a thumbnail, use a fallback
      return res.redirect('/images/instagram-placeholder.jpg');
    }
  } catch (error) {
    console.error('Error fetching Instagram thumbnail:', error);
    
    // Close browser if it's still open
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error closing browser:', e);
      }
    }
    
    // Return a placeholder image
    return res.redirect('/images/instagram-placeholder.jpg');
  }
}

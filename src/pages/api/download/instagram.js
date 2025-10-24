/**
 * Robust Instagram Downloader - Works on Vercel Hobby
 * Extracts media from Instagram using public data without Puppeteer
 */

import axios from 'axios';
import { existsSync, mkdirSync, statSync, unlink } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const downloadLocks = new Map();
const LOCK_TIMEOUT = 30000; // 30 seconds

/**
 * Extract Instagram media URL from public data
 * Instagram exposes media URLs in the HTML for public posts
 */
async function extractInstagramMediaUrl(url) {
  try {
    console.log(`Extracting media from: ${url}`);

    // Fetch the Instagram page with standard headers
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.instagram.com/',
        'DNT': '1'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const html = response.data;

    // Method 1: Extract from og:video meta tag (for videos/reels)
    const videoMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i);
    if (videoMatch && videoMatch[1]) {
      console.log('✓ Extracted video from og:video meta tag');
      return {
        url: videoMatch[1],
        type: 'video',
        source: 'og:video'
      };
    }

    // Method 2: Extract from og:image meta tag (for images/photos)
    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (imageMatch && imageMatch[1]) {
      console.log('✓ Extracted image from og:image meta tag');
      return {
        url: imageMatch[1],
        type: 'image',
        source: 'og:image'
      };
    }

    // Method 3: Extract from JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/i);
    if (jsonLdMatch && jsonLdMatch[1]) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);

        if (jsonData.videoObject?.contentUrl) {
          console.log('✓ Extracted video from JSON-LD videoObject');
          return {
            url: jsonData.videoObject.contentUrl,
            type: 'video',
            source: 'json-ld-video'
          };
        }

        if (jsonData.image?.url) {
          console.log('✓ Extracted image from JSON-LD image');
          return {
            url: jsonData.image.url,
            type: 'image',
            source: 'json-ld-image'
          };
        }
      } catch (e) {
        console.log('JSON-LD parse error, trying next method');
      }
    }

    // Method 4: Look for video in script tags (Instagram's data-spaconfig)
    const scriptMatch = html.match(/<script[^>]*>([^<]*?"videoObject"[^<]*)<\/script>/i);
    if (scriptMatch && scriptMatch[1]) {
      try {
        const videoUrlMatch = scriptMatch[1].match(/"contentUrl":"([^"]+)"/);
        if (videoUrlMatch && videoUrlMatch[1]) {
          const videoUrl = videoUrlMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
          console.log('✓ Extracted video from script tag');
          return {
            url: videoUrl,
            type: 'video',
            source: 'script-tag'
          };
        }
      } catch (e) {
        console.log('Script tag parse error, trying next method');
      }
    }

    // Method 5: Look for image URLs in script tags
    const imageScriptMatch = html.match(/"display_url":"([^"]+)"/);
    if (imageScriptMatch && imageScriptMatch[1]) {
      const imageUrl = imageScriptMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
      console.log('✓ Extracted image from script tag display_url');
      return {
        url: imageUrl,
        type: 'image',
        source: 'script-display-url'
      };
    }

    throw new Error('Could not extract media URL from Instagram post. The post might be private, deleted, or Instagram\'s page structure has changed.');
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Instagram post not found (404). Check that the URL is correct and public.');
    }
    if (error.response?.status === 403) {
      throw new Error('Access denied (403). The post might be private or restricted.');
    }
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Connection refused. Check your internet connection.');
    }
    throw new Error(`Failed to extract Instagram media: ${error.message}`);
  }
}

/**
 * Download media file from URL
 */
async function downloadMedia(mediaUrl) {
  try {
    console.log(`Downloading media from: ${mediaUrl.substring(0, 100)}...`);

    const response = await axios({
      method: 'GET',
      url: mediaUrl,
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.instagram.com/',
        'Range': 'bytes=0-'
      },
      maxRedirects: 5
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Downloaded file is empty');
    }

    if (response.data.length < 100) {
      throw new Error('Downloaded file is too small - might be an error page');
    }

    console.log(`✓ Downloaded ${response.data.length} bytes`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Media file not found (404). The URL might be expired.');
    }
    throw new Error(`Failed to download media: ${error.message}`);
  }
}

/**
 * Main Instagram download handler
 */
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed. Use POST.' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      message: 'URL is required',
      example: 'https://www.instagram.com/p/ABC123/'
    });
  }

  // Validate Instagram URL
  if (!url.includes('instagram.com')) {
    return res.status(400).json({
      message: 'Only Instagram URLs are supported',
      supported_formats: [
        'https://www.instagram.com/p/POST_ID/',
        'https://www.instagram.com/reel/REEL_ID/',
        'https://www.instagram.com/tv/VIDEO_ID/'
      ]
    });
  }

  let tempFile = null;

  try {
    // Check for concurrent downloads of same URL
    const urlHash = crypto.createHash('md5').update(url).digest('hex');

    if (downloadLocks.has(urlHash)) {
      const lockTime = downloadLocks.get(urlHash);
      const timeSinceLock = Date.now() - lockTime;

      if (timeSinceLock < LOCK_TIMEOUT) {
        return res.status(429).json({
          message: 'This URL is already being downloaded',
          retryAfter: Math.ceil((LOCK_TIMEOUT - timeSinceLock) / 1000),
          suggestion: 'Please wait a moment and try again'
        });
      }
      downloadLocks.delete(urlHash);
    }

    downloadLocks.set(urlHash, Date.now());
    setTimeout(() => downloadLocks.delete(urlHash), LOCK_TIMEOUT);

    console.log(`[Instagram Download] Starting: ${url}`);
    const startTime = Date.now();

    // Step 1: Extract media URL from Instagram page
    const mediaInfo = await extractInstagramMediaUrl(url);
    console.log(`[Instagram Download] Media type: ${mediaInfo.type}, source: ${mediaInfo.source}`);

    // Step 2: Download the media file
    const mediaBuffer = await downloadMedia(mediaInfo.url);

    // Step 3: Save to temp file
    const tempDir = join(process.cwd(), 'temp', 'downloads');
    mkdirSync(tempDir, { recursive: true });

    const extension = mediaInfo.type === 'video' ? 'mp4' : 'jpg';
    tempFile = join(tempDir, `instagram_${uuidv4()}.${extension}`);

    require('fs').writeFileSync(tempFile, mediaBuffer);
    const stats = statSync(tempFile);

    const downloadTime = Date.now() - startTime;
    console.log(`[Instagram Download] Complete: ${stats.size} bytes in ${downloadTime}ms`);

    // Step 4: Send file to client
    const filename = `instagram-${mediaInfo.type}-${Date.now()}.${extension}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', mediaInfo.type === 'video' ? 'video/mp4' : 'image/jpeg');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('X-Download-Time', downloadTime);
    res.setHeader('X-Media-Type', mediaInfo.type);
    res.setHeader('X-Media-Source', mediaInfo.source);

    const fileStream = require('fs').createReadStream(tempFile);
    await pipeline(fileStream, res);

  } catch (error) {
    console.error('[Instagram Download] Error:', error.message);

    if (!res.headersSent) {
      const statusCode = error.message?.includes('not found') ? 404 :
                        error.message?.includes('denied') ? 403 :
                        error.message?.includes('private') ? 403 : 500;

      res.status(statusCode).json({
        success: false,
        message: 'Download failed',
        error: error.message,
        troubleshooting: {
          'Post not found': 'Check that the URL is correct and the post exists',
          'Access denied': 'The post might be private or you need to be logged in',
          'Media not extracted': 'Instagram\'s page structure might have changed - try refreshing',
          'Connection error': 'Check your internet connection and try again'
        }
      });
    }

  } finally {
    // Cleanup
    try {
      const urlHash = crypto.createHash('md5').update(url).digest('hex');
      downloadLocks.delete(urlHash);
    } catch (e) {
      // Ignore
    }

    if (tempFile && existsSync(tempFile)) {
      unlink(tempFile, (err) => {
        if (err) console.error('Cleanup error:', err.message);
      });
    }
  }
}

export default handler;

export const config = {
  api: {
    bodyParser: { sizeLimit: '1kb' },
    responseLimit: false,
  },
  maxDuration: 60, // 60 second timeout for Vercel
};
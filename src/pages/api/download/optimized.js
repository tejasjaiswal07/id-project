import { createReadStream, existsSync, mkdirSync, statSync, unlink } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import ytdl from 'ytdl-core';
import crypto from 'crypto';

// Download lock system to prevent multiple downloads of the same URL
const downloadLocks = new Map();
const LOCK_TIMEOUT = 30000; // 30 seconds

// Simple error message about unavailable features on Vercel Hobby
const UNAVAILABLE_FEATURES = {
  instagram: 'Instagram downloads are not available on the Vercel Hobby plan (requires Puppeteer browser automation).',
  youtube: 'YouTube downloads using yt-dlp are not available on the Vercel Hobby plan (requires system dependencies).'
};

/**
 * Optimized YouTube download using ytdl-core (available on Vercel)
 */
async function downloadYouTube(url, quality = '720p') {
  try {
    const info = await ytdl.getInfo(url);
    const videoTitle = (info.videoDetails?.title || 'YouTube Video')
      .replace(/[^\w\s-]/gi, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);

    const tempDir = join(process.cwd(), 'temp', 'downloads');
    mkdirSync(tempDir, { recursive: true });
    const tempFile = join(tempDir, `${uuidv4()}.mp4`);

    const qualityMap = {
      '144p': '18',  // 360p video
      '240p': '18',
      '360p': '18',
      '480p': '135', // 480p video
      '720p': '22',  // 720p video
      '1080p': '137' // 1080p video (if available)
    };

    const itag = qualityMap[quality] || '22';
    const options = {
      quality: itag,
      filter: 'videoandaudio'
    };

    const stream = ytdl(url, options);
    const writeStream = require('fs').createWriteStream(tempFile);

    return new Promise((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', () => resolve({ file: tempFile, title: videoTitle }));
      stream.on('error', reject);
      writeStream.on('error', reject);
    });
  } catch (error) {
    throw new Error(`YouTube download failed: ${error.message}`);
  }
}

/**
 * Main optimized download handler
 */
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
    const urlHash = crypto.createHash('md5').update(url).digest('hex');

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

    console.log(`Starting download for ${url}`);
    const startTime = Date.now();

    let result;

    // Check platform
    if (platform === 'instagram' || url.includes('instagram.com')) {
      // Instagram downloads not available on Vercel Hobby
      throw new Error(UNAVAILABLE_FEATURES.instagram);
    } else if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
      // Use ytdl-core for YouTube (available on Vercel)
      result = await downloadYouTube(url, format, quality);
      fileName = result.title || 'youtube_video';
    } else {
      return res.status(400).json({
        message: 'Unsupported platform',
        supported: ['youtube'],
        note: 'Instagram downloads require upgrade from Vercel Hobby plan'
      });
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
    console.log(`Download completed in ${downloadTime}ms, size: ${stats.size} bytes`);

    // Set appropriate headers
    const extension = format === 'mp3' ? 'mp3' : 'mp4';
    const finalFileName = `${fileName}.${extension}`;

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFileName)}"`);
    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('X-Download-Time', downloadTime);

    // Stream the file to the client
    const fileStream = createReadStream(tempFile);
    await pipeline(fileStream, res);

  } catch (error) {
    console.error('Download error:', error);

    if (!res.headersSent) {
      const statusCode = error.message?.includes('not available') ? 503 : 500;
      res.status(statusCode).json({
        message: 'Download failed',
        error: error.message,
        hint: platform === 'instagram' ? 'Instagram downloads require upgrading from Vercel Hobby plan' : undefined
      });
    }
  } finally {
    // Clean up download lock
    try {
      const urlHash = crypto.createHash('md5').update(url).digest('hex');
      downloadLocks.delete(urlHash);
    } catch (e) {
      // Ignore errors
    }

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
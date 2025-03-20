import { createReadStream, existsSync, statSync } from 'fs';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { pipeline } from 'stream/promises';
import ytDlp from 'yt-dlp-exec';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import axios from 'axios';

// Create temp directory path
const TEMP_DIR = join(process.cwd(), 'temp');

// Configure API to handle larger files
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

// Helper function to recursively delete a folder
async function deleteFolder(folderPath) {
  try {
    await fs.rm(folderPath, { recursive: true, force: true });
    console.log(`Cleaned up folder: ${folderPath}`);
  } catch (error) {
    console.error(`Error deleting folder ${folderPath}:`, error);
  }
}

// Helper function to update progress
async function updateProgress(downloadId, progress, status = 'processing') {
  try {
    await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/download/progress?type=download`, {
      id: downloadId,
      progress,
      status
    });
  } catch (error) {
    console.error('Error updating progress:', error);
  }
}

export default async function handler(req, res) {
  // Support both GET and POST requests
  const { url, format = 'mp4', quality = '720p' } = req.method === 'POST' ? req.body : req.query;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  let tempFilePath = null;
  let tempFolderPath = null;
  const downloadId = uuidv4();

  try {
    // Create temp directory if it doesn't exist
    try {
      await mkdir(TEMP_DIR, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('Error creating temp directory:', err);
      }
    }

    // Extract video ID for validation
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    if (!videoId) {
      return res.status(400).json({ message: 'Invalid YouTube URL' });
    }

    // Initialize progress
    await updateProgress(downloadId, 0, 'started');

    // Set content type based on format
    const contentType = format === 'mp3' ? 'audio/mpeg' : 'video/mp4';
    const extension = format === 'mp3' ? 'mp3' : 'mp4';
    
    // Generate a temporary folder path with unique ID
    tempFolderPath = join(TEMP_DIR, downloadId);
    await mkdir(tempFolderPath, { recursive: true });
    
    // Create temporary filepath with timestamp to avoid conflicts
    const tempFileName = `youtube_${videoId}_${Date.now()}.${extension}`;
    tempFilePath = join(tempFolderPath, tempFileName);

    console.log(`Download starting for: ${url} (Format: ${format}, Quality: ${quality})`);
    console.log('Temporary file path:', tempFilePath);
    console.log('Download ID:', downloadId);

    // Update progress to 10%
    await updateProgress(downloadId, 10, 'downloading');

    // Configure yt-dlp options based on format and quality
    const downloadOptions = {
      output: tempFilePath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: format === 'mp3', // Skip for audio to speed up
    };

    if (format === 'mp3') {
      downloadOptions.extractAudio = true;
      downloadOptions.audioFormat = 'mp3';
      downloadOptions.audioQuality = 0; // Best quality
    } else {
      // Enhanced format mapping for different qualities with better compatibility
      // Using specific format selection for better speed and reliability
      const formatMap = {
        '144p': 'worst[ext=mp4]/worst',
        '240p': 'best[height<=240][ext=mp4]/best[height<=240]',
        '360p': 'best[height<=360][ext=mp4]/best[height<=360]',
        '480p': 'best[height<=480][ext=mp4]/best[height<=480]',
        '720p': 'best[height<=720][ext=mp4]/best[height<=720]',
        '1080p': 'best[height<=1080][ext=mp4]/best[height<=1080]',
        '1440p': 'best[height<=1440][ext=mp4]/best[height<=1440]',
        '2160p': 'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/best[height<=2160][ext=mp4]/best', // Better 4K support
      };
      
      // Use more specific format selection for 4K to ensure it works
      if (quality === '2160p') {
        downloadOptions.format = formatMap[quality];
        downloadOptions.mergeOutputFormat = 'mp4';
      } else {
        downloadOptions.format = formatMap[quality] || 'best[ext=mp4]/best';
      }
    }

    // Add progress hooks for yt-dlp
    downloadOptions.progress = true;
    
    // Execute in a promise with progress updates
    const downloadPromise = new Promise((resolve, reject) => {
      // Set up the yt-dlp process with progress tracking
      const ytDlpProcess = ytDlp.exec(url, downloadOptions);
      
      // Track download progress
      let lastProgress = 0;
      
      // Listen for progress output
      ytDlpProcess.on('progress', (progress) => {
        if (progress && progress.percent !== undefined) {
          // Calculate adjusted progress from 10% to 90%
          const adjustedProgress = 10 + (progress.percent * 0.8);
          // Only update if progress changed significantly to avoid too many requests
          if (adjustedProgress - lastProgress >= 5) {
            lastProgress = adjustedProgress;
            updateProgress(downloadId, Math.round(adjustedProgress));
          }
        }
      });
      
      // Handle completion
      ytDlpProcess.then(() => {
        updateProgress(downloadId, 90, 'finalizing');
        resolve();
      }).catch((error) => {
        console.error('yt-dlp error:', error);
        reject(error);
      });
    });
    
    // Wait for the download to complete
    await downloadPromise;
    
    console.log('Download completed, checking if file exists');
    
    // Check if file exists and has content
    if (!existsSync(tempFilePath)) {
      throw new Error('Download failed: File not created');
    }

    // Get file size
    const stats = statSync(tempFilePath);
    const fileSize = stats.size;

    // Update progress to 95%
    await updateProgress(downloadId, 95, 'sending');

    // Set filename for download (make it descriptive but safe)
    const fileName = `youtube_video_${videoId}.${extension}`;
    
    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('X-Download-ID', downloadId);
    
    // Create read stream from the downloaded file
    const fileStream = createReadStream(tempFilePath);
    
    // Stream the file to the response
    await pipeline(fileStream, res);
    
    // Update progress to 100%
    await updateProgress(downloadId, 100, 'completed');
    
    // Schedule cleanup after response is complete
    res.on('close', async () => {
      try {
        // Clean up temp folder after download is complete
        if (tempFolderPath && existsSync(tempFolderPath)) {
          setTimeout(async () => {
            try {
              await deleteFolder(tempFolderPath);
            } catch (err) {
              console.error('Delayed cleanup error:', err);
            }
          }, 2000);
        }
      } catch (err) {
        console.error('Error in cleanup after download:', err);
      }
    });
    
  } catch (error) {
    console.error('Download Error:', error);
    
    // Update progress to error
    await updateProgress(downloadId, 0, 'error');
    
    // Clean up temp folder if it exists and an error occurred
    if (tempFolderPath && existsSync(tempFolderPath)) {
      try {
        await deleteFolder(tempFolderPath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp folder:', cleanupError);
      }
    }
    
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Error processing download request',
        error: process.env.NODE_ENV === 'development' ? error.toString() : 'An error occurred during download',
        downloadId
      });
    }
  }
}

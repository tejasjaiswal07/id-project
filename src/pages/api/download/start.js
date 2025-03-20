import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import ytDlp from 'yt-dlp-exec';

// Ensure temp directories exist
const TEMP_DIR = join(process.cwd(), 'tmp');
const DOWNLOADS_DIR = join(TEMP_DIR, 'downloads');
const PROGRESS_DIR = join(TEMP_DIR, 'progress');

if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

if (!existsSync(DOWNLOADS_DIR)) {
  mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

if (!existsSync(PROGRESS_DIR)) {
  mkdirSync(PROGRESS_DIR, { recursive: true });
}

// Global map to store download processes
global.activeDownloads = global.activeDownloads || new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url, format = 'mp4', quality = '720p' } = req.body;
  
  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }
  
  try {
    // Generate unique download ID
    const downloadId = uuidv4();
    
    // Create file paths
    const outputFilename = `${downloadId}.${format}`;
    const outputPath = join(DOWNLOADS_DIR, outputFilename);
    const progressPath = join(PROGRESS_DIR, `${downloadId}.json`);
    
    // Store initial progress data
    const progressData = {
      downloadId,
      url,
      format,
      quality,
      percent: 0,
      speed: '0 KB/s',
      eta: 'calculating...',
      status: 'starting',
      output: outputPath,
      created: new Date().toISOString()
    };
    
    // Start the download process in background
    startDownloadProcess(downloadId, url, format, quality, outputPath, progressData);
    
    // Return the download ID immediately
    return res.status(200).json({ 
      downloadId, 
      message: 'Download started successfully' 
    });
    
  } catch (error) {
    console.error('Error starting download:', error);
    return res.status(500).json({ 
      message: 'Failed to start download',
      error: error.message 
    });
  }
}

function startDownloadProcess(downloadId, url, format, quality, outputPath, progressData) {
  // Prepare ytdlp arguments based on format and quality
  const args = [
    url,
    '--newline',
    '--progress',
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificate',
    '--concurrent-fragments', '8'
  ];
  
  if (format === 'mp3') {
    args.push(
      '-f', 'bestaudio',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0'
    );
  } else {
    // Video format map
    const formatMap = {
      '144p': 'bestvideo[height<=144]+bestaudio/worst',
      '240p': 'bestvideo[height<=240]+bestaudio/worst[height>144]',
      '360p': 'bestvideo[height<=360]+bestaudio/worst[height>240]',
      '480p': 'bestvideo[height<=480]+bestaudio/worst[height>360]',
      '720p': 'bestvideo[height<=720]+bestaudio/best[height>480]',
      '1080p': 'bestvideo[height<=1080]+bestaudio/best[height>720]',
      '1440p': 'bestvideo[height<=1440]+bestaudio/best[height>1080]',
      '2160p': 'bestvideo[height<=2160]+bestaudio/best[height>1440]'
    };
    
    args.push(
      '-f', formatMap[quality] || 'bestvideo+bestaudio/best',
      '--merge-output-format', 'mp4'
    );
  }
  
  // Add output path
  args.push('-o', outputPath);
  
  try {
    // Start yt-dlp process
    const ytdlpProcess = spawn('yt-dlp', args);
    
    // Store process in global map
    global.activeDownloads.set(downloadId, {
      process: ytdlpProcess,
      progressData,
      outputPath
    });
    
    // Track progress from stderr
    ytdlpProcess.stderr.on('data', (data) => {
      const output = data.toString();
      updateProgress(downloadId, output);
    });
    
    // Handle process completion
    ytdlpProcess.on('close', (code) => {
      if (code === 0) {
        // Download completed successfully
        updateProgress(downloadId, '[download] 100% of ~100MiB in 00:00 at 0KiB/s ETA 00:00', true);
      } else {
        // Download failed
        const downloadData = global.activeDownloads.get(downloadId);
        if (downloadData) {
          downloadData.progressData.status = 'error';
          downloadData.progressData.error = `Download process exited with code ${code}`;
          global.activeDownloads.set(downloadId, downloadData);
        }
      }
    });
    
    // Handle process errors
    ytdlpProcess.on('error', (error) => {
      console.error(`Download process error for ${downloadId}:`, error);
      const downloadData = global.activeDownloads.get(downloadId);
      if (downloadData) {
        downloadData.progressData.status = 'error';
        downloadData.progressData.error = error.message;
        global.activeDownloads.set(downloadId, downloadData);
      }
    });
    
  } catch (error) {
    console.error(`Failed to start download process for ${downloadId}:`, error);
    const downloadData = global.activeDownloads.get(downloadId);
    if (downloadData) {
      downloadData.progressData.status = 'error';
      downloadData.progressData.error = error.message;
      global.activeDownloads.set(downloadId, downloadData);
    }
  }
}

function updateProgress(downloadId, output, completed = false) {
  const downloadData = global.activeDownloads.get(downloadId);
  if (!downloadData) return;
  
  // Extract progress information from output
  const percentMatch = output.match(/(\d+(\.\d+)?)%/);
  const speedMatch = output.match(/at\s+(\d+(\.\d+)?[KMGT]?i?B\/s)/i);
  const etaMatch = output.match(/ETA\s+(\d+:\d+)/);
  
  if (percentMatch || completed) {
    // Update progress data
    downloadData.progressData.percent = completed ? 100 : parseFloat(percentMatch[1]);
    downloadData.progressData.status = completed ? 'complete' : 'downloading';
    
    if (speedMatch) {
      downloadData.progressData.speed = speedMatch[1];
    }
    
    if (etaMatch) {
      downloadData.progressData.eta = etaMatch[1];
    } else if (completed) {
      downloadData.progressData.eta = '00:00';
    }
    
    // Update the download data in the global map
    global.activeDownloads.set(downloadId, downloadData);
  }
} 
import ytdl from 'ytdl-core';
import { pipeline } from 'stream/promises';
import ytDlpExec from 'yt-dlp-exec';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  try {
    const { url, format = 'mp4', quality = '720p' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    try {
      // Try using ytdl-core first
      // Get info to set proper filename
      const info = await ytdl.getInfo(url);
      const videoTitle = info.videoDetails.title.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '-');
      
      // Set quality based on request
      let videoQuality;
      if (format === 'mp3') {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp3"`);
      } else {
        // Map quality to ytdl options
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
        videoQuality = qualityMap[quality] || '720p';
        
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${videoTitle}.mp4"`);
      }
      
      // Create options based on format and quality
      const options = {
        quality: format === 'mp3' ? 'highestaudio' : videoQuality,
        filter: format === 'mp3' ? 'audioonly' : 'videoandaudio',
      };
      
      // Create the stream and pipe to response
      const stream = ytdl(url, options);
      
      // Error handling for the stream
      stream.on('error', (error) => {
        throw error; // This will be caught by the outer catch block
      });
      
      // Pipe the stream to the response
      await pipeline(stream, res);
      
    } catch (ytdlError) {
      console.log('ytdl-core failed, falling back to yt-dlp:', ytdlError.message);
      
      // Fallback to yt-dlp-exec if ytdl-core fails
      const tempDir = path.join(process.cwd(), 'temp');
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Generate a unique filename
      const uniqueId = uuidv4();
      const tempFilePath = path.join(tempDir, `${uniqueId}.${format === 'mp3' ? 'mp3' : 'mp4'}`);
      
      // Set yt-dlp options based on format and quality
      const ytDlpOptions = {
        output: tempFilePath,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
      };
      
      if (format === 'mp3') {
        ytDlpOptions.extractAudio = true;
        ytDlpOptions.audioFormat = 'mp3';
        ytDlpOptions.audioQuality = 0; // Best quality
      } else {
        // Map quality to yt-dlp format
        const formatMap = {
          '144p': 'best[height<=144]',
          '240p': 'best[height<=240]',
          '360p': 'best[height<=360]',
          '480p': 'best[height<=480]',
          '720p': 'best[height<=720]',
          '1080p': 'best[height<=1080]',
          '1440p': 'best[height<=1440]',
          '2160p': 'best[height<=2160]',
        };
        ytDlpOptions.format = formatMap[quality] || 'best[height<=720]';
      }
      
      // Download with yt-dlp
      await ytDlpExec(url, ytDlpOptions);
      
      // Check if file exists
      if (!fs.existsSync(tempFilePath)) {
        throw new Error('Download failed');
      }
      
      // Get file info for headers
      const stat = fs.statSync(tempFilePath);
      const fileName = `video.${format === 'mp3' ? 'mp3' : 'mp4'}`;
      
      // Set headers
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Create read stream and pipe to response
      const fileStream = fs.createReadStream(tempFilePath);
      await pipeline(fileStream, res);
      
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.error('Failed to clean up temporary file:', cleanupError);
      }
    }
    
  } catch (error) {
    console.error('Error during download:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'An error occurred during download',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Download failed'
      });
    }
  }
}

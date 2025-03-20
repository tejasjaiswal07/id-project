import { createReadStream, existsSync, mkdirSync, statSync, unlink } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import ytDlp from 'yt-dlp-exec';

// Ensure temp directory exists
const TEMP_DIR = join(process.cwd(), 'tmp');
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

// Configure API to handle large files and streaming
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1kb', // Limit body size since we'll stream the file
    },
    responseLimit: false, // Disable response size limit for streaming
  },
};

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Extract request parameters
    const { url, format = 'mp4', quality = '720p' } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    // Generate unique filename
    const tempFilename = `${uuidv4()}.${format}`;
    const outputPath = join(TEMP_DIR, tempFilename);

    // Prepare yt-dlp command arguments
    const args = {
      noWarnings: true,
      output: outputPath,
      concurrentFragments: 8, // Download up to 8 fragments in parallel for faster downloads
    };

    // Format-specific arguments
    if (format === 'mp3') {
      args.extractAudio = true;
      args.audioFormat = 'mp3';
      args.audioQuality = 0; // 0 is best quality
    } else {
      // Video format (mp4)
      if (quality !== 'best') {
        // Map quality to format codes
        const formatCode = {
          '144p': 'bestvideo[height<=144]+bestaudio/worst',
          '240p': 'bestvideo[height<=240]+bestaudio/worst[height>144]',
          '360p': 'bestvideo[height<=360]+bestaudio/worst[height>240]',
          '480p': 'bestvideo[height<=480]+bestaudio/worst[height>360]',
          '720p': 'bestvideo[height<=720]+bestaudio/best[height>480]',
          '1080p': 'bestvideo[height<=1080]+bestaudio/best[height>720]',
          '1440p': 'bestvideo[height<=1440]+bestaudio/best[height>1080]',
          '2160p': 'bestvideo[height<=2160]+bestaudio/best[height>1440]',
        };
        
        args.format = formatCode[quality] || 'bestvideo+bestaudio/best';
      }
      
      // Force mp4 container
      args.mergeOutputFormat = 'mp4';
    }

    console.log(`Starting download for ${url} in ${format} (${quality})`);

    // Get video info first to have a meaningful filename
    const info = await ytDlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
    });

    // Sanitize filename
    const safeTitle = info.title.replace(/[^\w\s.-]/g, '_');
    const finalFilename = `${safeTitle}.${format}`;

    // Download the video
    await ytDlp(url, args);

    // Check if file exists and has content
    if (!existsSync(outputPath)) {
      return res.status(404).json({ message: 'Downloaded file not found' });
    }

    const stats = statSync(outputPath);
    if (stats.size === 0) {
      unlink(outputPath, () => {});
      return res.status(400).json({ message: 'Downloaded file is empty' });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeTitle)}.${format}"`);
    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Length', stats.size);
    
    // Create read stream and pipe to response
    const fileStream = createReadStream(outputPath);
    
    try {
      // Stream the file to the client
      await pipeline(fileStream, res);
    } catch (err) {
      console.error('Streaming error:', err);
    } finally {
      // Clean up temp file
      unlink(outputPath, (err) => {
        if (err) {
          console.error('Error deleting temp file:', err);
        }
      });
    }
  } catch (error) {
    console.error('Error in direct download handler:', error);
    
    // Check if response has already been sent
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'An error occurred during download',
        error: error.message 
      });
    }
  }
} 
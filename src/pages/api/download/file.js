import { createReadStream, statSync, existsSync } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';

// Configure API to handle larger files without size limit
export const config = {
  api: {
    responseLimit: false,
    bodyParser: false,
  },
};

// Define the temp directory path
const TEMP_DIR = join(process.cwd(), 'temp');

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id: downloadId, fileName } = req.query;

  if (!downloadId) {
    return res.status(400).json({ message: 'Download ID is required' });
  }

  // The download folder contains the files
  const downloadFolder = join(TEMP_DIR, downloadId);

  try {
    // Check if the download folder exists
    if (!existsSync(downloadFolder)) {
      return res.status(404).json({ message: 'Download not found or expired' });
    }

    // Find the first file in the folder (should be only one)
    const files = await require('fs').promises.readdir(downloadFolder);
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'No files found in download folder' });
    }

    // Get the file path
    const filePath = join(downloadFolder, files[0]);
    
    // Check if the file exists
    if (!existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Get file stats
    const stat = statSync(filePath);
    const fileSize = stat.size;

    // Set headers for file download
    const displayName = fileName || files[0];
    
    // Detect content type based on file extension
    const ext = displayName.split('.').pop().toLowerCase();
    const contentType = ext === 'mp3' ? 'audio/mpeg' : (
      ext === 'mp4' ? 'video/mp4' : 'application/octet-stream'
    );
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${displayName}"`);
    res.setHeader('Content-Length', fileSize);

    // Support range requests for large files and video streaming
    if (req.headers.range) {
      const parts = req.headers.range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      
      console.log(`Serving range request: ${start}-${end}/${fileSize}`);
      
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunkSize);
      res.statusCode = 206;
      
      const fileStream = createReadStream(filePath, { start, end });
      await pipeline(fileStream, res);
    } else {
      // Send the entire file
      console.log(`Serving full file: ${filePath} (${fileSize} bytes)`);
      const fileStream = createReadStream(filePath);
      await pipeline(fileStream, res);
    }
    
    // File cleanup will be handled separately
    
  } catch (error) {
    console.error('Error serving file:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Error serving file',
        error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
      });
    }
  }
}
const fs = require('fs');
const path = require('path');
const { readdir, unlink } = require('fs/promises');
const { existsSync, mkdirSync } = require('fs');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const CLEANUP_KEY = process.env.CLEANUP_KEY;

// Define temp directories
const TEMP_DIR = path.join(process.cwd(), 'tmp');
const DOWNLOADS_DIR = path.join(TEMP_DIR, 'downloads');
const PROGRESS_DIR = path.join(TEMP_DIR, 'progress');

// Ensure directories exist
function ensureDirectoriesExist() {
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
    console.log(`Created directory: ${TEMP_DIR}`);
  }
  
  if (!existsSync(DOWNLOADS_DIR)) {
    mkdirSync(DOWNLOADS_DIR, { recursive: true });
    console.log(`Created directory: ${DOWNLOADS_DIR}`);
  }
  
  if (!existsSync(PROGRESS_DIR)) {
    mkdirSync(PROGRESS_DIR, { recursive: true });
    console.log(`Created directory: ${PROGRESS_DIR}`);
  }
}

// Try to use the API if server is running, otherwise clean up files directly
async function runCleanup() {
  try {
    ensureDirectoriesExist();
    
    // First try to use the API
    try {
      const response = await fetch(`${API_URL}/api/download/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: CLEANUP_KEY }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Cleanup completed successfully via API:');
        console.log(JSON.stringify(result, null, 2));
        return;
      }
    } catch (apiError) {
      console.log('API server not available, performing direct file cleanup...');
    }
    
    // If API fails, do direct file cleanup
    const results = {
      downloadFilesDeleted: 0,
      progressFilesDeleted: 0,
      errors: []
    };
    
    // Clean up download files
    if (existsSync(DOWNLOADS_DIR)) {
      const files = await readdir(DOWNLOADS_DIR);
      console.log(`Found ${files.length} files in downloads directory`);
      
      for (const file of files) {
        try {
          await unlink(path.join(DOWNLOADS_DIR, file));
          results.downloadFilesDeleted++;
        } catch (error) {
          console.error(`Error deleting download file ${file}:`, error);
          results.errors.push(`Failed to delete download file ${file}: ${error.message}`);
        }
      }
    }
    
    // Clean up progress files
    if (existsSync(PROGRESS_DIR)) {
      const files = await readdir(PROGRESS_DIR);
      console.log(`Found ${files.length} files in progress directory`);
      
      for (const file of files) {
        try {
          await unlink(path.join(PROGRESS_DIR, file));
          results.progressFilesDeleted++;
        } catch (error) {
          console.error(`Error deleting progress file ${file}:`, error);
          results.errors.push(`Failed to delete progress file ${file}: ${error.message}`);
        }
      }
    }
    
    console.log('Direct file cleanup completed:');
    console.log(JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('Error running cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
runCleanup(); 
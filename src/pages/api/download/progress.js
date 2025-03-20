import { EventEmitter } from 'events';

// Create a global event emitter to track download progress
const progressEmitter = new EventEmitter();
// Set higher max listeners to avoid warnings
progressEmitter.setMaxListeners(100);

// Global store for progress data
const progressStore = new Map();

// Auto-cleanup for stale progress items (30 minutes)
const PROGRESS_TIMEOUT = 30 * 60 * 1000;
const cleanupIntervals = new Map();

// Handler for the API route
export default function handler(req, res) {
  if (req.method === 'GET') {
    // Handle progress requests
    const { id, type } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Download ID is required' });
    }
    
    // Check if we have progress data for this ID
    if (progressStore.has(id)) {
      return res.status(200).json(progressStore.get(id));
    } else {
      return res.status(404).json({ error: 'Download not found' });
    }
  }
  
  if (req.method === 'POST') {
    // Handle progress updates
    const { type = 'download' } = req.query;
    const { id, progress, status, error } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Download ID is required' });
    }
    
    // Format data based on the request format
    const progressData = {
      id,
      progress: progress || req.body.percent || 0,
      status: status || req.body.status || 'processing',
      error: error || req.body.error || null,
      updatedAt: Date.now()
    };
    
    // Add additional fields if they exist
    if (req.body.speed) progressData.speed = req.body.speed;
    if (req.body.eta) progressData.eta = req.body.eta;
    
    updateProgress(id, progressData);
    return res.status(200).json({ success: true });
  }
  
  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}

// Update progress for a download
function updateProgress(id, data) {
  // Merge with existing data if available
  const existingData = progressStore.get(id) || {};
  const updatedData = { ...existingData, ...data };
  
  // Store the updated progress
  progressStore.set(id, updatedData);
  
  // Emit an event for SSE listeners
  progressEmitter.emit(`progress:${id}`, updatedData);
  
  // Schedule cleanup for this progress entry
  scheduleCleanup(id);
  
  return updatedData;
}

// Schedule cleanup for a progress entry
function scheduleCleanup(id) {
  // Clear existing cleanup interval if present
  if (cleanupIntervals.has(id)) {
    clearTimeout(cleanupIntervals.get(id));
  }
  
  // Schedule new cleanup
  const timeoutId = setTimeout(() => {
    // Remove progress data after timeout
    progressStore.delete(id);
    cleanupIntervals.delete(id);
    
    // Log cleanup for debugging
    console.log(`[Progress] Cleaned up progress data for ${id}`);
  }, PROGRESS_TIMEOUT);
  
  // Store the timeout ID
  cleanupIntervals.set(id, timeoutId);
}

// Mark a download as complete
export function completeDownload(id, data = {}) {
  const progressData = {
    ...data,
    progress: 100,
    status: 'completed',
    completedAt: Date.now()
  };
  
  return updateProgress(id, progressData);
}

// Configuration for API route to increase limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
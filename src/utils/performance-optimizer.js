import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';

/**
 * High-Performance Memory and Resource Management System
 * Optimized for VigGrab's speed and reliability requirements
 */

class PerformanceOptimizer {
  constructor() {
    this.tempDir = join(process.cwd(), 'temp');
    this.downloadsDir = join(this.tempDir, 'downloads');
    this.cacheDir = join(this.tempDir, 'cache');
    this.logsDir = join(this.tempDir, 'logs');
    
    // Performance metrics
    this.metrics = {
      downloadsCompleted: 0,
      averageDownloadTime: 0,
      errorRate: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      lastCleanup: Date.now()
    };
    
    // Cleanup configuration
    this.cleanupConfig = {
      maxFileAge: 5 * 60 * 1000,        // 5 minutes
      maxCacheAge: 30 * 60 * 1000,       // 30 minutes
      maxTempSize: 500 * 1024 * 1024,    // 500MB
      cleanupInterval: 60 * 1000,         // 1 minute
      aggressiveCleanupThreshold: 0.8     // 80% disk usage
    };
    
    this.initialize();
  }

  initialize() {
    // Create necessary directories
    [this.tempDir, this.downloadsDir, this.cacheDir, this.logsDir].forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });

    // Start cleanup scheduler
    this.startCleanupScheduler();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    console.log('[PerformanceOptimizer] Initialized with optimized settings');
  }

  /**
   * Optimized file cleanup with aggressive performance settings
   */
  async performCleanup() {
    const startTime = Date.now();
    let filesDeleted = 0;
    let bytesFreed = 0;

    try {
      // Clean downloads directory (most aggressive)
      const downloads = readdirSync(this.downloadsDir);
      const now = Date.now();
      
      for (const file of downloads) {
        const filePath = join(this.downloadsDir, file);
        const stats = statSync(filePath);
        const age = now - stats.mtimeMs;
        
        if (age > this.cleanupConfig.maxFileAge) {
          const size = stats.size;
          unlinkSync(filePath);
          filesDeleted++;
          bytesFreed += size;
        }
      }

      // Clean cache directory
      const cacheFiles = readdirSync(this.cacheDir);
      for (const file of cacheFiles) {
        const filePath = join(this.cacheDir, file);
        const stats = statSync(filePath);
        const age = now - stats.mtimeMs;
        
        if (age > this.cleanupConfig.maxCacheAge) {
          const size = stats.size;
          unlinkSync(filePath);
          filesDeleted++;
          bytesFreed += size;
        }
      }

      // Check if we need aggressive cleanup
      const totalSize = this.getDirectorySize(this.tempDir);
      if (totalSize > this.cleanupConfig.maxTempSize) {
        console.log('[PerformanceOptimizer] Triggering aggressive cleanup');
        await this.performAggressiveCleanup();
      }

      const cleanupTime = Date.now() - startTime;
      console.log(`[PerformanceOptimizer] Cleanup completed in ${cleanupTime}ms: ${filesDeleted} files, ${this.formatBytes(bytesFreed)} freed`);
      
      this.metrics.lastCleanup = Date.now();
      
    } catch (error) {
      console.error('[PerformanceOptimizer] Cleanup error:', error);
    }
  }

  /**
   * Aggressive cleanup when disk usage is high
   */
  async performAggressiveCleanup() {
    const now = Date.now();
    const aggressiveAge = 2 * 60 * 1000; // 2 minutes for aggressive cleanup
    
    // Clean all files older than 2 minutes
    const allFiles = this.getAllFiles(this.tempDir);
    
    for (const filePath of allFiles) {
      try {
        const stats = statSync(filePath);
        const age = now - stats.mtimeMs;
        
        if (age > aggressiveAge) {
          unlinkSync(filePath);
        }
      } catch (error) {
        // File might have been deleted already
      }
    }
  }

  /**
   * Get total size of directory
   */
  getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const files = readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = join(dirPath, file);
        const stats = statSync(filePath);
        
        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return totalSize;
  }

  /**
   * Get all files recursively
   */
  getAllFiles(dirPath) {
    const files = [];
    
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = join(dirPath, item);
        const stats = statSync(itemPath);
        
        if (stats.isDirectory()) {
          files.push(...this.getAllFiles(itemPath));
        } else {
          files.push(itemPath);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return files;
  }

  /**
   * Start cleanup scheduler
   */
  startCleanupScheduler() {
    // Initial cleanup
    this.performCleanup();
    
    // Schedule regular cleanups
    setInterval(() => {
      this.performCleanup();
    }, this.cleanupConfig.cleanupInterval);
    
    // Schedule memory cleanup
    setInterval(() => {
      if (global.gc) {
        global.gc();
        console.log('[PerformanceOptimizer] Forced garbage collection');
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      this.updateMetrics();
    }, 30 * 1000); // Every 30 seconds
  }

  /**
   * Update performance metrics
   */
  updateMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    
    // Log performance warnings
    if (this.metrics.memoryUsage > 500) { // 500MB
      console.warn(`[PerformanceOptimizer] High memory usage: ${this.metrics.memoryUsage.toFixed(2)}MB`);
    }
    
    if (this.metrics.errorRate > 0.1) { // 10% error rate
      console.warn(`[PerformanceOptimizer] High error rate: ${(this.metrics.errorRate * 100).toFixed(2)}%`);
    }
  }

  /**
   * Record download completion
   */
  recordDownload(downloadTime, success = true) {
    this.metrics.downloadsCompleted++;
    
    // Update average download time
    const totalTime = this.metrics.averageDownloadTime * (this.metrics.downloadsCompleted - 1);
    this.metrics.averageDownloadTime = (totalTime + downloadTime) / this.metrics.downloadsCompleted;
    
    // Update error rate
    if (!success) {
      const totalDownloads = this.metrics.downloadsCompleted;
      const errors = this.metrics.errorRate * (totalDownloads - 1) + 1;
      this.metrics.errorRate = errors / totalDownloads;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      tempDirectorySize: this.formatBytes(this.getDirectorySize(this.tempDir)),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Force cleanup (for manual triggers)
   */
  async forceCleanup() {
    console.log('[PerformanceOptimizer] Manual cleanup triggered');
    await this.performCleanup();
    await this.performAggressiveCleanup();
    
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    
    let status = 'healthy';
    let issues = [];
    
    if (heapUsedMB > 500) {
      status = 'warning';
      issues.push('High memory usage');
    }
    
    if (this.metrics.errorRate > 0.1) {
      status = 'warning';
      issues.push('High error rate');
    }
    
    if (this.metrics.averageDownloadTime > 30000) { // 30 seconds
      status = 'warning';
      issues.push('Slow downloads');
    }
    
    return {
      status,
      issues,
      memoryUsage: `${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB`,
      errorRate: `${(this.metrics.errorRate * 100).toFixed(2)}%`,
      averageDownloadTime: `${(this.metrics.averageDownloadTime / 1000).toFixed(2)}s`
    };
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Export for use in API routes
export default performanceOptimizer;

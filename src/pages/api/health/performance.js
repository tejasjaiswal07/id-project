import performanceOptimizer from '../../../utils/performance-optimizer';

/**
 * High-Performance Health Monitoring API
 * Provides real-time performance metrics and system health status
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const startTime = Date.now();
    
    // Get comprehensive performance metrics
    const metrics = performanceOptimizer.getMetrics();
    const healthStatus = performanceOptimizer.getHealthStatus();
    
    // Additional system metrics
    const systemMetrics = {
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024), // MB
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        external: Math.round(process.memoryUsage().external / 1024 / 1024), // MB
        arrayBuffers: Math.round(process.memoryUsage().arrayBuffers / 1024 / 1024) // MB
      },
      cpuUsage: process.cpuUsage(),
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : null
    };

    // Performance analysis
    const analysis = {
      downloadSpeed: metrics.averageDownloadTime < 10000 ? 'excellent' : 
                    metrics.averageDownloadTime < 30000 ? 'good' : 'slow',
      reliability: metrics.errorRate < 0.05 ? 'excellent' :
                   metrics.errorRate < 0.1 ? 'good' : 'poor',
      memoryEfficiency: systemMetrics.memoryUsage.heapUsed < 200 ? 'excellent' :
                       systemMetrics.memoryUsage.heapUsed < 500 ? 'good' : 'poor',
      overallHealth: healthStatus.status
    };

    // Recommendations based on metrics
    const recommendations = [];
    
    if (metrics.averageDownloadTime > 30000) {
      recommendations.push('Consider optimizing download configuration for faster speeds');
    }
    
    if (metrics.errorRate > 0.1) {
      recommendations.push('High error rate detected - check network connectivity and retry logic');
    }
    
    if (systemMetrics.memoryUsage.heapUsed > 500) {
      recommendations.push('High memory usage - consider increasing cleanup frequency');
    }
    
    if (metrics.downloadsCompleted === 0) {
      recommendations.push('No downloads completed yet - system is ready for testing');
    }

    // Performance score (0-100)
    let performanceScore = 100;
    
    // Deduct points for slow downloads
    if (metrics.averageDownloadTime > 10000) {
      performanceScore -= Math.min(30, (metrics.averageDownloadTime - 10000) / 1000);
    }
    
    // Deduct points for high error rate
    if (metrics.errorRate > 0.05) {
      performanceScore -= Math.min(40, metrics.errorRate * 400);
    }
    
    // Deduct points for high memory usage
    if (systemMetrics.memoryUsage.heapUsed > 200) {
      performanceScore -= Math.min(20, (systemMetrics.memoryUsage.heapUsed - 200) / 10);
    }
    
    performanceScore = Math.max(0, Math.round(performanceScore));

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      health: {
        status: healthStatus.status,
        issues: healthStatus.issues,
        performanceScore,
        analysis
      },
      metrics: {
        ...metrics,
        ...systemMetrics
      },
      recommendations,
      optimization: {
        enabled: true,
        version: '1.0.0',
        features: [
          'Unified download endpoint',
          'Browser pooling',
          'Advanced retry logic',
          'Memory optimization',
          'Performance monitoring'
        ]
      }
    };

    // Set cache headers for monitoring endpoints
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('[Health API] Error:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}

// Configure API
export const config = {
  api: {
    responseLimit: false,
  },
};

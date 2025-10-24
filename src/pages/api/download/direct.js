/**
 * DEPRECATED: Direct Download Endpoint (Legacy)
 *
 * This endpoint is deprecated and maintained only for backward compatibility.
 * Please migrate to /api/download/optimized for better performance and maintenance.
 */

import { withRateLimit } from '@/middleware/rate-limiter';
import { captureMessage } from '@/utils/sentry-config';

async function handler(req, res) {
  console.warn('[DEPRECATED] Legacy direct download endpoint called. Please migrate to /api/download/optimized');
  captureMessage(
    'Deprecated API endpoint used',
    'warning',
    {
      endpoint: '/api/download/direct',
      url: req.body?.url,
      recommendation: 'Migrate to /api/download/optimized',
    }
  );

  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
  res.setHeader('Link', '</api/download/optimized>; rel="successor-version"');

  try {
    const { default: optimizedHandler } = await import('./optimized');
    return optimizedHandler(req, res);
  } catch (error) {
    console.error('Error forwarding to optimized endpoint:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: 'The legacy endpoint could not forward your request to the new endpoint.',
      suggestion: 'Please use /api/download/optimized instead',
    });
  }
}

export default withRateLimit(handler);

export const config = {
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: '1mb' },
  },
};
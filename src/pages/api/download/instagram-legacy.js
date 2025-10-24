/**
 * DEPRECATED: Instagram Download Endpoint (Legacy)
 *
 * This endpoint is deprecated and maintained only for backward compatibility.
 * Please migrate to /api/download/optimized for better performance and maintenance.
 *
 * This endpoint will be removed in version 2.0.0
 */

import { withRateLimit } from '../../../middleware/rate-limiter';
import { captureMessage } from '../../../utils/sentry-config';

async function handler(req, res) {
  // Log deprecation warning
  console.warn('[DEPRECATED] Legacy Instagram download endpoint called. Please migrate to /api/download/optimized');
  captureMessage(
    'Deprecated API endpoint used',
    'warning',
    {
      endpoint: '/api/download/instagram',
      url: req.body?.url,
      recommendation: 'Migrate to /api/download/optimized',
    }
  );

  // Add deprecation headers
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()); // 90 days
  res.setHeader('Link', '</api/download/optimized>; rel="successor-version"');

  // Forward request to optimized endpoint
  try {
    const optimizedHandler = require('./optimized').default;
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
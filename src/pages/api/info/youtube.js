/**
 * DEPRECATED: YouTube Info Endpoint (Legacy)
 *
 * This endpoint is deprecated and maintained only for backward compatibility.
 * Please migrate to /api/info/enhanced for better performance and maintenance.
 */

import { withRateLimit } from '../../../middleware/rate-limiter';
import { captureMessage } from '../../../utils/sentry-config';

async function handler(req, res) {
  console.warn('[DEPRECATED] Legacy YouTube info endpoint called. Please migrate to /api/info/enhanced');
  captureMessage(
    'Deprecated API endpoint used',
    'warning',
    {
      endpoint: '/api/info/youtube',
      url: req.body?.url || req.query?.url,
      recommendation: 'Migrate to /api/info/enhanced',
    }
  );

  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
  res.setHeader('Link', '</api/info/enhanced>; rel="successor-version"');

  try {
    const { default: enhancedHandler } = await import('./enhanced');
    return enhancedHandler(req, res);
  } catch (error) {
    console.error('Error forwarding to enhanced endpoint:', error);
    res.status(500).json({
      error: 'Failed to process request',
      message: 'The legacy endpoint could not forward your request to the new endpoint.',
      suggestion: 'Please use /api/info/enhanced instead',
    });
  }
}

export default withRateLimit(handler);
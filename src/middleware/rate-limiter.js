/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP address
 */

const requestCounts = new Map();
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '30');
const ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false';

/**
 * Get client IP from request
 * @param {Object} req - Next.js request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.socket?.remoteAddress || 'unknown';
  return ip;
}

/**
 * Check if request should be rate limited
 * @param {string} ip - Client IP address
 * @returns {Object} Rate limit status
 */
function checkRateLimit(ip) {
  if (!ENABLED) {
    return { allowed: true, remaining: MAX_REQUESTS };
  }

  const now = Date.now();
  const key = ip;

  // Clean up old entries
  if (requestCounts.has(key)) {
    const records = requestCounts.get(key).filter(time => now - time < WINDOW_MS);
    if (records.length === 0) {
      requestCounts.delete(key);
    } else {
      requestCounts.set(key, records);
    }
  }

  // Initialize or get request records
  if (!requestCounts.has(key)) {
    requestCounts.set(key, []);
  }

  const records = requestCounts.get(key);
  const allowed = records.length < MAX_REQUESTS;

  if (allowed) {
    records.push(now);
  }

  return {
    allowed,
    remaining: Math.max(0, MAX_REQUESTS - records.length),
    resetTime: records.length > 0 ? records[0] + WINDOW_MS : now + WINDOW_MS,
  };
}

/**
 * Middleware function for rate limiting
 * Use in API routes: export { rateLimiterMiddleware as default };
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @returns {boolean} True if request is allowed, false if rate limited
 */
export function rateLimiterMiddleware(req, res) {
  if (!ENABLED) {
    return true;
  }

  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000));

  if (!rateLimit.allowed) {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
    });
    return false;
  }

  return true;
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 * @param {Function} handler - API route handler
 * @returns {Function} Wrapped handler with rate limiting
 */
export function withRateLimit(handler) {
  return async (req, res) => {
    if (!rateLimiterMiddleware(req, res)) {
      return; // Rate limited, response already sent
    }

    return handler(req, res);
  };
}

/**
 * Get current rate limit stats (for monitoring)
 * @returns {Object} Current stats
 */
export function getRateLimitStats() {
  const totalIps = requestCounts.size;
  const now = Date.now();
  let totalRequests = 0;

  requestCounts.forEach(records => {
    totalRequests += records.filter(time => now - time < WINDOW_MS).length;
  });

  return {
    enabled: ENABLED,
    totalIps,
    totalRequests,
    maxRequestsPerWindow: MAX_REQUESTS,
    windowMs: WINDOW_MS,
  };
}

export default {
  rateLimiterMiddleware,
  withRateLimit,
  getRateLimitStats,
};
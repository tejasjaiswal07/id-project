/**
 * Sentry Error Tracking Configuration
 * Comprehensive error tracking and performance monitoring
 * NOTE: Sentry is optional and gracefully handled if not installed
 */

// Safely get Sentry without failing build if not installed
let SentryClient = null;

try {
  // Only require during runtime, not during build
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
    // Development server
    SentryClient = null; // Will be loaded on demand
  }
} catch (err) {
  // Sentry not available
}

/**
 * Lazily load Sentry when needed
 */
function getSentry() {
  if (SentryClient !== null) {
    return SentryClient;
  }

  try {
    // Only attempt to require on-demand in runtime
    if (typeof require !== 'undefined') {
      return require('@sentry/nextjs');
    }
  } catch (err) {
    return null;
  }
  return null;
}

/**
 * Initialize Sentry on the server side
 * This should be called as early as possible in your application
 */
export function initSentry() {
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!sentryDsn) {
    console.log('Sentry DSN not configured. Error tracking disabled.');
    return null;
  }

  try {
    const Sentry = getSentry();
    if (!Sentry) {
      console.log('Sentry package not installed. Error tracking disabled.');
      return null;
    }

    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.OnUncaughtException(),
        new Sentry.Integrations.OnUnhandledRejection(),
      ],
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      beforeSend(event) {
        // Filter out healthcheck errors
        if (event.request?.url?.includes('/api/health')) {
          return null;
        }
        return event;
      },
      ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        // Cancel token
        'cancelled',
        // Network errors that are expected
        'Network request failed',
      ],
    });

    console.log('✓ Sentry error tracking initialized');
    return Sentry;
  } catch (error) {
    console.log('Sentry initialization skipped:', error.message);
    return null;
  }
}

/**
 * Capture exception with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context information
 */
export function captureException(error, context = {}) {
  try {
    const Sentry = getSentry();
    if (!Sentry) return;

    if (context && Object.keys(context).length > 0) {
      Sentry.setContext('additional', context);
    }

    Sentry.captureException(error);
  } catch (err) {
    // Sentry not available
    console.error('Error capturing exception:', error);
  }
}

/**
 * Capture message (for non-error events)
 * @param {string} message - Message to capture
 * @param {string} level - Severity level (fatal, error, warning, info)
 * @param {Object} context - Additional context information
 */
export function captureMessage(message, level = 'info', context = {}) {
  try {
    const Sentry = getSentry();
    if (!Sentry) {
      console.log(`[${level.toUpperCase()}] ${message}`);
      return;
    }

    if (context && Object.keys(context).length > 0) {
      Sentry.setContext('additional', context);
    }

    Sentry.captureMessage(message, level);
  } catch (err) {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}

/**
 * Set user context for error tracking
 * @param {Object} user - User information
 */
export function setUserContext(user) {
  try {
    const Sentry = getSentry();
    if (!Sentry) return;
    Sentry.setUser(user);
  } catch (err) {
    // Sentry not available
  }
}

/**
 * Clear user context
 */
export function clearUserContext() {
  try {
    const Sentry = getSentry();
    if (!Sentry) return;
    Sentry.setUser(null);
  } catch (err) {
    // Sentry not available
  }
}

/**
 * Wrap API handler with error tracking
 * @param {Function} handler - API handler function
 * @returns {Function} Wrapped handler
 */
export function withSentry(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      captureException(error, {
        method: req.method,
        url: req.url,
        api: true,
      });

      // Return error response
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      });
    }
  };
}

export default {
  initSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  withSentry,
};
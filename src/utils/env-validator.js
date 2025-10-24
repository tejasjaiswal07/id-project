/**
 * Environment Variable Validator
 * Ensures all required environment variables are properly configured
 * and provides helpful error messages for missing configs
 */

const ENV_VARS = {
  REQUIRED_DEVELOPMENT: [
    'NEXT_PUBLIC_BASE_URL',
  ],
  REQUIRED_PRODUCTION: [
    'NEXT_PUBLIC_BASE_URL',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
  ],
  OPTIONAL: [
    'NEXT_PUBLIC_YOUTUBE_API_KEY',
    'NEXT_PUBLIC_SENTRY_DSN',
    'CRON_SECRET_KEY',
  ],
};

/**
 * Validate environment variables on server startup
 * @returns {Object} Validation result with status and missing vars
 */
export function validateEnvVars() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const requiredVars = isDevelopment ? ENV_VARS.REQUIRED_DEVELOPMENT : ENV_VARS.REQUIRED_PRODUCTION;

  const missing = [];
  const warnings = [];

  // Check required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check optional variables and warn if missing
  ENV_VARS.OPTIONAL.forEach(varName => {
    if (!process.env[varName]) {
      // Only warn for critical optional vars in production
      if (!isDevelopment && varName === 'NEXT_PUBLIC_FIREBASE_API_KEY') {
        warnings.push(`${varName} is not configured. Some features may not work.`);
      }
    }
  });

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
    environment: process.env.NODE_ENV || 'development',
  };
}

/**
 * Get a safe environment variable (logs if missing)
 * @param {string} varName - Environment variable name
 * @param {string} defaultValue - Default value if not found
 * @param {boolean} isSecret - If true, won't be logged in errors
 * @returns {string|undefined} Environment variable value
 */
export function getEnvVar(varName, defaultValue = undefined, isSecret = false) {
  const value = process.env[varName];

  if (!value && defaultValue === undefined) {
    console.warn(`Missing environment variable: ${varName}`);
    return undefined;
  }

  return value || defaultValue;
}

/**
 * Validate API keys are not using default/placeholder values
 * @returns {Object} Validation result
 */
export function validateApiKeys() {
  const issues = [];

  // Check YouTube API key
  const youtubeKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (youtubeKey && youtubeKey === 'your_youtube_api_key_here') {
    issues.push({
      service: 'YouTube',
      severity: 'warning',
      message: 'YouTube API key is using placeholder value',
    });
  }

  // Check Firebase config
  const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (firebaseProjectId && firebaseProjectId === 'your_firebase_project_id') {
    issues.push({
      service: 'Firebase',
      severity: 'warning',
      message: 'Firebase configuration is using placeholder values',
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Log environment configuration status (safe version for server logs)
 */
export function logEnvStatus() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  console.log('=== Environment Configuration Status ===');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Base URL: ${process.env.NEXT_PUBLIC_BASE_URL}`);
  console.log(`YouTube API Key: ${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`Firebase Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`Sentry DSN: ${process.env.NEXT_PUBLIC_SENTRY_DSN ? '✓ Configured' : '✗ Not configured'}`);
  console.log('========================================');
}

export default {
  validateEnvVars,
  getEnvVar,
  validateApiKeys,
  logEnvStatus,
};
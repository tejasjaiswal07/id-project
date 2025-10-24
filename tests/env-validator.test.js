/**
 * Environment Variable Validator Tests
 */

import { validateEnvVars, getEnvVar, validateApiKeys } from '@/utils/env-validator';

describe('Environment Variable Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateEnvVars', () => {
    test('should validate required development variables', () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

      const result = validateEnvVars();

      expect(result.isValid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    test('should detect missing required variables', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.NEXT_PUBLIC_BASE_URL;

      const result = validateEnvVars();

      expect(result.isValid).toBe(false);
    });

    test('should validate production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_BASE_URL = 'https://vidgrab-pro.com';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'my-project';
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'my-project.firebaseapp.com';
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'key123';

      const result = validateEnvVars();

      expect(result.environment).toBe('production');
    });
  });

  describe('getEnvVar', () => {
    test('should get existing environment variable', () => {
      process.env.TEST_VAR = 'test-value';

      const value = getEnvVar('TEST_VAR');

      expect(value).toBe('test-value');
    });

    test('should return default value if not found', () => {
      delete process.env.MISSING_VAR;

      const value = getEnvVar('MISSING_VAR', 'default-value');

      expect(value).toBe('default-value');
    });

    test('should warn if variable is missing and no default', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      delete process.env.MISSING_VAR;

      const value = getEnvVar('MISSING_VAR');

      expect(warnSpy).toHaveBeenCalled();
      expect(value).toBeUndefined();

      warnSpy.mockRestore();
    });
  });

  describe('validateApiKeys', () => {
    test('should detect placeholder YouTube API key', () => {
      process.env.NEXT_PUBLIC_YOUTUBE_API_KEY = 'your_youtube_api_key_here';

      const result = validateApiKeys();

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.service === 'YouTube')).toBe(true);
    });

    test('should detect placeholder Firebase config', () => {
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'your_firebase_project_id';

      const result = validateApiKeys();

      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.service === 'Firebase')).toBe(true);
    });

    test('should pass with real API keys', () => {
      process.env.NEXT_PUBLIC_YOUTUBE_API_KEY = 'AIzaSy-real-key-here';
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'real-project-id';

      const result = validateApiKeys();

      expect(result.issues.length).toBe(0);
    });

    test('should allow missing optional keys', () => {
      delete process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
      delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      const result = validateApiKeys();

      // Missing keys are not reported as issues if not placeholders
      expect(result.issues.length).toBeLessThanOrEqual(0);
    });
  });

  describe('Environment Configuration Edge Cases', () => {
    test('should handle empty string values', () => {
      process.env.EMPTY_VAR = '';

      const value = getEnvVar('EMPTY_VAR', 'default');

      // Empty string is falsy, so should return default
      expect(value).toBe('default');
    });

    test('should handle boolean-like strings', () => {
      process.env.BOOL_VAR = 'true';

      const value = getEnvVar('BOOL_VAR');

      expect(value).toBe('true');
      expect(typeof value).toBe('string');
    });

    test('should handle numeric strings', () => {
      process.env.NUMERIC_VAR = '42';

      const value = getEnvVar('NUMERIC_VAR');

      expect(value).toBe('42');
      expect(typeof value).toBe('string');
    });
  });

  describe('Environment Validation Results', () => {
    test('should return proper validation structure', () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

      const result = validateEnvVars();

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('missing');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('environment');

      expect(Array.isArray(result.missing)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});
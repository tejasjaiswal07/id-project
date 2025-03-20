/**
 * Validate YouTube URL
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid
 */
export const isValidYouTubeUrl = (url) => {
  if (!url) return false;
  
  // Support various YouTube URL formats
  const patterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|v\/|embed\/|shorts\/)?([a-zA-Z0-9_-]{11})(\S*)?$/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(\S*)?$/
  ];
  
  return patterns.some(pattern => pattern.test(url));
};

/**
 * Validate Instagram URL
 * @param {string} url - URL to validate
 * @returns {boolean} Whether URL is valid
 */
export const isValidInstagramUrl = (url) => {
  if (!url) return false;
  
  // Support various Instagram URL formats
  const pattern = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv|stories)\/([^/?]+)/i;
  
  return pattern.test(url);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email is valid
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  return pattern.test(email);
};

/**
 * Check if URL is HTTPS
 * @param {string} url - URL to check
 * @returns {boolean} Whether URL uses HTTPS
 */
export const isHttps = (url) => {
  if (!url) return false;
  
  return /^https:\/\//.test(url);
};

/**
 * Validate download format against allowed formats
 * @param {string} format - Format to validate
 * @param {string[]} allowedFormats - List of allowed formats
 * @returns {boolean} Whether format is valid
 */
export const isValidFormat = (format, allowedFormats = ['mp4', 'webm', 'mp3']) => {
  if (!format) return false;
  
  return allowedFormats.includes(format.toLowerCase());
};

/**
 * Validate quality against allowed qualities
 * @param {string} quality - Quality to validate
 * @param {string[]} allowedQualities - List of allowed qualities
 * @returns {boolean} Whether quality is valid
 */
export const isValidQuality = (quality, allowedQualities = ['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p']) => {
  if (!quality) return false;
  
  return allowedQualities.includes(quality.toLowerCase());
};

export default {
  isValidYouTubeUrl,
  isValidInstagramUrl,
  isValidEmail,
  isHttps,
  isValidFormat,
  isValidQuality
};

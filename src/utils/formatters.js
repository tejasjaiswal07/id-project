/**
 * Format view count with appropriate suffixes (K, M, B)
 * @param {number} count - View count to format
 * @returns {string} Formatted view count
 */
export const formatViewCount = (count) => {
  if (!count && count !== 0) return 'N/A';
  
  const num = parseInt(count, 10);
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

/**
 * Format ISO 8601 duration to human-readable format
 * @param {string} isoDuration - ISO 8601 duration string (e.g., PT1H30M15S)
 * @returns {string} Formatted duration
 */
export const formatDuration = (isoDuration) => {
  if (!isoDuration) return 'N/A';
  
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;
  
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Format file size from bytes to human-readable format
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format date to human-readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  
  return date.toLocaleDateString(undefined, options);
};

/**
 * Generate filename for downloaded content
 * @param {object} info - Content info object
 * @param {string} format - File format
 * @returns {string} Sanitized filename
 */
export const generateFilename = (info, format) => {
  // Sanitize title by removing invalid characters
  const sanitizedTitle = (info?.title || 'download')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100); // Limit length
  
  return `${sanitizedTitle}_${Date.now().toString().substr(-6)}.${format}`;
};

export default {
  formatViewCount,
  formatDuration,
  formatFileSize,
  formatDate,
  generateFilename
};

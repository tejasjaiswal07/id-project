/**
 * Storage utility for managing local storage interactions
 */

// Check if running in browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Set an item in local storage
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 */
export const setItem = (key, value) => {
  if (!isBrowser) return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting localStorage item:', error);
  }
};

/**
 * Get an item from local storage
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if item doesn't exist
 * @returns {any} Parsed value or default value
 */
export const getItem = (key, defaultValue = null) => {
  if (!isBrowser) return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error getting localStorage item:', error);
    return defaultValue;
  }
};

/**
 * Remove an item from local storage
 * @param {string} key - Storage key to remove
 */
export const removeItem = (key) => {
  if (!isBrowser) return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing localStorage item:', error);
  }
};

/**
 * Save download history
 * @param {Object} downloadInfo - Download information to save
 */
export const saveDownloadHistory = (downloadInfo) => {
  if (!downloadInfo) return;
  
  try {
    const history = getItem('downloadHistory', []);
    
    // Add timestamp and ensure we don't exceed maximum history items
    const updatedHistory = [
      { ...downloadInfo, timestamp: new Date().toISOString() },
      ...history
    ].slice(0, 50); // Keep only the most recent 50 items
    
    setItem('downloadHistory', updatedHistory);
  } catch (error) {
    console.error('Error saving download history:', error);
  }
};

/**
 * Get download history
 * @returns {Array} Download history array
 */
export const getDownloadHistory = () => {
  return getItem('downloadHistory', []);
};

/**
 * Clear download history
 */
export const clearDownloadHistory = () => {
  removeItem('downloadHistory');
};

/**
 * Save user preferences
 * @param {Object} preferences - User preferences object
 */
export const saveUserPreferences = (preferences) => {
  if (!preferences) return;
  
  const currentPreferences = getItem('userPreferences', {});
  setItem('userPreferences', { ...currentPreferences, ...preferences });
};

/**
 * Get user preferences
 * @returns {Object} User preferences
 */
export const getUserPreferences = () => {
  return getItem('userPreferences', {
    theme: 'light',
    defaultFormat: 'mp4',
    defaultQuality: '720p',
    showHistory: true,
    consentToTracking: false
  });
};

export default {
  setItem,
  getItem,
  removeItem,
  saveDownloadHistory,
  getDownloadHistory,
  clearDownloadHistory,
  saveUserPreferences,
  getUserPreferences
};

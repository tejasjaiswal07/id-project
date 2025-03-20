/**
 * Adds a download to history in localStorage
 * @param {Object} download - Download info object
 * @param {string} download.platform - 'youtube' or 'instagram'
 * @param {string} download.title - Title of the downloaded content
 * @param {string} download.format - Format of the download (mp4, mp3, etc)
 * @param {string} download.quality - Quality of the download (for videos)
 * @param {string} download.type - Type of content (video, image, etc)
 */
export const addToHistory = (download) => {
  try {
    const history = getDownloadHistory();
    
    // Add timestamp
    const downloadWithTimestamp = {
      ...download,
      timestamp: Date.now()
    };
    
    // Add to beginning of array (most recent first)
    history.unshift(downloadWithTimestamp);
    
    // Limit history to 20 items
    const limitedHistory = history.slice(0, 20);
    
    localStorage.setItem('downloadHistory', JSON.stringify(limitedHistory));
    return true;
  } catch (error) {
    console.error('Error adding to download history:', error);
    return false;
  }
};

/**
 * Gets download history from localStorage
 * @returns {Array} Array of download history items
 */
export const getDownloadHistory = () => {
  try {
    const history = localStorage.getItem('downloadHistory');
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error reading download history:', error);
    return [];
  }
};

/**
 * Handles downloading a file from a blob
 * @param {Blob} blob - Blob data
 * @param {string} filename - Filename for the download
 */
export const downloadFromBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

/**
 * Formats a filename based on content info
 * @param {Object} info - Content info
 * @param {string} format - File format
 * @returns {string} Formatted filename
 */
export const formatFilename = (info, format) => {
  const title = info.title 
    ? info.title.replace(/[^\w\s]/gi, '').substring(0, 50) 
    : 'download';
  
  return `${title}-${Date.now()}.${format}`;
};

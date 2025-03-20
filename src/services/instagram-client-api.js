import axios from 'axios';

/**
 * Extract Instagram post ID from URL (client-side safe version)
 * @param {string} url - Instagram post URL
 * @returns {Object|null} Post type and ID or null if invalid
 */
export const extractPostInfo = (url) => {
  if (!url) return null;
  
  // Support various Instagram URL formats
  const patterns = {
    post: /instagram\.com\/p\/([^/?#]+)/i,
    reel: /instagram\.com\/reel\/([^/?#]+)/i,
    story: /instagram\.com\/stories\/([^/?#]+)\/([^/?#]+)/i,
    tv: /instagram\.com\/tv\/([^/?#]+)/i
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    const match = url.match(pattern);
    if (match) {
      const result = {
        type,
        id: type === 'story' ? { username: match[1], storyId: match[2] } : match[1],
        // For reels, explicitly set content type as video
        mediaType: type === 'reel' || type === 'tv' ? 'video' : null
      };
      console.log(`Extracted Instagram post info:`, result);
      return result;
    }
  }

  return null;
};

/**
 * Download media from Instagram via API
 * @param {string} url - Instagram post URL
 * @param {boolean} directStream - Whether to stream the file directly (default: true)
 * @returns {string} Download URL
 */
export const getDownloadUrl = (url, directStream = true) => {
  return `/api/download/instagram?url=${encodeURIComponent(url)}&directStream=${directStream}`;
};

/**
 * Generate temporary thumbnail URL for Instagram content
 * @param {string|Object} postId - Instagram post ID or post info object
 * @returns {string} Thumbnail URL
 */
export const getThumbnailUrl = (postInfo) => {
  // If postInfo is a string, assume it's a post ID
  if (typeof postInfo === 'string') {
    return `https://www.instagram.com/p/${postInfo}/media/?size=l`;
  }
  
  // If it's an object with ID and type
  if (postInfo && postInfo.id) {
    const id = typeof postInfo.id === 'string' ? postInfo.id : postInfo.id.storyId || '';
    const type = postInfo.type || 'post';
    
    // Different URL structure based on content type
    if (type === 'reel' || type === 'tv') {
      // For reels, use a better thumbnail pattern
      return `/api/info/instagram-thumbnail?type=reel&id=${id}`;
    } else if (type === 'story') {
      // For stories, try to get a better thumbnail
      return `/api/info/instagram-thumbnail?type=story&id=${id}`;
    } else {
      // For posts, we can use the standard media endpoint
      return `https://www.instagram.com/p/${id}/media/?size=l`;
    }
  }
  
  // Default fallback
  return '/api/info/instagram-placeholder';
};

/**
 * Get media information from server API
 * @param {string} url - Instagram post URL
 * @returns {Promise<Object>} Media information
 */
export const getMediaInfoClient = async (url) => {
  try {
    // First check if URL is valid
    const postInfo = extractPostInfo(url);
    if (!postInfo) {
      throw new Error('Invalid Instagram URL format');
    }
    
    // Get media info from API
    const response = await axios.get(`/api/info/instagram?url=${encodeURIComponent(url)}`);
    
    // If no thumbnail in response, generate one
    if (!response.data.thumbnail) {
      response.data.thumbnail = getThumbnailUrl(postInfo);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error getting Instagram media info:', error);
    throw error;
  }
};

/**
 * Generate a proper file name for downloaded Instagram content
 * @param {string} type - Content type (video, image)
 * @returns {string} Formatted file name
 */
export const getFileName = (type = 'content') => {
  const date = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 14);
  return `instagram_${type}_${date}`;
};

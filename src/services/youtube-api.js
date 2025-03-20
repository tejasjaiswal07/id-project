import axios from 'axios';

// YouTube API endpoints
const API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

/**
 * Fetch video information using YouTube Data API
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object>} Video information
 */
export const getVideoInfo = async (videoId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/videos`, {
      params: {
        part: 'snippet,contentDetails,statistics',
        id: videoId,
        key: API_KEY
      }
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Video not found');
    }

    const videoData = response.data.items[0];
    return {
      id: videoData.id,
      title: videoData.snippet.title,
      description: videoData.snippet.description,
      publishedAt: videoData.snippet.publishedAt,
      channelId: videoData.snippet.channelId,
      channelTitle: videoData.snippet.channelTitle,
      thumbnail: videoData.snippet.thumbnails.maxres?.url || videoData.snippet.thumbnails.high?.url,
      duration: videoData.contentDetails.duration,
      viewCount: videoData.statistics.viewCount,
      likeCount: videoData.statistics.likeCount
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    throw error;
  }
};

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube video URL
 * @returns {string|null} YouTube video ID or null if invalid
 */
export const extractVideoId = (url) => {
  // Support various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /youtube.com\/shorts\/([^"&?\/\s]{11})/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Get related videos based on video ID
 * @param {string} videoId - YouTube video ID
 * @param {number} maxResults - Maximum number of results to return
 * @returns {Promise<Array>} Array of related videos
 */
export const getRelatedVideos = async (videoId, maxResults = 5) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/search`, {
      params: {
        part: 'snippet',
        relatedToVideoId: videoId,
        type: 'video',
        maxResults,
        key: API_KEY
      }
    });

    return response.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url,
      publishedAt: item.snippet.publishedAt
    }));
  } catch (error) {
    console.error('Error fetching related videos:', error);
    throw error;
  }
};

export default {
  getVideoInfo,
  extractVideoId,
  getRelatedVideos
};

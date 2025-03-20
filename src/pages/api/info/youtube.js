import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    // Extract the video ID from the YouTube URL
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    
    if (!videoId) {
      return res.status(400).json({ message: 'Invalid YouTube URL' });
    }
    
    // Use YouTube Data API to fetch video information
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ message: 'YouTube API key not configured' });
    }
    
    const response = await axios.get(`https://www.googleapis.com/youtube/v3/videos`, {
      params: {
        part: 'snippet,contentDetails,statistics',
        id: videoId,
        key: apiKey
      }
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }
    
    const videoData = response.data.items[0];
    
    // Format the response
    const videoInfo = {
      id: videoId,
      title: videoData.snippet.title,
      description: videoData.snippet.description,
      thumbnail: videoData.snippet.thumbnails.high?.url || videoData.snippet.thumbnails.default?.url,
      channelTitle: videoData.snippet.channelTitle,
      publishedAt: videoData.snippet.publishedAt,
      duration: videoData.contentDetails.duration,
      viewCount: videoData.statistics.viewCount,
      likeCount: videoData.statistics.likeCount,
      dislikeCount: videoData.statistics.dislikeCount,
      commentCount: videoData.statistics.commentCount
    };
    
    return res.status(200).json(videoInfo);
    
  } catch (error) {
    console.error('Error fetching YouTube video info:', error);
    return res.status(500).json({ 
      message: 'Error fetching video information',
      error: process.env.NODE_ENV === 'development' ? error.toString() : 'An error occurred'
    });
  }
}

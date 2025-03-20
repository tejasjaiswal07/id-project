// Test endpoint for YouTube API functionality
export default async function handler(req, res) {
  try {
    // Check if YouTube API key is configured
    const youtubeApiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    
    if (!youtubeApiKey) {
      return res.status(500).json({ 
        error: true, 
        message: 'YouTube API key is not configured',
        envVars: {
          hasYoutubeApiKey: Boolean(process.env.NEXT_PUBLIC_YOUTUBE_API_KEY),
          // Don't expose actual key values, just check if they exist
        }
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'YouTube API key is properly configured',
      envVars: {
        hasYoutubeApiKey: Boolean(process.env.NEXT_PUBLIC_YOUTUBE_API_KEY),
      }
    });
  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({ 
      error: true, 
      message: error.message || 'Unknown error in test endpoint' 
    });
  }
}

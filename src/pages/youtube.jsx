import { Box, Typography } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import YouTubeDownloader from '../components/downloaders/YouTubeDownloader';
import AdInterstitial from '../components/ads/AdInterstitial';
import SEOHead from '../components/common/SEOHead';

export default function YouTubePage() {
  return (
    <>
      <SEOHead
        title="YouTube Video Downloader - Download YouTube Videos Free | VidGrab Pro"
        description="Download YouTube videos in MP4, WEBM, or MP3 format. High-quality downloads up to 4K resolution. Fast, free, and easy to use!"
        canonicalUrl="/youtube"
        ogType="website"
      />
      
      <Box sx={{ maxWidth: 800, mx: 'auto', my: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom align="center">
          YouTube Video Downloader
        </Typography>
        <Typography variant="subtitle1" gutterBottom align="center" color="text.secondary" sx={{ mb: 4 }}>
          Download YouTube videos in MP4, WEBM, or MP3 format
        </Typography>
        
        <YouTubeDownloader />
        
        <AdInterstitial />
        
        <Box sx={{ mt: 6 }}>
          <Typography variant="h4" gutterBottom>
            How to Download YouTube Videos
          </Typography>
          <Typography paragraph>
            1. Copy the YouTube video URL from your browser's address bar
          </Typography>
          <Typography paragraph>
            2. Paste the URL in the input field above
          </Typography>
          <Typography paragraph>
            3. Click "Get Info" to load the video details
          </Typography>
          <Typography paragraph>
            4. Select your preferred format and quality
          </Typography>
          <Typography paragraph>
            5. Click "Download" to save the video to your device
          </Typography>
          
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Features of Our YouTube Downloader
          </Typography>
          <Typography paragraph>
            • Download videos in various formats (MP4, WEBM, MP3)
          </Typography>
          <Typography paragraph>
            • Choose from multiple quality options (144p to 4K)
          </Typography>
          <Typography paragraph>
            • Fast and reliable downloads with no limitations
          </Typography>
          <Typography paragraph>
            • No registration or software installation required
          </Typography>
          <Typography paragraph>
            • Compatible with all devices and browsers
          </Typography>
        </Box>
      </Box>
    </>
  );
}

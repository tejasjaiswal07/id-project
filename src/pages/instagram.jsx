import { Box, Typography } from '@mui/material';
import InstagramDownloader from '../components/downloaders/InstagramDownloader';
import AdInterstitial from '../components/ads/AdInterstitial';
import SEOHead from '../components/common/SEOHead';

export default function InstagramPage() {
  return (
    <>
      <SEOHead
        title="Instagram Downloader - Save Photos, Videos, Stories & Reels | VidGrab Pro"
        description="Download Instagram photos, videos, stories, reels, and IGTV in high quality. Save Instagram content to your device easily and quickly."
        canonicalUrl="/instagram"
        ogType="website"
      />
      
      <Box sx={{ maxWidth: 800, mx: 'auto', my: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom align="center">
          Instagram Downloader
        </Typography>
        <Typography variant="subtitle1" gutterBottom align="center" color="text.secondary" sx={{ mb: 4 }}>
          Download posts, stories, reels, and IGTV videos
        </Typography>
        
        <InstagramDownloader />
        
        <AdInterstitial />
        
        <Box sx={{ mt: 6 }}>
          <Typography variant="h4" gutterBottom>
            How to Download Instagram Content
          </Typography>
          <Typography paragraph>
            1. Copy the URL of the Instagram post, story, reel, or IGTV video
          </Typography>
          <Typography paragraph>
            2. Paste the URL in the input field above
          </Typography>
          <Typography paragraph>
            3. Click "Get Info" to load the media details
          </Typography>
          <Typography paragraph>
            4. Click "Download" to save the media to your device
          </Typography>
          
          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
            Features of Our Instagram Downloader
          </Typography>
          <Typography paragraph>
            • Download all types of Instagram content (posts, stories, reels, IGTV)
          </Typography>
          <Typography paragraph>
            • Save photos and videos in original quality
          </Typography>
          <Typography paragraph>
            • Download multiple photos from carousel posts
          </Typography>
          <Typography paragraph>
            • No login or registration required
          </Typography>
          <Typography paragraph>
            • Works on all devices and browsers
          </Typography>
        </Box>
      </Box>
    </>
  );
}

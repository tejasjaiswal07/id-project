import { Box, Typography, Grid, Card, CardContent, Button } from '@mui/material';
import { YouTube, Instagram } from '@mui/icons-material';
import { Helmet } from 'react-helmet-async';
import Link from 'next/link';
import AdBanner from '../components/ads/AdBanner';
import DownloadCounter from '../components/marketing/DownloadCounter';
import EmailCollector from '../components/marketing/EmailCollector';
import DownloadHistory from '../components/history/DownloadHistory';

export default function Home() {
  return (
    <>
      <Helmet>
        <title>VidGrab Pro - Download Videos from YouTube & Instagram</title>
        <meta name="description" content="Download videos from YouTube and Instagram in HD quality. Support for MP4, WEBM, MP3 formats and 4K resolution. Fast, free, and easy to use!" />
        <meta property="og:title" content="VidGrab Pro - Social Media Video Downloader" />
        <meta property="og:description" content="Download your favorite videos from YouTube and Instagram in high quality" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-image.jpg" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "VidGrab Pro",
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "Any",
            "description": "Download videos from YouTube and Instagram in HD quality",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            }
          })}
        </script>
      </Helmet>

      <Box sx={{ textAlign: 'center', my: 8 }}>
        <Typography variant="h1" component="h1" sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, mb: 2 }}>
          Download Videos from YouTube & Instagram
        </Typography>
        <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, color: 'text.secondary', mb: 4 }}>
          Fast, Free, and High Quality Downloads
        </Typography>

        <DownloadCounter />

        <Grid container spacing={4} sx={{ mt: 4, mb: 8 }}>
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent sx={{ p: 4 }}>
                <YouTube sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  YouTube Downloader
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Download videos in MP4, WEBM, or MP3 format
                </Typography>
                <Link href="/youtube" passHref>
                  <Button variant="contained" color="error" size="large">
                    Download from YouTube
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent sx={{ p: 4 }}>
                <Instagram sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Instagram Downloader
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Download posts, stories, reels, and IGTV
                </Typography>
                <Link href="/instagram" passHref>
                  <Button variant="contained" color="secondary" size="large">
                    Download from Instagram
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <AdBanner position="middle" />
        
        <Box sx={{ mt: 8 }}>
          <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, mb: 4 }}>
            Why Choose VidGrab Pro?
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="h6" gutterBottom>✨ High Quality</Typography>
              <Typography color="text.secondary">Up to 4K resolution downloads</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="h6" gutterBottom>⚡ Fast & Easy</Typography>
              <Typography color="text.secondary">No software installation needed</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="h6" gutterBottom>🔒 Secure</Typography>
              <Typography color="text.secondary">Safe and private downloads</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="h6" gutterBottom>💎 Free</Typography>
              <Typography color="text.secondary">Basic features always free</Typography>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 8 }}>
          <DownloadHistory />
        </Box>

        <Box sx={{ mt: 8 }}>
          <EmailCollector />
        </Box>
      </Box>
    </>
  );
}

import { Box, Typography, Grid, Card, CardContent, Button, Chip, Alert } from '@mui/material';
import { Instagram, Speed, Security, Download } from '@mui/icons-material';
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
        <title>VidGrab Pro - Download Instagram Videos & Photos</title>
        <meta name="description" content="Download Instagram videos, photos, reels, and stories in HD quality. Fast, free, and easy to use! Support for MP4 and JPG formats with high-quality downloads." />
        <meta property="og:title" content="VidGrab Pro - Instagram Video & Photo Downloader" />
        <meta property="og:description" content="Download your favorite Instagram content in high quality - videos, photos, reels, and stories" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-image.jpg" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "VidGrab Pro",
            "applicationCategory": "MultimediaApplication",
            "operatingSystem": "Any",
            "description": "Download Instagram videos and photos in HD quality",
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
          Download Instagram Videos & Photos
        </Typography>
        <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, color: 'text.secondary', mb: 4 }}>
          Fast, Free, and High Quality Downloads
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Chip 
            label="🚀 Optimized for Speed" 
            color="primary" 
            sx={{ mr: 1, mb: 1 }} 
          />
          <Chip 
            label="📱 Instagram Focused" 
            color="secondary" 
            sx={{ mr: 1, mb: 1 }} 
          />
          <Chip 
            label="⚡ 1-3 Second Downloads" 
            color="success" 
            sx={{ mb: 1 }} 
          />
        </Box>

        <DownloadCounter />

        <Grid container spacing={4} sx={{ mt: 4, mb: 8 }}>
          <Grid item xs={12} md={8} sx={{ mx: 'auto' }}>
            <Card elevation={3} sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent sx={{ p: 6 }}>
                <Instagram sx={{ fontSize: 80, mb: 3 }} />
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Instagram Downloader
                </Typography>
                <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                  Download posts, stories, reels, and IGTV in HD quality
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, opacity: 0.8 }}>
                  ✨ High-quality video downloads (MP4)<br/>
                  📸 Crystal clear photo downloads (JPG)<br/>
                  ⚡ Lightning-fast 1-3 second downloads<br/>
                  🔒 Secure and private downloads
                </Typography>
                <Link href="/instagram" passHref>
                  <Button 
                    variant="contained" 
                    size="large" 
                    sx={{ 
                      backgroundColor: 'white', 
                      color: '#667eea',
                      fontWeight: 'bold',
                      px: 4,
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Start Downloading Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
          <Typography variant="h6" gutterBottom>
            📢 Notice: YouTube downloads are temporarily disabled
          </Typography>
          <Typography>
            We're currently focusing on providing the best Instagram download experience. 
            YouTube downloads will be available again soon. In the meantime, enjoy our 
            lightning-fast Instagram downloader!
          </Typography>
        </Alert>

        <AdBanner position="middle" />
        
        <Box sx={{ mt: 8 }}>
          <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.5rem' }, mb: 4 }}>
            Why Choose VidGrab Pro?
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                <Speed sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>⚡ Lightning Fast</Typography>
                <Typography color="text.secondary">1-3 second downloads with optimized performance</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                <Download sx={{ fontSize: 40, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>📱 Instagram Focused</Typography>
                <Typography color="text.secondary">Specialized for Instagram content - posts, reels, stories</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                <Security sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>🔒 Secure & Private</Typography>
                <Typography color="text.secondary">Safe downloads with no data collection</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ p: 3, textAlign: 'center', height: '100%' }}>
                <Instagram sx={{ fontSize: 40, color: 'error.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>💎 High Quality</Typography>
                <Typography color="text.secondary">HD videos and crystal clear photos</Typography>
              </Card>
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

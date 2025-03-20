import { Box, Container, Grid, Typography, Link } from '@mui/material';

export default function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: 'background.paper', py: 6, mt: 'auto' }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="space-between">
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              VidGrab Pro
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The ultimate social media video downloader
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Legal
            </Typography>
            <Box>
              <Link href="/legal/terms" color="inherit" display="block">Terms of Service</Link>
              <Link href="/legal/privacy" color="inherit" display="block">Privacy Policy</Link>
              <Link href="/legal/dmca" color="inherit" display="block">DMCA</Link>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Resources
            </Typography>
            <Box>
              <Link href="/blog" color="inherit" display="block">Blog</Link>
              <Link href="mailto:support@vidgrabpro.com" color="inherit" display="block">Support</Link>
            </Box>
          </Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
          © {new Date().getFullYear()} VidGrab Pro. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}

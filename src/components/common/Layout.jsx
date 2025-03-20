import { Box, Container } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import AdBanner from '../ads/AdBanner';

export default function Layout({ children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AdBanner position="top" />
      <Header />
      <Container component="main" sx={{ flex: 1, py: 4 }}>
        {children}
      </Container>
      <AdBanner position="bottom" />
      <Footer />
    </Box>
  );
}

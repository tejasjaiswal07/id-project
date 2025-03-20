import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HelmetProvider } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../contexts/ThemeContext';
import Layout from '../components/common/Layout';
import '../styles/globals.css';
import { useEffect } from 'react';
import axios from 'axios';

function MyApp({ Component, pageProps }) {
  // System initialization
  useEffect(() => {
    // Initialize backend systems
    const initializeSystem = async () => {
      try {
        await axios.get('/api/system/initialize');
        console.log('System initialized successfully');
      } catch (error) {
        console.error('Failed to initialize system:', error);
      }
    };
    
    initializeSystem();
  }, []);

  return (
    <HelmetProvider>
      <CustomThemeProvider>
        <AppContent Component={Component} pageProps={pageProps} />
      </CustomThemeProvider>
    </HelmetProvider>
  );
}

// Separate component to use the theme context
function AppContent({ Component, pageProps }) {
  const { theme } = useTheme();
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout>
        <Component {...pageProps} />
        <Analytics />
      </Layout>
    </ThemeProvider>
  );
}

export default MyApp;

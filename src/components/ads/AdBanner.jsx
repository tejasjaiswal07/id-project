import { Box, Typography, Paper } from '@mui/material';
import { useState, useEffect } from 'react';

export default function AdBanner({ position }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Only run AdSense code on the client side
    if (window && isClient) {
      try {
        // This is where you would typically initialize AdSense
        // For now, we'll just add a console log
        console.log('AdSense banner would load here');
      } catch (error) {
        console.error('Ad loading error:', error);
      }
    }
  }, [isClient]);

  const bannerHeight = position === 'top' ? '90px' : '250px';

  return (
    <Paper 
      elevation={0}
      sx={{
        width: '100%',
        height: bannerHeight,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'background.paper',
        my: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        bgcolor: 'grey.100'
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
          Advertisement
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Ad Space - {position} banner
        </Typography>
      </Box>
    </Paper>
  );
}

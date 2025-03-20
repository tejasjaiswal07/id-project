import { Box, Card, CardContent, Typography, Button, CardMedia, Paper } from '@mui/material';
import { useState, useEffect } from 'react';

export default function AdNative() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Only run AdSense code on the client side
    if (window && isClient) {
      try {
        // This is where you would typically initialize AdSense
        console.log('AdSense native ad would load here');
      } catch (error) {
        console.error('Ad loading error:', error);
      }
    }
  }, [isClient]);

  return (
    <Card sx={{ 
      my: 3, 
      border: '1px solid',
      borderColor: 'divider',
      position: 'relative',
      overflow: 'visible'
    }}>
      <Box 
        sx={{ 
          position: 'absolute', 
          top: -10, 
          right: 10, 
          bgcolor: 'grey.200', 
          color: 'grey.700',
          px: 1, 
          py: 0.5, 
          fontSize: '0.75rem',
          borderRadius: 1
        }}
      >
        Sponsored
      </Box>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
          <Box sx={{ flex: 1, minHeight: '150px' }}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'grey.50',
                border: '1px dashed',
                borderColor: 'grey.300',
                borderRadius: 1
              }}
            >
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Native Advertisement
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                This is a placeholder for a native ad unit.
              </Typography>
              <Button variant="outlined" size="small" sx={{ pointerEvents: 'none' }}>
                Learn More
              </Button>
            </Paper>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

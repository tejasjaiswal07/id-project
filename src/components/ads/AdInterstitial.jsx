import { useState, useEffect } from 'react';
import { Box, Modal, IconButton, Typography, Paper, Button } from '@mui/material';
import { Close } from '@mui/icons-material';

export default function AdInterstitial() {
  const [open, setOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Show interstitial ad with delay and only if not shown recently
    const checkAndShowAd = () => {
      try {
        const lastShown = localStorage.getItem('lastAdShown');
        const now = Date.now();
        const minInterval = 5 * 60 * 1000; // 5 minutes
  
        if (!lastShown || now - parseInt(lastShown) > minInterval) {
          const timer = setTimeout(() => {
            setOpen(true);
            localStorage.setItem('lastAdShown', now.toString());
          }, 2000);
  
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
      }
    };

    if (isClient) {
      checkAndShowAd();
    }
  }, [isClient]);

  const handleClose = () => {
    setOpen(false);
  };

  // Don't render anything during SSR
  if (!isClient) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="interstitial-ad"
      aria-describedby="advertisement-between-actions"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 600 },
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          outline: 'none',
          borderRadius: 2,
        }}
      >
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
          }}
        >
          <Close />
        </IconButton>
        
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.primary" gutterBottom>
            Special Offer
          </Typography>
          
          <Box sx={{ my: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body1" color="text.secondary" paragraph>
              This is a placeholder for an interstitial advertisement.
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              Your actual ad content would appear here.
            </Typography>
            
            <Button 
              variant="contained" 
              color="primary" 
              sx={{ mt: 2 }}
              onClick={handleClose}
            >
              Continue to Site
            </Button>
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            Advertisement
          </Typography>
        </Paper>
      </Box>
    </Modal>
  );
}

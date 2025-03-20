import { useState } from 'react';
import { Box, TextField, Button, Typography, Snackbar, Alert } from '@mui/material';
import { Email } from '@mui/icons-material';

export default function EmailCollector() {
  const [email, setEmail] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setSnackbarMessage('Please enter a valid email address');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
      return;
    }
    
    try {
      // In a real app, this would send the email to your backend
      // await fetch('/api/newsletter/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email })
      // });
      
      setEmail('');
      setSnackbarMessage('Thanks for subscribing to our newsletter!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      setSnackbarMessage('Something went wrong. Please try again later.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom>
        <Email sx={{ mr: 1, verticalAlign: 'middle' }} />
        Subscribe to Our Newsletter
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        Get the latest updates, tips, and special offers!
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <TextField
          fullWidth
          label="Your Email"
          variant="outlined"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
        />
        <Button type="submit" variant="contained">
          Subscribe
        </Button>
      </Box>
      
      <Snackbar 
        open={openSnackbar} 
        autoHideDuration={6000} 
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert 
          onClose={() => setOpenSnackbar(false)} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

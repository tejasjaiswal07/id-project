import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

export default function DownloadCounter() {
  const [count, setCount] = useState(1234567);

  useEffect(() => {
    // Simulate real-time counter updates
    const interval = setInterval(() => {
      setCount(prevCount => prevCount + Math.floor(Math.random() * 3));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ 
      bgcolor: 'primary.main',
      color: 'white',
      py: 2,
      px: 4,
      borderRadius: 2,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 1
    }}>
      <Typography variant="h6" component="span">
        {count.toLocaleString()}
      </Typography>
      <Typography variant="body1" component="span">
        successful downloads and counting!
      </Typography>
    </Box>
  );
}

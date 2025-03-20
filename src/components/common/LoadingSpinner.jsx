import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        py: 4
      }}
    >
      <CircularProgress color="primary" size={40} thickness={4} />
      {text && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ mt: 2 }}
        >
          {text}
        </Typography>
      )}
    </Box>
  );
}

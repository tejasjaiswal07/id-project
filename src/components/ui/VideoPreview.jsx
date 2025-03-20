import { Box, Typography, Card, CardMedia } from '@mui/material';

export default function VideoPreview({ videoInfo, mediaInfo }) {
  const info = videoInfo || mediaInfo;
  
  if (!info) return null;

  return (
    <Card sx={{ maxWidth: '100%' }}>
      <CardMedia
        component="img"
        image={info.thumbnail || info.url}
        alt={info.title || 'Media preview'}
        sx={{ 
          width: '100%',
          maxHeight: 400,
          objectFit: 'contain',
          bgcolor: 'black'
        }}
      />
      {info.title && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {info.title}
          </Typography>
          {info.description && (
            <Typography variant="body2" color="text.secondary">
              {info.description}
            </Typography>
          )}
        </Box>
      )}
    </Card>
  );
}

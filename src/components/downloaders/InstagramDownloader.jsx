import { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Alert, 
  Snackbar, 
  LinearProgress,
  CircularProgress,
  CardMedia,
  Paper,
  Chip
} from '@mui/material';
import { CloudDownload, Instagram as InstagramIcon, VideoLibrary, Photo } from '@mui/icons-material';
import axios from 'axios';
import { extractPostInfo, getThumbnailUrl, getDownloadUrl, getFileName } from '../../services/instagram-client-api';

export default function InstagramDownloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaInfo, setMediaInfo] = useState(null);
  const [error, setError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadId, setDownloadId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  // Removed queue system to prevent multiple downloads
  const progressIntervalRef = useRef(null);
  const downloadLinkRef = useRef(null);
  const formRef = useRef(null);

  // Clean up progress tracking interval when component unmounts
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);
  
  // Effect to track download progress
  useEffect(() => {
    if (downloadId && downloading) {
      // Start tracking progress
      const trackProgress = async () => {
        try {
          const response = await axios.get(`/api/download/progress?type=download&id=${downloadId}`);
          const { progress, status } = response.data;
          
          setDownloadProgress(progress || 0);
          
          // Handle completed or error status
          if (status === 'completed') {
            setDownloadProgress(100);
            setDownloading(false);
            setSuccessMessage('Download completed successfully!');
            clearInterval(progressIntervalRef.current);
          } else if (status === 'error') {
            setErrorMessage('Download failed. Please try again.');
            setDownloading(false);
            setShowError(true);
            clearInterval(progressIntervalRef.current);
          }
        } catch (err) {
          console.error('Error checking progress:', err);
        }
      };
      
      // Check immediately and then set interval
      trackProgress();
      progressIntervalRef.current = setInterval(trackProgress, 1000);
      
      // Clean up interval on status change
      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, [downloadId, downloading]);

  // Simplified download process - no queue system to prevent multiple downloads

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMediaInfo(null);
    setShowError(false);
    
    try {
      // Basic validation
      if (!url || !url.includes('instagram.com')) {
        throw new Error('Please enter a valid Instagram URL');
      }

      // Extract post info using client-side function
      const postInfo = extractPostInfo(url);
      
      if (!postInfo || !postInfo.id) {
        throw new Error('Could not identify Instagram content from URL. Make sure it\'s a post, reel, or video URL.');
      }

      console.log('URL type detected:', postInfo.type);
      
      // Create initial media info from client-side extraction
      const initialMediaInfo = {
        postId: postInfo.id,
        postType: postInfo.type,
        type: postInfo.mediaType || 'unknown', // Use the explicitly set media type if available
        thumbnail: getThumbnailUrl(postInfo),
        author: '',
        isReady: true
      };
      
      // For reels, explicitly set type to video
      if (postInfo.type === 'reel' || postInfo.type === 'tv') {
        initialMediaInfo.type = 'video';
        console.log('Setting media type to VIDEO for reel/tv content');
      }
      
      setMediaInfo(initialMediaInfo);
      
      // Then try to get more detailed info from the enhanced server API
      try {
        const response = await fetch('/api/info/enhanced', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            platform: 'instagram'
          })
        });

        if (response.ok) {
          const result = await response.json();
          const serverMediaInfo = result.data;
          
          // Only update if we got valid data
          if (serverMediaInfo && serverMediaInfo.thumbnail) {
            setMediaInfo(prev => ({
              ...prev,
              ...serverMediaInfo,
              // Preserve the post ID and type we already extracted
              postId: prev.postId,
              postType: prev.postType
            }));
          }
        }
      } catch (infoError) {
        console.warn('Could not fetch detailed media info:', infoError);
        // Continue with basic info, no need to show error to user
      }
      
    } catch (error) {
      console.error('Error preparing Instagram download:', error);
      setErrorMessage(error.message || 'Error processing Instagram URL. Please check the URL and try again.');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  // Removed old download function with queue system

  // Simplified download process - no queue system to prevent multiple downloads
  const handleDownload = async () => {
    if (!mediaInfo) return;
    
    // Prevent multiple downloads by checking if already downloading
    if (downloading) {
      console.log('Download already in progress, skipping...');
      return;
    }
    
    try {
      setDownloading(true);
      setDownloadProgress(0);
      setError(null);
      setSuccessMessage('');
      
      console.log(`Starting single download for: ${url}`);
      
      // Check if this is a reel/video
      const isReel = url.includes('/reel/') || 
                    (mediaInfo && mediaInfo.type === 'video');
      
      // Use optimized download endpoint
      const response = await fetch('/api/download/optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url,
          platform: 'instagram'
        })
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Get download time from response headers
      const downloadTime = response.headers.get('X-Download-Time');
      console.log(`Download completed in ${downloadTime}ms`);

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl_blob = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl_blob;
      link.download = `instagram_${isReel ? 'video' : 'image'}.${isReel ? 'mp4' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      window.URL.revokeObjectURL(downloadUrl_blob);
      
      // Download completed successfully
      console.log(`Download completed successfully in ${downloadTime}ms`);
      
      // Show success message
      const fileType = isReel ? 'Video' : 'Image';
      setSuccessMessage(`${fileType} download completed in ${downloadTime}ms!`);
      setShowSuccess(true);
      
      // Add to download history
      if (addToHistory) {
        addToHistory({
          type: 'instagram',
          url,
          title: mediaInfo.title || 'Instagram Content',
          thumbnail: mediaInfo.thumbnail,
          authorName: mediaInfo.authorName,
          downloadTime: parseInt(downloadTime),
          date: new Date().toISOString()
        });
      }
      
    } catch (err) {
      console.error('Download failed:', err);
      setErrorMessage(`Download failed: ${err.message || 'Unknown error'}`);
      setShowError(true);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  const handleReset = () => {
    setUrl('');
    setMediaInfo(null);
    setError('');
    setShowError(false);
    setDownloading(false);
    setDownloadProgress(0);
    setSuccessMessage('');
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        <InstagramIcon sx={{ mr: 1, color: '#E1306C' }} />
        VidGrab Pro - Instagram Downloader
      </Typography>
      
      <Typography variant="body1" gutterBottom align="center" sx={{ mb: 3 }}>
        Download photos, reels, and videos from Instagram in high quality
      </Typography>
      
      <Snackbar 
        open={showError} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
      
      <Snackbar 
        open={showSuccess} 
        autoHideDuration={3000} 
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
      
      <form onSubmit={handleSubmit} ref={formRef}>
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField 
            fullWidth
            label="Instagram URL"
            variant="outlined"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/... or https://www.instagram.com/reel/..."
            error={Boolean(errorMessage)}
            disabled={loading || downloading}
            sx={{ bgcolor: 'background.paper' }}
            helperText={errorMessage ? '' : 'Paste a post, reel, or video URL'}
          />
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading || !url || downloading}
            sx={{ minWidth: 120, height: 56 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Get Info'}
          </Button>
        </Box>
      </form>
      
      {mediaInfo && (
        <Card sx={{ mb: 3, boxShadow: 3, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
            <CardMedia
              component="img"
              sx={{ 
                width: { xs: '100%', md: 240 }, 
                height: { xs: 200, md: 200 },
                objectFit: 'cover'
              }}
              image={mediaInfo.thumbnail || `https://via.placeholder.com/300?text=${encodeURIComponent(mediaInfo.title || 'Instagram Content')}`}
              alt={mediaInfo.title || 'Instagram Content'}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://via.placeholder.com/300?text=${encodeURIComponent('Instagram Content')}`;
              }}
            />
            <CardContent sx={{ flex: '1', p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="h2">
                  {mediaInfo.postType ? `Instagram ${mediaInfo.postType.charAt(0).toUpperCase() + mediaInfo.postType.slice(1)}` : 'Instagram Content'}
                </Typography>
                <Chip 
                  icon={mediaInfo.type === 'video' || mediaInfo.postType === 'reel' ? <VideoLibrary fontSize="small" /> : <Photo fontSize="small" />}
                  label={mediaInfo.type === 'video' || mediaInfo.postType === 'reel' ? 
                    (mediaInfo.postType === 'reel' ? 'Reel (Video)' : 'Video') : 'Photo'}
                  color={mediaInfo.type === 'video' || mediaInfo.postType === 'reel' ? 'secondary' : 'primary'}
                  size="small"
                />
              </Box>
              
              {mediaInfo.authorName && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  By: {mediaInfo.authorName}
                </Typography>
              )}
              
              {mediaInfo.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {mediaInfo.description.substring(0, 120)}{mediaInfo.description.length > 120 ? '...' : ''}
                </Typography>
              )}
              
              {downloading ? (
                <Box sx={{ width: '100%', mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>{downloadProgress < 100 ? 'Downloading...' : 'Download complete!'}</Typography>
                  <LinearProgress variant="determinate" value={downloadProgress} color="success" />
                </Box>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={handleDownload}
                  startIcon={<CloudDownload />}
                  disabled={!mediaInfo?.isReady}
                  sx={{ mb: 2, height: 48 }}
                >
                  {mediaInfo?.type === 'video' || mediaInfo?.postType === 'reel' ? 
                    (mediaInfo?.postType === 'reel' ? 'Download Reel' : 'Download Video') : 
                    'Download Photo'}
                </Button>
              )}
              
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                  disabled={downloading}
                  sx={{ width: 120, height: 56 }}
                >
                  Reset
                </Button>
              </Box>
              
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                {mediaInfo.type === 'video' 
                  ? 'Videos and reels will be downloaded in the highest available quality' 
                  : 'Photos will be downloaded in full resolution'}
              </Typography>
            </CardContent>
          </Box>
        </Card>
      )}
      
      <Box sx={{ mt: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            VidGrab Pro uses advanced techniques to download Instagram content. For best results with reels, make sure to use direct reel URLs (instagram.com/reel/...).
          </Typography>
        </Alert>
        <Typography variant="subtitle2" color="text.secondary" align="center">
          VidGrab Pro - The Ultimate Social Media Downloader
        </Typography>
      </Box>
    </Paper>
  );
}

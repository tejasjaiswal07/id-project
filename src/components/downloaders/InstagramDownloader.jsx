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
  const [downloadQueue, setDownloadQueue] = useState([]);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState({});
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

  // Process the download queue
  useEffect(() => {
    const processQueue = async () => {
      if (downloadQueue.length > 0 && !processingQueue) {
        setProcessingQueue(true);
        const nextDownload = downloadQueue[0];
        
        try {
          console.log('Processing queued download:', nextDownload);
          const success = await processDownload(nextDownload);
          
          if (!success && nextDownload.retryCount < 3) {
            // Put back in queue with increased retry count
            console.log(`Scheduling retry ${nextDownload.retryCount + 1}/3 for download`);
            setDownloadQueue(prev => [
              ...prev.slice(1), 
              { 
                ...nextDownload, 
                retryCount: (nextDownload.retryCount || 0) + 1,
                retryDelay: 2000 * (nextDownload.retryCount || 0) + 1
              }
            ]);
            
            // Wait before trying the next item
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            // Remove the processed item
            setDownloadQueue(prev => prev.slice(1));
          }
        } catch (err) {
          console.error('Error processing download from queue:', err);
          // Remove failed item and continue
          setDownloadQueue(prev => prev.slice(1));
        }
        
        setProcessingQueue(false);
      }
    };
    
    processQueue();
  }, [downloadQueue, processingQueue]);

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
      
      // Then try to get more detailed info from the server
      try {
        const response = await axios.get(`/api/info/instagram?url=${encodeURIComponent(url)}`);
        const serverMediaInfo = response.data;
        
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

  const handleDownload = async () => {
    if (!mediaInfo) return;
    
    // Add to download queue with increased priority for multiple attempts
    // Add multiple entries to ensure at least one succeeds
    setDownloadQueue(prev => [
      ...prev, 
      { url, mediaInfo, retryCount: 0, priority: 'high' },
      { url, mediaInfo, retryCount: 0, priority: 'medium', retryDelay: 1500 },
      { url, mediaInfo, retryCount: 0, priority: 'low', retryDelay: 3000 }
    ]);
    
    // Show progress simulation for user feedback
    setDownloading(true);
    setDownloadProgress(0);
    setError('');
    setShowError(false);
    
    // Simulate progress for better UX
    const isVideo = mediaInfo.type === 'video' || mediaInfo.postType === 'reel';
    simulateProgressAndComplete(isVideo);
  };

  // Helper function to simulate progress and completion
  const simulateProgressAndComplete = (isVideo) => {
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.floor(Math.random() * 5) + 1;
      if (progress >= 100) {
        progress = 100;
        clearInterval(progressInterval);
        
        setTimeout(() => {
          setDownloading(false);
          setSuccessMessage(`${isVideo ? 'Video' : 'Image'} download started! Check your downloads folder.`);
        }, 1000);
      }
      setDownloadProgress(progress);
    }, 300);
  };

  const processDownload = async (downloadItem) => {
    try {
      // If this is a retry, wait the specified delay
      if (downloadItem.retryDelay) {
        console.log(`Waiting ${downloadItem.retryDelay}ms before retry attempt`);
        await new Promise(resolve => setTimeout(resolve, downloadItem.retryDelay));
      }
      
      // Create a visible indicator that download is in progress
      setDownloadStatus({
        ...downloadStatus,
        [downloadItem.url]: { 
          status: 'downloading', 
          progress: 10,
          attempt: (downloadItem.retryCount || 0) + 1 
        }
      });
      
      // Create a unique download ID to prevent duplicate downloads
      const downloadId = `${new Date().getTime()}-${Math.floor(Math.random() * 10000)}`;
      console.log(`Starting download #${downloadId} for ${downloadItem.url}`);
      
      // Check if this is a reel/video
      const isReel = downloadItem.url.includes('/reel/') || 
                    (downloadItem.mediaInfo && downloadItem.mediaInfo.type === 'video');
      
      // Build direct download URL for the new endpoint
      const encodedUrl = encodeURIComponent(downloadItem.url);
      const downloadUrl = `/api/download/instagram-direct-file?url=${encodedUrl}&downloadId=${downloadId}&isReel=${isReel}`;
      
      console.log(`Downloading ${isReel ? 'VIDEO' : 'IMAGE'} from: ${downloadUrl}`);
      
      // Use more reliable direct download approach with iframe
      const downloadFrame = document.createElement('iframe');
      downloadFrame.style.display = 'none';
      document.body.appendChild(downloadFrame);
      
      // Create a promise that resolves when either:
      // 1. We detect the download has started (setTimeout as proxy)
      // 2. An error occurs (message event from iframe)
      const downloadPromise = new Promise((resolve, reject) => {
        // Set a timeout to assume download has started after 5 seconds
        const successTimeout = setTimeout(() => {
          resolve('download-started');
        }, 5000);
        
        // Listen for error messages from the iframe
        window.addEventListener('message', (event) => {
          if (event.data && event.data.error) {
            clearTimeout(successTimeout);
            reject(new Error(event.data.error));
          }
        }, { once: true });
        
        // Set a timeout for overall failure after 20 seconds
        setTimeout(() => {
          reject(new Error('Download timed out'));
        }, 20000);
      });
      
      // Start the download
      downloadFrame.src = downloadUrl;
      
      try {
        await downloadPromise;
        
        // Update progress and show success
        setDownloadStatus({
          ...downloadStatus,
          [downloadItem.url]: { 
            status: 'completed', 
            progress: 100,
            attempt: (downloadItem.retryCount || 0) + 1 
          }
        });
        
        // Show success message
        const fileType = isReel ? 'Video' : 'Image';
        setSuccessMessage(`${fileType} download started! Check your downloads folder.`);
        setShowSuccess(true);
        
        // Clean up the iframe after 15 seconds
        setTimeout(() => {
          try {
            document.body.removeChild(downloadFrame);
          } catch (e) {
            console.log('Frame already removed', e);
          }
        }, 15000);
        
        return true;
      } catch (err) {
        console.error('iframe download failed:', err);
        
        // Try fallback method - direct window.open
        try {
          window.open(downloadUrl, '_blank');
          
          setSuccessMessage(`Download opened in new tab. If blocked, please allow popups.`);
          setShowSuccess(true);
          return true;
        } catch (fallbackErr) {
          console.error('Fallback download failed:', fallbackErr);
          throw new Error(`Both download methods failed: ${err.message}`);
        }
      }
    } catch (err) {
      console.error('Download failed:', err);
      setErrorMessage(`Download failed: ${err.message || 'Unknown error'}`);
      setShowError(true);
      
      // Add to retry queue with exponential backoff if this is a retryable error
      const isRetryableError = 
        err.message.includes('429') || 
        err.message.includes('503') || 
        err.message.includes('timeout') || 
        err.message.includes('network') ||
        err.message.includes('empty file') ||
        err.message.includes('in progress');
      
      if (isRetryableError && (downloadItem.retryCount || 0) < 2) {
        const retryDelay = Math.pow(2, (downloadItem.retryCount || 0)) * 2000;
        console.log(`Scheduling retry #${(downloadItem.retryCount || 0) + 1} after ${retryDelay}ms`);
        
        // Add to retry queue with increased retry count
        setDownloadQueue(prev => [
          ...prev,
          { 
            ...downloadItem, 
            retryCount: (downloadItem.retryCount || 0) + 1,
            retryDelay
          }
        ]);
      }
      
      return false;
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

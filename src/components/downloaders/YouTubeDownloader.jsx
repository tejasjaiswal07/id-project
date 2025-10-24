import React, { useState, useEffect, useRef } from 'react';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CardMedia, 
  FormControl, 
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  LinearProgress
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import YouTubeIcon from '@mui/icons-material/YouTube';
import axios from 'axios';

const YouTubeDownloader = ({ addToHistory }) => {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [format, setFormat] = useState('mp4');
  const [quality, setQuality] = useState('720p');
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [downloadId, setDownloadId] = useState(null);
  const progressIntervalRef = useRef(null);
  const downloadFrameRef = useRef(null);
  
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
            setError('Download failed. Please try again.');
            setDownloading(false);
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

  // Handle form submission to get video info
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setVideoInfo(null);

    try {
      // Get YouTube video ID
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }
      
      // Try to get enhanced video info from server
      try {
        const response = await fetch('/api/info/enhanced', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            platform: 'youtube'
          })
        });

        if (response.ok) {
          const result = await response.json();
          const enhancedInfo = result.data;
          
          if (enhancedInfo && enhancedInfo.title) {
            setVideoInfo({
              id: videoId,
              title: enhancedInfo.title,
              thumbnail: enhancedInfo.thumbnail,
              channelTitle: enhancedInfo.authorName,
              description: enhancedInfo.description,
              duration: enhancedInfo.duration,
              viewCount: enhancedInfo.viewCount
            });
          } else {
            throw new Error('No enhanced info available');
          }
        } else {
          throw new Error('Enhanced info API failed');
        }
      } catch (enhancedError) {
        console.log('Enhanced info failed, using basic info:', enhancedError.message);
        
        // Fallback to basic info
        const videoTitle = `YouTube Video (${videoId})`;
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        const basicVideoInfo = {
          id: videoId,
          title: videoTitle,
          thumbnail: thumbnailUrl,
          channelTitle: 'YouTube Channel', 
        };
        
        setVideoInfo(basicVideoInfo);
      }
      
      // Add to history
      if (addToHistory) {
        addToHistory({
          type: 'youtube',
          url,
          title: videoTitle,
          thumbnail: thumbnailUrl,
          date: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error fetching video info:', err);
      setError(err.message || 'Error fetching video information');
    } finally {
      setLoading(false);
    }
  };

  // Handle download with optimized API endpoint
  const handleDownload = async () => {
    if (!videoInfo) return;
    
    // YouTube download functionality is temporarily disabled
    setError('YouTube download functionality is currently disabled. Please use Instagram downloader instead.');
    setShowError(true);
    return;
    
    /* COMMENTED OUT - YouTube Download Functionality
    try {
      setDownloading(true);
      setDownloadProgress(0);
      setError(null);
      setSuccessMessage('');
      
      console.log(`Starting optimized download for: ${url} (Format: ${format}, Quality: ${quality})`);
      
      // Use the optimized download endpoint
      const response = await fetch('/api/download/optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          format,
          quality,
          platform: 'youtube'
        })
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Get download time from response headers
      const downloadTime = response.headers.get('X-Download-Time');
      console.log(`Download completed in ${downloadTime}ms`);

      // Track progress with realistic updates
      let progress = 0;
      progressIntervalRef.current = setInterval(() => {
        progress += Math.random() * 20; // Faster progress simulation
        if (progress > 95) progress = 95; // Don't go to 100% until actually complete
        setDownloadProgress(Math.round(progress));
      }, 300); // Faster updates

      // Create blob and download
      const blob = await response.blob();
      const downloadUrl_blob = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl_blob;
      link.download = `${videoInfo.title}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      window.URL.revokeObjectURL(downloadUrl_blob);
      
      // Complete progress
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setDownloadProgress(100);
      setDownloading(false);
      setSuccessMessage(`Download completed in ${downloadTime}ms! ${videoInfo.title}`);
      
      // Add to download history
      if (addToHistory) {
        addToHistory({
          type: 'youtube',
          url,
          title: videoInfo.title,
          format,
          quality,
          downloadTime: parseInt(downloadTime),
          date: new Date().toISOString()
        });
      }
      
    } catch (err) {
      console.error('Download failed:', err);
      setError(`Download failed: ${err.message || 'Unknown error'}`);
      setDownloading(false);
      setDownloadProgress(0);
      
      // Clean up
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
    */
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        <YouTubeIcon sx={{ mr: 1, color: 'red' }} />
        VidGrab Pro - YouTube Downloader
      </Typography>
      
      <Typography variant="body1" gutterBottom align="center" sx={{ mb: 3 }}>
        Download YouTube videos in MP4 or MP3 format (144p to 4K)
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField 
            fullWidth
            label="YouTube URL"
            variant="outlined"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            error={Boolean(error)}
            helperText={error}
            disabled={loading || downloading}
          />
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading || !url || downloading}
            sx={{ minWidth: 120 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Get Info'}
          </Button>
        </Box>
      </form>
      
      {videoInfo && (
        <Card sx={{ mb: 3, boxShadow: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
            <CardMedia
              component="img"
              sx={{ width: { xs: '100%', md: 240 }, height: { xs: 200, md: 180 } }}
              image={videoInfo.thumbnail}
              alt={videoInfo.title}
            />
            <CardContent sx={{ flex: '1' }}>
              <Typography variant="h6" component="h2" gutterBottom>
                {videoInfo.title}
              </Typography>
              {videoInfo.channelTitle && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {videoInfo.channelTitle}
                </Typography>
              )}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Format</InputLabel>
                  <Select
                    value={format}
                    label="Format"
                    onChange={(e) => setFormat(e.target.value)}
                    disabled={downloading}
                  >
                    <MenuItem value="mp4">MP4 Video</MenuItem>
                    <MenuItem value="mp3">MP3 Audio</MenuItem>
                  </Select>
                </FormControl>
                
                {format !== 'mp3' && (
                  <FormControl fullWidth>
                    <InputLabel>Quality</InputLabel>
                    <Select
                      value={quality}
                      label="Quality"
                      onChange={(e) => setQuality(e.target.value)}
                      disabled={downloading}
                    >
                      <MenuItem value="144p">144p</MenuItem>
                      <MenuItem value="240p">240p</MenuItem>
                      <MenuItem value="360p">360p</MenuItem>
                      <MenuItem value="480p">480p</MenuItem>
                      <MenuItem value="720p">720p HD</MenuItem>
                      <MenuItem value="1080p">1080p Full HD</MenuItem>
                      <MenuItem value="1440p">1440p QHD</MenuItem>
                      <MenuItem value="2160p">2160p 4K UHD</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Box>
              
              {downloading && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">
                      {downloadProgress < 95 
                        ? `Downloading ${format === 'mp3' ? 'audio' : 'video'}...` 
                        : 'Finalizing download...'}
                    </Typography>
                    <Typography variant="body2">{downloadProgress}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={downloadProgress} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              )}
              
              <Button 
                variant="contained" 
                color="success" 
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                fullWidth
                disabled={downloading}
                size="large"
                sx={{ height: 50 }}
              >
                {downloading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                    <span>Processing...</span>
                  </Box>
                ) : (
                  `Download ${format.toUpperCase()} (${format === 'mp3' ? 'Audio' : quality})`
                )}
              </Button>
            </CardContent>
          </Box>
        </Card>
      )}
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccessMessage('')} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle2" color="text.secondary" align="center">
          VidGrab Pro - The Ultimate Social Media Downloader
        </Typography>
      </Box>
    </Box>
  );
};

export default YouTubeDownloader;

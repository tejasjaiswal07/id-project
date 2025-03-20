import { useState } from 'react';
import { useRouter } from 'next/router';
import analytics from '../services/analytics';
import storage from '../utils/storage';
import formatters from '../utils/formatters';

/**
 * Custom hook for handling media download functionality
 * @param {string} platform - Platform (youtube or instagram)
 * @returns {Object} Download state and functions
 */
export default function useMediaDownloader(platform) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mediaInfo, setMediaInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const router = useRouter();
  
  /**
   * Fetch media information
   * @param {string} url - Media URL
   */
  const fetchMediaInfo = async (url) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/info/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch ${platform} info`);
      }
      
      const data = await response.json();
      setMediaInfo(data);
      
      // Log event to analytics
      analytics.trackPageView(`/${platform}/info`, `${platform} Info`);
      
      // Return data for potential further processing
      return data;
    } catch (error) {
      console.error(`Error fetching ${platform} info:`, error);
      setError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Download media content
   * @param {Object} options - Download options
   * @param {string} options.url - Media URL
   * @param {string} options.format - Download format (for YouTube)
   * @param {string} options.quality - Download quality (for YouTube)
   */
  const downloadMedia = async (options) => {
    setLoading(true);
    setError(null);
    setDownloadProgress(0);
    
    try {
      // Prepare download request
      const endpoint = `/api/download/${platform}`;
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      };
      
      // Using fetch with XMLHttpRequest to track progress
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);
      xhr.responseType = 'blob';
      
      // Track download progress
      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setDownloadProgress(progress);
        }
      };
      
      // Handle successful download
      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = xhr.response;
          const downloadUrl = window.URL.createObjectURL(blob);
          
          // Determine filename and extension
          const format = options.format || (platform === 'youtube' ? 'mp4' : 'jpg');
          const filename = formatters.generateFilename(mediaInfo, format);
          
          // Create download link and trigger download
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          
          // Save to download history
          storage.saveDownloadHistory({
            platform,
            title: mediaInfo?.title || 'Untitled',
            thumbnail: mediaInfo?.thumbnail,
            format,
            quality: options.quality,
            url: options.url
          });
          
          // Track download event
          analytics.trackDownload(
            platform, 
            format, 
            options.quality,
            false
          );
          
          setLoading(false);
          setDownloadProgress(100);
        } else {
          throw new Error(`Download failed with status ${xhr.status}`);
        }
      };
      
      // Handle download errors
      xhr.onerror = () => {
        setError('Network error during download');
        setLoading(false);
      };
      
      // Set request headers
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      // Send the request with JSON body
      xhr.send(JSON.stringify(options));
    } catch (error) {
      console.error(`Error downloading ${platform} content:`, error);
      setError(error.message);
      setLoading(false);
    }
  };
  
  /**
   * Reset state (e.g., when starting a new download)
   */
  const resetState = () => {
    setMediaInfo(null);
    setError(null);
    setLoading(false);
    setDownloadProgress(0);
  };
  
  return {
    mediaInfo,
    loading,
    error,
    downloadProgress,
    fetchMediaInfo,
    downloadMedia,
    resetState
  };
}

/**
 * DEPRECATED: Legacy Advertisement Component
 *
 * This component is deprecated in favor of the updated version.
 * Use: src/components/ads/AdBanner.jsx instead
 *
 * The new version includes:
 * - Material-UI components
 * - Better client-side rendering
 * - Improved error handling
 */

import { useEffect } from 'react';

const Advertisement = ({ slot, format = 'auto', responsive = true }) => {
  useEffect(() => {
    console.warn('[DEPRECATED] Using legacy Advertisement.js component. Please migrate to src/components/ads/AdBanner.jsx');
    try {
      // Push the ad to the queue if adsense is loaded
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div className="ad-container">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-YOUR_PUBLISHER_ID" // Replace with your publisher ID
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
      <style jsx>{`
        .ad-container {
          width: 100%;
          min-height: 100px;
          margin: 20px 0;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default Advertisement; 
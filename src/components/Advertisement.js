import { useEffect } from 'react';

const Advertisement = ({ slot, format = 'auto', responsive = true }) => {
  useEffect(() => {
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
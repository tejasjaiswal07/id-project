import { initializeAnalytics } from './firebase';
import { Analytics } from '@vercel/analytics/react';

let analyticsInstance = null;

/**
 * Initialize analytics services
 */
export const initAnalytics = async () => {
  // Initialize Firebase Analytics if not already initialized
  if (!analyticsInstance) {
    analyticsInstance = await initializeAnalytics();
  }
  
  // Note: Vercel Analytics is initialized in _app.jsx
  return analyticsInstance;
};

/**
 * Track download event
 * @param {string} platform - Platform (youtube, instagram)
 * @param {string} format - Download format (mp4, mp3, etc.)
 * @param {string} quality - Download quality
 * @param {boolean} isPremium - Whether user is premium
 */
export const trackDownload = async (platform, format, quality, isPremium = false) => {
  try {
    const analytics = await initAnalytics();
    
    if (analytics) {
      analytics.logEvent('download', {
        platform,
        format,
        quality,
        isPremium,
        timestamp: new Date().toISOString()
      });
    }
    
    // You can also send to your own backend for custom analytics
    // await fetch('/api/analytics/track', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ 
    //     event: 'download', 
    //     platform, 
    //     format, 
    //     quality, 
    //     isPremium 
    //   })
    // });
  } catch (error) {
    console.error('Error tracking download:', error);
  }
};

/**
 * Track page view
 * @param {string} pagePath - Page path
 * @param {string} pageTitle - Page title
 */
export const trackPageView = async (pagePath, pageTitle) => {
  try {
    const analytics = await initAnalytics();
    
    if (analytics) {
      analytics.logEvent('page_view', {
        page_path: pagePath,
        page_title: pageTitle,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
};

/**
 * Track premium conversion or upgrade attempt
 * @param {string} plan - Subscription plan
 * @param {boolean} successful - Whether conversion was successful
 */
export const trackPremiumConversion = async (plan, successful) => {
  try {
    const analytics = await initAnalytics();
    
    if (analytics) {
      analytics.logEvent(successful ? 'purchase' : 'begin_checkout', {
        items: [{
          item_name: `VidGrab Pro Premium - ${plan}`,
          item_category: 'subscription',
          price: getPlanPrice(plan)
        }],
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error tracking premium conversion:', error);
  }
};

/**
 * Helper function to get plan price
 * @param {string} plan - Subscription plan
 * @returns {number} Price in USD
 */
const getPlanPrice = (plan) => {
  const prices = {
    monthly: 4.99,
    yearly: 39.99,
    lifetime: 99.99
  };
  
  return prices[plan.toLowerCase()] || 0;
};

export default {
  trackDownload,
  trackPageView,
  trackPremiumConversion
};

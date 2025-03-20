/**
 * Generate JSON-LD structured data for different page types
 */

/**
 * Generate basic website structured data
 * @returns {Object} JSON-LD structured data
 */
export const generateWebsiteSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'VidGrab Pro',
    description: 'Download videos from YouTube and Instagram in high quality',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://vidgrabpro.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://vidgrabpro.com'}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
};

/**
 * Generate software application structured data
 * @returns {Object} JSON-LD structured data
 */
export const generateSoftwareAppSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VidGrab Pro',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250'
    }
  };
};

/**
 * Generate video object structured data
 * @param {Object} videoInfo - Video information
 * @returns {Object} JSON-LD structured data
 */
export const generateVideoObjectSchema = (videoInfo) => {
  if (!videoInfo) return null;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: videoInfo.title,
    description: videoInfo.description,
    thumbnailUrl: videoInfo.thumbnail,
    uploadDate: videoInfo.publishedAt,
    contentUrl: videoInfo.url,
    duration: videoInfo.duration,
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/WatchAction',
      userInteractionCount: videoInfo.viewCount
    }
  };
};

/**
 * Generate FAQ page structured data
 * @param {Array} faqs - Array of FAQ objects with question and answer properties
 * @returns {Object} JSON-LD structured data
 */
export const generateFAQSchema = (faqs) => {
  if (!faqs || !faqs.length) return null;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
};

/**
 * Generate breadcrumb structured data
 * @param {Array} items - Array of breadcrumb items with name and url properties
 * @returns {Object} JSON-LD structured data
 */
export const generateBreadcrumbSchema = (items) => {
  if (!items || !items.length) return null;
  
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
};

/**
 * Generate canonical URL
 * @param {string} path - Page path
 * @returns {string} Full canonical URL
 */
export const getCanonicalUrl = (path) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidgrabpro.com';
  return `${baseUrl}${path}`;
};

/**
 * Generate alternative language links for hreflang tags
 * @param {string} path - Page path
 * @returns {Array} Array of language objects with locale and url
 */
export const getAlternateLanguages = (path) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidgrabpro.com';
  const locales = ['en', 'es', 'fr', 'de', 'hi'];
  
  return locales.map(locale => ({
    locale,
    url: `${baseUrl}/${locale}${path}`
  }));
};

export default {
  generateWebsiteSchema,
  generateSoftwareAppSchema,
  generateVideoObjectSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
  getCanonicalUrl,
  getAlternateLanguages
};

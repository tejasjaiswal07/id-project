import { Helmet } from 'react-helmet-async';

export default function SEOHead({ 
  title, 
  description, 
  canonicalUrl, 
  ogType = 'website',
  ogImage = '/og-image.jpg',
  twitterCard = 'summary_large_image',
  jsonLd = null
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vidgrabpro.com';
  const fullCanonicalUrl = `${baseUrl}${canonicalUrl}`;
  
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullCanonicalUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${baseUrl}${ogImage}`} />
      
      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:url" content={fullCanonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${baseUrl}${ogImage}`} />
      
      {/* Structured data / JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

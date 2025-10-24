/**
 * Enhanced Instagram Info Extraction API
 * Note: Puppeteer-based extraction is not available on Vercel Hobby plan
 */

import axios from 'axios';

/**
 * Extract Instagram info from meta tags (server-side fallback)
 */
async function getInstagramInfoFromMeta(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const html = response.data;

    // Extract meta tags
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    const descriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const videoMatch = html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i);

    return {
      title: titleMatch ? titleMatch[1] : null,
      description: descriptionMatch ? descriptionMatch[1] : null,
      image: imageMatch ? imageMatch[1] : null,
      video: videoMatch ? videoMatch[1] : null,
      source: 'meta-tags'
    };
  } catch (error) {
    throw new Error(`Failed to extract Instagram info: ${error.message}`);
  }
}

/**
 * Main enhanced info handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ message: 'URL is required' });
  }

  try {
    // Validate URL is Instagram
    if (!url.includes('instagram.com')) {
      return res.status(400).json({
        message: 'Only Instagram URLs are supported',
        supported: ['instagram.com posts, reels, stories'],
        note: 'Other platforms are not supported for info extraction'
      });
    }

    console.log(`Extracting info for: ${url}`);

    // Try to extract from meta tags (works without Puppeteer)
    const info = await getInstagramInfoFromMeta(url);

    if (!info.image && !info.video) {
      return res.status(503).json({
        message: 'Instagram info extraction unavailable',
        error: 'Instagram does not provide public meta tags for this content. This feature requires upgrade from Vercel Hobby plan.',
        hint: 'Try using the download endpoint instead, which may work for some public content.'
      });
    }

    return res.status(200).json({
      success: true,
      platform: 'instagram',
      url,
      info,
      note: 'Limited extraction without Puppeteer. Full extraction requires Vercel upgrade.'
    });

  } catch (error) {
    console.error('Enhanced info extraction error:', error);

    if (!res.headersSent) {
      res.status(503).json({
        message: 'Info extraction failed',
        error: error.message,
        solution: 'This feature is not available on Vercel Hobby plan. Consider upgrading your plan.'
      });
    }
  }
}

// Configure API
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1kb',
    },
  },
};
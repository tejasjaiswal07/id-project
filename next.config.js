/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n: {
    locales: ['en', 'es', 'fr', 'de', 'hi'],
    defaultLocale: 'en',
  },
  images: {
    domains: ['i.ytimg.com', 'img.youtube.com', 'cdninstagram.com'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; connect-src 'self' https:;"
          },
        ],
      },
    ]
  },
  experimental: {
    largePageDataBytes: 128 * 1000,
  },
  webpack: (config, { isServer }) => {
    // Only include these polyfills on the client-side build
    if (!isServer) {
      // Ignore all node-only modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        'fs-extra': false,
        module: false
      };
    }
    return config;
  },
  // Tell webpack to not bundle puppeteer or puppeteer-extra packages for client-side
  transpilePackages: [],
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Browser compatibility - removed invalid option

  // Compiler options for Safari compatibility
  compiler: {
    // Support for older Safari versions
    styledComponents: true,
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all API routes
        source: '/api/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Apply security headers to all pages
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
              "img-src 'self' data: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co https://api.anthropic.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

  // Environment variable validation
  env: {
    // Only expose safe environment variables to client
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
    NEXT_PUBLIC_APP_NAME: 'Pantry Buddy Pro',
  },

  // Webpack configuration for security
  webpack: (config, { isServer }) => {
    // Don't bundle server-only modules in client build
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    poweredByHeader: false,
    generateEtags: false,
    compress: true,
  }),
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: [
    'react-admin',
    'ra-core',
    'ra-ui-materialui',
    'ra-data-simple-rest',
    'ra-language-english',
    'date-fns',
    '@api-platform/admin'
  ],
  experimental: {
   // Enable ESM support in Webpack 5
   esmExternals: true,
   // Enable Turbopack for development (optional, can be removed if not needed)
   turbo: true,
   // Enable Webpack 5 (should be default in Next.js 12+)
   webpack5: true,
   // Enable React Server Components (optional, can be removed if not needed)
   serverComponents: true,
   // Enable SWC minification (should be default in Next.js 12+)
   swcMinify: true,
   // Enable the new image optimization engine (optional, can be removed if not needed)
   images: {
     unoptimized: true,
   },
   // Enable the new font optimization engine (optional, can be removed if not needed)
   fonts: {
     optimize: true,
   },
   // Enable the new middleware engine (optional, can be removed if not needed)
   middleware: {
     experimental: true,
   },
    // Enable the new app directory (optional, can be removed if not needed)
    appDir: true, 
  },
  webpack: (config, { isServer }) => {
    // Handle ESM packages properly
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Allow ESM imports
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx', '.jsx'],
      '.mjs': ['.mjs', '.mts'],
      '.cjs': ['.cjs', '.cts'],
    };

    return config;
  },
  async rewrites() {
    // Backend runs on http://localhost (port 80)
    const apiUrl = 'http://localhost';
    return [
      // Auth endpoint for JWT login
      { 
        source: '/auth', 
        destination: `${apiUrl}/auth` 
      },
      // API endpoints
      { 
        source: '/api/:path*', 
        destination: `${apiUrl}/api/:path*` 
      },
    ];
  },
}

module.exports = nextConfig

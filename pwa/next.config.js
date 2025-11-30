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
    esmExternals: 'loose',
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

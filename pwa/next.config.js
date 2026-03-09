/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  allowedDevOrigins: ['metroteam.tail358c67.ts.net'],
  transpilePackages: [
    'react-admin',
    'ra-core', '@mui/icons-material', '@mui/material',
    'ra-ui-materialui',
    'ra-data-simple-rest',
    'ra-language-english',
    'date-fns',
    '@api-platform/admin'
  ],
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

    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Optional native addon; safe to ignore in browser bundles.
      'rdf-canonize-native': false,
      // ky-universal expects this legacy export path.
      'web-streams-polyfill/ponyfill/es2018': 'web-streams-polyfill/ponyfill/es2018',
      '@mui/icons-material': '@mui/icons-material/esm',
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

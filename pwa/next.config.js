/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://localhost';
    return [
      // Auth endpoint
      { 
        source: '/auth', 
        destination: `${apiUrl.replace(/\/$/, '')}/auth` 
      },
      // API endpoints
      { 
        source: '/api/:path*', 
        destination: `${apiUrl.replace(/\/$/, '')}/api/:path*` 
      },
    ];
  },
}

module.exports = nextConfig

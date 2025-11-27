/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      // Proxy API requests to backend to avoid CORS in development
      { source: '/api/:path*', destination: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api/:path*` : '/api/:path*' },
      // Optionally proxy login path
      { source: '/login', destination: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/login` : '/login' },
    ];
  },
}

module.exports = nextConfig

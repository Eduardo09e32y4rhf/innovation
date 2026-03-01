import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  turbopack: {},
  async rewrites() {
    const GATEWAY = process.env.API_URL || 'http://gateway:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${GATEWAY}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${GATEWAY}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;

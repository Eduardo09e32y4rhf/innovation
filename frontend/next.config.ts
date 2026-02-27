import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const GATEWAY = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        source: '/api/:path*',
        destination: `${GATEWAY}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

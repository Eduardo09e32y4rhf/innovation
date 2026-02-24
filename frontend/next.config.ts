import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://innovation_gateway:8000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

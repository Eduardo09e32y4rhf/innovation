import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  experimental: {
    turbo: {
      resolveAlias: {
        "@/utils": "./utils",
        "utils": "./utils"
      }
    }
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
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

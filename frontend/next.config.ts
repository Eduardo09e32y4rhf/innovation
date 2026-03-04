import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  turbopack: {},
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://innovation_gateway:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

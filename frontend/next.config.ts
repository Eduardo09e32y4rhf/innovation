import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  turbopack: {},
};

export default nextConfig;

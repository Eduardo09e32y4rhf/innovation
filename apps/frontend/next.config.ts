import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  async rewrites() {
    const isDev = process.env.NODE_ENV !== "production";
    const gatewayUrl =
      process.env.API_URL || "http://api_monolith:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${gatewayUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

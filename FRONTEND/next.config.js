/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
  // Necessário para exportação estática com Electron
  assetPrefix: './',
}

module.exports = nextConfig

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bookface-images.s3.amazonaws.com',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;

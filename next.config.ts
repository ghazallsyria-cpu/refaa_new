import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  generateBuildId: async () => {
    return `build-${new Date().getTime()}`;
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
    ],
  },
};

export default nextConfig;

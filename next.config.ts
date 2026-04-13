
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // 🚀 تغيير المعرف مع كل عملية بناء لإجبار جلب الملفات الجديدة
  generateBuildId: async () => {
    return `build-${new Date().getTime()}`;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json; charset=utf-8',
          },
        ],
      },
      // 🚀 إجبار المتصفح على التحقق من الصفحة الرئيسية دائماً
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;



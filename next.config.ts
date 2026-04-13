
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // 🚀 هذه الإضافة ستغير أسماء كل الملفات الأساسية مع كل عملية بناء، مما يقتل الكاش الإجباري للمتصفح
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
      // 🚀 إجبار المتصفح على عدم حفظ ملف الـ Service worker في الكاش أبداً!
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
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



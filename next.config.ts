import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // 🚀 تغيير المعرف مع كل عملية بناء لإجبار جلب ملفات Next.js الجديدة
  generateBuildId: async () => {
    return `build-${new Date().getTime()}`;
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', port: '', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', port: '', pathname: '/**' },
    ],
  },

  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
        ],
      },
      // 🚀 إجبار المتصفح على تحميل "ملف الانتحار" وعدم حفظه أبداً في الكاش!
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' },
        ],
      }
    ];
  },
};

export default nextConfig;

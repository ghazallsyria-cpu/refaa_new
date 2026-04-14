import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // 🚀 تغيير المعرف مع كل عملية بناء لإجبار جلب ملفات Next.js الجديدة (ممتاز)
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
      // 🚀 إجبار المتصفح على تحميل "ملف الانتحار" وعدم حفظه أبداً
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' },
        ],
      },
      // 🚀 في حال كان المتصفح يبحث عن هذا الاسم أيضاً
      {
        source: '/service-worker.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0' },
        ],
      }
      // ❌ تم إزالة الفلتر الشامل '/(.*)' للسماح لـ Next.js بتسريع الصور وملفات التصميم!
    ];
  },
};

export default nextConfig;

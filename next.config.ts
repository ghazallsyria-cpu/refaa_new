import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// 🚀 تغليف النظام بمحرك PWA (بإعدادات متوافقة مع App Router)
const withPWA = withPWAInit({
  dest: "public",
  
  // 🛑 إيقاف الكاش الهجومي (لأنه يتعارض كلياً مع App Router في Next 15 ويسبب الحلقة المفرغة)
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  
  workboxOptions: {
    disableDevLogs: true,
    // 🛡️ حماية إضافية: استثناء ملفات السيرفر الديناميكية من الكاش لتجنب خطأ (_async_to_generator)
    exclude: [
      /_next\/server\/.*/,
      /(?:\?|&)rsc=.*/
    ],
  },
});

const nextConfig: NextConfig = {
  output: 'standalone',

  // 🛑 تم إزالة generateBuildId لأنه يدمر مزامنة الـ Service Worker في Netlify
  // Next.js سيقوم الآن بإنشاء Build ID ثابت وآمن ورياضي تلقائياً!

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
    ],
  },
};

export default withPWA(nextConfig);

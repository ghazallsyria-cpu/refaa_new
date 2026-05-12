import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// 🚀 تغليف النظام بمحرك PWA
const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // تم إزالة swcMinify من هنا لأن Next.js يعالجه تلقائياً
  disable: process.env.NODE_ENV === "development", // إيقافه في التطوير لمنع مشاكل الكاش
  workboxOptions: {
    disableDevLogs: true,
  },
});

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

export default withPWA(nextConfig);

import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { NotificationProvider } from "@/context/notification-context";
import { AuthProvider } from "@/context/auth-context";
import { AppLayout } from "@/components/app-layout";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "مدرسة الرفعة النموذجية | المنصة الرقمية",
  description: "نظام إدارة مدرسي رقمي متكامل وعصري",
};

export const viewport: Viewport = {
  themeColor: "#0f172a", // 🚀 مطابقة لون متصفح الجوال مع الثيم الجديد (Slate 900)
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={ibmPlexArabic.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function (regs) {
                      regs.forEach(function (reg) { reg.unregister(); console.log('SW cleaned silently'); });
                    });
                  }
                  if (window.caches) {
                    caches.keys().then(function (keys) {
                      keys.forEach(function (key) { caches.delete(key); console.log('Cache cleaned silently'); });
                    });
                  }
                } catch (e) { console.log('Cleanup background task skipped:', e); }
              })();
            `,
          }}
        />
      </head>

      {/* 🚀 تحديث لون الخلفية والنص ليكون مريحاً وفخماً */}
      <body className="antialiased bg-[#0f172a] text-slate-300 font-sans relative min-h-screen overflow-x-hidden">
        
        {/* 🚀 הסحر يبدأ هنا: الكرات المضيئة المتحركة (Animated Cinematic Blobs) */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none print:hidden">
          {/* إضاءة نيلية هادئة متحركة في الزاوية العلوية */}
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[140px] animate-blob mix-blend-screen" />
          {/* إضاءة زمردية هادئة متحركة في الزاوية السفلية */}
          <div className="absolute bottom-[-10%] left-[-5%] w-[700px] h-[700px] bg-emerald-500/15 rounded-full blur-[140px] animate-blob animation-delay-2000 mix-blend-screen" />
        </div>

        <AuthProvider>
          <NotificationProvider>
            <QueryProvider>
              <AppLayout>{children}</AppLayout>
            </QueryProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

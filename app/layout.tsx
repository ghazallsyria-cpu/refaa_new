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
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={ibmPlexArabic.variable}
      suppressHydrationWarning
    >
      <head>
        {/* 🚀 المكنسة الآلية الصامتة: تعمل في الخلفية دون طرد أو إعادة توجيه */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  // 1. قتل أي Service Worker قديم مسجل في المتصفح بصمت
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function (regs) {
                      regs.forEach(function (reg) {
                        reg.unregister();
                        console.log('SW cleaned silently');
                      });
                    });
                  }

                  // 2. مسح ملفات الكاش العميقة (PWA Cache) بصمت
                  if (window.caches) {
                    caches.keys().then(function (keys) {
                      keys.forEach(function (key) {
                        caches.delete(key);
                        console.log('Cache cleaned silently');
                      });
                    });
                  }
                } catch (e) {
                  console.log('Cleanup background task skipped:', e);
                }
              })();
            `,
          }}
        />
      </head>

      <body className="antialiased bg-slate-50 text-slate-900 font-sans">
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

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
        {/* 🚀 تنظيف PWA والكاش عند تغيير النسخة */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var version = 'v_ultimate_clear_102';

                try {
                  var oldVersion = localStorage.getItem('app_super_version');

                  if (oldVersion !== version) {

                    // 1. حذف Service Worker
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistrations().then(function (regs) {
                        regs.forEach(function (reg) {
                          reg.unregister();
                        });
                      });
                    }

                    // 2. حذف كاش المتصفح
                    if (window.caches) {
                      caches.keys().then(function (keys) {
                        keys.forEach(function (key) {
                          caches.delete(key);
                        });
                      });
                    }

                    // 3. تنظيف التخزين المحلي (بدون كسر التنفيذ)
                    sessionStorage.clear();
                    localStorage.removeItem('app_super_version');

                    // 4. حفظ النسخة الجديدة
                    localStorage.setItem('app_super_version', version);

                    // 5. إعادة تحميل آمنة
                    setTimeout(function () {
                      window.location.replace('/login?refresh=' + Date.now());
                    }, 300);
                  }
                } catch (e) {
                  console.log('SW cleanup skipped:', e);
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

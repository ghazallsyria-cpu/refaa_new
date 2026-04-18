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
  themeColor: "#090b14", // 🚀 مطابقة لون متصفح الجوال مع الثيم
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

      <body className="antialiased bg-[#090b14] text-slate-200 font-sans relative min-h-screen overflow-x-hidden">
        
        {/* 🚀 السحر يبدأ هنا: الخلفية المضيئة العالمية (Global Glowing Blobs) */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none print:hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-[120px]" />
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

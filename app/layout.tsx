import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { NotificationProvider } from "@/context/notification-context";
import { AuthProvider } from "@/context/auth-context";
import { AppLayout } from "@/components/app-layout";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
});

// 🚀 1. تم إضافة ملف الهوية (Manifest) هنا
export const metadata: Metadata = {
  title: "مدرسة الرفعة النموذجية | المنصة الرقمية",
  description: "نظام إدارة مدرسي رقمي متكامل وعصري",
  manifest: "/manifest.json", 
};

// 🚀 2. تم تحديد لون شريط الحالة في هواتف الأندرويد والآيفون هنا
export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmPlexArabic.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-slate-50 text-slate-900 font-sans" suppressHydrationWarning>
        <AuthProvider>
          <NotificationProvider>
            <QueryProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </QueryProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

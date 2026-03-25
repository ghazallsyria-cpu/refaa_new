import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import "./globals.css";
import { AppLayout } from "@/components/app-layout";
import { NotificationProvider } from "@/context/notification-context";

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "مدرسة الرفعة النموذجية | المنصة الرقمية",
  description: "نظام إدارة مدرسي رقمي متكامل وعصري",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmPlexArabic.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-slate-50 text-slate-900 font-sans" suppressHydrationWarning>
        <NotificationProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </NotificationProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { NotificationProvider } from "@/context/notification-context";
import { AuthProvider } from "@/context/auth-context";
import { AppLayout } from "@/components/app-layout";

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
  themeColor: "#02040a",
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-visual',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={ibmPlexArabic.variable} suppressHydrationWarning>
      <body className="antialiased bg-[#02040a] text-slate-100 font-sans relative min-h-screen overflow-x-hidden">
        
        {/* ✨ تم تحسين الخلفية لإنهاء مشكلة الحرارة والبطء (ألغينا الانيميشن والدمج المعقد) */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none print:hidden opacity-50">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
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

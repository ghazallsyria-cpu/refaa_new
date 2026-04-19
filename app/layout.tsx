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
  themeColor: "#f8fafc", // لون اللؤلؤ للمتصفح
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
                      regs.forEach(function (reg) { reg.unregister(); });
                    });
                  }
                  if (window.caches) {
                    caches.keys().then(function (keys) {
                      keys.forEach(function (key) { caches.delete(key); });
                    });
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body className="antialiased bg-[#f8fafc] text-[#0f172a] font-sans relative min-h-screen overflow-x-hidden">
        
        {/* 🚀 السحر السينمائي: التموجات اللونية (ذهب، نيلي عميق، فحمي) */}
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none print:hidden">
          {/* نور ذهبي لامع في الأعلى */}
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-amber-400/15 rounded-full blur-[120px] animate-blob mix-blend-multiply" />
          {/* نور نيلي عميق في الأسفل */}
          <div className="absolute bottom-[-10%] left-[-5%] w-[700px] h-[700px] bg-indigo-900/10 rounded-full blur-[140px] animate-blob animation-delay-2000 mix-blend-multiply" />
          {/* لمسة أسود فحمي في المنتصف للعمق */}
          <div className="absolute top-[40%] left-[20%] w-[500px] h-[500px] bg-slate-800/5 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-multiply" />
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
